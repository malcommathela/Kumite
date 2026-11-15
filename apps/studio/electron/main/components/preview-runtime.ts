import { PREVIEW_MESSAGE_SOURCE } from '@kumite/models';
import { spawn, type ChildProcess } from 'child_process';
import crypto from 'crypto';
import { detect } from 'detect-port';
import fs from 'fs';
import path from 'path';

export { advancePreviewState, parsePreviewMessage } from '@kumite/models';
export type { PreviewLifecycleState, PreviewMessage } from '@kumite/models';

/**
 * Project-scoped preview runtime.
 *
 * A Vite dev server is one process per (project, preview kind). Every preview
 * that shares that server owns a session directory under
 * `__kumite_preview/<session id>/`. Keeping one process per project and kind,
 * instead of one global process, means two projects can be previewed at the
 * same time and opening the library for a second project never breaks the
 * previews already rendered for the first one.
 */

export const PREVIEW_DIR = '__kumite_preview';
export const PREVIEW_MARKER = 'kumite-preview-session';
const START_TIMEOUT_MS = 45_000;
const IDLE_TIMEOUT_MS = 10 * 60_000;
const MAX_CONCURRENT_STARTS = 2;

export interface PreviewEntrySpec {
    /** Stable id shared by the generated entry and the host iframe. */
    sessionId: string;
    /** File stem inside the session directory. Must be filesystem-safe. */
    entryId: string;
    /** Markup of the session page. It must include the handshake script. */
    html: string;
    /** Module source rendered by Vite. */
    source: string;
}

export interface PreviewSessionFiles {
    sessionId: string;
    entryId: string;
    directory: string;
    htmlPath: string;
    sourcePath: string;
    urlPath: string;
}

export interface PreviewSessionInfo {
    sessionId: string;
    entryId: string;
    url: string;
}

interface RuntimeKey {
    projectPath: string;
    kind: string;
}

interface RuntimeRecord {
    key: RuntimeKey;
    port: number;
    process: ChildProcess;
    log: string;
    sessions: Map<string, PreviewSessionFiles>;
    lastUsedAt: number;
    idleTimer: ReturnType<typeof setTimeout> | null;
}

export interface EnsureRuntimeOptions {
    projectPath: string;
    kind: string;
    /** The local Vite binary the project already has installed. */
    viteBin: string;
    /** Port to try first; the runtime walks upward until one is free. */
    basePort: number;
    entries: PreviewEntrySpec[];
}

export interface EnsureRuntimeResult {
    urls: Record<string, string>;
    error: string | null;
    log: string | null;
}

function runtimeKey(projectPath: string, kind: string): string {
    return `${path.resolve(projectPath)}::${kind}`;
}

/**
 * Derives a session id from the project and entry so re-requesting a preview
 * keeps pointing at the same Vite module. Regenerating it would make Vite
 * remount every iframe (and reset scroll) each time the library asks for a
 * batch.
 */
export function stableSessionId(projectPath: string, entryId: string, kind = 'catalog'): string {
    const digest = crypto
        .createHash('sha1')
        .update(`${path.resolve(projectPath)}::${kind}::${entryId}`)
        .digest('hex');
    return `ks_${digest.slice(0, 16)}`;
}

export function safeEntryId(value: string): string {
    const safe = value
        .replace(/[^a-zA-Z0-9_-]/g, '-')
        .replace(/-+/g, '-')
        .slice(0, 64);
    return safe || 'entry';
}

/**
 * Runs inside the preview page. It reports the three states the host needs:
 * the module booted, React committed, or something threw. `error` handlers are
 * registered before the module executes, so a top-level import failure is
 * reported too.
 */
export function buildHandshakeScript(sessionId: string): string {
    return `<script>
        (function () {
            var sessionId = ${JSON.stringify(sessionId)};
            var source = ${JSON.stringify(PREVIEW_MESSAGE_SOURCE)};
            function post(state, detail) {
                try {
                    parent.postMessage(
                        {
                            source: source,
                            sessionId: sessionId,
                            state: state,
                            detail: detail == null ? null : String(detail),
                        },
                        '*',
                    );
                } catch (error) {
                    /* The host went away; nothing to report to. */
                }
            }
            window.__kumitePreview = { sessionId: sessionId, post: post };
            post('booting');
            window.addEventListener('error', function (event) {
                var detail = '';
                if (event && event.message) {
                    detail = event.message;
                } else if (event && event.target && event.target.src) {
                    detail = 'Failed to load ' + event.target.src;
                }
                post('error', detail || 'The preview failed to load.');
            });
            window.addEventListener('unhandledrejection', function (event) {
                var reason = event && event.reason;
                post('error', (reason && reason.message) || reason || 'Unhandled rejection');
            });
        })();
    </script>`;
}

function sessionDirectory(projectPath: string, sessionId: string): string {
    return path.join(projectPath, PREVIEW_DIR, safeEntryId(sessionId));
}

function writeIfChanged(file: string, contents: string): void {
    try {
        if (fs.readFileSync(file, 'utf8') === contents) {
            return;
        }
    } catch {
        // Missing or unreadable: write it.
    }
    fs.writeFileSync(file, contents, 'utf8');
}

/**
 * Writes a session's HTML and module. The HTML carries the marker; a file of
 * the same name without it belongs to the user and is never overwritten.
 */
export function writeSessionEntry(
    projectPath: string,
    spec: PreviewEntrySpec,
): PreviewSessionFiles {
    const directory = sessionDirectory(projectPath, spec.sessionId);
    const htmlPath = path.join(directory, 'index.html');
    const sourcePath = path.join(directory, `${safeEntryId(spec.entryId)}.tsx`);
    fs.mkdirSync(directory, { recursive: true });

    if (fs.existsSync(htmlPath)) {
        const existing = fs.readFileSync(htmlPath, 'utf8');
        if (!existing.includes(PREVIEW_MARKER)) {
            throw new Error('Preview files already exist in this project.');
        }
    }

    writeIfChanged(htmlPath, spec.html);
    writeIfChanged(sourcePath, spec.source);

    return {
        sessionId: spec.sessionId,
        entryId: spec.entryId,
        directory,
        htmlPath,
        sourcePath,
        urlPath: `/${PREVIEW_DIR}/${safeEntryId(spec.sessionId)}/index.html`,
    };
}

function removeSessionEntry(files: PreviewSessionFiles): void {
    const keepDirectory = (() => {
        try {
            return !fs.readFileSync(files.htmlPath, 'utf8').includes(PREVIEW_MARKER);
        } catch {
            return false;
        }
    })();
    if (keepDirectory) {
        return;
    }
    try {
        fs.rmSync(files.directory, { recursive: true, force: true });
    } catch {
        // Ignore cleanup failures.
    }
}

function killProcess(child: ChildProcess): void {
    if (child.exitCode !== null || !child.pid) {
        return;
    }
    if (process.platform === 'win32') {
        spawn('taskkill', ['/pid', String(child.pid), '/T', '/F'], {
            windowsHide: true,
            stdio: 'ignore',
        });
        return;
    }
    child.kill('SIGTERM');
}

function waitForServer(getUrl: () => string, child: ChildProcess): Promise<boolean> {
    return new Promise((resolve) => {
        const startedAt = Date.now();
        const tick = async () => {
            if (child.exitCode !== null || Date.now() - startedAt > START_TIMEOUT_MS) {
                resolve(false);
                return;
            }
            try {
                const response = await fetch(getUrl(), {
                    signal: AbortSignal.timeout(3000),
                });
                if (response.ok) {
                    resolve(true);
                    return;
                }
            } catch {
                // Not accepting connections yet.
            }
            setTimeout(tick, 500);
        };
        void tick();
    });
}

export class PreviewRuntimeManager {
    private runtimes = new Map<string, RuntimeRecord>();
    /** Per-key chains. Starting one server is serialized per project and kind. */
    private chains = new Map<string, Promise<void>>();
    private startsInFlight = 0;
    private startWaiters: Array<() => void> = [];

    constructor(
        private options: {
            idleTimeoutMs?: number;
            startTimeoutMs?: number;
        } = {},
    ) {}

    private get idleTimeoutMs(): number {
        return this.options.idleTimeoutMs ?? IDLE_TIMEOUT_MS;
    }

    /**
     * Writes the entries, makes sure the project's server is running, and
     * returns the URL for every requested session. Concurrent requests for the
     * same project share one start.
     */
    async ensure(options: EnsureRuntimeOptions): Promise<EnsureRuntimeResult> {
        const key = runtimeKey(options.projectPath, options.kind);
        // Batch A and batch B can arrive while one server is starting. Chain
        // them instead of merging their results, or B would be told about A's
        // entries only and never receive its own URLs.
        const previous = this.chains.get(key) ?? Promise.resolve();
        const task = previous.catch(() => undefined).then(() => this.ensureInternal(options));
        this.chains.set(
            key,
            task.then(
                () => undefined,
                () => undefined,
            ),
        );
        return task;
    }

    private async ensureInternal(options: EnsureRuntimeOptions): Promise<EnsureRuntimeResult> {
        let written: PreviewSessionFiles[];
        try {
            written = options.entries.map((entry) => writeSessionEntry(options.projectPath, entry));
        } catch (error: any) {
            return {
                urls: {},
                error: error?.message ?? 'Failed to write the preview entry.',
                log: null,
            };
        }

        const key = runtimeKey(options.projectPath, options.kind);
        let runtime = this.runtimes.get(key);
        if (runtime && runtime.process.exitCode !== null) {
            this.forget(key, runtime, false);
            runtime = undefined;
        }

        if (!runtime) {
            const started = await this.startRuntime(options, key, written);
            if (started.error || !started.runtime) {
                return {
                    urls: {},
                    error: started.error ?? 'Failed to start the preview server.',
                    log: started.log,
                };
            }
            runtime = started.runtime;
        }

        runtime.lastUsedAt = Date.now();
        for (const files of written) {
            runtime.sessions.set(files.sessionId, files);
        }
        this.touch(key, runtime);

        return {
            urls: Object.fromEntries(
                written.map((files) => [
                    files.sessionId,
                    `http://127.0.0.1:${runtime!.port}${files.urlPath}`,
                ]),
            ),
            error: null,
            log: null,
        };
    }

    private async startRuntime(
        options: EnsureRuntimeOptions,
        key: string,
        written: PreviewSessionFiles[],
    ): Promise<{ runtime: RuntimeRecord | null; error: string | null; log: string | null }> {
        await this.acquireStartSlot();
        let port: number;
        let child: ChildProcess;
        try {
            port = await detect(options.basePort);
            child = spawn(
                process.execPath,
                [options.viteBin, '--port', String(port), '--strictPort', '--host', '127.0.0.1'],
                {
                    cwd: options.projectPath,
                    env: { ...process.env, ELECTRON_RUN_AS_NODE: '1', NODE_ENV: 'development' },
                    windowsHide: true,
                    stdio: ['ignore', 'pipe', 'pipe'],
                },
            );
        } catch (error: any) {
            this.releaseStartSlot();
            for (const files of written) {
                removeSessionEntry(files);
            }
            return {
                runtime: null,
                error: error?.message ?? 'Failed to start the preview server.',
                log: null,
            };
        }

        const runtime: RuntimeRecord = {
            key: { projectPath: options.projectPath, kind: options.kind },
            port,
            process: child,
            log: '',
            sessions: new Map(),
            lastUsedAt: Date.now(),
            idleTimer: null,
        };
        const appendLog = (data: Buffer) => {
            runtime.log = `${runtime.log}${data.toString()}`.slice(-8000);
        };
        child.stdout?.on('data', appendLog);
        child.stderr?.on('data', appendLog);

        const firstUrl = `http://127.0.0.1:${port}/${PREVIEW_DIR}/${safeEntryId(
            written[0]?.sessionId ?? 'index',
        )}/index.html`;
        const ready = await waitForServer(() => firstUrl, child);
        this.releaseStartSlot();

        if (!ready) {
            const error =
                child.exitCode === null ? 'Preview server timed out.' : 'Preview server exited.';
            const log = runtime.log || null;
            killProcess(child);
            for (const files of written) {
                removeSessionEntry(files);
            }
            return { runtime: null, error, log };
        }
        child.on('exit', () => {
            const current = this.runtimes.get(key);
            if (current === runtime) {
                this.runtimes.delete(key);
                if (runtime.idleTimer) {
                    clearTimeout(runtime.idleTimer);
                }
            }
        });

        this.runtimes.set(key, runtime);
        return { runtime, error: null, log: null };
    }

    private acquireStartSlot(): Promise<void> {
        if (this.startsInFlight < MAX_CONCURRENT_STARTS) {
            this.startsInFlight += 1;
            return Promise.resolve();
        }
        return new Promise((resolve) => {
            this.startWaiters.push(() => {
                this.startsInFlight += 1;
                resolve();
            });
        });
    }

    private releaseStartSlot(): void {
        this.startsInFlight = Math.max(0, this.startsInFlight - 1);
        const next = this.startWaiters.shift();
        if (next) {
            next();
        }
    }

    private touch(key: string, runtime: RuntimeRecord): void {
        if (runtime.idleTimer) {
            clearTimeout(runtime.idleTimer);
        }
        runtime.idleTimer = setTimeout(() => {
            const current = this.runtimes.get(key);
            if (current === runtime && Date.now() - runtime.lastUsedAt >= this.idleTimeoutMs) {
                this.forget(key, runtime, true);
            }
        }, this.idleTimeoutMs);
        // Timers keep a Node/Bun test process alive; the app's lifetime is the
        // process lifetime, so this only matters while testing.
        runtime.idleTimer.unref?.();
    }

    private forget(key: string, runtime: RuntimeRecord, cleanupFiles: boolean): void {
        if (runtime.idleTimer) {
            clearTimeout(runtime.idleTimer);
        }
        this.runtimes.delete(key);
        killProcess(runtime.process);
        if (cleanupFiles) {
            for (const files of runtime.sessions.values()) {
                removeSessionEntry(files);
            }
        }
    }

    /** Stops the runtime for one project kind and removes its session files. */
    stop(projectPath: string, kind: string): void {
        const key = runtimeKey(projectPath, kind);
        const runtime = this.runtimes.get(key);
        if (runtime) {
            this.forget(key, runtime, true);
        }
    }

    stopProject(projectPath: string): void {
        for (const [key, runtime] of [...this.runtimes.entries()]) {
            if (runtime.key.projectPath === path.resolve(projectPath)) {
                this.forget(key, runtime, true);
            }
        }
    }

    stopAll(): void {
        for (const [key, runtime] of [...this.runtimes.entries()]) {
            this.forget(key, runtime, true);
        }
    }

    /** Number of live servers. Exposed for tests and diagnostics. */
    get size(): number {
        return this.runtimes.size;
    }
}
