import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { describe, it } from 'bun:test';
import { isCatalogRuntimeInstalled } from './catalog';

const runtimePackages: Record<string, string> = {
    react: '19.0.0',
    'react-dom': '19.0.0',
    '@tailwindcss/vite': '4.1.0',
    '@vitejs/plugin-react': '4.3.4',
    tailwindcss: '4.1.0',
    vite: '6.0.0',
};

function writePackage(root: string, name: string, version: string): void {
    const directory = path.join(root, 'node_modules', ...name.split('/'));
    fs.mkdirSync(directory, { recursive: true });
    fs.writeFileSync(path.join(directory, 'package.json'), JSON.stringify({ name, version }), 'utf8');
}

describe('catalog preview runtime dependencies', () => {
    it('requires every package owned by the isolated preview runtime', () => {
        const root = fs.mkdtempSync(path.join(os.tmpdir(), 'kumite-catalog-runtime-'));
        try {
            assert.equal(isCatalogRuntimeInstalled(root), false);
            for (const [name, version] of Object.entries(runtimePackages)) writePackage(root, name, version);
            assert.equal(isCatalogRuntimeInstalled(root), true);
        } finally {
            fs.rmSync(root, { recursive: true, force: true });
        }
    });

    it('rejects Tailwind v3 even when Vite is present', () => {
        const root = fs.mkdtempSync(path.join(os.tmpdir(), 'kumite-catalog-runtime-'));
        try {
            for (const [name, version] of Object.entries(runtimePackages)) writePackage(root, name, version);
            writePackage(root, 'tailwindcss', '3.4.4');
            assert.equal(isCatalogRuntimeInstalled(root), false);
        } finally {
            fs.rmSync(root, { recursive: true, force: true });
        }
    });

    it('rejects a runtime missing the Tailwind Vite plugin', () => {
        const root = fs.mkdtempSync(path.join(os.tmpdir(), 'kumite-catalog-runtime-'));
        try {
            for (const [name, version] of Object.entries(runtimePackages)) {
                if (name !== '@tailwindcss/vite') writePackage(root, name, version);
            }
            assert.equal(isCatalogRuntimeInstalled(root), false);
        } finally {
            fs.rmSync(root, { recursive: true, force: true });
        }
    });
});
