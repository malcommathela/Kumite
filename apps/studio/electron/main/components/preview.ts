import type { ShadcnLibraryItem, ShadcnProjectStatus } from '@kumite/models';
import type { ChildProcess } from 'child_process';
import fs from 'fs';
import path from 'path';
import { processLifecycle } from '../lifecycle/processes';
import { projectOwnerId } from '../lifecycle/ports';
import { projectLifecycle } from '../lifecycle/state';
import { startVitePreview } from '../lifecycle/vite';
import { readComponentsJson, resolveAlias } from './inspect';
import {
    buildHandshakeScript,
    PREVIEW_MARKER,
    safeEntryId,
    stableSessionId,
} from './preview-runtime';

const PREVIEW_STEM = '__kumite_preview';
const HTML_MARKER = '<!-- kumite-preview -->';
const ENTRY_MARKER = '/* kumite-preview */';
const PREFERRED_PORT = 3310;

interface RunningPreview {
    projectPath: string;
    sessionId: string;
    resourceId: string;
    port: number;
    url: string;
    process: ChildProcess;
    generation: number;
}

interface PendingPreview {
    generation: number;
    cancelled: boolean;
    resourceId: string;
}

class ComponentPreviewServer {
    private runtimes = new Map<string, RunningPreview>();
    private pendings = new Map<string, PendingPreview>();
    private generations = new Map<string, number>();
    private starts = new Map<string, Promise<unknown>>();
    private chains = new Map<string, Promise<void>>();

    private key(projectPath: string): string {
        return path.resolve(projectPath);
    }

    private generationFor(projectPath: string): number {
        return this.generations.get(this.key(projectPath)) ?? 0;
    }

    private bumpGeneration(projectPath: string): number {
        const key = this.key(projectPath);
        const next = this.generationFor(key) + 1;
        this.generations.set(key, next);
        return next;
    }

    async start(
        status: ShadcnProjectStatus,
        definition: ShadcnLibraryItem,
        ownerId?: string | null,
    ): Promise<{
        url: string | null;
        error: string | null;
        log: string | null;
        sessionId: string | null;
    }> {
        const key = this.key(status.projectPath);
        const previous = this.chains.get(key) ?? Promise.resolve();
        const task = previous
            .catch(() => undefined)
            .then(() => this.startInternal(status, definition, ownerId));
        this.chains.set(
            key,
            task.then(
                () => undefined,
                () => undefined,
            ),
        );
        this.starts.set(key, task);
        return task.finally(() => {
            if (this.starts.get(key) === task) {
                this.starts.delete(key);
            }
        });
    }

    private async startInternal(
        status: ShadcnProjectStatus,
        definition: ShadcnLibraryItem,
        ownerId?: string | null,
    ): Promise<{
        url: string | null;
        error: string | null;
        log: string | null;
        sessionId: string | null;
    }> {
        const projectPath = status.projectPath;
        const key = this.key(projectPath);
        if (projectLifecycle.isShuttingDown) {
            return {
                url: null,
                error: 'Kumite is shutting down.',
                log: null,
                sessionId: null,
            };
        }
        if (definition.previewable === false) {
            return {
                url: null,
                error: definition.limitation ?? `${definition.title} cannot be previewed.`,
                log: null,
                sessionId: null,
            };
        }
        if (!status.supported) {
            return {
                url: null,
                error: status.reason ?? 'Project is not supported.',
                log: null,
                sessionId: null,
            };
        }
        if (!status.uiDir) {
            return {
                url: null,
                error: 'Could not resolve the shadcn/ui directory.',
                log: null,
                sessionId: null,
            };
        }
        const viteBin = path.join(projectPath, 'node_modules', 'vite', 'bin', 'vite.js');
        if (!fs.existsSync(viteBin)) {
            return {
                url: null,
                error: 'An isolated preview needs a local Vite install. This project does not have one.',
                log: null,
                sessionId: null,
            };
        }

        // One preview per project: await the previous server, then start again
        // under a fresh generation. Other projects keep their own runtime.
        const existing = this.runtimes.get(key);
        if (existing) {
            await this.stopRuntime(key, existing);
        }

        const generation = this.bumpGeneration(projectPath);
        const resourceId = `component-preview:${key}`;
        const pending: PendingPreview = { generation, cancelled: false, resourceId };
        this.pendings.set(key, pending);

        const sessionId = stableSessionId(projectPath, `component:${definition.name}`, 'component');
        let entrySource: string;
        try {
            entrySource = buildEntryFile(projectPath, status, definition, sessionId);
            writePreviewFiles(projectPath, entrySource, sessionId);
        } catch (error: any) {
            this.pendings.delete(key);
            return {
                url: null,
                error: error?.message ?? 'Failed to build the preview entry.',
                log: null,
                sessionId: null,
            };
        }

        const started = await startVitePreview({
            resourceId,
            projectPath,
            viteBin,
            preferredPort: PREFERRED_PORT,
            ownerId: projectOwnerId(ownerId ?? projectPath),
            ownerScope: 'project',
            projectId: ownerId ?? null,
            type: 'component-preview',
            isValid: () =>
                !pending.cancelled &&
                this.pendings.get(key) === pending &&
                this.generationFor(projectPath) === generation,
        });

        if (!started.server) {
            if (this.pendings.get(key) === pending) {
                this.pendings.delete(key);
            }
            removePreviewFiles(projectPath);
            return { url: null, error: started.error, log: started.log, sessionId: null };
        }

        const running: RunningPreview = {
            projectPath,
            sessionId,
            resourceId,
            port: started.server.port,
            url: `${started.server.origin}/${PREVIEW_STEM}.html`,
            process: started.server.process,
            generation,
        };

        if (
            pending.cancelled ||
            this.pendings.get(key) !== pending ||
            this.generationFor(projectPath) !== generation
        ) {
            await processLifecycle.stop(resourceId);
            removePreviewFiles(projectPath);
            return {
                url: null,
                error: 'Preview start was cancelled.',
                log: started.log,
                sessionId: null,
            };
        }

        this.pendings.delete(key);
        this.runtimes.set(key, running);
        running.process.on('exit', () => {
            if (this.runtimes.get(key) === running) {
                this.runtimes.delete(key);
                removePreviewFiles(projectPath);
            }
        });
        return { url: running.url, error: null, log: null, sessionId };
    }

    private async stopRuntime(key: string, running: RunningPreview): Promise<void> {
        if (this.runtimes.get(key) === running) {
            this.runtimes.delete(key);
        }
        if (!(await processLifecycle.stop(running.resourceId))) {
            // Keep the generated entry so a retry still has a page to serve.
            throw new Error(`The preview server for ${running.projectPath} did not exit.`);
        }
        removePreviewFiles(running.projectPath);
    }

    /** Stops every preview server owned by this project. Idempotent. */
    async stopProject(projectPath: string): Promise<void> {
        const key = this.key(projectPath);
        this.bumpGeneration(projectPath);
        const pending = this.pendings.get(key);
        if (pending) {
            pending.cancelled = true;
        }
        const start = this.starts.get(key);
        if (start) {
            await start.catch(() => undefined);
        }
        if (this.pendings.get(key) === pending) {
            this.pendings.delete(key);
        }
        const running = this.runtimes.get(key);
        if (running) {
            await this.stopRuntime(key, running);
        }
    }

    async stop(): Promise<void> {
        const failures: string[] = [];
        for (const projectPath of [...this.runtimes.keys()]) {
            try {
                await this.stopProject(projectPath);
            } catch (error: any) {
                failures.push(error?.message ?? String(error));
            }
        }
        for (const projectPath of [...this.pendings.keys()]) {
            try {
                await this.stopProject(projectPath);
            } catch (error: any) {
                failures.push(error?.message ?? String(error));
            }
        }
        if (failures.length > 0) {
            throw new Error(failures.join(' '));
        }
    }
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

/**
 * Shared mount reporting and error containment for every preview page. The
 * host uses the `mounted` message to replace the skeleton and `error` to stop
 * waiting on a preview that will never render.
 */
function previewShellLines(): string[] {
    return [
        `function PreviewHandshake() {`,
        `    React.useEffect(() => {`,
        `        window.__kumitePreview?.post('mounted');`,
        `    }, []);`,
        `    return null;`,
        `}`,
        ``,
        `class PreviewErrorBoundary extends React.Component {`,
        `    constructor(props) {`,
        `        super(props);`,
        `        this.state = { message: null };`,
        `    }`,
        `    static getDerivedStateFromError(error) {`,
        `        return { message: (error && error.message) || 'The preview crashed.' };`,
        `    }`,
        `    componentDidCatch(error) {`,
        `        window.__kumitePreview?.post('error', (error && error.message) || 'The preview crashed.');`,
        `    }`,
        `    render() {`,
        `        if (this.state.message) {`,
        `            return <div className="p-6 text-sm text-red-600">{this.state.message}</div>;`,
        `        }`,
        `        return this.props.children;`,
        `    }`,
        `}`,
        ``,
        `function PreviewRoot({ children }) {`,
        `    return (`,
        `        <React.StrictMode>`,
        `            <PreviewErrorBoundary>`,
        `                <PreviewHandshake />`,
        `                {children}`,
        `            </PreviewErrorBoundary>`,
        `        </React.StrictMode>`,
        `    );`,
        `}`,
    ];
}

function buildEntryFile(
    projectPath: string,
    status: ShadcnProjectStatus,
    definition: ShadcnLibraryItem,
    sessionId: string,
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

    lines.push(`const PREVIEW_SESSION = ${JSON.stringify(sessionId)};`);
    lines.push(...previewShellLines());
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
    lines.push(`    <PreviewRoot>`);
    lines.push(`        <Preview />`);
    lines.push(`    </PreviewRoot>,`);
    lines.push(`);`);
    lines.push(``);
    return lines.join('\n');
}

function buildPreviewHtml(sessionId: string): string {
    return `${HTML_MARKER}
<!doctype html>
<html lang="en">
    <head>
        <meta charset="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>Kumite component preview</title>
    </head>
    <body>
        <div id="root"></div>
        ${buildHandshakeScript(sessionId)}
        <script type="module" src="/${PREVIEW_STEM}.tsx"></script>
    </body>
</html>
`;
}

function writePreviewFiles(projectPath: string, entrySource: string, sessionId: string): void {
    const files = [
        [path.join(projectPath, `${PREVIEW_STEM}.html`), buildPreviewHtml(sessionId)],
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

export function buildCatalogHtml(title: string, sessionId: string, entryId: string): string {
    const safeTitle = title.replace(
        /[<>&"]/g,
        (value) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;' })[value]!,
    );
    return `${HTML_MARKER}
<!-- ${PREVIEW_MARKER} -->
<!doctype html>
<html lang="en">
    <head>
        <meta charset="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>${safeTitle}</title>
    </head>
    <body class="bg-background text-foreground">
        <div id="root"></div>
        ${buildHandshakeScript(sessionId)}
        <script type="module" src="./${entryId}.tsx"></script>
    </body>
</html>
`;
}
