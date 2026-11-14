import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { after, describe, it } from 'node:test';
import { restoreFiles, snapshotFiles } from './files';

const roots: string[] = [];

after(() => {
    for (const root of roots) {
        fs.rmSync(root, { recursive: true, force: true });
    }
});

function project(): { root: string; app: string; css: string; page: string } {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'kumite-files-'));
    roots.push(root);
    const app = path.join(root, 'app');
    const css = path.join(app, 'globals.css');
    const page = path.join(app, 'page.tsx');
    fs.mkdirSync(app, { recursive: true });
    fs.writeFileSync(css, ':root {\n  --background: 0 0% 100%;\n}\n');
    fs.writeFileSync(page, 'export default function Page() { return null; }\n');
    return { root, app, css, page };
}

describe('install file snapshot', () => {
    it('restores project files but keeps the stylesheet the CLI extended', () => {
        const { app, css, page } = project();
        const originalPage = fs.readFileSync(page, 'utf8');

        const snapshot = snapshotFiles([app], [css]);

        fs.writeFileSync(page, 'overwritten by the CLI');
        fs.writeFileSync(
            css,
            ':root {\n  --background: 0 0% 100%;\n  --sidebar-background: 0 0% 98%;\n}\n',
        );
        restoreFiles(snapshot);

        assert.equal(fs.readFileSync(page, 'utf8'), originalPage);
        assert.match(fs.readFileSync(css, 'utf8'), /--sidebar-background/);
    });

    it('lets an install refill a component file that was truncated to zero bytes', () => {
        const { root, app } = project();
        const components = path.join(root, 'components');
        const searchForm = path.join(components, 'search-form.tsx');
        fs.mkdirSync(components, { recursive: true });
        fs.writeFileSync(searchForm, '');

        const snapshot = snapshotFiles([app, components]);

        fs.writeFileSync(searchForm, 'export function SearchForm() { return null; }\n');
        restoreFiles(snapshot);

        assert.match(fs.readFileSync(searchForm, 'utf8'), /export function SearchForm/);
    });
});
