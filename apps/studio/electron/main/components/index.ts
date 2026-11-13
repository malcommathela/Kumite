import type {
    ShadcnInitResult,
    ShadcnInstallResult,
    ShadcnPreviewResult,
    ShadcnProjectStatus,
} from '@kumite/models';
import { getShadcnLibraryItem, isShadcnBlock } from '@kumite/models';
import { app } from 'electron';
import fs from 'fs';
import path from 'path';
import { runShadcnCommand } from './cli';
import { restoreFiles, snapshotFiles } from './files';
import {
    findBlockComponent,
    findComponentFile,
    inspectProject,
    readPackageJson,
    resolveAlias,
} from './inspect';
import { componentPreviewServer } from './preview';
import { recordComponentInstallation } from './provenance';
import { normalizeOklchTheme } from './theme';

function resolveProjectPath(projectPath: unknown): string {
    if (typeof projectPath !== 'string' || projectPath.trim().length === 0) {
        throw new Error('No active project path was provided.');
    }
    const resolved = path.resolve(projectPath);
    if (!fs.existsSync(path.join(resolved, 'package.json'))) {
        throw new Error('The active project does not contain a package.json.');
    }
    return resolved;
}

function unsupportedStatus(projectPath: string, reason: string): ShadcnProjectStatus {
    return {
        projectPath,
        supported: false,
        reason,
        previewSupported: false,
        previewReason: 'Open a supported project with Vite installed to preview components.',
        framework: 'unknown',
        packageManager: null,
        tailwind: false,
        initialized: false,
        uiDir: null,
        uiAlias: null,
        componentsAlias: null,
        componentsJsonPath: null,
        installed: {},
    };
}

export function getComponentStatus(projectPath: unknown): ShadcnProjectStatus {
    try {
        return inspectProject(resolveProjectPath(projectPath));
    } catch (error: any) {
        return unsupportedStatus(
            typeof projectPath === 'string' ? projectPath : '',
            error?.message ?? 'Could not inspect the active project.',
        );
    }
}

function applyThemeNormalization(root: string): string {
    const result = normalizeOklchTheme(root);
    if (result.replacements > 0 && result.file) {
        return `Rewrote ${result.replacements} design tokens in ${path
            .relative(root, result.file)
            .split(path.sep)
            .join('/')} to HSL so the project's hsl(var(--...)) Tailwind mappings resolve.`;
    }
    return result.skipped ? `Theme tokens were left unchanged: ${result.skipped}` : '';
}

export async function initializeComponents(projectPath: unknown): Promise<ShadcnInitResult> {
    let root: string;
    try {
        root = resolveProjectPath(projectPath);
    } catch (error: any) {
        return {
            success: false,
            message: error?.message ?? 'Invalid project.',
            log: '',
            status: null,
        };
    }

    let status = inspectProject(root);
    if (!status.supported) {
        return {
            success: false,
            message: status.reason ?? 'Project is not supported.',
            log: '',
            status,
        };
    }
    if (status.initialized) {
        const themeNote = applyThemeNormalization(root);
        return {
            success: true,
            message: `shadcn/ui is already initialized in this project.${themeNote ? ` ${themeNote}` : ''}`,
            log: themeNote,
            status,
        };
    }
    if (!status.packageManager) {
        return { success: false, message: 'Could not detect a package manager.', log: '', status };
    }

    const result = await runShadcnCommand(root, status.packageManager, ['init', '-d']);
    status = inspectProject(root);
    if (!result.success || !status.initialized) {
        return {
            success: false,
            message: 'shadcn init did not complete. See the log for details.',
            log: `${result.command}\n\n${result.output}`,
            status,
        };
    }
    const themeNote = applyThemeNormalization(root);
    return {
        success: true,
        message: `shadcn/ui initialized. Tailwind and CSS variables were configured.${themeNote ? ` ${themeNote}` : ''}`,
        log: `${result.command}\n\n${result.output}${themeNote ? `\n\n${themeNote}` : ''}`,
        status,
    };
}

function componentDirectories(root: string, status: ShadcnProjectStatus): string[] {
    return [
        status.uiDir,
        resolveAlias(root, status.componentsAlias ?? '@/components'),
        path.join(root, 'app'),
        path.join(root, 'src', 'app'),
    ].filter((directory): directory is string => Boolean(directory));
}

export async function installComponent(
    projectPath: unknown,
    componentName: unknown,
): Promise<ShadcnInstallResult> {
    const definition =
        typeof componentName === 'string' ? getShadcnLibraryItem(componentName) : undefined;
    if (!definition) {
        return {
            component: String(componentName ?? ''),
            success: false,
            initialized: false,
            message: 'That component is not part of the supported catalog.',
            log: '',
            status: null,
        };
    }
    if (definition.installable === false) {
        return {
            component: definition.name,
            success: false,
            initialized: false,
            message: definition.limitation ?? `${definition.title} is not installable.`,
            log: '',
            status: null,
        };
    }

    let root: string;
    try {
        root = resolveProjectPath(projectPath);
    } catch (error: any) {
        return {
            component: definition.name,
            success: false,
            initialized: false,
            message: error?.message ?? 'Invalid project.',
            log: '',
            status: null,
        };
    }

    let status = inspectProject(root);
    if (!status.supported) {
        return {
            component: definition.name,
            success: false,
            initialized: status.initialized,
            message: status.reason ?? 'Project is not supported.',
            log: '',
            status,
        };
    }
    if (!status.packageManager) {
        return {
            component: definition.name,
            success: false,
            initialized: status.initialized,
            message: 'Could not detect a package manager.',
            log: '',
            status,
        };
    }

    let log = '';
    let initialized = status.initialized;
    if (!initialized) {
        const init = await initializeComponents(root);
        log += `${init.log}\n\n`;
        if (!init.success || !init.status?.initialized) {
            return {
                component: definition.name,
                success: false,
                initialized: false,
                message: init.message,
                log: log.trim(),
                status: init.status,
            };
        }
        initialized = true;
        status = init.status;
    }

    const packageManager = status.packageManager;
    if (!packageManager) {
        return {
            component: definition.name,
            success: false,
            initialized,
            message: 'Could not detect a package manager.',
            log: log.trim(),
            status,
        };
    }

    // Never overwrite a component the project already owns.
    const existing = isShadcnBlock(definition)
        ? status.installed[definition.name]
            ? findBlockComponent(
                  root,
                  status.componentsAlias ?? undefined,
                  definition.componentFile,
              )
            : null
        : findComponentFile(status.uiDir, definition.name);
    if (isShadcnBlock(definition) && !status.installed[definition.name]) {
        const targetExists = definition.files
            .map((file) => findBlockComponent(root, status.componentsAlias ?? undefined, file))
            .find((file): file is string => Boolean(file));
        if (targetExists) {
            return {
                component: definition.name,
                success: false,
                initialized,
                message: `The block target ${path.relative(root, targetExists)} already exists. Kumite will not overwrite it.`,
                log: log.trim(),
                status,
            };
        }
    }
    if (existing) {
        status = inspectProject(root);
        const missingDependencies = verifyDependencies(root, definition.dependencies);
        const missingRegistryItems = definition.registryDependencies.filter(
            (registryDependency) => !status.installed[registryDependency],
        );
        return {
            component: definition.name,
            success: missingDependencies.length === 0 && missingRegistryItems.length === 0,
            initialized,
            message:
                missingDependencies.length === 0 && missingRegistryItems.length === 0
                    ? `${definition.title} is already installed at ${path.relative(root, existing)}.`
                    : `${definition.title} exists at ${path.relative(root, existing)}, but the project is missing ${[
                          ...missingDependencies.map((name) => `packages ${name}`),
                          ...missingRegistryItems.map((name) => `shadcn components ${name}`),
                      ].join(', ')}. Add them before using this item.`,
            log: log.trim(),
            status,
        };
    }

    const itemReference = isShadcnBlock(definition) ? definition.registryUrl : definition.name;
    const snapshot = snapshotFiles(componentDirectories(root, status));
    let result: Awaited<ReturnType<typeof runShadcnCommand>>;
    try {
        result = await runShadcnCommand(root, packageManager, [
            'add',
            itemReference,
            '-y',
            '--overwrite',
        ]);
    } finally {
        restoreFiles(snapshot);
    }
    log += `${result.command}\n\n${result.output}`;

    let refreshed = inspectProject(root);
    const installedFile = isShadcnBlock(definition)
        ? findBlockComponent(root, refreshed.componentsAlias ?? undefined, definition.componentFile)
        : findComponentFile(refreshed.uiDir, definition.name);
    if (!result.success || !installedFile) {
        return {
            component: definition.name,
            success: false,
            initialized,
            message: `Installing ${definition.title} failed. See the log for the CLI output.`,
            log: log.trim(),
            status: refreshed,
        };
    }

    recordComponentInstallation(root, definition.name, refreshed.uiDir);
    refreshed = inspectProject(root);

    const missingDependencies = verifyDependencies(root, definition.dependencies);
    const missingRegistryItems = definition.registryDependencies.filter(
        (registryDependency) => !refreshed.installed[registryDependency],
    );
    const fileLabel = path.relative(root, installedFile);
    return {
        component: definition.name,
        success: true,
        initialized,
        message:
            missingDependencies.length === 0 && missingRegistryItems.length === 0
                ? `Installed ${definition.title} to ${fileLabel}.`
                : `Installed ${definition.title} to ${fileLabel}. Missing ${[
                      ...missingDependencies.map((name) => `packages ${name}`),
                      ...missingRegistryItems.map((name) => `shadcn components ${name}`),
                  ].join(', ')}.`,
        log: log.trim(),
        status: refreshed,
    };
}

function verifyDependencies(projectPath: string, dependencies: string[]): string[] {
    if (dependencies.length === 0) {
        return [];
    }
    const packageJson = readPackageJson(projectPath);
    const declared = {
        ...(packageJson?.dependencies ?? {}),
        ...(packageJson?.devDependencies ?? {}),
    };
    return dependencies.filter((dependency) => !declared[dependency]);
}

export async function startComponentPreview(
    projectPath: unknown,
    componentName: unknown,
): Promise<ShadcnPreviewResult> {
    const definition =
        typeof componentName === 'string' ? getShadcnLibraryItem(componentName) : undefined;
    if (!definition) {
        return {
            component: String(componentName ?? ''),
            url: null,
            error: 'That component is not part of the supported catalog.',
            log: null,
        };
    }
    if (isShadcnBlock(definition) && definition.previewUrl) {
        return {
            component: definition.name,
            url: definition.previewUrl,
            error: null,
            log: null,
        };
    }
    let root: string;
    try {
        root = resolveProjectPath(projectPath);
    } catch (error: any) {
        return {
            component: definition.name,
            url: null,
            error: error?.message ?? 'Invalid project.',
            log: null,
        };
    }

    const status = inspectProject(root);
    if (!status.supported) {
        return {
            component: definition.name,
            url: null,
            error: status.reason ?? 'Project is not supported.',
            log: null,
        };
    }
    if (!status.installed[definition.name]) {
        return {
            component: definition.name,
            url: null,
            error: `${definition.title} is not installed in this project yet.`,
            log: null,
        };
    }

    const result = await componentPreviewServer.start(status, definition);
    return { component: definition.name, url: result.url, error: result.error, log: result.log };
}

export async function stopComponentPreview(): Promise<boolean> {
    await componentPreviewServer.stop();
    return true;
}

app.on('before-quit', () => {
    void componentPreviewServer.stop();
});
