import fs from 'node:fs';
import path from 'node:path';
import type { PackageManager } from '@kumite/models';

/**
 * Preference order used when a project carries more than one lockfile.
 * Kumite installs new projects with its bundled Bun, so bun wins.
 */
const PREFERRED_PACKAGE_MANAGERS: PackageManager[] = ['bun', 'pnpm', 'yarn', 'npm'];

const LOCKFILE_NAMES = [
    'bun.lock',
    'bun.lockb',
    'pnpm-lock.yaml',
    'yarn.lock',
    'package-lock.json',
] as const;

/** Every package manager with a lockfile at the project root. */
export function detectPackageManagers(root: string): PackageManager[] {
    const managers: PackageManager[] = [];
    const has = (name: string) => fs.existsSync(path.join(root, name));
    if (has('bun.lock') || has('bun.lockb')) {
        managers.push('bun');
    }
    if (has('pnpm-lock.yaml')) {
        managers.push('pnpm');
    }
    if (has('yarn.lock')) {
        managers.push('yarn');
    }
    if (has('package-lock.json')) {
        managers.push('npm');
    }
    return managers;
}

/**
 * Picks one package manager deterministically instead of rejecting a project
 * that has stray lockfiles. Returns null only when no lockfile exists.
 */
export function resolvePackageManager(root: string): PackageManager | null {
    const managers = detectPackageManagers(root);
    return PREFERRED_PACKAGE_MANAGERS.find((manager) => managers.includes(manager)) ?? null;
}

/** Absolute paths of every lockfile present at the project root. */
export function packageManagerLockfiles(root: string): string[] {
    return LOCKFILE_NAMES.map((name) => path.join(root, name)).filter((file) =>
        fs.existsSync(file),
    );
}

/**
 * Removes conflicting lockfiles before a fresh install. Used when creating or
 * reinstalling a project so the package manager writes exactly one lockfile.
 */
export function removePackageManagerLockfiles(root: string): string[] {
    const removed: string[] = [];
    for (const file of packageManagerLockfiles(root)) {
        try {
            fs.rmSync(file, { force: true });
            removed.push(path.basename(file));
        } catch {
            // Leave files we cannot remove; insertion still resolves a manager.
        }
    }
    return removed;
}
