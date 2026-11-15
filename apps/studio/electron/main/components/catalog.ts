import type { ShadcnInstallProgress, ShadcnProjectStatus } from '@kumite/models';
import { COMPONENT_CLI_VERSION, SHADCN_COMPONENTS } from '@kumite/models';
import { app } from 'electron';
import fs from 'fs';
import path from 'path';
import { runPackageManagerInstall, runShadcnCommand } from './cli';
import { inspectProject } from './inspect';
import { sharedInstallQueue } from './install-queue';
import { guardEmptyChartContainer } from './patches';

/**
 * Kumite's private copy of the catalog.
 *
 * Catalog previews must render items the active project does not have, so they
 * cannot come from the project. This workspace lives under the app's user data
 * and is served by a single Vite dev server. Only the base project is prepared
 * up front: each catalog item is installed when the library actually shows it,
 * so opening the library never pays for the whole catalog. The user's project
 * is never touched.
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

const VITE_CONFIG = `import react from '@vitejs/plugin-react';
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
    return path.join(app.getPath('userData'), WORKSPACE_DIR);
}

function writeBaseFiles(root: string): void {
    fs.mkdirSync(path.join(root, 'src'), { recursive: true });
    fs.writeFileSync(
        path.join(root, 'package.json'),
        `${JSON.stringify(PACKAGE_JSON, null, 4)}\n`,
        'utf8',
    );
    fs.writeFileSync(
        path.join(root, 'tsconfig.json'),
        `${JSON.stringify(TSCONFIG, null, 4)}\n`,
        'utf8',
    );
    fs.writeFileSync(path.join(root, 'vite.config.ts'), VITE_CONFIG, 'utf8');
    fs.writeFileSync(path.join(root, 'src', 'index.css'), INDEX_CSS, 'utf8');
}

export function catalogPreviewNames(): string[] {
    return SHADCN_COMPONENTS.filter(
        (component) => component.installable !== false && component.previewable !== false,
    ).map((component) => component.name);
}

function isCatalogPreviewName(name: string): boolean {
    return catalogPreviewNames().includes(name);
}

export interface CatalogWorkspace {
    root: string;
    status: ShadcnProjectStatus;
    log: string;
}

let basePromise: Promise<CatalogWorkspace> | null = null;

/**
 * Prepares the empty workspace once per run: base files, dependencies, and
 * `shadcn init`. Every step is idempotent, so an interrupted first run is
 * repaired instead of restarted. A failed attempt is forgotten so the next
 * request can retry.
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

    if (!fs.existsSync(path.join(root, 'package.json'))) {
        writeBaseFiles(root);
    }

    if (!fs.existsSync(path.join(root, 'node_modules', 'vite', 'bin', 'vite.js'))) {
        const install = await runPackageManagerInstall(root, 'bun');
        log += `${install.command}\n${install.output}\n\n`;
        if (!install.success) {
            throw new Error(
                `Could not install the component preview workspace. ${install.output || install.command}`,
            );
        }
    }

    if (!fs.existsSync(path.join(root, 'components.json'))) {
        const init = await runShadcnCommand(root, 'bun', ['init', '-d']);
        log += `${init.command}\n${init.output}\n\n`;
        if (!init.success || !fs.existsSync(path.join(root, 'components.json'))) {
            throw new Error(
                `Could not initialize shadcn/ui in the preview workspace. ${init.output || init.command}`,
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

    return { root, status: inspectProject(root), log: log.trim() };
}

export interface CatalogInstall {
    root: string;
    installed: string[];
    missing: string[];
    log: string;
    status: ShadcnProjectStatus;
}

/**
 * Installs the requested catalog items into the private workspace. Calls are
 * queued so two batches never edit the workspace at the same time; the files
 * belong to Kumite, so overwriting is safe. The queue key is the batch itself:
 * an identical batch requested twice (a fast scroll) is deduplicated, while a
 * different batch waits its turn.
 */
export function installCatalogItems(
    names: string[],
    onProgress?: (progress: ShadcnInstallProgress) => void,
): Promise<CatalogInstall> {
    const requested = [...new Set(names)].filter(isCatalogPreviewName);
    const root = workspaceRoot();
    const key = `catalog:${root}:${requested.slice().sort().join(',')}`;
    return sharedInstallQueue.enqueue(key, () => installCatalogBatch(requested, onProgress));
}

async function installCatalogBatch(
    requested: string[],
    onProgress?: (progress: ShadcnInstallProgress) => void,
): Promise<CatalogInstall> {
    const base = await ensureCatalogBase();
    const { root } = base;
    let log = '';
    let status = inspectProject(root);

    const missing = requested.filter((name) => !status.installed[name]);
    if (missing.length > 0) {
        const label = missing.length === 1 ? missing[0] : `${missing.length} components`;
        onProgress?.({
            component: missing.join(', '),
            phase: 'installing',
            message: `Preparing ${label} for preview…`,
            output: null,
        });
        const add = await runShadcnCommand(
            root,
            'bun',
            ['add', ...missing, '-y', '--overwrite'],
            (progress) => {
                onProgress?.({
                    component: missing.join(', '),
                    phase: 'installing',
                    message: `Preparing ${label} for preview…`,
                    output: progress.chunk || null,
                });
            },
        );
        log += `${add.command}\n${add.output}\n\n`;
        status = inspectProject(root);
    }

    if (guardEmptyChartContainer(status.uiDir)) {
        status = inspectProject(root);
    }

    return {
        root,
        installed: requested.filter((name) => status.installed[name]),
        missing: requested.filter((name) => !status.installed[name]),
        log: `${base.log}${base.log && log ? '\n\n' : ''}${log.trim()}`.trim(),
        status,
    };
}
