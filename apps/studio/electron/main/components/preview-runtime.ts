import { PREVIEW_MESSAGE_SOURCE } from '@kumite/models';
import type { ChildProcess } from 'child_process';
import crypto from 'node:crypto';
import fs from 'fs';
import path from 'path';
import { processLifecycle } from '../lifecycle/processes';
import { runtimeOwnerId } from '../lifecycle/ports';
import { startVitePreview } from '../lifecycle/vite';

export { advancePreviewState, parsePreviewMessage } from '@kumite/models';
export type { PreviewLifecycleState, PreviewMessage } from '@kumite/models';

/**
 * Shared preview runtime.
 *
 * A Vite dev server is one process per (project, preview kind). Every preview
 * that shares that server owns a session directory under
 * `__kumite_preview/<session id>/`. Sessions record which consumer owns them so
 * closing one project never kills a server another consumer still uses.
 */

export const PREVIEW_DIR = '__kumite_preview';
export const PREVIEW_MARKER = 'kumite-preview-session';
const SESSION_SOURCE_MARKER = '/* kumite-preview-session-source */';
const DEFAULT_IDLE_TIMEOUT_MS = 10 * 60_000;
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
    htmlHash: string;
    sourceHash: string;
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

interface RuntimeSession {
    files: PreviewSessionFiles;
    ownerId: string;
}

interface RuntimeRecord {
    key: RuntimeKey;
    resourceId: string;
    port: number;
    origin: string;
    process: ChildProcess;
    log: string;
    sessions: Map<string, RuntimeSession>;
    lastUsedAt: number;
    idleTimer: ReturnType<typeof setTimeout> | null;
}

interface PendingRequest {
    ownerId: string;
    generation: number;
}

interface PendingStart {
    key: string;
    resourceId: string;
    cancelled: boolean;
    child: ChildProcess | null;
    requests: Map<number, PendingRequest>;
    cancelPromise: Promise<void> | null;
}

export interface EnsureRuntimeOptions {
    projectPath: string;
    kind: string;
    /** The local Vite binary the project already has installed. */
    viteBin: string;
    /** Preferred port hint. Vite increments when it is taken. */
    basePort: number;
    entries: PreviewEntrySpec[];
    /** Consumer that owns the requested sessions. */
    ownerId: string;
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
    const source = `${SESSION_SOURCE_MARKER}\n${spec.source}`;
    fs.mkdirSync(directory, { recursive: true });

    if (fs.existsSync(htmlPath)) {
        const existing = fs.readFileSync(htmlPath, 'utf8');
        if (!existing.includes(PREVIEW_MARKER)) {
            throw new Error('Preview files already exist in this project.');
        }
        if (existing !== spec.html) {
            throw new Error(
                'Preview HTML changed since this session was created; refusing to overwrite it.',
            );
        }
    }
    if (fs.existsSync(sourcePath)) {
        const existing = fs.readFileSync(sourcePath, 'utf8');
        if (!existing.startsWith(SESSION_SOURCE_MARKER) || existing !== source) {
            throw new Error('Preview module already exists with different or user-owned content.');
        }
    }
    const created: string[] = [];
    try {
        if (!fs.existsSync(htmlPath)) {
            fs.writeFileSync(htmlPath, spec.html, { encoding: 'utf8', flag: 'wx' });
            created.push(htmlPath);
        }
        if (!fs.existsSync(sourcePath)) {
            fs.writeFileSync(sourcePath, source, { encoding: 'utf8', flag: 'wx' });
            created.push(sourcePath);
        }
    } catch (error) {
        for (const file of created) {
            try {
                fs.unlinkSync(file);
            } catch {
                // Preserve files that could not be verified for cleanup.
            }
        }
        throw error;
    }

    return {
        sessionId: spec.sessionId,
        entryId: spec.entryId,
        directory,
        htmlPath,
        sourcePath,
        urlPath: `/${PREVIEW_DIR}/${safeEntryId(spec.sessionId)}/index.html`,
        htmlHash: crypto.createHash('sha256').update(spec.html).digest('hex'),
        sourceHash: crypto.createHash('sha256').update(source).digest('hex'),
    };
}

function removeSessionEntry(files: PreviewSessionFiles): void {
    try {
        const html = fs.readFileSync(files.htmlPath, 'utf8');
        if (
            html.includes(PREVIEW_MARKER) &&
            crypto.createHash('sha256').update(html).digest('hex') === files.htmlHash
        ) {
            fs.unlinkSync(files.htmlPath);
        }
    } catch {
        // Missing or modified: preserve it.
    }
    try {
        const source = fs.readFileSync(files.sourcePath, 'utf8');
        if (
            source.startsWith(SESSION_SOURCE_MARKER) &&
            crypto.createHash('sha256').update(source).digest('hex') === files.sourceHash
        ) {
            fs.unlinkSync(files.sourcePath);
        }
    } catch {
        // Missing or modified: preserve it.
    }
    try {
        fs.rmdirSync(files.directory);
    } catch {
        // Unknown files keep the session directory in place.
    }
}

export class PreviewRuntimeManager {
    private runtimes = new Map<string, RuntimeRecord>();
    /** Per-key chains. Starting one server is serialized per project and kind. */
    private chains = new Map<string, Promise<void>>();
    private startsInFlight = 0;
    private startWaiters: Array<() => void> = [];
    private pending = new Map<string, PendingStart>();
    private ownerGenerations = new Map<string, number>();
    private requestId = 0;

    constructor(
        private options: {
            idleTimeoutMs?: number;
            startTimeoutMs?: number;
        } = {},
    ) {}

    private get idleTimeoutMs(): number {
        return this.options.idleTimeoutMs ?? DEFAULT_IDLE_TIMEOUT_MS;
    }

    private ownerGeneration(ownerId: string): number {
        return this.ownerGenerations.get(ownerId) ?? 0;
    }

    private isOwnerValid(ownerId: string, generation: number): boolean {
        return this.ownerGeneration(ownerId) === generation;
    }

    /**
     * Writes the entries, makes sure the project's server is running, and
     * returns the URL for every requested session. Concurrent requests for the
     * same project share one start.
     */
    async ensure(options: EnsureRuntimeOptions): Promise<EnsureRuntimeResult> {
        const key = runtimeKey(options.projectPath, options.kind);
        const generation = this.ownerGeneration(options.ownerId);
        const requestId = ++this.requestId;

        let pending = this.pending.get(key);
        if (!pending && !this.runtimes.has(key)) {
            pending = {
                key,
                resourceId: this.resourceId(key),
                cancelled: false,
                child: null,
                requests: new Map(),
                cancelPromise: null,
            };
            this.pending.set(key, pending);
        }
        pending?.requests.set(requestId, {
            ownerId: options.ownerId,
            generation,
        });

        // Batch A and batch B can arrive while one server is starting. Chain
        // them instead of merging their results, or B would be told about A's
        // entries only and never receive its own URLs.
        const previous = this.chains.get(key) ?? Promise.resolve();
        const task = previous
            .catch(() => undefined)
            .then(() => this.ensureInternal(options, key, generation, requestId, pending));
        this.chains.set(
            key,
            task.then(
                () => undefined,
                () => undefined,
            ),
        );
        return task;
    }

    private resourceId(key: string): string {
        return `catalog-preview:${key}`;
    }

    private async ensureInternal(
        options: EnsureRuntimeOptions,
        key: string,
        ownerGeneration: number,
        requestId: number,
        pending: PendingStart | undefined,
    ): Promise<EnsureRuntimeResult> {
        const cancelled = (): EnsureRuntimeResult => ({
            urls: {},
            error: 'Preview start was cancelled.',
            log: null,
        });

        if (!this.isOwnerValid(options.ownerId, ownerGeneration)) {
            this.dropRequest(pending, requestId);
            return cancelled();
        }

        const written: PreviewSessionFiles[] = [];
        try {
            for (const entry of options.entries) {
                written.push(writeSessionEntry(options.projectPath, entry));
            }
        } catch (error: any) {
            for (const files of written) {
                removeSessionEntry(files);
            }
            this.dropRequest(pending, requestId);
            return {
                urls: {},
                error: error?.message ?? 'Failed to write the preview entry.',
                log: null,
            };
        }

        let runtime = this.runtimes.get(key);
        if (runtime && runtime.process.exitCode !== null) {
            await this.forget(key, runtime, true);
            runtime = undefined;
        }

        if (!runtime) {
            if (!pending || pending.cancelled) {
                for (const files of written) {
                    removeSessionEntry(files);
                }
                return cancelled();
            }
            const started = await this.startRuntime(options, key, pending);
            if (started.error || !started.runtime) {
                for (const files of written) {
                    removeSessionEntry(files);
                }
                return {
                    urls: {},
                    error: started.error ?? 'Failed to start the preview server.',
                    log: started.log,
                };
            }
            runtime = started.runtime;
        }

        if (!this.isOwnerValid(options.ownerId, ownerGeneration) || pending?.cancelled === true) {
            this.dropRequest(pending, requestId);
            for (const files of written) {
                if (!runtime.sessions.has(files.sessionId)) {
                    removeSessionEntry(files);
                }
            }
            return cancelled();
        }

        runtime.lastUsedAt = Date.now();
        for (const files of written) {
            runtime.sessions.set(files.sessionId, { files, ownerId: options.ownerId });
        }
        this.touch(key, runtime);
        this.dropRequest(pending, requestId);

        return {
            urls: Object.fromEntries(
                written.map((files) => [files.sessionId, `${runtime!.origin}${files.urlPath}`]),
            ),
            error: null,
            log: null,
        };
    }

    private dropRequest(pending: PendingStart | undefined, requestId: number): void {
        if (!pending) {
            return;
        }
        pending.requests.delete(requestId);
        if (pending.requests.size === 0) {
            this.pending.delete(pending.key);
        }
    }

    private pendingIsValid(pending: PendingStart): boolean {
        if (pending.cancelled) {
            return false;
        }
        for (const request of pending.requests.values()) {
            if (this.isOwnerValid(request.ownerId, request.generation)) {
                return true;
            }
        }
        return false;
    }

    private async startRuntime(
        options: EnsureRuntimeOptions,
        key: string,
        pending: PendingStart,
    ): Promise<{ runtime: RuntimeRecord | null; error: string | null; log: string | null }> {
        await this.acquireStartSlot();
        const resourceId = pending.resourceId;
        const started = await startVitePreview({
            resourceId,
            projectPath: options.projectPath,
            viteBin: options.viteBin,
            preferredPort: options.basePort,
            ownerId: runtimeOwnerId(options.projectPath, options.kind),
            ownerScope: 'shared',
            type: 'catalog-preview',
            startTimeoutMs: this.options.startTimeoutMs,
            isValid: () => this.pending.get(key) === pending && this.pendingIsValid(pending),
        });
        this.releaseStartSlot();

        if (!started.server) {
            if (!this.pendingIsValid(pending)) {
                this.pending.delete(key);
            }
            return { runtime: null, error: started.error, log: started.log };
        }

        pending.child = started.server.process;
        if (!this.pendingIsValid(pending)) {
            await processLifecycle.stop(resourceId);
            this.pending.delete(key);
            return { runtime: null, error: 'Preview start was cancelled.', log: started.log };
        }

        const runtime: RuntimeRecord = {
            key: { projectPath: options.projectPath, kind: options.kind },
            resourceId,
            port: started.server.port,
            origin: started.server.origin,
            process: started.server.process,
            log: started.server.log,
            sessions: new Map(),
            lastUsedAt: Date.now(),
            idleTimer: null,
        };
        runtime.process.on('exit', () => {
            const current = this.runtimes.get(key);
            if (current === runtime) {
                this.runtimes.delete(key);
                if (runtime.idleTimer) {
                    clearTimeout(runtime.idleTimer);
                }
                for (const session of runtime.sessions.values()) {
                    removeSessionEntry(session.files);
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
                void this.forget(key, runtime, true);
            }
        }, this.idleTimeoutMs);
        // Timers keep a Node/Bun test process alive; the app's lifetime is the
        // process lifetime, so this only matters while testing.
        runtime.idleTimer.unref?.();
    }

    private async forget(
        key: string,
        runtime: RuntimeRecord,
        cleanupFiles: boolean,
    ): Promise<void> {
        if (runtime.idleTimer) {
            clearTimeout(runtime.idleTimer);
        }
        if (this.runtimes.get(key) === runtime) {
            this.runtimes.delete(key);
        }
        if (!(await processLifecycle.stop(runtime.resourceId))) {
            // Keep the generated session files while the server may still read them.
            throw new Error(`The preview server for ${key} did not exit.`);
        }
        if (cleanupFiles) {
            for (const session of runtime.sessions.values()) {
                removeSessionEntry(session.files);
            }
        }
    }

    /** Releases every session owned by a consumer without killing shared users. */
    async releaseOwner(ownerId: string): Promise<void> {
        this.ownerGenerations.set(ownerId, this.ownerGeneration(ownerId) + 1);

        for (const [key, runtime] of [...this.runtimes.entries()]) {
            for (const [sessionId, session] of [...runtime.sessions.entries()]) {
                if (session.ownerId === ownerId) {
                    runtime.sessions.delete(sessionId);
                    removeSessionEntry(session.files);
                }
            }
            if (runtime.sessions.size === 0) {
                await this.forget(key, runtime, true);
            } else {
                this.touch(key, runtime);
            }
        }

        for (const [key, pending] of [...this.pending.entries()]) {
            for (const [requestId, request] of [...pending.requests.entries()]) {
                if (request.ownerId === ownerId) {
                    pending.requests.delete(requestId);
                }
            }
            if (pending.requests.size === 0) {
                await this.cancelPending(key, pending);
            }
        }
    }

    private async cancelPending(key: string, pending: PendingStart): Promise<void> {
        if (pending.cancelPromise) {
            return pending.cancelPromise;
        }
        pending.cancelled = true;
        this.pending.delete(key);
        pending.cancelPromise = (async () => {
            if (pending.child && !(await processLifecycle.stop(pending.resourceId))) {
                throw new Error(`The pending preview server for ${key} did not exit.`);
            }
        })();
        await pending.cancelPromise;
    }

    /** Stops the runtime for one project kind and removes its session files. */
    async stop(projectPath: string, kind: string): Promise<void> {
        const key = runtimeKey(projectPath, kind);
        const pending = this.pending.get(key);
        if (pending) {
            await this.cancelPending(key, pending);
        }
        const runtime = this.runtimes.get(key);
        if (runtime) {
            await this.forget(key, runtime, true);
        }
    }

    async stopProject(projectPath: string): Promise<void> {
        const resolved = path.resolve(projectPath);
        for (const [key, runtime] of [...this.runtimes.entries()]) {
            if (runtime.key.projectPath === resolved) {
                await this.forget(key, runtime, true);
            }
        }
        for (const [key, pending] of [...this.pending.entries()]) {
            if (key.startsWith(`${resolved}::`)) {
                await this.cancelPending(key, pending);
            }
        }
    }

    async stopAll(): Promise<void> {
        const failures: string[] = [];
        for (const pending of [...this.pending.values()]) {
            try {
                await this.cancelPending(pending.key, pending);
            } catch (error: any) {
                failures.push(error?.message ?? String(error));
            }
        }
        for (const [key, runtime] of [...this.runtimes.entries()]) {
            try {
                await this.forget(key, runtime, true);
            } catch (error: any) {
                failures.push(error?.message ?? String(error));
            }
        }
        if (failures.length > 0) {
            throw new Error(failures.join(' '));
        }
    }

    /** Number of live servers. Exposed for tests and diagnostics. */
    get size(): number {
        return this.runtimes.size;
    }

    get pendingCount(): number {
        return this.pending.size;
    }
}
