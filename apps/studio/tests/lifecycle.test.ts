import { afterAll, describe, expect, it } from 'bun:test';
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import net from 'node:net';
import os from 'node:os';
import path from 'node:path';
import { processLifecycle } from '../electron/main/lifecycle/processes';
import { portRegistry } from '../electron/main/lifecycle/ports';
import { ProjectLifecycleState, projectLifecycle } from '../electron/main/lifecycle/state';
import { startVitePreview } from '../electron/main/lifecycle/vite';
import {
    PreviewRuntimeManager,
    writeSessionEntry,
} from '../electron/main/components/preview-runtime';

const roots: string[] = [];
const VITE_BIN = path.resolve(__dirname, '../../../node_modules/vite/bin/vite.js');

function tempProject(): string {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'kumite-lifecycle-'));
    roots.push(root);
    fs.writeFileSync(path.join(root, 'index.html'), '<html><body>ok</body></html>');
    return root;
}

function spawnSleeper(): ReturnType<typeof spawn> {
    return spawn(process.execPath, ['-e', 'setInterval(() => {}, 1000)'], {
        stdio: 'ignore',
        windowsHide: true,
        detached: process.platform !== 'win32',
    });
}

function bindPort(port: number): Promise<net.Server> {
    return new Promise((resolve, reject) => {
        const server = net.createServer();
        server.once('error', reject);
        server.listen(port, '127.0.0.1', () => resolve(server));
    });
}

function closeServer(server: net.Server): Promise<void> {
    return new Promise((resolve) => server.close(() => resolve()));
}

afterAll(async () => {
    await processLifecycle.stopAll(2000);
    portRegistry.clear();
    projectLifecycle.clear();
    for (const root of roots) {
        fs.rmSync(root, { recursive: true, force: true });
    }
});

describe('process lifecycle', () => {
    it('awaits exit and removes the registry entry', async () => {
        const child = spawnSleeper();
        processLifecycle.register({
            resourceId: 'test:exit',
            ownerId: 'project:a',
            ownerScope: 'project',
            projectId: 'a',
            type: 'development-server',
            child,
        });
        expect(processLifecycle.get('test:exit')?.state).toBe('running');
        expect(await processLifecycle.stop('test:exit', 5000)).toBe(true);
        expect(child.exitCode).not.toBeNull();
        expect(processLifecycle.get('test:exit')).toBeUndefined();
    });

    it('treats repeated stops and already-exited processes as safe', async () => {
        const child = spawnSleeper();
        processLifecycle.register({
            resourceId: 'test:repeat',
            ownerId: 'project:a',
            ownerScope: 'project',
            type: 'terminal',
            child,
        });
        expect(await processLifecycle.stop('test:repeat')).toBe(true);
        expect(await processLifecycle.stop('test:repeat')).toBe(true);

        processLifecycle.register({
            resourceId: 'test:dead',
            ownerId: 'project:a',
            ownerScope: 'project',
            type: 'terminal',
            child: spawn(process.execPath, ['-e', ''], { stdio: 'ignore' }),
        });
        expect(await processLifecycle.stop('test:dead')).toBe(true);
        expect(await processLifecycle.stop('test:dead')).toBe(true);
    });

    it('continues cleanup when one managed process cannot be verified', async () => {
        processLifecycle.register({
            resourceId: 'test:stuck',
            ownerId: 'project:stuck',
            ownerScope: 'project',
            type: 'terminal',
            // A macOS-style handle that never emits exit; taskkill has no target.
            pty: { pid: 999_999, kill: () => {}, onExit: () => {} },
        });
        const child = spawnSleeper();
        processLifecycle.register({
            resourceId: 'test:healthy',
            ownerId: 'project:stuck',
            ownerScope: 'project',
            type: 'terminal',
            child,
        });
        const failures = await processLifecycle.stopOwner('project:stuck', 300);
        expect(failures).toContain('test:stuck');
        expect(failures).not.toContain('test:healthy');
        expect(processLifecycle.get('test:healthy')).toBeUndefined();
        expect(processLifecycle.get('test:stuck')?.state).toBe('failed');
        processLifecycle.get('test:stuck');
    });
});

describe('dynamic port allocation', () => {
    it('binds real Vite servers on distinct actual ports', async () => {
        const root = tempProject();
        const one = await startVitePreview({
            resourceId: 'test:vite:one',
            projectPath: root,
            viteBin: VITE_BIN,
            preferredPort: 3499,
            ownerId: 'shared:test',
            ownerScope: 'shared',
            type: 'catalog-preview',
        });
        const two = await startVitePreview({
            resourceId: 'test:vite:two',
            projectPath: root,
            viteBin: VITE_BIN,
            preferredPort: 3499,
            ownerId: 'shared:test',
            ownerScope: 'shared',
            type: 'catalog-preview',
        });

        expect(one.error).toBeNull();
        expect(two.error).toBeNull();
        expect(one.server?.port).toBeGreaterThan(0);
        expect(two.server?.port).toBeGreaterThan(0);
        expect(one.server?.port).not.toBe(two.server?.port);
        expect(portRegistry.isOwned(one.server!.port)).toBe(true);
        expect(portRegistry.isOwned(two.server!.port)).toBe(true);

        await processLifecycle.stop('test:vite:one');
        await processLifecycle.stop('test:vite:two');
    });

    it('leaves an unrelated process on the preferred port alone', async () => {
        const root = tempProject();
        const preferred = 3498;
        const unrelated = await bindPort(preferred);
        try {
            const started = await startVitePreview({
                resourceId: 'test:vite:conflict',
                projectPath: root,
                viteBin: VITE_BIN,
                preferredPort: preferred,
                ownerId: 'shared:test',
                ownerScope: 'shared',
                type: 'catalog-preview',
            });
            expect(started.error).toBeNull();
            expect(started.server?.port).not.toBe(preferred);
            expect(unrelated.listening).toBe(true);
            await processLifecycle.stop('test:vite:conflict');
        } finally {
            await closeServer(unrelated);
        }
    });

    it('releases a port only after the process exits, then rebinds it', async () => {
        const root = tempProject();
        const started = await startVitePreview({
            resourceId: 'test:vite:release',
            projectPath: root,
            viteBin: VITE_BIN,
            preferredPort: 3497,
            ownerId: 'project:release',
            ownerScope: 'project',
            projectId: 'release',
            type: 'development-server',
        });
        expect(started.error).toBeNull();
        const port = started.server!.port;
        expect(portRegistry.isOwned(port)).toBe(true);

        expect(await processLifecycle.stop('test:vite:release')).toBe(true);
        expect(processLifecycle.get('test:vite:release')).toBeUndefined();
        expect(portRegistry.isOwned(port)).toBe(false);

        const rebound = await bindPort(port);
        expect(rebound.listening).toBe(true);
        await closeServer(rebound);
    });
});

describe('project lifecycle state', () => {
    it('invalidates pending work and cannot start after closing', () => {
        const record = projectLifecycle.activate('project:test', tempProject());
        const generation = record.generation;
        projectLifecycle.beginClose(record.id);
        expect(record.state).toBe(ProjectLifecycleState.CLOSING);
        expect(projectLifecycle.generation(record.id)).not.toBe(generation);
        expect(projectLifecycle.isOpen(record.id)).toBe(false);
        expect(() => projectLifecycle.assertCanStart(record.id, record.folderPath)).toThrow();
        projectLifecycle.completeClose(record, false);
        expect(projectLifecycle.state(record.id)).toBe(ProjectLifecycleState.CLOSED);
    });

    it('rejects new work while the application is shutting down', () => {
        projectLifecycle.setShuttingDown(true);
        try {
            const record = projectLifecycle.ensure('project:shutdown', tempProject());
            expect(projectLifecycle.isOpen(record.id)).toBe(false);
            expect(() => projectLifecycle.activate(record.id, record.folderPath)).toThrow(
                'Kumite is shutting down.',
            );
        } finally {
            projectLifecycle.setShuttingDown(false);
        }
    });
});

describe('shared preview runtime', () => {
    function entry(root: string, sessionId: string) {
        const spec = {
            sessionId,
            entryId: sessionId,
            html: `<!-- kumite-preview-session -->\n<!doctype html><html><body><div id="root"></div><script type="module" src="./${sessionId}.tsx"></script></body></html>`,
            source: 'export {};',
        };
        writeSessionEntry(root, spec);
        return spec;
    }

    it('keeps the server while another consumer owns sessions', async () => {
        const root = tempProject();
        const manager = new PreviewRuntimeManager({ idleTimeoutMs: 60_000 });
        const first = await manager.ensure({
            projectPath: root,
            kind: 'catalog',
            viteBin: VITE_BIN,
            basePort: 3496,
            ownerId: 'project:a',
            entries: [entry(root, 'ks_a')],
        });
        expect(first.urls.ks_a).toContain('http://127.0.0.1:');

        const second = await manager.ensure({
            projectPath: root,
            kind: 'catalog',
            viteBin: VITE_BIN,
            basePort: 3496,
            ownerId: 'project:b',
            entries: [entry(root, 'ks_b')],
        });
        expect(second.urls.ks_b).toContain('http://127.0.0.1:');
        expect(manager.size).toBe(1);

        await manager.releaseOwner('project:a');
        expect(manager.size).toBe(1);
        await manager.releaseOwner('project:b');
        expect(manager.size).toBe(0);
        await manager.stopAll();
        expect(manager.size).toBe(0);
    });

    it('does not register a runtime after its final consumer closed', async () => {
        const root = tempProject();
        const manager = new PreviewRuntimeManager({ idleTimeoutMs: 60_000 });
        const started = manager.ensure({
            projectPath: root,
            kind: 'catalog',
            viteBin: VITE_BIN,
            basePort: 3495,
            ownerId: 'project:closing',
            entries: [entry(root, 'ks_closing')],
        });
        await manager.releaseOwner('project:closing');
        const result = await started;
        expect(result.urls).toEqual({});
        expect(result.error).toBe('Preview start was cancelled.');
        expect(manager.size).toBe(0);
        expect(manager.pendingCount).toBe(0);
    });

    it('gives each project its own server and stops only the named project', async () => {
        const rootA = tempProject();
        const rootB = tempProject();
        const manager = new PreviewRuntimeManager({ idleTimeoutMs: 60_000 });
        try {
            const a = await manager.ensure({
                projectPath: rootA,
                kind: 'catalog',
                viteBin: VITE_BIN,
                basePort: 3494,
                ownerId: 'project:a',
                entries: [entry(rootA, 'ks_project_a')],
            });
            const b = await manager.ensure({
                projectPath: rootB,
                kind: 'catalog',
                viteBin: VITE_BIN,
                basePort: 3494,
                ownerId: 'project:b',
                entries: [entry(rootB, 'ks_project_b')],
            });
            expect(a.error).toBeNull();
            expect(b.error).toBeNull();
            expect(manager.size).toBe(2);

            const originA = new URL(a.urls.ks_project_a).origin;
            const originB = new URL(b.urls.ks_project_b).origin;
            expect(originA).not.toBe(originB);

            await manager.stopProject(rootA);
            expect(manager.size).toBe(1);
            expect(fs.existsSync(path.join(rootA, '__kumite_preview', 'ks_project_a'))).toBe(false);
            await expect(
                fetch(`${originA}/`, { signal: AbortSignal.timeout(2000) }),
            ).rejects.toThrow();

            const stillLive = await fetch(`${originB}/__kumite_preview/ks_project_b/index.html`, {
                signal: AbortSignal.timeout(5000),
            });
            expect(stillLive.ok).toBe(true);
        } finally {
            await manager.stopAll();
        }
    });

    it('removes session files after the server exits and frees its port', async () => {
        const root = tempProject();
        const manager = new PreviewRuntimeManager({ idleTimeoutMs: 60_000 });
        const started = await manager.ensure({
            projectPath: root,
            kind: 'catalog',
            viteBin: VITE_BIN,
            basePort: 3493,
            ownerId: 'project:cleanup',
            entries: [entry(root, 'ks_cleanup')],
        });
        const port = Number.parseInt(new URL(started.urls.ks_cleanup).port, 10);
        expect(portRegistry.isOwned(port)).toBe(true);
        expect(fs.existsSync(path.join(root, '__kumite_preview', 'ks_cleanup'))).toBe(true);

        await manager.stopAll();

        expect(manager.size).toBe(0);
        expect(portRegistry.isOwned(port)).toBe(false);
        expect(fs.existsSync(path.join(root, '__kumite_preview', 'ks_cleanup'))).toBe(false);
        const rebound = await bindPort(port);
        expect(rebound.listening).toBe(true);
        await closeServer(rebound);
    });

    it('preserves unknown files when releasing a generated preview session', async () => {
        const root = tempProject();
        const manager = new PreviewRuntimeManager({ idleTimeoutMs: 60_000 });
        const spec = entry(root, 'ks_keep_user_file');
        const directory = path.join(root, '__kumite_preview', 'ks_keep_user_file');
        const userFile = path.join(directory, 'notes.txt');
        fs.writeFileSync(userFile, 'user-owned');

        await manager.ensure({
            projectPath: root,
            kind: 'catalog',
            viteBin: VITE_BIN,
            basePort: 3492,
            ownerId: 'project:keep-user-file',
            entries: [spec],
        });
        await manager.stopAll();

        expect(fs.readFileSync(userFile, 'utf8')).toBe('user-owned');
        expect(fs.existsSync(path.join(directory, 'index.html'))).toBe(false);
        expect(fs.existsSync(path.join(directory, `${spec.entryId}.tsx`))).toBe(false);
        expect(fs.existsSync(directory)).toBe(true);
    });
});
