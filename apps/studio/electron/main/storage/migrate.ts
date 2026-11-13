import { app } from 'electron';
import path from 'node:path';
import { migrateUserData, type MigrationReport } from './migration';

/** Directory names earlier builds used under the platform appData root. */
const LEGACY_APP_NAMES = ['Onlook', '@onlook/studio', 'onlook'];

let report: MigrationReport | null = null;

/**
 * Runs once per process, before the first storage read.
 *
 * Electron derives `userData` from the product name, so the rebrand moved the
 * storage root. Without this, an existing Onlook install would look empty and
 * the first write would create a fresh, empty settings file beside the old one.
 */
export function ensureLegacyUserDataMigrated(): MigrationReport {
    if (report) {
        return report;
    }
    const appDataDir = app.getPath('appData');
    const targetDir = app.getPath('userData');
    report = migrateUserData({
        legacyCandidates: LEGACY_APP_NAMES.map((name) => path.join(appDataDir, name)).filter(
            (candidate) => path.resolve(candidate) !== path.resolve(targetDir),
        ),
        targetDir,
    });
    if (report.status === 'migrated' || report.status === 'partial') {
        console.log(`[migration] ${report.message}`);
    } else if (report.status === 'failed') {
        console.error(`[migration] ${report.message}`);
    }
    return report;
}
