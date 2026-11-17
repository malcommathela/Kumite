import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { after, describe, it } from 'node:test';
import { cleanupArtifactPreviewWorkspace } from './preview-workspace-cleanup';

const roots: string[] = [];

after(() => {
    for (const root of roots) {fs.rmSync(root, { recursive: true, force: true });}
});

function sha256(value: string): string {
    return createHash('sha256').update(value).digest('hex');
}

describe('artifact preview workspace cleanup', () => {
    it('removes only hash-verified artifact files and preserves user edits', () => {
        const root = fs.mkdtempSync(path.join(os.tmpdir(), 'kumite-preview-cleanup-'));
        roots.push(root);
        const materialization = path.join(root, '.kumite-materializations', 'artifact');
        const relativeSource = 'registry/new-york-v4/ui/fixture.tsx';
        const relativeAsset = 'public/fixture.svg';
        const originalSource = 'export const Fixture = true;';
        const changedSource = 'export const Fixture = false;';
        const asset = '<svg />';
        const materializedSource = path.join(materialization, relativeSource);
        const materializedAsset = path.join(materialization, relativeAsset);
        const mergedSource = path.join(root, 'src', relativeSource);
        const mergedAsset = path.join(root, relativeAsset);
        const userFile = path.join(root, 'src', 'registry/new-york-v4/ui/user-owned.tsx');

        fs.mkdirSync(path.dirname(materializedSource), { recursive: true });
        fs.mkdirSync(path.dirname(materializedAsset), { recursive: true });
        fs.mkdirSync(path.dirname(mergedSource), { recursive: true });
        fs.mkdirSync(path.dirname(mergedAsset), { recursive: true });
        fs.writeFileSync(materializedSource, originalSource);
        fs.writeFileSync(materializedAsset, asset);
        fs.writeFileSync(mergedSource, changedSource);
        fs.writeFileSync(mergedAsset, asset);
        fs.writeFileSync(userFile, 'export const Keep = true;');
        fs.writeFileSync(
            path.join(materialization, '.kumite-implementation.json'),
            JSON.stringify({
                schemaVersion: 1,
                files: [{ path: relativeSource, sha256: sha256(originalSource) }],
                assets: [{ path: relativeAsset, sha256: sha256(asset) }],
            }),
        );

        cleanupArtifactPreviewWorkspace(root);

        assert.equal(fs.readFileSync(mergedSource, 'utf8'), changedSource);
        assert.equal(fs.readFileSync(userFile, 'utf8'), 'export const Keep = true;');
        assert.equal(fs.existsSync(mergedAsset), false);
        assert.equal(fs.existsSync(materializedSource), false);
        assert.equal(fs.existsSync(materializedAsset), false);
        assert.equal(fs.existsSync(materialization), false);
    });
});
