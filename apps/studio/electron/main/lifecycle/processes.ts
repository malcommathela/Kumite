import type { ChildProcess } from 'child_process';
import { spawn } from 'child_process';
import os from 'os';
import { portRegistry, type PortOwnerScope } from './ports';

export type ManagedProcessType =
    'terminal' | 'development-server' | 'component-preview' | 'catalog-preview' | 'command';

export type ManagedProcessState = 'running' | 'stopping' | 'exited' | 'failed';

export interface PtyHandle {
    pid: number;
    exitCode?: number;
    kill(): void;
    onExit(listener: (event: { exitCode: number; signal?: number }) => void): {
        dispose(): void;
    } | void;
}

export interface ExitInfo {
    code: number | null;
    signal: string | null;
    error: string | null;
}

export interface ManagedProcessRecord {
    resourceId: string;
    ownerId: string;
    ownerScope: PortOwnerScope;
    projectId: string | null;
    type: ManagedProcessType;
    pid: number | null;
    platform: NodeJS.Platform;
    startedAt: number;
    state: ManagedProcessState;
    port: number | null;
    host: string | null;
    child: ChildProcess | null;
    pty: PtyHandle | null;
    exitCode: number | null;
    signal: string | null;
    error: string | null;
    endedAt: number | null;
}

const DEFAULT_STOP_TIMEOUT_MS = 5000;
const GRACE_MS = 1500;

function delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

function isExited(record: ManagedProcessRecord): boolean {
    if (record.state === 'exited') {
        return true;
    }
    if (record.child) {
        return record.child.exitCode !== null || record.child.signalCode !== null;
    }
    return record.exitCode !== null && record.exitCode !== undefined;
}

function runTaskkill(pid: number): Promise<void> {
    return new Promise((resolve) => {
        let settled = false;
        const done = () => {
            if (!settled) {
                settled = true;
                resolve();
            }
        };
        const taskkill = spawn('taskkill', ['/pid', String(pid), '/T', '/F'], {
            windowsHide: true,
            stdio: 'ignore',
        });
        taskkill.on('error', done);
        taskkill.on('exit', done);
        // taskkill is itself bounded; never let a hung helper block cleanup.
        const timer = setTimeout(done, 5000);
        timer.unref?.();
    });
}

function signalTree(pid: number, signal: NodeJS.Signals): void {
    try {
        // Kumite starts POSIX children detached so the whole group can be reached.
        process.kill(-pid, signal);
    } catch {
        try {
            process.kill(pid, signal);
        } catch {
            // Already gone.
        }
    }
}

class ProcessLifecycleManager {
    private records = new Map<string, ManagedProcessRecord>();
    private exitSignals = new Map<string, Promise<ExitInfo>>();
    private resolveExit = new Map<string, (info: ExitInfo) => void>();
    private stopping = new Map<string, Promise<boolean>>();

    register(input: {
        resourceId: string;
        ownerId: string;
        ownerScope: PortOwnerScope;
        projectId?: string | null;
        type: ManagedProcessType;
        child?: ChildProcess | null;
        pty?: PtyHandle | null;
    }): ManagedProcessRecord {
        const existing = this.records.get(input.resourceId);
        if (existing && existing.state === 'running') {
            return existing;
        }

        const record: ManagedProcessRecord = {
            resourceId: input.resourceId,
            ownerId: input.ownerId,
            ownerScope: input.ownerScope,
            projectId: input.projectId ?? null,
            type: input.type,
            pid: input.child?.pid ?? input.pty?.pid ?? null,
            platform: os.platform(),
            startedAt: Date.now(),
            state: 'running',
            port: null,
            host: null,
            child: input.child ?? null,
            pty: input.pty ?? null,
            exitCode: null,
            signal: null,
            error: null,
            endedAt: null,
        };

        this.records.set(record.resourceId, record);
        this.exitSignals.set(
            record.resourceId,
            new Promise((resolve) => this.resolveExit.set(record.resourceId, resolve)),
        );

        if (input.child) {
            input.child.once('exit', (code, signal) => this.handleExit(record, code, signal, null));
            input.child.once('error', (error) => {
                record.error = error.message;
                // A failed spawn never produced a pid; there is nothing left to kill.
                if (!record.pid) {
                    this.handleExit(record, null, null, error.message);
                }
            });
        }
        if (input.pty) {
            input.pty.onExit(({ exitCode, signal }) =>
                this.handleExit(record, exitCode ?? 0, signal ? String(signal) : null, null),
            );
        }

        if (isExited(record)) {
            this.handleExit(record, record.child?.exitCode ?? null, null, null);
        }

        return record;
    }

    private handleExit(
        record: ManagedProcessRecord,
        code: number | null,
        signal: string | null,
        error: string | null,
    ): void {
        if (record.state === 'exited') {
            return;
        }
        const failed = error !== null;
        record.exitCode = code;
        record.signal = signal;
        record.error = error;
        record.endedAt = Date.now();
        record.state = failed ? 'failed' : 'exited';
        const released = portRegistry.release(record.resourceId);
        if (released.length > 0) {
            console.info(
                `[lifecycle] released port ${released.map((item) => item.port).join(', ')} for ${record.resourceId}`,
            );
        }
        this.resolveExit.get(record.resourceId)?.({ code, signal, error });
        this.resolveExit.delete(record.resourceId);
        this.exitSignals.delete(record.resourceId);
        if (!failed) {
            this.records.delete(record.resourceId);
        }
        console.info(
            `[lifecycle] process exited resource=${record.resourceId} pid=${record.pid ?? 'n/a'} code=${code ?? 'n/a'} signal=${signal ?? 'n/a'}`,
        );
    }

    get(resourceId: string): ManagedProcessRecord | undefined {
        return this.records.get(resourceId);
    }

    list(): ManagedProcessRecord[] {
        return [...this.records.values()];
    }

    /** Associates the actual bound port with a live managed process. */
    setPort(resourceId: string, port: number, host = '127.0.0.1'): boolean {
        const record = this.records.get(resourceId);
        if (!record || record.state !== 'running') {
            return false;
        }
        record.port = port;
        record.host = host;
        portRegistry.allocate({
            resourceId,
            ownerId: record.ownerId,
            ownerScope: record.ownerScope,
            projectId: record.projectId,
            port,
            host,
            pid: record.pid,
            processType: record.type,
        });
        console.info(
            `[lifecycle] port ${port} assigned resource=${resourceId} owner=${record.ownerId}`,
        );
        return true;
    }

    private waitForExit(record: ManagedProcessRecord, timeoutMs: number): Promise<boolean> {
        if (record.state === 'exited') {
            return Promise.resolve(true);
        }
        const signal = this.exitSignals.get(record.resourceId);
        if (!signal) {
            return Promise.resolve(isExited(record));
        }
        return Promise.race([signal.then(() => true), delay(timeoutMs).then(() => false)]);
    }

    async stop(resourceId: string, timeoutMs = DEFAULT_STOP_TIMEOUT_MS): Promise<boolean> {
        const record = this.records.get(resourceId);
        if (!record) {
            return true;
        }
        if (record.state === 'exited') {
            this.records.delete(resourceId);
            return true;
        }
        const inProgress = this.stopping.get(resourceId);
        if (inProgress) {
            return inProgress;
        }
        const stop = this.terminate(record, timeoutMs).finally(() => {
            this.stopping.delete(resourceId);
        });
        this.stopping.set(resourceId, stop);
        return stop;
    }

    private async terminate(record: ManagedProcessRecord, timeoutMs: number): Promise<boolean> {
        record.state = 'stopping';
        console.info(
            `[lifecycle] stopping resource=${record.resourceId} pid=${record.pid ?? 'n/a'}`,
        );
        const pid = record.pid;

        if (record.platform === 'win32') {
            if (record.pty) {
                try {
                    record.pty.kill();
                } catch {
                    // PTY may already be gone.
                }
            }
            if (pid) {
                await runTaskkill(pid);
            }
        } else {
            if (record.child) {
                if (pid) {
                    signalTree(pid, 'SIGTERM');
                } else {
                    record.child.kill('SIGTERM');
                }
            }
            if (record.pty) {
                try {
                    record.pty.kill();
                } catch {
                    // PTY may already be gone.
                }
            }
            if (pid && !(await this.waitForExit(record, GRACE_MS))) {
                signalTree(pid, 'SIGKILL');
            }
        }

        const exited = await this.waitForExit(record, timeoutMs);
        if (!exited) {
            record.state = 'failed';
            record.error = `Process did not exit within ${timeoutMs}ms.`;
            console.error(
                `[lifecycle] cleanup timeout resource=${record.resourceId} pid=${pid ?? 'n/a'}`,
            );
            return false;
        }
        // If exit was observed without the event callback running, record it.
        this.handleExit(record, record.child?.exitCode ?? record.exitCode, null, null);
        return true;
    }

    async stopOwner(ownerId: string, timeoutMs = DEFAULT_STOP_TIMEOUT_MS): Promise<string[]> {
        const failures: string[] = [];
        const owned = this.list().filter((record) => record.ownerId === ownerId);
        await Promise.all(
            owned.map(async (record) => {
                const stopped = await this.stop(record.resourceId, timeoutMs);
                if (!stopped) {
                    failures.push(record.resourceId);
                }
            }),
        );
        return failures;
    }

    async stopAll(timeoutMs = DEFAULT_STOP_TIMEOUT_MS): Promise<string[]> {
        const failures: string[] = [];
        const records = this.list();
        await Promise.all(
            records.map(async (record) => {
                const stopped = await this.stop(record.resourceId, timeoutMs);
                if (!stopped) {
                    failures.push(record.resourceId);
                }
            }),
        );
        return failures;
    }

    get size(): number {
        return this.records.size;
    }
}

export const processLifecycle = new ProcessLifecycleManager();
