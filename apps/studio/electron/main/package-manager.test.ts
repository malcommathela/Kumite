import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { after, describe, it } from 'node:test';
import {
    detectPackageManagers,
    packageManagerLockfiles,
    removePackageManagerLockfiles,
    resolvePackageManager,
} from './package-manager';

const roots: string[] = [];

after(() => {
    for (const root of roots) {
        fs.rmSync(root, { recursive: true, force: true });
    }
});

function createRoot(files: string[]): string {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'kumite-package-manager-'));
    roots.push(root);
    fs.writeFileSync(path.join(root, 'package.json'), '{}');
    for (const file of files) {
        fs.writeFileSync(path.join(root, file), '');
    }
    return root;
}

describe('package manager resolution', () => {
    it('resolves a single lockfile', () => {
        const root = createRoot(['package-lock.json']);
        assert.deepEqual(detectPackageManagers(root), ['npm']);
        assert.equal(resolvePackageManager(root), 'npm');
    });

    it('prefers bun deterministically when lockfiles conflict', () => {
        const root = createRoot(['bun.lockb', 'package-lock.json', 'yarn.lock']);
        assert.deepEqual(detectPackageManagers(root), ['bun', 'yarn', 'npm']);
        assert.equal(resolvePackageManager(root), 'bun');
    });

    it('prefers pnpm over yarn and npm without bun', () => {
        const root = createRoot(['pnpm-lock.yaml', 'yarn.lock', 'package-lock.json']);
        assert.equal(resolvePackageManager(root), 'pnpm');
    });

    it('returns null when no lockfile exists', () => {
        const root = createRoot([]);
        assert.deepEqual(detectPackageManagers(root), []);
        assert.equal(resolvePackageManager(root), null);
    });

    it('removes every lockfile while leaving other files intact', () => {
        const root = createRoot(['bun.lock', 'bun.lockb', 'package-lock.json', 'yarn.lock']);
        assert.equal(packageManagerLockfiles(root).length, 4);
        assert.deepEqual(removePackageManagerLockfiles(root).sort(), [
            'bun.lock',
            'bun.lockb',
            'package-lock.json',
            'yarn.lock',
        ]);
        assert.deepEqual(packageManagerLockfiles(root), []);
        assert.equal(fs.existsSync(path.join(root, 'package.json')), true);
    });
});
