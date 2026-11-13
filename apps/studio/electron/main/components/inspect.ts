import type {
    DetectedFramework,
    PackageManager,
    ShadcnProjectStatus,
} from '@kumite/models';
import { SHADCN_COMPONENTS } from '@kumite/models';
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

function installedComponents(uiDir: string | null): Record<string, boolean> {
    const installed: Record<string, boolean> = {};
    for (const component of SHADCN_COMPONENTS) {
        installed[component.name] = Boolean(findComponentFile(uiDir, component.name));
    }
    return installed;
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

    return {
        projectPath: resolvedPath,
        supported,
        reason,
        framework,
        packageManager: packageJson ? detectPackageManager(resolvedPath) : null,
        tailwind,
        initialized: Boolean(componentsJson),
        uiDir,
        componentsJsonPath: componentsJson
            ? path.join(resolvedPath, 'components.json')
            : null,
        installed: installedComponents(uiDir),
    };
}
