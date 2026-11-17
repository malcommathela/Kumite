import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterAll, describe, it } from 'bun:test';
import { cleanupArtifactPreviewWorkspace } from './preview-workspace-cleanup';

const roots: string[] = [];

afterAll(() => {
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
    it('preserves incomplete materialization directories instead of treating them as owned cleanup records', () => {
        const root = fs.mkdtempSync(path.join(os.tmpdir(), 'kumite-preview-incomplete-'));
        roots.push(root);
        const destination = path.join(root, '.kumite-materializations', 'partial');
        fs.mkdirSync(destination, { recursive: true });
        fs.writeFileSync(path.join(destination, '.kumite-implementation.json'), '{"schemaVersion":1}');
        cleanupArtifactPreviewWorkspace(root);
        assert.equal(fs.existsSync(destination), true);
    });
    it('removes only abandoned staging directories older than the recovery window', () => {
        const root = fs.mkdtempSync(path.join(os.tmpdir(), 'kumite-preview-stale-stage-'));
        roots.push(root);
        const materializationsRoot = path.join(root, '.kumite-materializations');
        const stale = path.join(materializationsRoot, '.kumite-implementation-stage-stale');
        const fresh = path.join(materializationsRoot, '.kumite-implementation-stage-fresh');
        fs.mkdirSync(stale, { recursive: true });
        fs.mkdirSync(fresh, { recursive: true });
        fs.writeFileSync(path.join(stale, 'partial.tsx'), 'partial');
        fs.writeFileSync(path.join(fresh, 'partial.tsx'), 'partial');
        const old = new Date(Date.now() - 48 * 60 * 60 * 1000);
        fs.utimesSync(stale, old, old);

        cleanupArtifactPreviewWorkspace(root);

        assert.equal(fs.existsSync(stale), false);
        assert.equal(fs.existsSync(fresh), true);
    });
});
