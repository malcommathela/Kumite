import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { after, describe, it } from 'node:test';
import { componentPreviewServer } from './preview';

const roots: string[] = [];

function project(): string {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'kumite-preview-'));
    roots.push(root);
    fs.mkdirSync(path.join(root, 'node_modules', 'vite', 'bin'), { recursive: true });
    fs.mkdirSync(path.join(root, 'src', 'components', 'ui'), { recursive: true });
    fs.writeFileSync(path.join(root, 'node_modules', 'vite', 'bin', 'vite.js'), 'process.exit(2);');
    return root;
}

function status(projectPath: string) {
    return {
        projectPath,
        supported: true,
        uiDir: path.join(projectPath, 'src', 'components', 'ui'),
    } as any;
}

const definition = {
    title: 'Test component',
    previewable: true,
    imports: [],
    previewCode: '<div>preview</div>',
} as any;

after(async () => {
    await componentPreviewServer.stop();
    for (const root of roots) {
        fs.rmSync(root, { recursive: true, force: true });
    }
});

describe('component preview lifecycle', () => {
    for (const extension of ['html', 'tsx']) {
        it(`preserves an existing preview .${extension} file`, async () => {
            const projectPath = project();
            const file = path.join(projectPath, `__kumite_preview.${extension}`);
            fs.writeFileSync(file, 'user-owned content');

            const result = await componentPreviewServer.start(status(projectPath), definition);

            assert.equal(result.url, null);
            assert.match(result.error ?? '', /already exist/);
            assert.equal(fs.readFileSync(file, 'utf8'), 'user-owned content');
            assert.equal(
                fs.existsSync(path.join(projectPath, '__kumite_preview.html')),
                extension === 'html',
            );
            assert.equal(
                fs.existsSync(path.join(projectPath, '__kumite_preview.tsx')),
                extension === 'tsx',
            );
        });
    }

    it('removes generated files when the preview process exits before becoming ready', async () => {
        const projectPath = project();

        const result = await componentPreviewServer.start(status(projectPath), definition);

        assert.equal(result.url, null);
        assert.equal(result.error, 'Preview server exited.');
        assert.equal(fs.existsSync(path.join(projectPath, '__kumite_preview.html')), false);
        assert.equal(fs.existsSync(path.join(projectPath, '__kumite_preview.tsx')), false);
    });
});
