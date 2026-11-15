import path from 'path';

export type PortOwnerScope = 'project' | 'shared';

export interface PortAllocation {
    /** Resource that owns the listening socket. */
    resourceId: string;
    ownerId: string;
    ownerScope: PortOwnerScope;
    projectId: string | null;
    port: number;
    host: string;
    pid: number | null;
    processType: string;
    allocatedAt: number;
}

/**
 * Tracks the ports Kumite-managed runtimes are actually listening on.
 *
 * This is not an operating-system port authority: it only answers "does Kumite
 * own a running resource on this port?". A port is registered once the server
 * has reported its real bind, and released when that process has exited.
 */
class PortRegistry {
    private allocations = new Map<string, PortAllocation>();

    allocate(input: {
        resourceId: string;
        ownerId: string;
        ownerScope: PortOwnerScope;
        projectId?: string | null;
        port: number;
        host?: string;
        pid?: number | null;
        processType: string;
    }): PortAllocation {
        const allocation: PortAllocation = {
            resourceId: input.resourceId,
            ownerId: input.ownerId,
            ownerScope: input.ownerScope,
            projectId: input.projectId ?? null,
            port: input.port,
            host: input.host ?? '127.0.0.1',
            pid: input.pid ?? null,
            processType: input.processType,
            allocatedAt: Date.now(),
        };
        this.allocations.set(input.resourceId, allocation);
        return allocation;
    }

    /** Replaces the allocation for a resource after its server reports a bind. */
    setPort(
        resourceId: string,
        port: number,
        host = '127.0.0.1',
        pid: number | null = null,
    ): PortAllocation | null {
        const existing = this.allocations.get(resourceId);
        if (!existing) {
            return null;
        }
        existing.port = port;
        existing.host = host;
        existing.pid = pid ?? existing.pid;
        return existing;
    }

    release(resourceId: string): PortAllocation[] {
        const released: PortAllocation[] = [];
        for (const [id, allocation] of this.allocations) {
            if (id === resourceId) {
                this.allocations.delete(id);
                released.push(allocation);
            }
        }
        return released;
    }

    releaseOwner(ownerId: string): PortAllocation[] {
        const released: PortAllocation[] = [];
        for (const [id, allocation] of this.allocations) {
            if (allocation.ownerId === ownerId) {
                this.allocations.delete(id);
                released.push(allocation);
            }
        }
        return released;
    }

    getByPort(port: number): PortAllocation[] {
        return [...this.allocations.values()].filter((allocation) => allocation.port === port);
    }

    get(resourceId: string): PortAllocation | undefined {
        return this.allocations.get(resourceId);
    }

    isOwned(port: number): boolean {
        return this.getByPort(port).length > 0;
    }

    list(): PortAllocation[] {
        return [...this.allocations.values()];
    }

    /** Test/diagnostic helper. Never called while resources are live. */
    clear(): void {
        this.allocations.clear();
    }
}

export const portRegistry = new PortRegistry();

export function projectOwnerId(projectId: string): string {
    return `project:${projectId}`;
}

export function runtimeOwnerId(projectPath: string, kind: string): string {
    return `runtime:${path.resolve(projectPath)}::${kind}`;
}
