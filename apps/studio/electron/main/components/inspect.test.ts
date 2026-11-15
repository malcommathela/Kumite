import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { after, describe, it } from 'node:test';
import { collectShadcnDependencies, getShadcnLibraryItem } from '@kumite/models';
import { inspectProject, missingPackages } from './inspect';

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

function dependencyProject(
    manifest: Record<string, unknown>,
    installedPackages: string[] = [],
): string {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'kumite-dependencies-'));
    roots.push(root);
    fs.writeFileSync(path.join(root, 'package.json'), JSON.stringify(manifest));
    for (const name of installedPackages) {
        const packageDir = path.join(root, 'node_modules', ...name.split('/'));
        fs.mkdirSync(packageDir, { recursive: true });
        fs.writeFileSync(path.join(packageDir, 'package.json'), '{}');
    }
    return root;
}

describe('component dependency closure', () => {
    it('includes packages declared by the registry dependencies of a block', () => {
        const block = getShadcnLibraryItem('sidebar-01');
        assert.ok(block);
        assert.ok(collectShadcnDependencies(block).includes('lucide-react'));
    });

    it('reports a declared package that is not installed', () => {
        const root = dependencyProject({ dependencies: { 'lucide-react': '^0.400.0' } });
        const block = getShadcnLibraryItem('sidebar-01');
        assert.ok(block);

        assert.ok(missingPackages(root, block).includes('lucide-react'));
    });

    it('skips a package that is declared and installed', () => {
        const root = dependencyProject({ dependencies: { 'lucide-react': '^0.400.0' } }, [
            'lucide-react',
        ]);
        const block = getShadcnLibraryItem('sidebar-01');
        assert.ok(block);

        assert.ok(!missingPackages(root, block).includes('lucide-react'));
    });

    it('reads packages from installed source, not only registry metadata', () => {
        const root = dependencyProject({ dependencies: { react: '^18.0.0' } });
        fs.mkdirSync(path.join(root, 'components'), { recursive: true });
        fs.writeFileSync(
            path.join(root, 'components', 'calendar-30.tsx'),
            'import { formatDateRange } from "little-date";\n',
        );
        const block = getShadcnLibraryItem('calendar-30');
        assert.ok(block);

        assert.ok(missingPackages(root, block).includes('little-date'));
    });
});
