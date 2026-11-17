import { spawn } from 'child_process';
import fs from 'fs';
import { processLifecycle, type ManagedProcessType } from './processes';
import type { PortOwnerScope } from './ports';

const START_TIMEOUT_MS = 45_000;
const POLL_INTERVAL_MS = 150;
const ANSI_PATTERN = /\x1B\[[0-9;]*[a-zA-Z]/g;
const LOCAL_URL_PATTERN = /https?:\/\/(?:localhost|127\.0\.0\.1):(\d+)\/?/i;

export function stripAnsi(value: string): string {
    return value.replace(ANSI_PATTERN, '');
}

/** The first local URL in a server's output, with its actual port. */
export function findLocalUrl(value: string): { url: string; port: number } | null {
    const match = stripAnsi(value).match(LOCAL_URL_PATTERN);
    if (!match) {
        return null;
    }
    const port = Number.parseInt(match[1], 10);
    if (!Number.isFinite(port) || port <= 0) {
        return null;
    }
    return { url: `http://127.0.0.1:${port}`, port };
}

function delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

function realPath(value: string): string {
    try {
        return fs.realpathSync.native(value);
    } catch {
        return value;
    }
}

export interface StartViteOptions {
    resourceId: string;
    projectPath: string;
    viteBin: string;
    preferredPort: number;
    ownerId: string;
    ownerScope: PortOwnerScope;
    projectId?: string | null;
    type: ManagedProcessType;
    startTimeoutMs?: number;
    /** Called after the server answers; returning false rejects the startup. */
    isValid?: () => boolean;
}

export interface StartedVite {
    resourceId: string;
    process: ReturnType<typeof spawn>;
    port: number;
    origin: string;
    log: string;
}

export interface StartViteResult {
    server: StartedVite | null;
    error: string | null;
    log: string | null;
}

/**
 * Starts the project's Vite binary with a preferred port but no `--strictPort`.
 * Vite increments to the next free port when the hint is taken, and its printed
 * Local URL is the source of truth for the actual bind. That removes the
 * check-then-bind race `detect()` + `--strictPort` had.
 */
export async function startVitePreview(options: StartViteOptions): Promise<StartViteResult> {
    const timeoutMs = options.startTimeoutMs ?? START_TIMEOUT_MS;
    const log = { value: '' };
    const append = (chunk: Buffer) => {
        log.value = `${log.value}${chunk.toString()}`.slice(-8000);
    };

    let child: ReturnType<typeof spawn>;
    try {
        // The desktop runtime is Electron (Node-compatible), but Bun's test
        // runner also exposes process.execPath as the Bun executable. Run Vite
        // under Node in tests so its config loader and native plugins use the
        // same runtime they use in the packaged Electron app.
        const executable = process.versions.bun ? 'node' : process.execPath;
        child = spawn(
            executable,
            [options.viteBin, '--port', String(options.preferredPort), '--host', '127.0.0.1'],
            {
                // Vite resolves modules to their real paths; a project reached
                // through a junction/symlink would otherwise make its dep
                // optimizer look for outputs under a different directory.
                cwd: realPath(options.projectPath),
                env: {
                    ...process.env,
                    ELECTRON_RUN_AS_NODE: '1',
                    NODE_ENV: 'development',
                },
                windowsHide: true,
                stdio: ['ignore', 'pipe', 'pipe'],
                detached: process.platform !== 'win32',
            },
        );
    } catch (error: any) {
        return {
            server: null,
            error: error?.message ?? 'Failed to start the preview server.',
            log: null,
        };
    }

    child.stdout?.on('data', append);
    child.stderr?.on('data', append);

    processLifecycle.register({
        resourceId: options.resourceId,
        ownerId: options.ownerId,
        ownerScope: options.ownerScope,
        projectId: options.projectId,
        type: options.type,
        child,
    });

    const startedAt = Date.now();
    let detected = findLocalUrl(log.value);
    while (!detected) {
        if (child.exitCode !== null) {
            const output = log.value || null;
            await processLifecycle.stop(options.resourceId);
            return { server: null, error: 'Preview server exited.', log: output };
        }
        if (options.isValid && !options.isValid()) {
            const output = log.value || null;
            await processLifecycle.stop(options.resourceId);
            return { server: null, error: 'Preview start was cancelled.', log: output };
        }
        if (Date.now() - startedAt > timeoutMs) {
            const output = log.value || null;
            await processLifecycle.stop(options.resourceId);
            return { server: null, error: 'Preview server timed out.', log: output };
        }
        await delay(POLL_INTERVAL_MS);
        detected = findLocalUrl(log.value);
    }

    let ready = false;
    while (!ready) {
        if (child.exitCode !== null) {
            const output = log.value || null;
            await processLifecycle.stop(options.resourceId);
            return { server: null, error: 'Preview server exited.', log: output };
        }
        if (options.isValid && !options.isValid()) {
            const output = log.value || null;
            await processLifecycle.stop(options.resourceId);
            return { server: null, error: 'Preview start was cancelled.', log: output };
        }
        if (Date.now() - startedAt > timeoutMs) {
            const output = log.value || null;
            await processLifecycle.stop(options.resourceId);
            return { server: null, error: 'Preview server timed out.', log: output };
        }
        try {
            // Any response proves the server is listening. A workspace whose
            // root has no index.html answers 404, which is still "up".
            await fetch(detected.url, { signal: AbortSignal.timeout(3000) });
            ready = true;
        } catch {
            // Not accepting connections yet.
        }
        if (!ready) {
            await delay(400);
        }
    }

    if (options.isValid && !options.isValid()) {
        await processLifecycle.stop(options.resourceId);
        return { server: null, error: 'Preview start was cancelled.', log: log.value || null };
    }

    processLifecycle.setPort(options.resourceId, detected.port, '127.0.0.1');
    return {
        server: {
            resourceId: options.resourceId,
            process: child,
            port: detected.port,
            origin: detected.url,
            log: log.value,
        },
        error: null,
        log: null,
    };
}

export async function stopManagedProcess(resourceId: string): Promise<boolean> {
    return processLifecycle.stop(resourceId);
}
