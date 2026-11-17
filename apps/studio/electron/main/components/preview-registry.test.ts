import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterAll, describe, it } from 'bun:test';
import { generateArtifactPreviewRegistry } from './preview-registry';
const roots: string[] = [];
afterAll(() => { for (const root of roots) fs.rmSync(root, { recursive: true, force: true }); });
describe('generated artifact preview registry', () => {
    it('writes lazy module loaders and integrity metadata in the isolated workspace', async () => {
        const root = fs.mkdtempSync(path.join(os.tmpdir(), 'kumite-preview-registry-'));
        roots.push(root);
        const source = 'export default function Preview() { return null; }';
        const item = { key: 'shadcn:component:button:session', artifactHash: 'a'.repeat(64), kind: 'component', name: 'Button', source };
        const first = await generateArtifactPreviewRegistry(root, [item]);
        const second = await generateArtifactPreviewRegistry(root, [item]);
        const manifest = JSON.parse(fs.readFileSync(first.manifestPath, 'utf8'));
        const index = fs.readFileSync(second.indexPath, 'utf8');
        const modulePath = path.join(root, 'src', '.kumite-preview-registry', manifest.entries[0].module);
        assert.equal(fs.readFileSync(modulePath, 'utf8'), source);
        assert.match(index, /import\('\.\/modules\//);
        assert.match(index, /export function loadPreview/);
        assert.match(first.entrySources[item.key]!, /import '@\/\.kumite-preview-registry\/modules\//);
        assert.doesNotMatch(first.entrySources[item.key]!, /loadPreview|registry\/index/);
        assert.equal(manifest.entries[0].artifactHash, item.artifactHash);
    });
    it('rejects malformed artifact hashes before writing registry output', async () => {
        const root = fs.mkdtempSync(path.join(os.tmpdir(), 'kumite-preview-registry-invalid-'));
        roots.push(root);
        await assert.rejects(generateArtifactPreviewRegistry(root, [{
            key: 'bad', artifactHash: 'not-a-hash', kind: 'component', name: 'Bad', source: 'export default null;',
        }]), /Invalid generated preview registry entry/);
        assert.equal(fs.existsSync(path.join(root, 'src', '.kumite-preview-registry')), false);
    });
});
