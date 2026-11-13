import type { RunBunCommandResult } from '@kumite/models';
import { runBunCommand } from '../bun';

export async function runBuildScript(
    folderPath: string,
    buildScript: string,
): Promise<RunBunCommandResult> {
    return await runBunCommand(buildScript, {
        cwd: folderPath,
        env: { ...process.env, NODE_ENV: 'production' },
    });
}
