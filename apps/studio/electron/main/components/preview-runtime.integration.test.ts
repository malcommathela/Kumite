import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { after, describe, it } from 'node:test';
import { PreviewRuntimeManager } from './preview-runtime';

const roots: string[] = [];
const managers: PreviewRuntimeManager[] = [];

after(async () => {
    await Promise.all(managers.map((manager) => manager.stopAll()));
    await Promise.all(roots.map((root) => fs.promises.rm(root, { recursive: true, force: true })));
});

describe('shared catalog preview runtime lifecycle', () => {
    it('cleans entries when a multi-entry batch collides before startup', async () => {
        const root = await fs.promises.mkdtemp(path.join(os.tmpdir(), 'kumite-preview-partial-'));
        roots.push(root);
        const manager = new PreviewRuntimeManager();
        managers.push(manager);
        const userOwnedPreviewDirectory = path.join(root, '__kumite_preview', 'second');
        await fs.promises.mkdir(userOwnedPreviewDirectory, { recursive: true });
        await fs.promises.writeFile(
            path.join(userOwnedPreviewDirectory, 'index.html'),
            '<!-- user-owned preview -->',
        );
        const result = await manager.ensure({
            projectPath: root,
            kind: 'integration-preview',
            viteBin: path.resolve(process.cwd(), '../../node_modules/vite/bin/vite.js'),
            basePort: 38932,
            ownerId: 'collision-consumer',
            entries: [
                {
                    sessionId: 'first',
                    entryId: 'first',
                    html: '<!-- kumite-preview-session --><div id="root"></div>',
                    source: 'export const First = true;',
                },
                {
                    sessionId: 'second',
                    entryId: 'second',
                    html: '<!-- kumite-preview-session --><div id="root"></div>',
                    source: 'export const Second = true;',
                },
            ],
        });
        assert.match(result.error ?? '', /Preview files already exist/);
        assert.equal(fs.existsSync(path.join(root, '__kumite_preview', 'first')), false);
        assert.equal(
            await fs.promises.readFile(path.join(userOwnedPreviewDirectory, 'index.html'), 'utf8'),
            '<!-- user-owned preview -->',
        );
        assert.equal(manager.size, 0);
    });

    it('cleans session files when Vite fails to start', async () => {
        const root = await fs.promises.mkdtemp(
            path.join(os.tmpdir(), 'kumite-preview-start-failure-'),
        );
        roots.push(root);
        const manager = new PreviewRuntimeManager({ startTimeoutMs: 5_000 });
        managers.push(manager);
        const result = await manager.ensure({
            projectPath: root,
            kind: 'integration-preview',
            viteBin: path.join(root, 'missing-vite.js'),
            basePort: 38933,
            ownerId: 'failed-consumer',
            entries: [
                {
                    sessionId: 'failed',
                    entryId: 'failed',
                    html: '<!-- kumite-preview-session --><div id="root"></div>',
                    source: 'export const Failed = true;',
                },
            ],
        });
        assert.ok(result.error);
        assert.equal(fs.existsSync(path.join(root, '__kumite_preview', 'failed')), false);
        assert.equal(manager.size, 0);
    });

    it('serves two concurrent consumers and stops the process after the final release', async () => {
        const root = await fs.promises.mkdtemp(path.join(os.tmpdir(), 'kumite-preview-runtime-'));
        roots.push(root);
        await fs.promises.symlink(
            path.resolve(process.cwd(), '../../node_modules'),
            path.join(root, 'node_modules'),
            'junction',
        );
        const manager = new PreviewRuntimeManager({ startTimeoutMs: 20_000 });
        managers.push(manager);
        const viteBin = path.resolve(process.cwd(), '../../node_modules/vite/bin/vite.js');
        const spec = (sessionId: string, ownerId: string) => ({
            projectPath: root,
            kind: 'integration-preview',
            viteBin,
            basePort: 38931,
            ownerId,
            entries: [
                {
                    sessionId,
                    entryId: `entry-${sessionId}`,
                    html: `<!doctype html><!-- kumite-preview-session --><div id="root"></div><script type="module" src="./entry-${sessionId}.tsx"></script>`,
                    source: `window.__kumitePreview?.post('mounted');`,
                },
            ],
        });

        const [first, second] = await Promise.all([
            manager.ensure(spec('session-one', 'consumer-one')),
            manager.ensure(spec('session-two', 'consumer-two')),
        ]);
        assert.equal(first.error, null);
        assert.equal(second.error, null);
        assert.equal(manager.size, 1);
        assert.equal((await fetch(Object.values(first.urls)[0])).status, 200);
        assert.equal((await fetch(Object.values(second.urls)[0])).status, 200);

        await manager.releaseOwner('consumer-one');
        assert.equal(manager.size, 1);
        assert.equal(fs.existsSync(path.join(root, '__kumite_preview', 'session-one')), false);
        assert.equal(fs.existsSync(path.join(root, '__kumite_preview', 'session-two')), true);

        await manager.releaseOwner('consumer-two');
        assert.equal(manager.size, 0);
        assert.equal(fs.existsSync(path.join(root, '__kumite_preview', 'session-two')), false);
    });
});
