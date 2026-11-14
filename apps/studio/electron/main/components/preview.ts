import type { ShadcnLibraryItem, ShadcnProjectStatus } from '@kumite/models';
import { spawn, type ChildProcess } from 'child_process';
import { detect } from 'detect-port';
import fs from 'fs';
import path from 'path';
import { readComponentsJson, resolveAlias } from './inspect';

const PREVIEW_STEM = '__kumite_preview';
const HTML_MARKER = '<!-- kumite-preview -->';
const ENTRY_MARKER = '/* kumite-preview */';
const START_TIMEOUT_MS = 45_000;

interface RunningPreview {
    projectPath: string;
    port: number;
    url: string;
    process: ChildProcess;
    log: string;
}

class ComponentPreviewServer {
    private current: RunningPreview | null = null;

    async start(
        status: ShadcnProjectStatus,
        definition: ShadcnLibraryItem,
    ): Promise<{ url: string | null; error: string | null; log: string | null }> {
        const projectPath = status.projectPath;
        if (definition.previewable === false) {
            return {
                url: null,
                error: definition.limitation ?? `${definition.title} cannot be previewed.`,
                log: null,
            };
        }
        if (!status.supported) {
            return { url: null, error: status.reason ?? 'Project is not supported.', log: null };
        }
        if (!status.uiDir) {
            return { url: null, error: 'Could not resolve the shadcn/ui directory.', log: null };
        }
        const viteBin = path.join(projectPath, 'node_modules', 'vite', 'bin', 'vite.js');
        if (!fs.existsSync(viteBin)) {
            return {
                url: null,
                error: 'An isolated preview needs a local Vite install. This project does not have one.',
                log: null,
            };
        }

        await this.stop();

        let entrySource: string;
        try {
            entrySource = buildEntryFile(projectPath, status, definition);
            writePreviewFiles(projectPath, entrySource);
        } catch (error: any) {
            return {
                url: null,
                error: error?.message ?? 'Failed to build the preview entry.',
                log: null,
            };
        }

        let port: number;
        let child: ChildProcess;
        try {
            port = await detect(3310);
            child = spawn(
                process.execPath,
                [viteBin, '--port', String(port), '--strictPort', '--host', '127.0.0.1'],
                {
                    cwd: projectPath,
                    env: { ...process.env, ELECTRON_RUN_AS_NODE: '1', NODE_ENV: 'development' },
                    windowsHide: true,
                    stdio: ['ignore', 'pipe', 'pipe'],
                },
            );
        } catch (error: any) {
            removePreviewFiles(projectPath);
            return {
                url: null,
                error: error?.message ?? 'Failed to start the preview server.',
                log: null,
            };
        }

        const running: RunningPreview = {
            projectPath,
            port,
            url: `http://127.0.0.1:${port}/${PREVIEW_STEM}.html`,
            process: child,
            log: '',
        };
        const appendLog = (data: Buffer) => {
            running.log = `${running.log}${data.toString()}`.slice(-8000);
        };
        child.stdout?.on('data', appendLog);
        child.stderr?.on('data', appendLog);

        const ready = await waitForServer(running);
        if (!ready) {
            const error =
                child.exitCode === null ? 'Preview server timed out.' : 'Preview server exited.';
            const log = running.log || null;
            cleanupRunning(running);
            return { url: null, error, log };
        }

        this.current = running;
        return { url: running.url, error: null, log: null };
    }

    async stop(): Promise<void> {
        const running = this.current;
        this.current = null;
        if (!running) {
            return;
        }
        cleanupRunning(running);
    }
}

function cleanupRunning(running: RunningPreview): void {
    killProcess(running.process);
    removePreviewFiles(running.projectPath);
}

function waitForServer(running: RunningPreview): Promise<boolean> {
    return new Promise((resolve) => {
        const startedAt = Date.now();
        const tick = async () => {
            if (running.process.exitCode !== null || Date.now() - startedAt > START_TIMEOUT_MS) {
                resolve(false);
                return;
            }
            try {
                const response = await fetch(running.url, {
                    signal: AbortSignal.timeout(3000),
                });
                if (response.ok) {
                    resolve(true);
                    return;
                }
            } catch {
                // Server is not accepting connections yet.
            }
            setTimeout(tick, 500);
        };
        void tick();
    });
}

function killProcess(child: ChildProcess): void {
    if (child.exitCode !== null || !child.pid) {
        return;
    }
    if (process.platform === 'win32') {
        spawn('taskkill', ['/pid', String(child.pid), '/T', '/F'], {
            windowsHide: true,
            stdio: 'ignore',
        });
        return;
    }
    child.kill('SIGTERM');
}

function toRelativeImport(projectPath: string, filePath: string): string {
    let relative = path.relative(projectPath, filePath).split(path.sep).join('/');
    if (!relative.startsWith('.')) {
        relative = `./${relative}`;
    }
    return relative.replace(/\.(tsx|jsx|ts|js)$/, '');
}

function buildImportStatement(
    relativePath: string,
    moduleImport: { defaultImport?: string | null; namedImports?: string[] | null },
): string {
    const named = moduleImport.namedImports ?? [];
    const namedPart = named.length > 0 ? `{ ${named.join(', ')} }` : '';
    const clause = [moduleImport.defaultImport, namedPart].filter(Boolean).join(', ');
    return `import ${clause} from '${relativePath}';`;
}

function resolveProjectImportFile(
    projectPath: string,
    status: ShadcnProjectStatus,
    source: string,
): string | null {
    const uiAlias = status.uiAlias ?? '@/components/ui';
    const componentsAlias = status.componentsAlias ?? '@/components';
    let localSource = source;

    if (source.startsWith('@/components/ui')) {
        localSource = `${uiAlias}${source.slice('@/components/ui'.length)}`;
    } else if (source.startsWith('@/components')) {
        localSource = `${componentsAlias}${source.slice('@/components'.length)}`;
    } else if (source.startsWith('@/')) {
        const aliasBase = componentsAlias.replace(/\/components$/, '');
        localSource = `${aliasBase}${source.slice(1)}`;
    }

    const basePath = localSource.startsWith('.')
        ? path.resolve(projectPath, localSource)
        : resolveAlias(projectPath, localSource);
    if (!basePath) {
        return null;
    }

    const candidates = path.extname(basePath)
        ? [basePath]
        : ['.tsx', '.jsx', '.ts', '.js', '.json'].map((extension) => `${basePath}${extension}`);
    return candidates.find((candidate) => fs.existsSync(candidate)) ?? null;
}

function buildEntryFile(
    projectPath: string,
    status: ShadcnProjectStatus,
    definition: ShadcnLibraryItem,
): string {
    if (!status.uiDir) {
        throw new Error('Could not resolve the shadcn/ui directory.');
    }
    const lines: string[] = [ENTRY_MARKER];
    lines.push(`import React from 'react';`);
    lines.push(`import { createRoot } from 'react-dom/client';`);

    const componentsJson = readComponentsJson(projectPath);
    const cssPath = componentsJson?.tailwind?.css;
    if (cssPath) {
        const absoluteCss = path.resolve(projectPath, cssPath);
        if (fs.existsSync(absoluteCss)) {
            lines.push(`import '${toRelativeImport(projectPath, absoluteCss)}';`);
        }
    }

    for (const moduleImport of definition.imports) {
        const file = resolveProjectImportFile(projectPath, status, moduleImport.source);
        if (file) {
            lines.push(buildImportStatement(toRelativeImport(projectPath, file), moduleImport));
            continue;
        }
        if (
            moduleImport.source.startsWith('@/') ||
            moduleImport.source.startsWith('~/') ||
            moduleImport.source.startsWith('.')
        ) {
            throw new Error(`Installed source for "${moduleImport.source}" was not found.`);
        }
        lines.push(buildImportStatement(moduleImport.source, moduleImport));
    }

    lines.push(`function Preview() {`);
    lines.push(`    return (`);
    lines.push(`        <div className="min-h-screen bg-background p-10 text-foreground">`);
    lines.push(
        `            <div className="mb-6 text-xs font-medium uppercase tracking-[0.2em] text-muted-foreground">`,
    );
    lines.push(`                shadcn/ui · ${definition.title}`);
    lines.push(`            </div>`);
    lines.push(`            ${definition.previewCode.trim()}`);
    lines.push(`        </div>`);
    lines.push(`    );`);
    lines.push(`}`);
    lines.push(``);
    lines.push(`createRoot(document.getElementById('root')!).render(`);
    lines.push(`    <React.StrictMode>`);
    lines.push(`        <Preview />`);
    lines.push(`    </React.StrictMode>,`);
    lines.push(`);`);
    lines.push(``);
    return lines.join('\n');
}

function writePreviewFiles(projectPath: string, entrySource: string): void {
    const html = `${HTML_MARKER}
<!doctype html>
<html lang="en">
    <head>
        <meta charset="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>Kumite component preview</title>
    </head>
    <body>
        <div id="root"></div>
        <script type="module" src="/${PREVIEW_STEM}.tsx"></script>
    </body>
</html>
`;
    const files = [
        [path.join(projectPath, `${PREVIEW_STEM}.html`), html],
        [path.join(projectPath, `${PREVIEW_STEM}.tsx`), entrySource],
    ] as const;
    if (files.some(([file]) => fs.existsSync(file))) {
        throw new Error('Preview files already exist in the project root.');
    }

    const created: string[] = [];
    try {
        for (const [file, contents] of files) {
            const descriptor = fs.openSync(file, 'wx');
            created.push(file);
            try {
                fs.writeFileSync(descriptor, contents, 'utf8');
            } finally {
                fs.closeSync(descriptor);
            }
        }
    } catch (error) {
        for (const file of created) {
            try {
                fs.unlinkSync(file);
            } catch {
                // Ignore cleanup failures.
            }
        }
        throw error;
    }
}

function removePreviewFiles(projectPath: string): void {
    const htmlPath = path.join(projectPath, `${PREVIEW_STEM}.html`);
    const entryPath = path.join(projectPath, `${PREVIEW_STEM}.tsx`);
    try {
        if (fs.existsSync(htmlPath) && fs.readFileSync(htmlPath, 'utf8').startsWith(HTML_MARKER)) {
            fs.unlinkSync(htmlPath);
        }
    } catch {
        // Ignore cleanup failures.
    }
    try {
        if (
            fs.existsSync(entryPath) &&
            fs.readFileSync(entryPath, 'utf8').startsWith(ENTRY_MARKER)
        ) {
            fs.unlinkSync(entryPath);
        }
    } catch {
        // Ignore cleanup failures.
    }
}

export const componentPreviewServer = new ComponentPreviewServer();

const CATALOG_DIR = 'kumite-preview';

function buildCatalogEntry(definition: ShadcnLibraryItem): string {
    const lines: string[] = [ENTRY_MARKER];
    lines.push(`import React from 'react';`);
    lines.push(`import { createRoot } from 'react-dom/client';`);
    lines.push(`import '@/index.css';`);
    for (const moduleImport of definition.imports) {
        lines.push(buildImportStatement(moduleImport.source, moduleImport));
    }
    lines.push(`function Preview() {`);
    lines.push(`    return (`);
    lines.push(
        `        <div className="flex min-h-screen w-full items-center justify-center bg-background p-6 text-foreground">`,
    );
    lines.push(`            ${definition.previewCode.trim()}`);
    lines.push(`        </div>`);
    lines.push(`    );`);
    lines.push(`}`);
    lines.push(``);
    lines.push(`createRoot(document.getElementById('root')!).render(`);
    lines.push(`    <React.StrictMode>`);
    lines.push(`        <Preview />`);
    lines.push(`    </React.StrictMode>,`);
    lines.push(`);`);
    lines.push(``);
    return lines.join('\n');
}

function buildCatalogHtml(title: string): string {
    return `${HTML_MARKER}
<!doctype html>
<html lang="en">
    <head>
        <meta charset="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>${title}</title>
    </head>
    <body class="bg-background text-foreground">
        <div id="root"></div>
    </body>
</html>
`;
}

/**
 * Writes one entry per definition. Entries are additive: batches arrive as the
 * library scrolls, and a later batch must not delete the previews already
 * shown. Files are only written when their content changes, so adding a batch
 * does not hot-reload the iframes that are already showing.
 */
function writeCatalogEntries(projectPath: string, definitions: ShadcnLibraryItem[]): void {
    const directory = path.join(projectPath, CATALOG_DIR);
    fs.mkdirSync(directory, { recursive: true });
    const writeIfChanged = (file: string, contents: string) => {
        try {
            if (fs.readFileSync(file, 'utf8') === contents) {
                return;
            }
        } catch {
            // Missing or unreadable: write it.
        }
        fs.writeFileSync(file, contents, 'utf8');
    };
    for (const definition of definitions) {
        const entry = buildCatalogEntry(definition);
        writeIfChanged(path.join(directory, `${definition.name}.tsx`), entry);
        const html = buildCatalogHtml(definition.title).replace(
            `<div id="root"></div>`,
            `<div id="root"></div>\n        <script type="module" src="./${definition.name}.tsx"></script>`,
        );
        writeIfChanged(path.join(directory, `${definition.name}.html`), html);
    }
}

/**
 * Serves catalog items from Kumite's preview workspace. One dev server renders
 * every entry, so the library can show a live preview per card without starting
 * a process per component. Entries are added as batches arrive, without
 * restarting the server or invalidating the previews already on screen.
 */
export class CatalogPreviewServer {
    private current: RunningPreview | null = null;
    private urls: Record<string, string> = {};

    async start(
        projectPath: string,
        definitions: ShadcnLibraryItem[],
    ): Promise<{ urls: Record<string, string>; error: string | null; log: string | null }> {
        const viteBin = path.join(projectPath, 'node_modules', 'vite', 'bin', 'vite.js');
        if (!fs.existsSync(viteBin)) {
            return {
                urls: {},
                error: 'The preview workspace has no local Vite install.',
                log: null,
            };
        }
        const items = definitions.filter(
            (definition) => definition.previewable !== false && definition.previewCode.trim(),
        );

        const running = this.current;
        const reuse = running !== null && running.projectPath === projectPath;
        if (items.length === 0 && !reuse) {
            return { urls: {}, error: 'The catalog has no previewable components.', log: null };
        }

        try {
            writeCatalogEntries(projectPath, items);
        } catch (error: any) {
            return {
                urls: {},
                error: error?.message ?? 'Failed to write the catalog preview entries.',
                log: null,
            };
        }

        if (reuse) {
            for (const definition of items) {
                this.urls[definition.name] =
                    `http://127.0.0.1:${running.port}/${CATALOG_DIR}/${definition.name}.html`;
            }
            return { urls: this.urls, error: null, log: null };
        }

        await this.stop();

        let port: number;
        let child: ChildProcess;
        try {
            port = await detect(3320);
            child = spawn(
                process.execPath,
                [viteBin, '--port', String(port), '--strictPort', '--host', '127.0.0.1'],
                {
                    cwd: projectPath,
                    env: { ...process.env, ELECTRON_RUN_AS_NODE: '1', NODE_ENV: 'development' },
                    windowsHide: true,
                    stdio: ['ignore', 'pipe', 'pipe'],
                },
            );
        } catch (error: any) {
            return {
                urls: {},
                error: error?.message ?? 'Failed to start the catalog preview server.',
                log: null,
            };
        }

        const server: RunningPreview = {
            projectPath,
            port,
            url: `http://127.0.0.1:${port}/${CATALOG_DIR}/${items[0].name}.html`,
            process: child,
            log: '',
        };
        const appendLog = (data: Buffer) => {
            server.log = `${server.log}${data.toString()}`.slice(-8000);
        };
        child.stdout?.on('data', appendLog);
        child.stderr?.on('data', appendLog);

        const ready = await waitForServer(server);
        if (!ready) {
            const error =
                child.exitCode === null
                    ? 'Catalog preview server timed out.'
                    : 'Catalog preview server exited.';
            const log = server.log || null;
            cleanupRunning(server);
            return { urls: {}, error, log };
        }

        this.current = server;
        this.urls = Object.fromEntries(
            items.map((definition) => [
                definition.name,
                `http://127.0.0.1:${port}/${CATALOG_DIR}/${definition.name}.html`,
            ]),
        );
        return { urls: this.urls, error: null, log: null };
    }

    async stop(): Promise<void> {
        const running = this.current;
        this.current = null;
        this.urls = {};
        if (!running) {
            return;
        }
        cleanupRunning(running);
    }
}

export const catalogPreviewServer = new CatalogPreviewServer();
