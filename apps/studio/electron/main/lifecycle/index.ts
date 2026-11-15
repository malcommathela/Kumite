import { catalogPreviewServer, componentPreviewServer } from '../components/preview';
import runManager from '../run';
import { processLifecycle } from './processes';
import { ProjectLifecycleState, projectLifecycle } from './state';

export interface CloseProjectResult {
    success: boolean;
    errors: string[];
}

const closeTasks = new Map<string, Promise<CloseProjectResult>>();
const completedCloses = new Map<string, { generation: number; result: CloseProjectResult }>();

async function collect(
    label: string,
    work: () => Promise<unknown>,
    errors: string[],
): Promise<void> {
    try {
        await work();
    } catch (error: any) {
        const message = `${label}: ${error?.message ?? String(error)}`;
        console.error('[lifecycle] cleanup failed', message);
        errors.push(message);
    }
}

/** Like `collect`, but a resource that reports it did not stop counts as a failure. */
async function collectResult(
    label: string,
    work: () => Promise<boolean>,
    errors: string[],
): Promise<void> {
    await collect(
        label,
        async () => {
            if (!(await work())) {
                throw new Error('the resource did not stop');
            }
        },
        errors,
    );
}

async function runClose(projectId: string): Promise<CloseProjectResult> {
    const record = projectLifecycle.beginClose(projectId);
    if (!record) {
        return { success: true, errors: [] };
    }
    const generation = record.generation;
    console.info(
        `[lifecycle] closing project=${projectId} path=${record.folderPath} generation=${generation}`,
    );

    const errors: string[] = [];
    await collectResult(
        'development server',
        () => runManager.stopProject(projectId, record.folderPath),
        errors,
    );
    await collect(
        'component preview',
        () => componentPreviewServer.stopProject(record.folderPath),
        errors,
    );
    await collect(
        'catalog preview sessions',
        () => catalogPreviewServer.releaseProject(projectId),
        errors,
    );

    const failed = errors.length > 0;
    projectLifecycle.completeClose(record, failed);
    const result = { success: !failed, errors };
    if (failed) {
        console.error(
            `[lifecycle] project=${projectId} close completed with ${errors.length} error(s)`,
        );
    } else {
        console.info(`[lifecycle] project=${projectId} closed`);
    }
    return result;
}

/**
 * The single close operation for every project entry point: close, switch,
 * delete and application shutdown. Concurrent callers share one cleanup.
 */
export async function closeProjectResources(
    projectId: string,
    folderPath: string,
): Promise<CloseProjectResult> {
    projectLifecycle.ensure(projectId, folderPath);
    const record = projectLifecycle.get(projectId)!;
    const completed = completedCloses.get(projectId);
    if (
        record.state === ProjectLifecycleState.CLOSED &&
        completed &&
        completed.generation === record.generation
    ) {
        return completed.result;
    }

    const inProgress = closeTasks.get(projectId);
    if (inProgress) {
        return inProgress;
    }
    const task = runClose(projectId)
        .then((result) => {
            if (result.success) {
                completedCloses.set(projectId, {
                    generation: record.generation,
                    result,
                });
            } else {
                completedCloses.delete(projectId);
            }
            return result;
        })
        .finally(() => closeTasks.delete(projectId));
    closeTasks.set(projectId, task);
    return task;
}

/** Stops every managed project and shared runtime before Electron exits. */
export async function shutdownResources(): Promise<CloseProjectResult> {
    projectLifecycle.setShuttingDown(true);
    const errors: string[] = [];
    for (const record of projectLifecycle.active()) {
        const result = await closeProjectResources(record.id, record.folderPath);
        errors.push(...result.errors);
    }
    await collect('component preview', () => componentPreviewServer.stop(), errors);
    await collect('catalog preview', () => catalogPreviewServer.stop(), errors);
    await collect(
        'managed processes',
        async () => {
            const failures = await processLifecycle.stopAll();
            if (failures.length > 0) {
                throw new Error(`did not exit: ${failures.join(', ')}`);
            }
        },
        errors,
    );
    const result = { success: errors.length === 0, errors };
    if (result.success) {
        console.info('[lifecycle] application shutdown cleanup complete');
    } else {
        console.error('[lifecycle] application shutdown cleanup had failures', errors);
    }
    return result;
}

export { projectLifecycle } from './state';
export { processLifecycle } from './processes';
export { portRegistry } from './ports';
