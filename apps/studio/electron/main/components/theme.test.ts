import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { after, describe, it } from 'node:test';
import { ensureShadcnBaseLayer } from './theme';

const roots: string[] = [];

function project(files: Record<string, string>): string {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'kumite-theme-'));
    roots.push(root);
    for (const [name, content] of Object.entries(files)) {
        const target = path.join(root, name);
        fs.mkdirSync(path.dirname(target), { recursive: true });
        fs.writeFileSync(target, content);
    }
    return root;
}

function cssPath(root: string): string {
    return path.join(root, 'src', 'globals.css');
}

const COMPONENTS_JSON = JSON.stringify({
    tailwind: { css: 'src/globals.css', config: '' },
    aliases: { ui: '@/components/ui', components: '@/components' },
});

const V4_CSS = `@import "tailwindcss";

@theme inline {
  --color-background: var(--background);
  --color-border: var(--border);
  --color-ring: var(--ring);
}

:root {
  --background: oklch(1 0 0);
  --border: oklch(0.922 0 0);
  --ring: oklch(0.708 0 0);
}
`;

after(() => {
    for (const root of roots) {
        fs.rmSync(root, { recursive: true, force: true });
    }
});

describe('shadcn base layer', () => {
    it('adds the border token layer to a v4 project that was initialized without it', () => {
        const root = project({
            'components.json': COMPONENTS_JSON,
            'src/globals.css': V4_CSS,
        });

        const result = ensureShadcnBaseLayer(root);
        assert.equal(result.added, true);
        const written = fs.readFileSync(cssPath(root), 'utf8');
        assert.match(written, /@layer base \{/);
        assert.match(written, /@apply border-border outline-ring\/50;/);
        assert.match(written, /@apply bg-background text-foreground;/);
    });

    it('is idempotent', () => {
        const root = project({
            'components.json': COMPONENTS_JSON,
            'src/globals.css': V4_CSS,
        });

        ensureShadcnBaseLayer(root);
        const first = fs.readFileSync(cssPath(root), 'utf8');
        const second = ensureShadcnBaseLayer(root);
        assert.equal(second.added, false);
        assert.equal(fs.readFileSync(cssPath(root), 'utf8'), first);
    });

    it('leaves a project that already has the layer untouched', () => {
        const source = `${V4_CSS}\n@layer base {\n  * {\n    @apply border-border;\n  }\n}\n`;
        const root = project({
            'components.json': COMPONENTS_JSON,
            'src/globals.css': source,
        });

        const result = ensureShadcnBaseLayer(root);
        assert.equal(result.added, false);
        assert.equal(fs.readFileSync(cssPath(root), 'utf8'), source);
    });

    it('does not write an @apply that would not compile', () => {
        const source = V4_CSS.replace('  --color-border: var(--border);\n', '');
        const root = project({
            'components.json': COMPONENTS_JSON,
            'src/globals.css': source,
        });

        const result = ensureShadcnBaseLayer(root);
        assert.equal(result.added, false);
        assert.match(result.skipped ?? '', /--color-border/);
        assert.equal(fs.readFileSync(cssPath(root), 'utf8'), source);
    });

    it('uses the Tailwind v3 form when the project has a config', () => {
        const root = project({
            'components.json': JSON.stringify({
                tailwind: { css: 'src/globals.css', config: 'tailwind.config.js' },
            }),
            'tailwind.config.js':
                'module.exports = { theme: { extend: { colors: { border: "hsl(var(--border))" } } } };',
            'src/globals.css': ':root {\n  --background: 0 0% 100%;\n  --border: 0 0% 90%;\n}\n',
        });

        const result = ensureShadcnBaseLayer(root);
        assert.equal(result.added, true);
        const written = fs.readFileSync(cssPath(root), 'utf8');
        assert.match(written, /@apply border-border;/);
        assert.doesNotMatch(written, /outline-ring/);
    });

    it('collapses duplicated @apply declarations without changing the rule', () => {
        const source = `${V4_CSS}\n@layer base {\n  * {\n    @apply border-border outline-ring/50;\n    @apply border-border outline-ring/50;\n  }\n  body {\n    @apply bg-background text-foreground;\n    @apply bg-background text-foreground;\n  }\n}\n`;
        const root = project({
            'components.json': COMPONENTS_JSON,
            'src/globals.css': source,
        });

        const result = ensureShadcnBaseLayer(root);
        assert.equal(result.added, false);
        assert.equal(result.removedDuplicates, 2);
        const written = fs.readFileSync(cssPath(root), 'utf8');
        assert.equal(written.match(/border-border/g)?.length, 1);
        assert.equal(written.match(/bg-background text-foreground/g)?.length, 1);
    });
});
