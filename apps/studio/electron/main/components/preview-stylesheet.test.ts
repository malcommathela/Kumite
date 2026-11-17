import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterAll, describe, it } from 'bun:test';
import { buildArtifactPreviewStylesheet, ensureArtifactPreviewStylesheet } from './preview-stylesheet';

const roots: string[] = [];
afterAll(() => {
    for (const root of roots) fs.rmSync(root, { recursive: true, force: true });
});

describe('artifact preview stylesheet', () => {
    it('creates a Tailwind v4 stylesheet with shadcn semantic tokens and artifact scan paths', () => {
        const root = fs.mkdtempSync(path.join(os.tmpdir(), 'kumite-preview-css-'));
        roots.push(root);
        const file = ensureArtifactPreviewStylesheet(root);
        const css = fs.readFileSync(file, 'utf8');
        assert.equal(css, buildArtifactPreviewStylesheet());
        assert.match(css, /@tailwind base;/);
        assert.match(css, /@tailwind utilities;/);
        assert.match(css, /\.dark\s*\{/);
        assert.match(css, /html, body, #root/);
        assert.ok(fs.existsSync(path.join(root, "tailwind.config.cjs")));
        assert.ok(fs.existsSync(path.join(root, "postcss.config.cjs")));
        assert.match(fs.readFileSync(path.join(root, "tailwind.config.cjs"), "utf8"), /\.\/src\/\*\*/);
    });

    it('preserves an existing project stylesheet instead of overwriting it', () => {
        const root = fs.mkdtempSync(path.join(os.tmpdir(), 'kumite-preview-css-existing-'));
        roots.push(root);
        fs.mkdirSync(path.join(root, 'src'), { recursive: true });
        fs.writeFileSync(path.join(root, 'src', 'index.css'), '/* user-owned */\nbody { color: red; }');
        ensureArtifactPreviewStylesheet(root);
        assert.equal(fs.readFileSync(path.join(root, 'src', 'index.css'), 'utf8'), '/* user-owned */\nbody { color: red; }');
    });
});
