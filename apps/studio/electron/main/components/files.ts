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
 *
 * The stylesheet is deliberately left out of the snapshot: the CLI only adds
 * that item's design tokens to it, and restoring it would drop them.
 *
 * Empty files are left out too. A component file that was truncated to zero
 * bytes (an interrupted install, a crashed editor save) has no user content to
 * protect, and restoring it would keep the block broken with an `undefined`
 * component after every reinstall. Without a snapshot entry the CLI's content
 * survives, so reinstalling repairs it.
 */
export type FileSnapshot = Map<string, string>;

function collect(directory: string, snapshot: FileSnapshot, excluded: Set<string>): void {
    if (!fs.existsSync(directory)) {
        return;
    }

    for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
        const fullPath = path.join(directory, entry.name);
        if (entry.isDirectory()) {
            collect(fullPath, snapshot, excluded);
        } else if (entry.isFile()) {
            if (excluded.has(path.resolve(fullPath))) {
                continue;
            }
            const content = fs.readFileSync(fullPath, 'utf8');
            if (content.length > 0) {
                snapshot.set(fullPath, content);
            }
        }
    }
}

export function snapshotFiles(
    directories: Array<string | null | undefined>,
    excludeFiles: Array<string | null | undefined> = [],
): FileSnapshot {
    const excluded = new Set(
        excludeFiles
            .filter((file): file is string => Boolean(file))
            .map((file) => path.resolve(file)),
    );
    const snapshot: FileSnapshot = new Map();
    for (const directory of directories) {
        if (directory) {
            collect(directory, snapshot, excluded);
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

/**
 * A zero-byte component file imports as `undefined`, so React throws "Element
 * type is invalid" on any page that renders it. Nothing can be lost by
 * refilling it, which is why installs treat it as missing rather than owned.
 */
export function isEmptyFile(file: string): boolean {
    try {
        return fs.statSync(file).size === 0;
    } catch {
        return false;
    }
}
