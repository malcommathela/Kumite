import type { ShadcnComponentDefinition, ShadcnProjectStatus } from '@kumite/models';
import { spawn, type ChildProcess } from 'child_process';
import { detect } from 'detect-port';
import fs from 'fs';
import path from 'path';
import { readComponentsJson } from './inspect';

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
        definition: ShadcnComponentDefinition,
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
        } catch (error: any) {
            return {
                url: null,
                error: error?.message ?? 'Failed to build the preview entry.',
                log: null,
            };
        }
        writePreviewFiles(projectPath, entrySource);

        const port = await detect(3310);
        const child = spawn(
            process.execPath,
            [viteBin, '--port', String(port), '--strictPort', '--host', '127.0.0.1'],
            {
                cwd: projectPath,
                env: { ...process.env, ELECTRON_RUN_AS_NODE: '1', NODE_ENV: 'development' },
                windowsHide: true,
                stdio: ['ignore', 'pipe', 'pipe'],
            },
        );

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
            await this.stop();
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
        killProcess(running.process);
        removePreviewFiles(running.projectPath);
    }
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

function resolveUiImportFile(uiDir: string, source: string): string {
    const base = source.split('/').pop() ?? source;
    for (const extension of ['tsx', 'jsx', 'ts', 'js']) {
        const candidate = path.join(uiDir, `${base}.${extension}`);
        if (fs.existsSync(candidate)) {
            return candidate;
        }
    }
    throw new Error(`Installed component file for "${base}" was not found in ${uiDir}.`);
}

function buildEntryFile(
    projectPath: string,
    status: ShadcnProjectStatus,
    definition: ShadcnComponentDefinition,
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
        // A registry import names a file the CLI installs into the ui directory.
        // Anything else is a package specifier the project already depends on
        // (chart needs the recharts primitives), so it is emitted verbatim
        // instead of being looked for in the ui directory.
        const isRegistryImport =
            moduleImport.source.startsWith('@/') || moduleImport.source.startsWith('.');
        if (!isRegistryImport) {
            lines.push(buildImportStatement(moduleImport.source, moduleImport));
            continue;
        }
        const file = resolveUiImportFile(status.uiDir, moduleImport.source);
        lines.push(buildImportStatement(toRelativeImport(projectPath, file), moduleImport));
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
    fs.writeFileSync(path.join(projectPath, `${PREVIEW_STEM}.html`), html, 'utf8');
    fs.writeFileSync(path.join(projectPath, `${PREVIEW_STEM}.tsx`), entrySource, 'utf8');
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
