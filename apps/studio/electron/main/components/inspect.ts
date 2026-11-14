import type {
    DetectedFramework,
    PackageManager,
    ShadcnLibraryItem,
    ShadcnProjectStatus,
} from '@kumite/models';
import {
    collectShadcnDependencies,
    getShadcnLibraryItem,
    isShadcnBlock,
    SHADCN_BLOCKS,
    SHADCN_COMPONENTS,
} from '@kumite/models';
import fs from 'fs';
import path from 'path';

export interface ShadcnComponentsJson {
    style?: string;
    tailwind?: {
        config?: string;
        css?: string;
        baseColor?: string;
        cssVariables?: boolean;
    };
    aliases?: {
        components?: string;
        utils?: string;
        ui?: string;
        lib?: string;
        hooks?: string;
    };
}

const TAILWIND_CONFIG_PATTERN = /^tailwind\.config\.(js|cjs|mjs|ts)$/;

export function readPackageJson(projectPath: string): Record<string, any> | null {
    try {
        return JSON.parse(fs.readFileSync(path.join(projectPath, 'package.json'), 'utf8'));
    } catch {
        return null;
    }
}

export function readComponentsJson(projectPath: string): ShadcnComponentsJson | null {
    try {
        return JSON.parse(fs.readFileSync(path.join(projectPath, 'components.json'), 'utf8'));
    } catch {
        return null;
    }
}

/**
 * The stylesheet shadcn writes design tokens into. It has to stay outside the
 * install snapshot: the CLI adds each item's `cssVars` (the sidebar palette, for
 * example) to this file, and restoring it would silently drop them.
 */
export function resolveCssFile(projectPath: string): string | null {
    const cssRelative = readComponentsJson(projectPath)?.tailwind?.css;
    return cssRelative ? path.resolve(projectPath, cssRelative) : null;
}

export function detectPackageManager(projectPath: string): PackageManager {
    const lockfiles: Array<[string, PackageManager]> = [
        ['pnpm-lock.yaml', 'pnpm'],
        ['bun.lockb', 'bun'],
        ['bun.lock', 'bun'],
        ['yarn.lock', 'yarn'],
        ['package-lock.json', 'npm'],
    ];
    for (const [lockfile, manager] of lockfiles) {
        if (fs.existsSync(path.join(projectPath, lockfile))) {
            return manager;
        }
    }
    return 'npm';
}

export function detectFramework(projectPath: string): DetectedFramework {
    const packageJson = readPackageJson(projectPath);
    if (!packageJson) {
        return 'unknown';
    }
    const dependencies = {
        ...(packageJson.dependencies ?? {}),
        ...(packageJson.devDependencies ?? {}),
    };
    if (dependencies.next) {
        return 'next';
    }
    if (dependencies.vite) {
        return 'vite';
    }
    if (dependencies.react) {
        return 'react';
    }
    return 'unknown';
}

export function detectTailwind(projectPath: string): boolean {
    const entries = fs.existsSync(projectPath) ? fs.readdirSync(projectPath) : [];
    if (entries.some((entry) => TAILWIND_CONFIG_PATTERN.test(entry))) {
        return true;
    }
    const packageJson = readPackageJson(projectPath);
    const dependencies = {
        ...(packageJson?.dependencies ?? {}),
        ...(packageJson?.devDependencies ?? {}),
    };
    return Boolean(dependencies.tailwindcss);
}

function getSourceRoot(projectPath: string): string {
    return fs.existsSync(path.join(projectPath, 'src')) ? 'src' : '';
}

export function resolveAlias(projectPath: string, alias: string | undefined): string | null {
    if (!alias) {
        return null;
    }
    const sourceRoot = getSourceRoot(projectPath);
    if (alias.startsWith('@/') || alias.startsWith('~/')) {
        return path.join(projectPath, sourceRoot, alias.slice(2));
    }
    return path.resolve(projectPath, alias);
}

export function findComponentFile(uiDir: string | null, name: string): string | null {
    if (!uiDir) {
        return null;
    }
    for (const extension of ['tsx', 'jsx', 'ts', 'js']) {
        const candidate = path.join(uiDir, `${name}.${extension}`);
        if (fs.existsSync(candidate)) {
            return candidate;
        }
    }
    return null;
}

function installedComponents(
    projectPath: string,
    uiDir: string | null,
    componentsAlias: string | undefined,
): Record<string, boolean> {
    const installed: Record<string, boolean> = {};
    for (const component of SHADCN_COMPONENTS) {
        installed[component.name] = Boolean(findComponentFile(uiDir, component.name));
    }
    try {
        const manifest = JSON.parse(
            fs.readFileSync(path.join(projectPath, '.kumite', 'components.json'), 'utf8'),
        ) as { components?: Array<{ name?: string }> };
        const installedBlocks = new Set(
            (manifest.components ?? [])
                .map((component) => component.name)
                .filter((name): name is string => Boolean(name)),
        );
        for (const block of SHADCN_BLOCKS) {
            installed[block.name] =
                installedBlocks.has(block.name) &&
                findBlockComponent(projectPath, componentsAlias, block.componentFile) !== null;
        }
    } catch {
        for (const block of SHADCN_BLOCKS) {
            installed[block.name] = false;
        }
    }
    return installed;
}

export function findBlockComponent(
    projectPath: string,
    componentsAlias: string | undefined,
    componentFile: string,
): string | null {
    const componentsDir = resolveAlias(projectPath, componentsAlias ?? '@/components');
    if (!componentsDir) {
        return null;
    }
    for (const extension of ['.tsx', '.jsx', '.ts', '.js']) {
        const candidate = path.join(componentsDir, `${componentFile}${extension}`);
        if (fs.existsSync(candidate)) {
            return candidate;
        }
    }
    return null;
}

/**
 * Packages the item and its registry dependencies need that the project cannot
 * resolve yet. A declared dependency can still be absent from node_modules, and
 * that is what breaks the dev server after an install.
 */
export function missingPackages(projectPath: string, item: ShadcnLibraryItem): string[] {
    const packageJson = readPackageJson(projectPath);
    const declared = {
        ...(packageJson?.dependencies ?? {}),
        ...(packageJson?.devDependencies ?? {}),
    };
    return requiredPackages(projectPath, item).filter(
        (name) =>
            !declared[name] ||
            !fs.existsSync(path.join(projectPath, 'node_modules', ...name.split('/'))),
    );
}

/** Packages provided by the project itself; never install or re-pin these. */
const PROJECT_OWNED_PACKAGES = new Set(['react', 'react-dom', 'next']);

const LOCAL_IMPORT_PREFIXES = ['@/', '~/', '#', '$'];

/**
 * The files of an item plus every catalog registry item it pulls in. Registry
 * items sometimes import a package they do not declare (`calendar-30` imports
 * `little-date`), so the files are scanned instead of trusting the metadata.
 */
function installedItemFiles(projectPath: string, item: ShadcnLibraryItem): string[] {
    const componentsJson = readComponentsJson(projectPath);
    const uiDir = resolveAlias(projectPath, componentsJson?.aliases?.ui ?? '@/components/ui');
    const componentsAlias = componentsJson?.aliases?.components;
    const files: string[] = [];
    const visited = new Set<string>([item.name]);
    const visit = (current: ShadcnLibraryItem) => {
        if (isShadcnBlock(current)) {
            for (const file of current.files) {
                const found = findBlockComponent(projectPath, componentsAlias, file);
                if (found) {
                    files.push(found);
                }
            }
        } else {
            const found = findComponentFile(uiDir, current.name);
            if (found) {
                files.push(found);
            }
        }
        for (const name of current.registryDependencies) {
            if (visited.has(name)) {
                continue;
            }
            visited.add(name);
            const registryItem = getShadcnLibraryItem(name);
            if (registryItem) {
                visit(registryItem);
            }
        }
    };
    visit(item);
    return files;
}

function importedPackageName(specifier: string, aliases: string[]): string | null {
    if (!specifier || specifier.startsWith('.') || specifier.startsWith('/')) {
        return null;
    }
    if (specifier.includes(':')) {
        return null;
    }
    if (LOCAL_IMPORT_PREFIXES.some((prefix) => specifier.startsWith(prefix))) {
        return null;
    }
    if (aliases.some((alias) => specifier === alias || specifier.startsWith(`${alias}/`))) {
        return null;
    }
    const parts = specifier.split('/');
    const name = specifier.startsWith('@') ? parts.slice(0, 2).join('/') : parts[0];
    return PROJECT_OWNED_PACKAGES.has(name) ? null : name;
}

/**
 * Every npm package the installed item pulls in: the measured registry closure
 * plus the bare imports its own source files actually use.
 */
export function requiredPackages(projectPath: string, item: ShadcnLibraryItem): string[] {
    const packages = new Set(collectShadcnDependencies(item));
    const aliases = Object.values(readComponentsJson(projectPath)?.aliases ?? {}).filter(
        (alias): alias is string => Boolean(alias),
    );
    for (const file of installedItemFiles(projectPath, item)) {
        let content: string;
        try {
            content = fs.readFileSync(file, 'utf8');
        } catch {
            continue;
        }
        for (const match of content.matchAll(/from\s+['"]([^'"]+)['"]/g)) {
            const name = importedPackageName(match[1], aliases);
            if (name) {
                packages.add(name);
            }
        }
    }
    return [...packages].sort();
}

export function inspectProject(projectPath: string): ShadcnProjectStatus {
    const resolvedPath = path.resolve(projectPath);
    const packageJson = readPackageJson(resolvedPath);
    const componentsJson = readComponentsJson(resolvedPath);
    const framework = detectFramework(resolvedPath);
    const tailwind = detectTailwind(resolvedPath);
    const uiDir = resolveAlias(resolvedPath, componentsJson?.aliases?.ui ?? '@/components/ui');

    let supported = true;
    let reason: string | null = null;
    if (!packageJson) {
        supported = false;
        reason = 'No package.json was found in the active project.';
    } else if (framework === 'unknown') {
        supported = false;
        reason = 'The active project does not declare React.';
    } else if (!tailwind) {
        supported = false;
        reason = 'Tailwind CSS was not detected in the active project.';
    }
    const previewSupported = fs.existsSync(
        path.join(resolvedPath, 'node_modules', 'vite', 'bin', 'vite.js'),
    );

    return {
        projectPath: resolvedPath,
        supported,
        reason,
        previewSupported,
        previewReason: previewSupported
            ? null
            : 'Live preview requires Vite to be installed in the active project.',
        framework,
        packageManager: packageJson ? detectPackageManager(resolvedPath) : null,
        tailwind,
        initialized: Boolean(componentsJson),
        uiDir,
        uiAlias: componentsJson?.aliases?.ui ?? '@/components/ui',
        componentsAlias: componentsJson?.aliases?.components ?? '@/components',
        componentsJsonPath: componentsJson ? path.join(resolvedPath, 'components.json') : null,
        installed: installedComponents(resolvedPath, uiDir, componentsJson?.aliases?.components),
    };
}
