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
    it('uses the shared Tailwind v4 theme and scans materialized artifact source', () => {
        const root = fs.mkdtempSync(path.join(os.tmpdir(), 'kumite-preview-css-'));
        roots.push(root);
        const file = ensureArtifactPreviewStylesheet(root);
        const css = fs.readFileSync(file, 'utf8');
        assert.equal(css, buildArtifactPreviewStylesheet());
        assert.match(css, /@import "tailwindcss"/);
        assert.match(css, /@source "\.\/\*\*\//);
        assert.match(css, /@source "\.\/\.kumite-preview-registry/);
        assert.match(css, /@theme inline/);
        assert.match(css, /--color-background: var\(--background\)/);
        assert.match(css, /\.dark\s*\{/);
        assert.match(css, /html, body, #root/);
        assert.equal(fs.existsSync(path.join(root, 'tailwind.config.cjs')), false);
        assert.equal(fs.existsSync(path.join(root, 'postcss.config.cjs')), false);
    });

    it('preserves existing workspace CSS while adding the preview theme once', () => {
        const root = fs.mkdtempSync(path.join(os.tmpdir(), 'kumite-preview-css-existing-'));
        roots.push(root);
        fs.mkdirSync(path.join(root, 'src'), { recursive: true });
        const existing = '@import "tailwindcss";\n/* workspace custom style */\nbody { color: red; }';
        fs.writeFileSync(path.join(root, 'src', 'index.css'), existing);
        const file = ensureArtifactPreviewStylesheet(root);
        const first = fs.readFileSync(file, 'utf8');
        assert.match(first, /@import "tailwindcss"/);
        assert.match(first, /workspace custom style/);
        assert.match(first, /body \{ color: red; \}/);
        ensureArtifactPreviewStylesheet(root);
        assert.equal(fs.readFileSync(file, 'utf8'), first);
    });
});
