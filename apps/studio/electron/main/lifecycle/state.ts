import path from 'path';

export enum ProjectLifecycleState {
    OPENING = 'OPENING',
    ACTIVE = 'ACTIVE',
    CLOSING = 'CLOSING',
    CLOSED = 'CLOSED',
    FAILED = 'FAILED',
}

export interface ProjectLifecycleRecord {
    id: string;
    folderPath: string;
    state: ProjectLifecycleState;
    /** Bumped whenever the project opens or starts closing. */
    generation: number;
}

function normalizePath(folderPath: string): string {
    return path.resolve(folderPath);
}

/**
 * Tracks whether a project may still create resources.
 *
 * Every async startup captures the generation it began under. If the project
 * closes meanwhile the generation changes, so the startup can terminate the
 * process it created instead of resurrecting a closed project.
 */
class ProjectLifecycleRegistry {
    private records = new Map<string, ProjectLifecycleRecord>();
    private paths = new Map<string, string>();
    private shuttingDown = false;

    ensure(id: string, folderPath: string): ProjectLifecycleRecord {
        const resolvedPath = normalizePath(folderPath);
        const existing = this.records.get(id);
        if (existing) {
            existing.folderPath = resolvedPath;
            this.paths.set(resolvedPath, id);
            return existing;
        }
        const record: ProjectLifecycleRecord = {
            id,
            folderPath: resolvedPath,
            state: ProjectLifecycleState.ACTIVE,
            generation: 1,
        };
        this.records.set(id, record);
        this.paths.set(resolvedPath, id);
        return record;
    }

    activate(id: string, folderPath: string): ProjectLifecycleRecord {
        if (this.shuttingDown) {
            throw new Error('Kumite is shutting down.');
        }
        const record = this.ensure(id, folderPath);
        if (record.state !== ProjectLifecycleState.ACTIVE) {
            record.generation += 1;
            record.state = ProjectLifecycleState.ACTIVE;
        }
        return record;
    }

    resolve(idOrPath: string): ProjectLifecycleRecord | undefined {
        return (
            this.records.get(idOrPath) ??
            this.records.get(this.paths.get(normalizePath(idOrPath)) ?? '')
        );
    }

    get(id: string): ProjectLifecycleRecord | undefined {
        return this.records.get(id);
    }

    generation(idOrPath: string): number {
        return this.resolve(idOrPath)?.generation ?? 0;
    }

    state(idOrPath: string): ProjectLifecycleState | null {
        return this.resolve(idOrPath)?.state ?? null;
    }

    isOpen(idOrPath: string): boolean {
        const record = this.resolve(idOrPath);
        return (
            !this.shuttingDown &&
            record !== undefined &&
            (record.state === ProjectLifecycleState.ACTIVE ||
                record.state === ProjectLifecycleState.OPENING)
        );
    }

    assertCanStart(id: string, folderPath: string): ProjectLifecycleRecord {
        if (this.shuttingDown) {
            throw new Error('Kumite is shutting down.');
        }
        const record = this.ensure(id, folderPath);
        if (record.state === ProjectLifecycleState.CLOSING) {
            throw new Error('The project is closing.');
        }
        if (record.state === ProjectLifecycleState.CLOSED) {
            throw new Error('The project is closed.');
        }
        return record;
    }

    beginClose(idOrPath: string): ProjectLifecycleRecord | undefined {
        const record = this.resolve(idOrPath);
        if (!record) {
            return undefined;
        }
        if (
            record.state === ProjectLifecycleState.CLOSING ||
            record.state === ProjectLifecycleState.CLOSED
        ) {
            return record;
        }
        record.state = ProjectLifecycleState.CLOSING;
        record.generation += 1;
        return record;
    }

    completeClose(record: ProjectLifecycleRecord, failed: boolean): void {
        record.state = failed ? ProjectLifecycleState.FAILED : ProjectLifecycleState.CLOSED;
    }

    setShuttingDown(value: boolean): void {
        this.shuttingDown = value;
    }

    get isShuttingDown(): boolean {
        return this.shuttingDown;
    }

    list(): ProjectLifecycleRecord[] {
        return [...this.records.values()];
    }

    active(): ProjectLifecycleRecord[] {
        return this.list().filter(
            (record) =>
                record.state === ProjectLifecycleState.ACTIVE ||
                record.state === ProjectLifecycleState.OPENING ||
                record.state === ProjectLifecycleState.FAILED,
        );
    }

    /** Test helper. */
    clear(): void {
        this.records.clear();
        this.paths.clear();
        this.shuttingDown = false;
    }
}

export const projectLifecycle = new ProjectLifecycleRegistry();
