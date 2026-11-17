import { createHash } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { isImplementationMaterializationActive } from './implementation-materializer';

function sha256(file: string): string {
    return createHash('sha256').update(fs.readFileSync(file)).digest('hex');
}

function resolveOwnedPath(root: string, relative: string): string | null {
    if (
        !relative ||
        relative.includes('\\') ||
        path.posix.isAbsolute(relative) ||
        relative.split('/').some((part) => !part || part === '.' || part === '..')
    ) {
        return null;
    }
    const absolute = path.resolve(root, ...relative.split('/'));
    const fromRoot = path.relative(root, absolute);
    return fromRoot && !fromRoot.startsWith('..') && !path.isAbsolute(fromRoot)
        ? absolute
        : null;
}

function removeIfOwned(file: string, expectedHash: string): boolean {
    try {
        if (!fs.lstatSync(file).isFile() || sha256(file) !== expectedHash) {return false;}
        fs.unlinkSync(file);
        return true;
    } catch {
        return false;
    }
}

function removeEmptyParents(root: string, file: string): void {
    let directory = path.dirname(file);
    while (directory !== root && path.relative(root, directory) &&
        !path.relative(root, directory).startsWith('..')) {
        try {
            fs.rmdirSync(directory);
        } catch {
            return;
        }
        directory = path.dirname(directory);
    }
}

export function cleanupArtifactPreviewWorkspace(workspaceRoot: string): void {
    const materializationsRoot = path.join(workspaceRoot, '.kumite-materializations');
    if (!fs.existsSync(materializationsRoot)) {return;}
    const records: Array<{
        directory: string;
        files: Array<{ path: string; sha256: string }>;
        assets: Array<{ path: string; sha256: string }>;
    }> = [];

    for (const entry of fs.readdirSync(materializationsRoot, { withFileTypes: true })) {
        if (!entry.isDirectory() || entry.isSymbolicLink()) {continue;}
        const directory = path.join(materializationsRoot, entry.name);
        if (isImplementationMaterializationActive(directory)) continue;
        try {
            const manifest = JSON.parse(
                fs.readFileSync(path.join(directory, '.kumite-implementation.json'), 'utf8'),
            ) as {
                schemaVersion?: number;
                files?: Array<{ path?: string; sha256?: string }>;
                assets?: Array<{ path?: string; sha256?: string }>;
            };
            if (
                manifest.schemaVersion !== 1 ||
                !Array.isArray(manifest.files) ||
                !Array.isArray(manifest.assets)
            ) {continue;}
            const files = manifest.files.map((file) => ({ path: file.path!, sha256: file.sha256! }));
            const assets = manifest.assets.map((asset) => ({ path: asset.path!, sha256: asset.sha256! }));
            if (
                [...files, ...assets].some(
                    (item) =>
                        typeof item.path !== 'string' ||
                        !/^[a-f0-9]{64}$/.test(item.sha256) ||
                        !resolveOwnedPath(directory, item.path),
                )
            ) {continue;}
            records.push({ directory, files, assets });
        } catch {
            // An unknown or corrupt workspace is not ours to clean.
        }
    }

    const mergedFiles = new Map<string, Set<string>>();
    for (const record of records) {
        for (const file of record.files) {
            const destination = resolveOwnedPath(path.join(workspaceRoot, 'src'), file.path);
            if (!destination) {continue;}
            const hashes = mergedFiles.get(destination) ?? new Set<string>();
            hashes.add(file.sha256);
            mergedFiles.set(destination, hashes);
        }
        for (const asset of record.assets) {
            const destination = resolveOwnedPath(workspaceRoot, asset.path);
            if (!destination) {continue;}
            const hashes = mergedFiles.get(destination) ?? new Set<string>();
            hashes.add(asset.sha256);
            mergedFiles.set(destination, hashes);
        }
    }
    for (const [file, hashes] of mergedFiles) {
        if (hashes.size === 1 && removeIfOwned(file, [...hashes][0])) {
            removeEmptyParents(workspaceRoot, file);
        }
    }

    for (const record of records) {
        let complete = true;
        for (const item of [...record.files, ...record.assets]) {
            const file = resolveOwnedPath(record.directory, item.path);
            if (!file || !removeIfOwned(file, item.sha256)) {complete = false;}
            else {removeEmptyParents(record.directory, file);}
        }
        const manifest = path.join(record.directory, '.kumite-implementation.json');
        try {
            if (complete && fs.lstatSync(manifest).isFile()) {fs.unlinkSync(manifest);}
        } catch {
            complete = false;
        }
        if (complete) {
            try {
                fs.rmdirSync(record.directory);
            } catch {
                // Unknown user-owned files keep the directory intact.
            }
        }
    }
}
