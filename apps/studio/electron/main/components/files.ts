import fs from 'fs';
import path from 'path';

/**
 * The shadcn CLI has no "skip existing files" flag: when any destination file
 * already exists it opens an interactive overwrite prompt, even with `-y` and
 * `CI=1`. In a desktop app there is no TTY, so the process stalls forever.
 *
 * We let the CLI run with `--overwrite` so it can finish, but first snapshot
 * every component file it could touch. Restoring the snapshot afterwards keeps
 * the project's own files exactly as they were, which preserves Kumite's rule
 * that installs never overwrite existing files.
 */
export type FileSnapshot = Map<string, string>;

function collect(directory: string, snapshot: FileSnapshot): void {
    if (!fs.existsSync(directory)) {
        return;
    }

    for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
        const fullPath = path.join(directory, entry.name);
        if (entry.isDirectory()) {
            collect(fullPath, snapshot);
        } else if (entry.isFile()) {
            snapshot.set(fullPath, fs.readFileSync(fullPath, 'utf8'));
        }
    }
}

export function snapshotFiles(directories: Array<string | null | undefined>): FileSnapshot {
    const snapshot: FileSnapshot = new Map();
    for (const directory of directories) {
        if (directory) {
            collect(directory, snapshot);
        }
    }
    return snapshot;
}

export function restoreFiles(snapshot: FileSnapshot): void {
    for (const [file, content] of snapshot) {
        fs.mkdirSync(path.dirname(file), { recursive: true });
        fs.writeFileSync(file, content, 'utf8');
    }
}
