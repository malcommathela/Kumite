import type { PackageManager } from '@kumite/models';
import { COMPONENT_CLI_VERSION } from '@kumite/models';
import { execFile } from 'child_process';
import path from 'path';
import { promisify } from 'util';
import { getBunExecutablePath } from '../bun';

const execFileAsync = promisify(execFile);

const COMMAND_TIMEOUT_MS = 10 * 60 * 1000;

export interface ShadcnCommandResult {
    command: string;
    success: boolean;
    output: string;
}

export function buildShadcnCommand(
    packageManager: PackageManager,
    args: string[],
): { command: string; args: string[] } {
    const cli = `shadcn@${COMPONENT_CLI_VERSION}`;
    switch (packageManager) {
        case 'pnpm':
            return { command: 'pnpm', args: ['dlx', cli, ...args] };
        case 'bun':
            // The desktop bundle carries Bun, but a user's PATH need not.
            return { command: getBunExecutablePath(), args: ['x', cli, ...args] };
        default:
            return { command: 'npx', args: ['--yes', cli, ...args] };
    }
}

export async function runShadcnCommand(
    projectPath: string,
    packageManager: PackageManager,
    args: string[],
): Promise<ShadcnCommandResult> {
    const { command, args: commandArgs } = buildShadcnCommand(packageManager, args);
    const printable = `${command} ${commandArgs.join(' ')}`;

    try {
        const { stdout, stderr } = await execFileAsync(command, commandArgs, {
            cwd: projectPath,
            shell: process.platform === 'win32' && packageManager !== 'bun',
            windowsHide: true,
            timeout: COMMAND_TIMEOUT_MS,
            maxBuffer: 20 * 1024 * 1024,
            env: {
                ...process.env,
                // The desktop app runs with NODE_ENV=production. npm would otherwise omit
                // devDependencies while the shadcn CLI installs component packages.
                NODE_ENV: 'development',
                npm_config_production: 'false',
                npm_config_omit: '',
                ...(packageManager === 'bun'
                    ? {
                          PATH: `${path.dirname(getBunExecutablePath())}${path.delimiter}${process.env.PATH ?? ''}`,
                      }
                    : {}),
                CI: '1',
                NO_COLOR: '1',
                FORCE_COLOR: '0',
                npm_config_yes: 'true',
            },
        });
        return { command: printable, success: true, output: stripAnsi(`${stdout}\n${stderr}`) };
    } catch (error: any) {
        const output = stripAnsi(
            [error?.stdout, error?.stderr, error?.message].filter(Boolean).join('\n'),
        );
        return { command: printable, success: false, output };
    }
}

function stripAnsi(value: string): string {
    return value.replace(/\u001b\[[0-9;]*m/g, '').trim();
}
