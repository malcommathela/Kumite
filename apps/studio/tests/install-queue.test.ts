import {
    InstallCancelledError,
    SerialInstallQueue,
    isInstallCancelled,
    isTransientNetworkFailure,
    retryDelay,
    withTransientRetry,
} from '../electron/main/components/install-queue';
import { describe, expect, it } from 'bun:test';

function deferred<T>() {
    let resolve!: (value: T) => void;
    let reject!: (error: unknown) => void;
    const promise = new Promise<T>((res, rej) => {
        resolve = res;
        reject = rej;
    });
    return { promise, resolve, reject };
}

describe('SerialInstallQueue', () => {
    it('runs tasks one at a time in enqueue order', async () => {
        const queue = new SerialInstallQueue();
        const events: string[] = [];
        const gate = deferred<void>();

        const first = queue.enqueue('first', async () => {
            events.push('first:start');
            await gate.promise;
            events.push('first:end');
        });
        const second = queue.enqueue('second', async () => {
            events.push('second:start');
        });

        await Promise.resolve();
        expect(events).toEqual(['first:start']);

        gate.resolve();
        await Promise.all([first, second]);
        expect(events).toEqual(['first:start', 'first:end', 'second:start']);
    });

    it('deduplicates a key that is already queued', async () => {
        const queue = new SerialInstallQueue();
        let runs = 0;
        const gate = deferred<void>();

        const first = queue.enqueue('same', async () => {
            runs += 1;
            await gate.promise;
            return 'done';
        });
        const second = queue.enqueue('same', async () => {
            runs += 1;
            return 'other';
        });

        gate.resolve();
        expect(await Promise.all([first, second])).toEqual(['done', 'done']);
        expect(runs).toBe(1);
    });

    it('cancels a queued task before it starts', async () => {
        const queue = new SerialInstallQueue();
        const gate = deferred<void>();
        const first = queue.enqueue('first', () => gate.promise);
        const second = queue.enqueue('second', async () => 'never');

        expect(queue.cancel('second')).toBe(true);

        gate.resolve();
        await first;
        let error: unknown;
        try {
            await second;
        } catch (caught) {
            error = caught;
        }
        expect(isInstallCancelled(error)).toBe(true);
        expect(error).toBeInstanceOf(InstallCancelledError);
    });

    it('does not cancel a task that is already running', async () => {
        const queue = new SerialInstallQueue();
        const started = deferred<void>();
        const gate = deferred<void>();

        const running = queue.enqueue('running', async () => {
            started.resolve();
            await gate.promise;
        });
        await started.promise;

        expect(queue.cancel('running')).toBe(false);
        gate.resolve();
        await running;
    });

    it('allows a cancelled or finished key to be enqueued again', async () => {
        const queue = new SerialInstallQueue();
        await queue.enqueue('key', async () => 1);
        expect(await queue.enqueue('key', async () => 2)).toBe(2);
    });
});

describe('transient network detection', () => {
    it('accepts registry and socket failures', () => {
        expect(isTransientNetworkFailure('fetch failed with ECONNRESET')).toBe(true);
        expect(isTransientNetworkFailure('registry returned 503')).toBe(true);
        expect(isTransientNetworkFailure('socket hang up')).toBe(true);
    });

    it('rejects permanent failures', () => {
        expect(isTransientNetworkFailure('404 Not Found')).toBe(false);
        expect(isTransientNetworkFailure('component not found')).toBe(false);
        expect(isTransientNetworkFailure('')).toBe(false);
    });
});

describe('retryDelay', () => {
    it('grows exponentially and respects the cap', () => {
        const options = { baseDelayMs: 1000, maxDelayMs: 3000, random: () => 1 };
        expect(retryDelay(1, options)).toBe(1000);
        expect(retryDelay(2, options)).toBe(2000);
        expect(retryDelay(3, options)).toBe(3000);
        expect(retryDelay(10, options)).toBe(3000);
    });

    it('never exceeds the cap with jitter and never goes negative', () => {
        const options = { baseDelayMs: 1000, maxDelayMs: 2000, random: () => 0 };
        expect(retryDelay(1, options)).toBe(500);
        expect(retryDelay(4, options)).toBe(1000);
    });
});

describe('withTransientRetry', () => {
    it('retries a transient result and returns the success', async () => {
        const attempts: number[] = [];
        const delays: number[] = [];
        const result = await withTransientRetry(
            async (attempt) => {
                attempts.push(attempt);
                return attempt < 3 ? 'ECONNRESET' : 'ok';
            },
            (value) => value !== 'ok',
            {
                attempts: 3,
                random: () => 1,
                sleep: async (ms) => {
                    delays.push(ms);
                },
            },
        );

        expect(result).toBe('ok');
        expect(attempts).toEqual([1, 2, 3]);
        expect(delays).toHaveLength(2);
    });

    it('does not retry a permanent failure', async () => {
        let calls = 0;
        const result = await withTransientRetry(
            async () => {
                calls += 1;
                return '404';
            },
            () => false,
            { attempts: 3, sleep: async () => {} },
        );
        expect(result).toBe('404');
        expect(calls).toBe(1);
    });
});
