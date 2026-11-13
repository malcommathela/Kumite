import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { after, describe, it } from 'node:test';
import { restoreFiles, snapshotFiles } from './files';

const roots: string[] = [];

function project(): string {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'kumite-component-files-'));
    roots.push(root);
    return root;
}

after(() => {
    for (const root of roots) {
        fs.rmSync(root, { recursive: true, force: true });
    }
});

describe('component file snapshots', () => {
    it('restores files the CLI overwrote and keeps files it created', () => {
        const root = project();
        const uiDir = path.join(root, 'src', 'components', 'ui');
        fs.mkdirSync(uiDir, { recursive: true });
        const button = path.join(uiDir, 'button.tsx');
        fs.writeFileSync(button, 'project button');

        const snapshot = snapshotFiles([uiDir]);

        fs.writeFileSync(button, 'registry button');
        fs.writeFileSync(path.join(uiDir, 'card.tsx'), 'registry card');
        restoreFiles(snapshot);

        assert.equal(fs.readFileSync(button, 'utf8'), 'project button');
        assert.equal(fs.readFileSync(path.join(uiDir, 'card.tsx'), 'utf8'), 'registry card');
    });

    it('ignores directories that do not exist yet', () => {
        const root = project();

        const snapshot = snapshotFiles([path.join(root, 'missing')]);

        assert.equal(snapshot.size, 0);
        assert.doesNotThrow(() => restoreFiles(snapshot));
    });
});
