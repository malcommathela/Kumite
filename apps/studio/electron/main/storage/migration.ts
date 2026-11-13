import fs from 'node:fs';
import path from 'node:path';

export interface MigrationReport {
    status: 'no-legacy-data' | 'already-migrated' | 'migrated' | 'partial' | 'failed';
    legacyDir: string | null;
    targetDir: string;
    copied: string[];
    keptExisting: string[];
    skippedInvalid: string[];
    message: string;
}

export interface MigrationOptions {
    /** Directories to look for, in order, under the platform's appData root. */
    legacyCandidates: string[];
    targetDir: string;
    /** Overridable for tests; defaults to now. */
    timestamp?: string;
}

const MARKER_FILE = 'migration.json';
const STAGING_DIR = '.migration-staging';

/** Written as base64 ciphertext by safeStorage, not JSON. Copied as opaque bytes. */
const OPAQUE_FILES = new Set(['auth-tokens-v1.json']);

/**
 * Copies an Onlook-era user-data directory into the Kumite one.
 *
 * Rules: the source is never modified or deleted, an existing target file is
 * never overwritten, every plain JSON file is parsed before it is accepted, and
 * a run that dies part-way leaves no marker so the next launch retries. The
 * operation is idempotent.
 */
export function migrateUserData(options: MigrationOptions): MigrationReport {
    const { targetDir } = options;
    const report: MigrationReport = {
        status: 'no-legacy-data',
        legacyDir: null,
        targetDir,
        copied: [],
        keptExisting: [],
        skippedInvalid: [],
        message: '',
    };

    const legacyDir = options.legacyCandidates.find((candidate) => {
        try {
            return fs.statSync(candidate).isDirectory();
        } catch {
            return false;
        }
    });
    if (!legacyDir) {
        report.message = 'No previous Onlook data directory was found.';
        return report;
    }
    report.legacyDir = legacyDir;

    const markerPath = path.join(targetDir, MARKER_FILE);
    const existingMarker = readJson(markerPath);
    if (existingMarker?.completedAt) {
        report.status = 'already-migrated';
        report.message = `User data was already migrated at ${existingMarker.completedAt}.`;
        return report;
    }

    try {
        fs.mkdirSync(targetDir, { recursive: true });
        removeStaleStaging(targetDir);

        const stagingDir = path.join(targetDir, STAGING_DIR);
        fs.mkdirSync(stagingDir, { recursive: true });

        for (const entry of listFiles(legacyDir)) {
            const bytes = fs.readFileSync(entry.absolute);
            if (!isAcceptable(entry.relative, bytes)) {
                report.skippedInvalid.push(toReportPath(entry.relative));
                continue;
            }
            const stagedPath = path.join(stagingDir, entry.relative);
            fs.mkdirSync(path.dirname(stagedPath), { recursive: true });
            fs.writeFileSync(stagedPath, bytes);
        }

        for (const entry of listFiles(stagingDir)) {
            const targetPath = path.join(targetDir, entry.relative);
            if (fs.existsSync(targetPath)) {
                report.keptExisting.push(toReportPath(entry.relative));
                continue;
            }
            fs.mkdirSync(path.dirname(targetPath), { recursive: true });
            fs.renameSync(entry.absolute, targetPath);
            report.copied.push(toReportPath(entry.relative));
        }

        fs.rmSync(stagingDir, { recursive: true, force: true });

        report.status = report.skippedInvalid.length > 0 ? 'partial' : 'migrated';
        report.message = buildMessage(report);

        fs.writeFileSync(
            markerPath,
            JSON.stringify(
                {
                    from: legacyDir,
                    completedAt: options.timestamp ?? new Date().toISOString(),
                    copied: report.copied,
                    keptExisting: report.keptExisting,
                    skippedInvalid: report.skippedInvalid,
                },
                null,
                2,
            ),
        );
        return report;
    } catch (error: any) {
        fs.rmSync(path.join(targetDir, STAGING_DIR), { recursive: true, force: true });
        report.status = 'failed';
        report.message = `Migrating previous user data failed: ${error?.message ?? error}`;
        return report;
    }
}

function isAcceptable(relative: string, bytes: Buffer): boolean {
    if (!relative.endsWith('.json')) {
        return true;
    }
    if (OPAQUE_FILES.has(path.basename(relative))) {
        return bytes.length > 0;
    }
    if (bytes.length === 0) {
        // `clear()` writes an empty file; the reader treats it as absent.
        return true;
    }
    try {
        JSON.parse(bytes.toString('utf8'));
        return true;
    } catch {
        return false;
    }
}

function toReportPath(relative: string): string {
    return relative.split(path.sep).join('/');
}

function listFiles(root: string, prefix = ''): { relative: string; absolute: string }[] {    const entries = fs.readdirSync(path.join(root, prefix), { withFileTypes: true });
    const files: { relative: string; absolute: string }[] = [];
    for (const entry of entries) {
        const relative = prefix ? path.join(prefix, entry.name) : entry.name;
        if (relative === MARKER_FILE || relative.startsWith(STAGING_DIR)) {
            continue;
        }
        if (entry.isDirectory()) {
            files.push(...listFiles(root, relative));
        } else if (entry.isFile()) {
            files.push({ relative, absolute: path.join(root, relative) });
        }
    }
    return files;
}

function removeStaleStaging(targetDir: string) {
    fs.rmSync(path.join(targetDir, STAGING_DIR), { recursive: true, force: true });
}

function readJson(filePath: string): { completedAt?: string } | null {
    try {
        return JSON.parse(fs.readFileSync(filePath, 'utf8'));
    } catch {
        return null;
    }
}

function buildMessage(report: MigrationReport): string {
    const parts = [`Copied ${report.copied.length} file(s) from ${report.legacyDir}.`];
    if (report.keptExisting.length > 0) {
        parts.push(
            `Kept ${report.keptExisting.length} existing Kumite file(s): ${report.keptExisting.join(', ')}.`,
        );
    }
    if (report.skippedInvalid.length > 0) {
        parts.push(
            `Skipped unreadable file(s): ${report.skippedInvalid.join(', ')}. The originals are untouched in ${report.legacyDir}.`,
        );
    }
    return parts.join(' ');
}
