import { SetupStage, type SetupCallback } from '@kumite/models';
import { runBunCommand } from '../bun';
import { removePackageManagerLockfiles } from '../package-manager';
import fs from 'fs';
import path from 'path';

export const installProjectDependencies = async (
    targetPath: string,
    installCommand: string,
    onProgress: SetupCallback,
): Promise<void> => {
    try {
        onProgress(SetupStage.INSTALLING, 'Installing required packages...');
        const result = await runBunCommand(installCommand, {
            cwd: targetPath,
        });

        if (!result.success) {
            throw new Error(`Failed to install dependencies: ${result.error}`);
        }

        onProgress(SetupStage.COMPLETE, 'Project dependencies installed.');
    } catch (err) {
        console.error(err);
        onProgress(
            SetupStage.ERROR,
            err instanceof Error ? err.message : 'An unknown error occurred.',
        );
    }
};

export const reinstallProjectDependencies = async (
    targetPath: string,
    installCommand: string,
    onProgress: SetupCallback,
): Promise<void> => {
    try {
        onProgress(SetupStage.INSTALLING, 'Cleaning up previous dependencies...');

        const nodeModulesPath = path.join(targetPath, 'node_modules');
        if (fs.existsSync(nodeModulesPath)) {
            await fs.promises.rm(nodeModulesPath, { recursive: true, force: true });
        }

        removePackageManagerLockfiles(targetPath);

        onProgress(SetupStage.INSTALLING, 'Reinstalling packages...');
        const result = await runBunCommand(installCommand, {
            cwd: targetPath,
        });

        if (!result.success) {
            throw new Error(`Failed to reinstall dependencies: ${result.error}`);
        }

        onProgress(SetupStage.COMPLETE, 'Project dependencies reinstalled successfully.');
    } catch (err) {
        console.error(err);
        onProgress(
            SetupStage.ERROR,
            err instanceof Error ? err.message : 'An unknown error occurred during reinstallation.',
        );
    }
};
