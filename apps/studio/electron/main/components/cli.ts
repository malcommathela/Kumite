import type { PackageManager } from '@kumite/models';
import { COMPONENT_CLI_VERSION } from '@kumite/models';
import { execFile, spawn, spawnSync, type ChildProcess } from 'child_process';
import path from 'path';
import { promisify } from 'util';
import { isTransientNetworkFailure, withTransientRetry } from './install-queue';

const execFileAsync = promisify(execFile);

const COMMAND_TIMEOUT_MS = 10 * 60 * 1000;

async function bunExecutablePath(): Promise<string> {
    const { getBunExecutablePath } = await import('../bun');
    return getBunExecutablePath();
}

export interface ShadcnCommandResult {
    command: string;
    success: boolean;
    output: string;
}

export interface CommandProgress {
    /** Latest chunk of stdout/stderr, already stripped of ANSI colours. */
    chunk: string;
}

export type ProgressListener = (progress: CommandProgress) => void;

export async function buildShadcnCommand(
    packageManager: PackageManager,
    args: string[],
): Promise<{ command: string; args: string[] }> {
    const cli = `shadcn@${COMPONENT_CLI_VERSION}`;
    switch (packageManager) {
        case 'pnpm':
            return { command: 'pnpm', args: ['dlx', cli, ...args] };
        case 'bun':
            // The desktop bundle carries Bun, but a user's PATH need not.
            return { command: await bunExecutablePath(), args: ['x', cli, ...args] };
        default:
            return { command: 'npx', args: ['--yes', cli, ...args] };
    }
}

export async function buildPackageManagerCommand(
    packageManager: PackageManager,
    packages: string[],
): Promise<{ command: string; args: string[] }> {
    switch (packageManager) {
        case 'pnpm':
            return { command: 'pnpm', args: ['add', ...packages] };
        case 'yarn':
            return { command: 'yarn', args: ['add', ...packages] };
        case 'bun':
            return { command: await bunExecutablePath(), args: ['add', ...packages] };
        default:
            return { command: 'npm', args: ['install', ...packages] };
    }
}

export async function runShadcnCommand(
    projectPath: string,
    packageManager: PackageManager,
    args: string[],
    onProgress?: ProgressListener,
): Promise<ShadcnCommandResult> {
    const { command, args: commandArgs } = await buildShadcnCommand(packageManager, args);
    return runProjectCommand(command, commandArgs, projectPath, packageManager, onProgress);
}

/**
 * `shadcn add` touches the network. A dropped connection or a registry `5xx`
 * is retried; a rejected component name or a 404 is not.
 */
export async function runShadcnCommandWithRetry(
    projectPath: string,
    packageManager: PackageManager,
    args: string[],
    onProgress?: ProgressListener,
): Promise<ShadcnCommandResult> {
    return withTransientRetry(
        (attempt) => {
            onProgress?.({ chunk: attempt > 1 ? `Retrying (attempt ${attempt})…` : '' });
            return runShadcnCommand(projectPath, packageManager, args, onProgress);
        },
        (result) => !result.success && isTransientNetworkFailure(result.output),
    );
}

export async function runPackageManagerCommand(
    projectPath: string,
    packageManager: PackageManager,
    packages: string[],
    onProgress?: ProgressListener,
    signal?: AbortSignal,
): Promise<ShadcnCommandResult> {
    const { command, args } = await buildPackageManagerCommand(packageManager, packages);
    return runProjectCommand(command, args, projectPath, packageManager, onProgress, signal);
}

/** Installs the dependencies already declared in the project's package.json. */
export async function runPackageManagerInstall(
    projectPath: string,
    packageManager: PackageManager,
    onProgress?: ProgressListener,
    signal?: AbortSignal,
    ignoreScripts = false,
): Promise<ShadcnCommandResult> {
    const command = packageManager === 'bun' ? await bunExecutablePath() : packageManager;
    return runProjectCommand(
        command,
        ['install', ...(ignoreScripts ? ['--ignore-scripts'] : [])],
        projectPath,
        packageManager,
        onProgress,
        signal,
    );
}

async function commandEnvironment(packageManager: PackageManager): Promise<NodeJS.ProcessEnv> {
    return {
        ...process.env,
        // The desktop app runs with NODE_ENV=production. npm would otherwise omit
        // devDependencies while the shadcn CLI installs component packages.
        NODE_ENV: 'development',
        npm_config_production: 'false',
        npm_config_omit: '',
        ...(packageManager === 'bun'
            ? {
                  PATH: `${path.dirname(await bunExecutablePath())}${path.delimiter}${process.env.PATH ?? ''}`,
              }
            : {}),
        CI: '1',
        NO_COLOR: '1',
        FORCE_COLOR: '0',
        npm_config_yes: 'true',
    };
}

async function runProjectCommand(
    command: string,
    commandArgs: string[],
    projectPath: string,
    packageManager: PackageManager,
    onProgress?: ProgressListener,
    signal?: AbortSignal,
): Promise<ShadcnCommandResult> {
    const printable = `${command} ${commandArgs.join(' ')}`;
    const useShell = process.platform === 'win32' && packageManager !== 'bun';
    const env = await commandEnvironment(packageManager);

    if (onProgress || signal) {
        return runStreamingCommand(command, commandArgs, {
            cwd: projectPath,
            shell: useShell,
            printable,
            onProgress: onProgress ?? (() => undefined),
            env,
            signal,
        });
    }

    try {
        const { stdout, stderr } = await execFileAsync(command, commandArgs, {
            cwd: projectPath,
            shell: useShell,
            windowsHide: true,
            timeout: COMMAND_TIMEOUT_MS,
            maxBuffer: 20 * 1024 * 1024,
            env,
            signal,
        });
        return { command: printable, success: true, output: stripAnsi(`${stdout}\n${stderr}`) };
    } catch (error: any) {
        const output = stripAnsi(
            [error?.stdout, error?.stderr, error?.message].filter(Boolean).join('\n'),
        );
        return { command: printable, success: false, output };
    }
}

interface StreamingOptions {
    cwd: string;
    shell: boolean;
    printable: string;
    env: NodeJS.ProcessEnv;
    onProgress: ProgressListener;
    signal?: AbortSignal;
}

/**
 * Same contract as the buffered runner, but reports output while it arrives and
 * kills the process on timeout instead of leaking it.
 */
function runStreamingCommand(
    command: string,
    commandArgs: string[],
    options: StreamingOptions,
): Promise<ShadcnCommandResult> {
    return new Promise((resolve) => {
        let output = '';
        let settled = false;
        let child: ChildProcess;
        let abort = () => undefined;
        const finish = (success: boolean) => {
            if (settled) {
                return;
            }
            settled = true;
            clearTimeout(timer);
            options.signal?.removeEventListener('abort', abort);
            resolve({ command: options.printable, success, output: stripAnsi(output) });
        };
        const timer = setTimeout(() => {
            killProcess(child);
            output += '\nThe install timed out.';
            finish(false);
        }, COMMAND_TIMEOUT_MS);

        try {
            if (options.signal?.aborted) {
                finish(false);
                return;
            }
            child = spawn(command, commandArgs, {
                cwd: options.cwd,
                shell: options.shell,
                detached: process.platform !== 'win32',
                windowsHide: true,
                env: options.env,
                stdio: ['ignore', 'pipe', 'pipe'],
            });
        } catch (error: any) {
            output += `\n${error?.message ?? 'Failed to start the command.'}`;
            finish(false);
            return;
        }

        abort = () => {
            output += '\nThe install was cancelled.';
            killProcess(child);
        };
        options.signal?.addEventListener('abort', abort, { once: true });
        if (options.signal?.aborted) {
            abort();
        }

        const append = (data: Buffer) => {
            const chunk = stripAnsi(data.toString());
            if (!chunk) {
                return;
            }
            output = (output + chunk).slice(-20000);
            options.onProgress({ chunk });
        };
        child.stdout?.on('data', append);
        child.stderr?.on('data', append);
        child.on('error', (error) => {
            output += `\n${error.message}`;
            finish(false);
        });
        child.on('close', (code) => finish(code === 0));
    });
}

function killProcess(child: ChildProcess): void {
    if (!child || child.exitCode !== null || !child.pid) {
        return;
    }
    if (process.platform === 'win32') {
        spawnSync('taskkill', ['/pid', String(child.pid), '/T', '/F'], {
            windowsHide: true,
            stdio: 'ignore',
        });
        return;
    }
    try {
        process.kill(-child.pid, 'SIGTERM');
    } catch {
        child.kill('SIGTERM');
    }
}

function stripAnsi(value: string): string {
    return value.replace(/\u001b\[[0-9;]*m/g, '').trim();
}
