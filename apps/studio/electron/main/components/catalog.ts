import { COMPONENT_CLI_VERSION } from '@kumite/models';
import * as electronModule from 'electron';
import os from 'os';
const electronApp = (electronModule as any).app ?? (electronModule as any).default?.app;
import fs from 'fs';
import path from 'path';
import { runPackageManagerInstall } from './cli';
import { GENERATED_CONFIG_MARKER } from './preview-vite-config';

/**
 * Private Vite runtime shared by artifact-backed catalog previews. Upstream
 * source is materialized separately; browsing never runs shadcn add or writes
 * into the active project.
 */
const WORKSPACE_DIR = 'catalog-preview';
const MARKER_FILE = '.kumite-catalog.json';
const WORKSPACE_VERSION = 1;

const PACKAGE_JSON = {
    name: 'kumite-catalog-preview',
    private: true,
    type: 'module',
    scripts: { dev: 'vite' },
    dependencies: {
        react: '^19.0.0',
        'react-dom': '^19.0.0',
    },
    devDependencies: {
        '@tailwindcss/vite': '^4.1.0',
        '@types/react': '^19.0.0',
        '@types/react-dom': '^19.0.0',
        '@vitejs/plugin-react': '^4.3.4',
        tailwindcss: '^4.1.0',
        vite: '^6.0.0',
    },
};

const TSCONFIG = {
    compilerOptions: {
        target: 'ES2022',
        lib: ['ES2022', 'DOM', 'DOM.Iterable'],
        module: 'ESNext',
        moduleResolution: 'bundler',
        jsx: 'react-jsx',
        strict: true,
        skipLibCheck: true,
        noEmit: true,
        baseUrl: '.',
        paths: { '@/*': ['./src/*'] },
    },
    include: ['src'],
};

/**
 * Both generated configs carry this marker, so a newer build may replace an
 * older generated config while a hand-written file is still never touched.
 */
export const CATALOG_PREVIEW_VITE_CONFIG = `${GENERATED_CONFIG_MARKER}import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';

export default defineConfig({
    plugins: [react(), tailwindcss()],
    resolve: {
        alias: {
            '@': fileURLToPath(new URL('./src', import.meta.url)),
        },
    },
});
`;

const INDEX_CSS = `@import "tailwindcss";
`;

function workspaceRoot(): string {
    const base = typeof electronApp?.getPath === 'function' ? electronApp.getPath('userData') : path.join(os.tmpdir(), 'kumite-e2e-shadcn-profile');
    return path.join(base, WORKSPACE_DIR);
}

function writeFileIfChanged(file: string, contents: string): void {
    if (fs.existsSync(file) && fs.readFileSync(file, 'utf8') === contents) {
        return;
    }
    fs.writeFileSync(file, contents, 'utf8');
}

function writeBaseFiles(root: string): void {
    fs.mkdirSync(path.join(root, 'src'), { recursive: true });

    // Keep artifact-specific dependencies, but always reconcile the packages
    // owned by this isolated preview runtime.
    const packagePath = path.join(root, 'package.json');
    let existing: { dependencies?: Record<string, string>; devDependencies?: Record<string, string> } = {};
    try {
        existing = JSON.parse(fs.readFileSync(packagePath, 'utf8')) as typeof existing;
    } catch {
        existing = {};
    }
    const packageJson = {
        ...PACKAGE_JSON,
        dependencies: {
            ...(existing.dependencies ?? {}),
            ...PACKAGE_JSON.dependencies,
        },
        devDependencies: {
            ...(existing.devDependencies ?? {}),
            ...PACKAGE_JSON.devDependencies,
        },
    };
    writeFileIfChanged(packagePath, `${JSON.stringify(packageJson, null, 4)}\n`);
    writeFileIfChanged(
        path.join(root, 'tsconfig.json'),
        `${JSON.stringify(TSCONFIG, null, 4)}\n`,
    );
    writeFileIfChanged(path.join(root, 'vite.config.ts'), CATALOG_PREVIEW_VITE_CONFIG);
    writeFileIfChanged(path.join(root, 'src', 'index.css'), INDEX_CSS);
}

const RUNTIME_PACKAGES = {
    react: 19,
    'react-dom': 19,
    '@tailwindcss/vite': 4,
    '@vitejs/plugin-react': 4,
    tailwindcss: 4,
    vite: 6,
} as const;

/** Vite alone is not enough: every runtime-owned package must be present. */
export function isCatalogRuntimeInstalled(root: string): boolean {
    for (const [name, expectedMajor] of Object.entries(RUNTIME_PACKAGES)) {
        const packagePath = path.join(root, 'node_modules', ...name.split('/'), 'package.json');
        try {
            const installed = JSON.parse(fs.readFileSync(packagePath, 'utf8')) as { version?: string };
            if (!installed.version || Number(installed.version.split('.')[0]) !== expectedMajor) {
                return false;
            }
        } catch {
            return false;
        }
    }
    return true;
}

export interface CatalogWorkspace {
    root: string;
    log: string;
}

let basePromise: Promise<CatalogWorkspace> | null = null;

/**
 * Prepares only the private Vite/React/Tailwind runtime. Component source is
 * always resolved from implementation artifacts, never installed with shadcn.
 */
export function ensureCatalogBase(): Promise<CatalogWorkspace> {
    if (!basePromise) {
        basePromise = prepareBase().catch((error) => {
            basePromise = null;
            throw error;
        });
    }
    return basePromise;
}

async function prepareBase(): Promise<CatalogWorkspace> {
    const root = workspaceRoot();
    fs.mkdirSync(root, { recursive: true });
    let log = '';

    writeBaseFiles(root);

    if (!isCatalogRuntimeInstalled(root)) {
        const install = await runPackageManagerInstall(root, 'bun');
        log += `${install.command}\n${install.output}\n\n`;
        if (!install.success) {
            throw new Error(
                `Could not install the component preview workspace. ${install.output || install.command}`,
            );
        }
    }

    const marker = path.join(root, MARKER_FILE);
    if (!fs.existsSync(marker)) {
        fs.writeFileSync(
            marker,
            `${JSON.stringify({ version: WORKSPACE_VERSION, cli: COMPONENT_CLI_VERSION }, null, 4)}\n`,
            'utf8',
        );
    }

    return { root, log: log.trim() };
}
