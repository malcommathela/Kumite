import type {
    PackageManager,
    ShadcnCatalogPreview,
    ShadcnInitResult,
    ShadcnInstallProgress,
    ShadcnInstallResult,
    ShadcnLibraryItem,
    ShadcnPreviewResult,
    ShadcnProjectStatus,
} from '@kumite/models';
import { getShadcnLibraryItem, isShadcnBlock, SHADCN_COMPONENTS } from '@kumite/models';
import fs from 'fs';
import path from 'path';
import { ensureCatalogBase, installCatalogItems } from './catalog';
import { runPackageManagerCommand, runShadcnCommand, runShadcnCommandWithRetry } from './cli';
import { isEmptyFile, restoreFiles, snapshotFiles } from './files';
import {
    findBlockComponent,
    findComponentFile,
    inspectProject,
    missingPackages,
    resolveAlias,
    resolveCssFile,
} from './inspect';
import { isInstallCancelled, sharedInstallQueue } from './install-queue';
import { guardEmptyChartContainer } from './patches';
import { catalogPreviewServer, componentPreviewServer } from './preview';
import { recordComponentInstallation } from './provenance';
import { normalizeOklchTheme, ensureShadcnBaseLayer } from './theme';

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

function baseLayerNote(root: string): string {
    const baseLayer = ensureShadcnBaseLayer(root);
    if (!baseLayer.file) {
        return '';
    }
    const file = path.relative(root, baseLayer.file).split(path.sep).join('/');
    const notes: string[] = [];
    if (baseLayer.added) {
        notes.push(
            `Added the shadcn base layer to ${file} so borders use the design token instead of currentColor.`,
        );
    }
    if (baseLayer.removedDuplicates > 0) {
        notes.push(
            `Removed ${baseLayer.removedDuplicates} duplicated @apply declaration${
                baseLayer.removedDuplicates === 1 ? '' : 's'
            } in ${file}.`,
        );
    }
    return notes.join(' ');
}

function applyThemeNormalization(root: string): string {
    const notes: string[] = [];
    const result = normalizeOklchTheme(root);
    if (result.replacements > 0 && result.file) {
        notes.push(
            `Rewrote ${result.replacements} design tokens in ${path
                .relative(root, result.file)
                .split(path.sep)
                .join('/')} to HSL so the project's hsl(var(--...)) Tailwind mappings resolve.`,
        );
    }
    if (result.skipped) {
        notes.push(`Theme tokens were left unchanged: ${result.skipped}`);
    }

    const baseNote = baseLayerNote(root);
    if (baseNote) {
        notes.push(baseNote);
    }
    return notes.join(' ');
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

/**
 * Registry dependencies the catalog knows about that the project does not have.
 * Names outside the catalog (`use-mobile`) are hooks the CLI writes under another
 * alias, so the component map cannot verify them.
 */
function missingRegistryItems(
    status: ShadcnProjectStatus,
    definition: ShadcnLibraryItem,
): string[] {
    return definition.registryDependencies.filter(
        (name) => getShadcnLibraryItem(name) !== undefined && !status.installed[name],
    );
}

interface InstallProgressReporter {
    (phase: ShadcnInstallProgress['phase'], message: string, chunk?: string | null): void;
}

function componentInstallKey(root: string, name: string): string {
    return `component:${root}:${name}`;
}

function failedInstall(
    component: string,
    message: string,
    status: ShadcnProjectStatus | null = null,
    log = '',
): ShadcnInstallResult {
    return { component, success: false, initialized: false, message, log, status };
}

function createProgressReporter(
    component: string,
    onProgress?: (progress: ShadcnInstallProgress) => void,
): InstallProgressReporter {
    let output = '';
    let lastSentAt = 0;
    return (phase, message, chunk) => {
        if (!onProgress) {
            return;
        }
        if (chunk) {
            output = `${output}${chunk}`.slice(-4000);
            // The CLI writes many small chunks; the host only needs a tail.
            if (phase === 'installing' && Date.now() - lastSentAt < 250) {
                return;
            }
            lastSentAt = Date.now();
        }
        onProgress({ component, phase, message, output: output || null });
    };
}

export async function installComponent(
    projectPath: unknown,
    componentName: unknown,
    onProgress?: (progress: ShadcnInstallProgress) => void,
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
        return failedInstall(definition.name, error?.message ?? 'Invalid project.');
    }

    const report = createProgressReporter(definition.name, onProgress);
    report('queued', `Waiting to install ${definition.title}…`);
    try {
        return await sharedInstallQueue.enqueue(componentInstallKey(root, definition.name), () =>
            runInstallComponent(root, definition, report),
        );
    } catch (error) {
        if (isInstallCancelled(error)) {
            return failedInstall(
                definition.name,
                `The queued install for ${definition.title} was cancelled before it started.`,
            );
        }
        throw error;
    }
}

/** Cancels an install only while it is still waiting in the queue. */
export function cancelComponentInstall(projectPath: unknown, componentName: unknown): boolean {
    if (typeof componentName !== 'string') {
        return false;
    }
    try {
        return sharedInstallQueue.cancel(
            componentInstallKey(resolveProjectPath(projectPath), componentName),
        );
    } catch {
        return false;
    }
}

async function runInstallComponent(
    root: string,
    definition: ShadcnLibraryItem,
    report: InstallProgressReporter,
): Promise<ShadcnInstallResult> {
    report('running', `Preparing ${definition.title}…`);
    const finish = (result: ShadcnInstallResult): ShadcnInstallResult => {
        report('done', result.success ? result.message : `Could not install ${definition.title}.`);
        return result;
    };

    let status = inspectProject(root);
    if (!status.supported) {
        return finish({
            component: definition.name,
            success: false,
            initialized: status.initialized,
            message: status.reason ?? 'Project is not supported.',
            log: '',
            status,
        });
    }
    if (!status.packageManager) {
        return finish({
            component: definition.name,
            success: false,
            initialized: status.initialized,
            message: 'Could not detect a package manager.',
            log: '',
            status,
        });
    }

    let log = '';
    let initialized = status.initialized;
    if (!initialized) {
        report('running', `Initializing shadcn/ui for ${definition.title}…`);
        const init = await initializeComponents(root);
        log += `${init.log}\n\n`;
        if (!init.success || !init.status?.initialized) {
            return finish({
                component: definition.name,
                success: false,
                initialized: false,
                message: init.message,
                log: log.trim(),
                status: init.status,
            });
        }
        initialized = true;
        status = init.status;
    }

    const packageManager = status.packageManager;
    if (!packageManager) {
        return finish({
            component: definition.name,
            success: false,
            initialized,
            message: 'Could not detect a package manager.',
            log: log.trim(),
            status,
        });
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
    // A zero-byte file is a broken install, not user work: React renders it as
    // `undefined` and every page that uses it crashes. Treat it as missing so
    // the install below refills it (the snapshot skips empty files).
    const ownedFiles = (
        isShadcnBlock(definition)
            ? [
                  existing,
                  ...definition.files.map((file) =>
                      findBlockComponent(root, status.componentsAlias ?? undefined, file),
                  ),
              ]
            : [existing]
    ).filter((file): file is string => Boolean(file));
    const truncated = ownedFiles.some((file) => isEmptyFile(file));
    if (isShadcnBlock(definition) && !status.installed[definition.name] && !truncated) {
        const targetExists = definition.files
            .map((file) => findBlockComponent(root, status.componentsAlias ?? undefined, file))
            .find((file): file is string => Boolean(file));
        if (targetExists) {
            return finish({
                component: definition.name,
                success: false,
                initialized,
                message: `The block target ${path.relative(root, targetExists)} already exists. Kumite will not overwrite it.`,
                log: log.trim(),
                status,
            });
        }
    }
    if (existing && !truncated) {
        const ensured = await ensurePackages(root, packageManager, definition);
        if (ensured.log) {
            log += `${ensured.log}\n\n`;
        }
        guardEmptyChartContainer(status.uiDir);
        status = inspectProject(root);
        const problems = [
            ...ensured.missing.map((name) => `packages ${name}`),
            ...missingRegistryItems(status, definition).map((name) => `shadcn components ${name}`),
        ];
        const location = path.relative(root, existing);
        const packageNote =
            ensured.installed.length > 0
                ? ` Added the missing packages ${ensured.installed.join(', ')}.`
                : '';
        return finish({
            component: definition.name,
            success: problems.length === 0,
            initialized,
            addedDependencies: ensured.installed,
            message:
                problems.length === 0
                    ? `${definition.title} is already installed at ${location}.${packageNote}`
                    : `${definition.title} exists at ${location}, but the project is missing ${problems.join(', ')}. See the log for the package manager output.`,
            log: log.trim(),
            status,
        });
    }

    const itemReference = isShadcnBlock(definition) ? definition.registryUrl : definition.name;
    const snapshot = snapshotFiles(componentDirectories(root, status), [resolveCssFile(root)]);
    report('installing', `Installing ${definition.title}…`);
    let result: Awaited<ReturnType<typeof runShadcnCommand>>;
    try {
        result = await runShadcnCommandWithRetry(
            root,
            packageManager,
            ['add', itemReference, '-y', '--overwrite'],
            (progress) => {
                if (progress.chunk) {
                    report('installing', `Installing ${definition.title}…`, progress.chunk);
                }
            },
        );
    } finally {
        restoreFiles(snapshot);
    }
    log += `${result.command}\n\n${result.output}`;

    let refreshed = inspectProject(root);
    const installedFile = isShadcnBlock(definition)
        ? findBlockComponent(root, refreshed.componentsAlias ?? undefined, definition.componentFile)
        : findComponentFile(refreshed.uiDir, definition.name);
    if (!result.success || !installedFile) {
        return finish({
            component: definition.name,
            success: false,
            initialized,
            message: `Installing ${definition.title} failed. See the log for the CLI output.`,
            log: log.trim(),
            status: refreshed,
        });
    }

    report('installing', `Checking ${definition.title} dependencies…`);
    const ensured = await ensurePackages(root, packageManager, definition);
    if (ensured.log) {
        log += `${ensured.log}\n\n`;
    }

    recordComponentInstallation(root, definition.name, refreshed.uiDir);
    guardEmptyChartContainer(refreshed.uiDir);
    refreshed = inspectProject(root);
    const baseNote = baseLayerNote(root);

    const problems = [
        ...ensured.missing.map((name) => `packages ${name}`),
        ...missingRegistryItems(refreshed, definition).map((name) => `shadcn components ${name}`),
    ];
    const fileLabel = path.relative(root, installedFile);
    const baseSuffix = baseNote ? ` ${baseNote}` : '';
    const packageNote =
        ensured.installed.length > 0
            ? ` Added the missing packages ${ensured.installed.join(', ')}.`
            : '';
    return finish({
        component: definition.name,
        success: problems.length === 0,
        initialized,
        addedDependencies: ensured.installed,
        message:
            problems.length === 0
                ? `Installed ${definition.title} to ${fileLabel}.${packageNote}${baseSuffix}`
                : `Installed ${definition.title} to ${fileLabel}, but the project is missing ${problems.join(', ')}. See the log for the package manager output.${baseSuffix}`,
        log: `${log.trim()}${baseNote ? `\n\n${baseNote}` : ''}`,
        status: refreshed,
    });
}

interface PackageInstall {
    installed: string[];
    missing: string[];
    log: string;
}

/**
 * The CLI installs the packages its resolved registry tree declares, but a CLI
 * run can finish after writing files without resolving them. Re-checking here
 * keeps imports such as `lucide-react` from breaking the project's build.
 */
async function ensurePackages(
    projectPath: string,
    packageManager: PackageManager,
    definition: ShadcnLibraryItem,
): Promise<PackageInstall> {
    const missing = missingPackages(projectPath, definition);
    if (missing.length === 0) {
        return { installed: [], missing: [], log: '' };
    }
    const result = await runPackageManagerCommand(projectPath, packageManager, missing);
    const remaining = missingPackages(projectPath, definition);
    return {
        installed: missing.filter((name) => !remaining.includes(name)),
        missing: remaining,
        log: `${result.command}\n\n${result.output}`,
    };
}

export async function startComponentPreview(
    projectPath: unknown,
    componentName: unknown,
    projectId?: unknown,
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

    const result = await componentPreviewServer.start(
        status,
        definition,
        typeof projectId === 'string' ? projectId : null,
    );
    return {
        component: definition.name,
        url: result.url,
        sessionId: result.sessionId,
        error: result.error,
        log: result.log,
    };
}

export async function stopComponentPreview(): Promise<boolean> {
    await componentPreviewServer.stop();
    return true;
}

/**
 * Prepares the preview workspace and installs only the requested catalog
 * components, then makes sure the shared dev server is running. The library
 * calls this as cards scroll into view, so opening it never installs the whole
 * catalog. Repeated calls reuse the server and the workspace.
 */
export async function startCatalogPreview(
    components?: unknown,
    projectId?: unknown,
    onProgress?: (progress: ShadcnInstallProgress) => void,
): Promise<ShadcnCatalogPreview> {
    try {
        const requested = Array.isArray(components)
            ? [
                  ...new Set(
                      components.filter(
                          (name): name is string =>
                              typeof name === 'string' && name.trim().length > 0,
                      ),
                  ),
              ]
            : [];
        const base = await ensureCatalogBase();
        const install =
            requested.length > 0 ? await installCatalogItems(requested, onProgress) : null;
        const status = install?.status ?? base.status;
        const definitions = SHADCN_COMPONENTS.filter(
            (component) => component.previewable !== false && status.installed[component.name],
        );
        const result = await catalogPreviewServer.start(
            base.root,
            definitions,
            typeof projectId === 'string' ? projectId : 'catalog-ui',
        );
        const log = [install?.log, result.log].filter(Boolean).join('\n\n');
        return {
            urls: result.urls,
            sessions: result.sessions,
            missing: install?.missing ?? [],
            error: result.error,
            log: log || null,
        };
    } catch (error: any) {
        return {
            urls: {},
            sessions: {},
            missing: [],
            error: error?.message ?? 'Could not prepare the component previews.',
            log: null,
        };
    }
}

/** Releases a project's catalog sessions without stopping other consumers. */
export async function releaseCatalogPreview(projectId: unknown): Promise<boolean> {
    if (typeof projectId !== 'string' || projectId.trim().length === 0) {
        return false;
    }
    await catalogPreviewServer.releaseProject(projectId);
    return true;
}
