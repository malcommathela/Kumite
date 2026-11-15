/**
 * Serial install queue for the shadcn CLI.
 *
 * Every install writes into the same project (`node_modules`, `components.json`,
 * the ui directory), so two installs must never overlap. The queue also
 * deduplicates a component that is requested twice while it is already running:
 * the library asks for previews as cards scroll, and a fast scroll can enqueue
 * the same item twice before the first finishes.
 */

export class InstallCancelledError extends Error {
    constructor(key: string) {
        super(`The queued install for ${key} was cancelled.`);
        this.name = 'InstallCancelledError';
    }
}

export function isInstallCancelled(error: unknown): error is InstallCancelledError {
    return error instanceof InstallCancelledError;
}

export class SerialInstallQueue {
    private tail: Promise<unknown> = Promise.resolve();
    private queued = new Map<string, Promise<unknown>>();
    private started = new Set<string>();
    private cancelled = new Set<string>();

    /** Runs `task` after every earlier task settles. Identical keys dedupe. */
    enqueue<T>(key: string, task: () => Promise<T>): Promise<T> {
        const existing = this.queued.get(key);
        if (existing) {
            return existing as Promise<T>;
        }

        const run = this.tail.then(async () => {
            if (this.cancelled.delete(key)) {
                throw new InstallCancelledError(key);
            }
            this.started.add(key);
            try {
                return await task();
            } finally {
                this.started.delete(key);
                this.queued.delete(key);
            }
        });

        this.queued.set(key, run);
        this.tail = run.then(
            () => undefined,
            () => undefined,
        );
        return run;
    }

    /**
     * Cancels a task that has not started yet. A running install cannot be
     * cancelled because it is already writing to the project.
     */
    cancel(key: string): boolean {
        const queued = this.queued.has(key);
        if (!queued || this.started.has(key)) {
            return false;
        }
        this.cancelled.add(key);
        return true;
    }

    get pending(): number {
        return this.queued.size;
    }
}

/**
 * One queue for the whole main process. Project installs and catalog preview
 * installs both write package state, and running two package managers at once
 * is what corrupts a lockfile. Keys include the target root, so unrelated
 * targets still dedupe correctly.
 */
export const sharedInstallQueue = new SerialInstallQueue();

export interface RetryOptions {
    /** Total attempts, including the first one. Defaults to 3. */
    attempts?: number;
    baseDelayMs?: number;
    maxDelayMs?: number;
    random?: () => number;
    sleep?: (ms: number) => Promise<void>;
}

const NETWORK_FAILURE_PATTERN =
    /\b(ENOTFOUND|EAI_AGAIN|ECONNRESET|ECONNREFUSED|ETIMEDOUT|EPIPE|network|fetch failed|socket hang up|request to .* failed|503|502|504|temporary failure)\b/i;

/**
 * True only for failures that a second attempt can actually fix. A registry
 * 404 or a bad component name must not be retried.
 */
export function isTransientNetworkFailure(output: string | null | undefined): boolean {
    if (!output) {
        return false;
    }
    return NETWORK_FAILURE_PATTERN.test(output);
}

export function retryDelay(
    attempt: number,
    options: Required<Pick<RetryOptions, 'baseDelayMs' | 'maxDelayMs' | 'random'>>,
): number {
    const exponential = Math.min(
        options.maxDelayMs,
        options.baseDelayMs * Math.pow(2, Math.max(0, attempt - 1)),
    );
    // Jitter keeps several projects from retrying in lockstep after a registry
    // outage, while never exceeding the cap.
    return Math.round(exponential * (0.5 + options.random() * 0.5));
}

/**
 * Retries a task when `shouldRetry` marks its result as a transient failure.
 * The delay is bounded and jittered, and the final result is returned as-is so
 * the caller can show the real CLI output.
 */
export async function withTransientRetry<T>(
    task: (attempt: number) => Promise<T>,
    shouldRetry: (result: T) => boolean,
    options: RetryOptions = {},
): Promise<T> {
    const attempts = Math.max(1, options.attempts ?? 3);
    const resolved = {
        baseDelayMs: options.baseDelayMs ?? 750,
        maxDelayMs: options.maxDelayMs ?? 6000,
        random: options.random ?? Math.random,
    };
    const sleep = options.sleep ?? ((ms: number) => new Promise<void>((r) => setTimeout(r, ms)));

    let last: T | undefined;
    for (let attempt = 1; attempt <= attempts; attempt += 1) {
        last = await task(attempt);
        if (!shouldRetry(last) || attempt === attempts) {
            return last;
        }
        await sleep(retryDelay(attempt, resolved));
    }
    return last as T;
}
