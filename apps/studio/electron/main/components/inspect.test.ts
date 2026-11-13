import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { after, describe, it } from 'node:test';
import { inspectProject } from './inspect';

const roots: string[] = [];

function project(withVite: boolean): string {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'kumite-components-'));
    roots.push(root);
    fs.mkdirSync(path.join(root, 'node_modules'), { recursive: true });
    fs.writeFileSync(
        path.join(root, 'package.json'),
        JSON.stringify({ dependencies: { react: '^18.0.0', tailwindcss: '^3.4.0' } }),
    );
    if (withVite) {
        const vite = path.join(root, 'node_modules', 'vite', 'bin');
        fs.mkdirSync(vite, { recursive: true });
        fs.writeFileSync(path.join(vite, 'vite.js'), '');
    }
    return root;
}

after(() => {
    for (const root of roots) {
        fs.rmSync(root, { recursive: true, force: true });
    }
});

describe('component project compatibility', () => {
    it('keeps project support separate from live-preview support', () => {
        const root = project(false);
        const status = inspectProject(root);

        assert.equal(status.supported, true);
        assert.equal(status.previewSupported, false);
        assert.match(status.previewReason ?? '', /Vite/);
    });

    it('enables live preview when the project has a local Vite executable', () => {
        const status = inspectProject(project(true));

        assert.equal(status.supported, true);
        assert.equal(status.previewSupported, true);
        assert.equal(status.previewReason, null);
    });

    it('recognizes an installed block through its provenance record and configured aliases', () => {
        const root = project(false);
        fs.mkdirSync(path.join(root, 'src', 'components', 'ui'), { recursive: true });
        fs.writeFileSync(
            path.join(root, 'components.json'),
            JSON.stringify({ aliases: { components: '~/components', ui: '~/components/ui' } }),
        );
        fs.mkdirSync(path.join(root, '.kumite'), { recursive: true });
        fs.writeFileSync(
            path.join(root, '.kumite', 'components.json'),
            JSON.stringify({ components: [{ name: 'login-01' }] }),
        );
        fs.writeFileSync(
            path.join(root, 'src', 'components', 'login-form.tsx'),
            'export function LoginForm() {}',
        );

        const status = inspectProject(root);

        assert.equal(status.componentsAlias, '~/components');
        assert.equal(status.uiAlias, '~/components/ui');
        assert.equal(status.installed['login-01'], true);
    });
});
