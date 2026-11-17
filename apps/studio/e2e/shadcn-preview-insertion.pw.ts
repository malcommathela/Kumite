import { spawn } from 'node:child_process';
import fs from 'node:fs';
import net from 'node:net';
import os from 'node:os';
import path from 'node:path';
import {
    _electron as electron,
    expect,
    test,
    type ElectronApplication,
    type Page,
} from '@playwright/test';

/**
 * Library E2E: a real Vite + shadcn project is opened in the studio, the
 * shared library popup loads a live upstream artifact preview, and
 * "Use artifact in Kumite" publishes the artifact and edits the selected
 * element's source.
 *
 * The project and Electron profile are disposable. The project borrows the
 * repository's node_modules through a junction so the test does not need a
 * second install; every state file the app reads is written by this spec.
 */

const E2E_DIR = import.meta.dirname;
const STUDIO_DIR = path.resolve(E2E_DIR, '..');
const REPO_ROOT = path.resolve(E2E_DIR, '..', '..', '..');
const REPO_NODE_MODULES = path.join(REPO_ROOT, 'node_modules');
const PROFILE_DIR = path.join(os.tmpdir(), 'kumite-e2e-shadcn-profile');

const REQUIRED_PACKAGES = [
    'vite',
    'react',
    'react-dom',
    '@vitejs/plugin-react',
    '@radix-ui/react-slot',
    'class-variance-authority',
    'clsx',
    'tailwind-merge',
];

test.describe.configure({ mode: 'serial', timeout: 900_000 });
test.describe('shadcn library preview and insertion', () => {
    test.skip(
        REQUIRED_PACKAGES.some((name) => !fs.existsSync(path.join(REPO_NODE_MODULES, name))),
        'needs the repository node_modules',
    );

    let app: ElectronApplication;
    let appPid: number | null = null;
    let page: Page;
    let fixtureRoot: string;
    let projectPath: string;
    let appFile: string;
    const dialogs: string[] = [];
    const consoleErrors: string[] = [];

    test.beforeAll(async () => {
        fixtureRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'kumite-e2e-shadcn-'));
        projectPath = path.join(fixtureRoot, 'site');
        appFile = path.join(projectPath, 'src', 'App.tsx');
        writeFixture(projectPath);
        const port = await findFreePort();

        fs.mkdirSync(PROFILE_DIR, { recursive: true });
        const project = {
            id: 'e2e-shadcn-project',
            name: 'Kumite shadcn E2E',
            url: `http://localhost:${port}`,
            folderPath: projectPath,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            commands: {
                install: 'npm install',
                run: `node ./node_modules/vite/bin/vite.js --host 127.0.0.1 --port ${port} --strictPort`,
                build: 'npm run build',
            },
            previewImg: null,
            settings: {
                scale: 1,
                position: { x: 40, y: 40 },
                frames: [
                    {
                        id: 'e2e-frame',
                        url: `http://localhost:${port}/`,
                        position: { x: 0, y: 0 },
                        dimension: { width: 1280, height: 900 },
                        aspectRatioLocked: false,
                        device: 'Custom:Custom',
                        theme: 'system',
                        orientation: 'Landscape',
                    },
                ],
                activeFrameId: 'e2e-frame',
            },
            domains: { base: null, custom: null },
            metadata: null,
            env: {},
        };
        fs.writeFileSync(
            path.join(PROFILE_DIR, 'projects.json'),
            JSON.stringify({ projects: [project] }),
        );
        fs.writeFileSync(
            path.join(PROFILE_DIR, 'app-state.json'),
            JSON.stringify({ activeProjectId: project.id }),
        );
        fs.writeFileSync(
            path.join(PROFILE_DIR, 'user-settings.json'),
            JSON.stringify({ enableAnalytics: false, id: 'kumite-e2e' }),
        );

        app = await electron.launch({
            args: ['.', `--user-data-dir=${PROFILE_DIR}`],
            cwd: STUDIO_DIR,
            env: { ...process.env, NODE_ENV: 'production' },
            timeout: 180_000,
        });
        appPid = app.process().pid ?? null;
        page = await app.firstWindow();
        page.on('dialog', async (dialog) => {
            dialogs.push(dialog.message());
            await dialog.accept();
        });
        page.on('console', (message) => {
            if (message.type() === 'error') {
                consoleErrors.push(message.text());
            }
        });
        page.on('pageerror', (error) => consoleErrors.push(error.message));
        await app.evaluate(({ BrowserWindow }) => {
            BrowserWindow.getAllWindows()[0]?.setSize(1600, 1000);
        });
    });

    test.afterAll(async () => {
        try {
            await app?.close();
        } catch {
            // The tree kill below handles a wedged window.
        }
        // `app.process()` is gone after close, so the pid was captured at launch.
        if (appPid) {
            await killTree(appPid);
        }
        const removed = removeJunction(path.join(projectPath ?? '', 'node_modules'));
        if (fixtureRoot && removed) {
            fs.rmSync(fixtureRoot, { recursive: true, force: true, maxRetries: 5 });
        }
    });

    test('previews a library artifact and edits the selected source', async () => {
        const play = page.getByRole('button', { name: /Play/ }).first();
        await expect(play).toBeVisible({ timeout: 180_000 });
        await play.click();

        await expect
            .poll(
                async () => {
                    try {
                        return (await guest(
                            page,
                            app,
                            'document.body.innerText.includes("Kumite E2E fixture")',
                        )) as boolean;
                    } catch {
                        return false;
                    }
                },
                { timeout: 180_000 },
            )
            .toBe(true);

        await selectArtifactTarget(page, app);

        await page.getByRole('button', { name: 'Library', exact: true }).first().click();
        await page.getByRole('button', { name: /Browse components/ }).click();

        const search = page.getByPlaceholder(/Search/).first();
        await expect(search).toBeVisible({ timeout: 30_000 });
        await search.fill('button');

        const card = page
            .getByRole('button', {
                name: /Displays a button or a component that looks like a button/,
            })
            .first();
        await expect(card).toBeVisible({ timeout: 30_000 });
        await card.click();

        const detail = page.getByRole('dialog').last();
        await expect(detail.getByRole('heading', { name: 'Button', exact: true })).toBeVisible({
            timeout: 30_000,
        });

        const frame = detail.frameLocator('iframe[title="Button preview"]');
        // A cold catalog workspace installs dependencies for the cards visible
        // when the library opens (including a Next.js-backed demo), so the first
        // run legitimately takes several minutes. The profile is reused after
        // that, which makes later runs fast.
        await expect(frame.getByText('Default', { exact: true }))
            .toBeVisible({ timeout: 900_000 })
            .catch(async (error) => {
                await dumpPreviewDiagnostics(detail, projectPath, dialogs, consoleErrors);
                throw error;
            });

        const use = detail.getByRole('button', { name: 'Use artifact in Kumite' });
        await expect(use).toBeEnabled({ timeout: 120_000 });
        await use.click();

        await expect
            .poll(() => dialogs.length, { timeout: 300_000, intervals: [250, 500, 1_000] })
            .toBeGreaterThan(0);
        const approval = dialogs[0];
        expect(approval).toContain('Project runtime: vite');
        expect(approval).toContain('SHA-256:');
        expect(approval).toMatch(/ui[\\/]button\.tsx/);

        const failure = page.getByText(
            /Could not add component|Insertion needs changes first|Could not prepare artifact insertion/,
        );
        await expect
            .poll(
                async () => {
                    if (fs.readFileSync(appFile, 'utf8').includes('KumiteArtifact')) {
                        return 'written';
                    }
                    return (await failure
                        .first()
                        .isVisible()
                        .catch(() => false))
                        ? 'failed'
                        : 'pending';
                },
                { timeout: 240_000, intervals: [500, 1_000, 2_000] },
            )
            .not.toBe('pending');

        const inserted = fs.readFileSync(appFile, 'utf8');
        // The artifact's verified entry export is a default export, so the
        // editor writes `import KumiteArtifact<hash> from ...` and renders
        // `<KumiteArtifact<hash> />`.
        const hash = inserted.match(/@\/components\/kumite\/([a-f0-9]{64})\//)?.[1];
        expect(hash).toBeTruthy();
        expect(inserted).toMatch(
            new RegExp(
                `import\\s+KumiteArtifact${hash}\\s+from\\s+['"]@/components/kumite/${hash}/`,
            ),
        );
        expect(inserted).toContain(`<KumiteArtifact${hash} />`);

        const artifactRoot = path.join(projectPath, 'src', 'components', 'kumite', hash!);
        expect(
            fs.existsSync(path.join(artifactRoot, 'registry', 'new-york-v4', 'ui', 'button.tsx')),
        ).toBe(true);
        expect(
            fs.existsSync(path.join(artifactRoot, 'registry', 'new-york-v4', 'lib', 'utils.ts')),
        ).toBe(true);
        expect(
            fs.existsSync(
                path.join(artifactRoot, 'registry', 'new-york-v4', 'examples', 'button-demo.tsx'),
            ),
        ).toBe(true);

        await expect
            .poll(
                async () => {
                    try {
                        return (await guest(
                            page,
                            app,
                            `Boolean(document.querySelector('[data-testid="artifact-target"] button'))`,
                        )) as boolean;
                    } catch {
                        return false;
                    }
                },
                { timeout: 120_000, intervals: [500, 1_000, 2_000] },
            )
            .toBe(true);
    });
});

function writeFixture(root: string): void {
    fs.mkdirSync(path.join(root, 'src', 'lib'), { recursive: true });

    const dependencyVersion = (name: string): string =>
        JSON.parse(fs.readFileSync(path.join(REPO_NODE_MODULES, name, 'package.json'), 'utf8'))
            .version;

    const dependencies = {
        '@radix-ui/react-slot': dependencyVersion('@radix-ui/react-slot'),
        'class-variance-authority': dependencyVersion('class-variance-authority'),
        clsx: dependencyVersion('clsx'),
        react: dependencyVersion('react'),
        'react-dom': dependencyVersion('react-dom'),
        'tailwind-merge': dependencyVersion('tailwind-merge'),
        tailwindcss: dependencyVersion('tailwindcss'),
    };
    const devDependencies = {
        '@vitejs/plugin-react': dependencyVersion('@vitejs/plugin-react'),
        vite: dependencyVersion('vite'),
    };

    fs.writeFileSync(
        path.join(root, 'package.json'),
        `${JSON.stringify(
            {
                name: 'kumite-e2e-shadcn-fixture',
                private: true,
                type: 'module',
                scripts: {
                    dev: 'vite --host 127.0.0.1 --port 3000 --strictPort',
                    build: 'vite build',
                },
                dependencies,
                devDependencies,
            },
            null,
            4,
        )}\n`,
    );
    fs.writeFileSync(
        path.join(root, 'components.json'),
        `${JSON.stringify(
            {
                $schema: 'https://ui.shadcn.com/schema.json',
                style: 'new-york',
                rsc: false,
                tsx: true,
                tailwind: {
                    config: '',
                    css: 'src/index.css',
                    baseColor: 'neutral',
                    cssVariables: true,
                    prefix: '',
                },
                aliases: {
                    components: '@/components',
                    utils: '@/lib/utils',
                    ui: '@/components/ui',
                    lib: '@/lib',
                    hooks: '@/hooks',
                },
            },
            null,
            4,
        )}\n`,
    );
    fs.writeFileSync(
        path.join(root, 'tsconfig.json'),
        `${JSON.stringify(
            {
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
            },
            null,
            4,
        )}\n`,
    );
    fs.writeFileSync(
        path.join(root, 'vite.config.ts'),
        `import { fileURLToPath, URL } from 'node:url';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

export default defineConfig({
    plugins: [react()],
    cacheDir: fileURLToPath(new URL('./.vite', import.meta.url)),
    resolve: {
        alias: {
            '@': fileURLToPath(new URL('./src', import.meta.url)),
        },
    },
});
`,
    );
    fs.writeFileSync(
        path.join(root, 'index.html'),
        `<!doctype html>
<html lang="en">
    <head>
        <meta charset="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>Kumite shadcn E2E</title>
    </head>
    <body>
        <div id="root"></div>
        <script type="module" src="/src/main.tsx"></script>
    </body>
</html>
`,
    );
    fs.writeFileSync(
        path.join(root, 'src', 'index.css'),
        `body {
    margin: 0;
    font-family: system-ui, sans-serif;
}
`,
    );
    fs.writeFileSync(
        path.join(root, 'src', 'main.tsx'),
        `import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import App from './App';

createRoot(document.getElementById('root')!).render(
    <StrictMode>
        <App />
    </StrictMode>,
);
`,
    );
    fs.writeFileSync(
        path.join(root, 'src', 'App.tsx'),
        `export default function App() {
    return (
        <main style={{ padding: 48, minHeight: '100vh' }}>
            <h1>Kumite E2E fixture</h1>
            <p>Select the dashed box, then insert a library artifact into it.</p>
            <div
                data-testid="artifact-target"
                style={{ border: '1px dashed #888', height: 220, padding: 24 }}
            >
                <span>Artifact target</span>
            </div>
        </main>
    );
}
`,
    );
    fs.writeFileSync(
        path.join(root, 'src', 'lib', 'utils.ts'),
        `import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
}
`,
    );
    // Artifact insertion refuses projects without exactly one package-manager
    // lockfile. Every dependency the artifact needs is already present through
    // the junction, so the lockfile is only a safety signal here.
    fs.writeFileSync(path.join(root, 'bun.lock'), '{}\n');

    fs.symlinkSync(REPO_NODE_MODULES, path.join(root, 'node_modules'), 'junction');
}

async function findFreePort(): Promise<number> {
    return await new Promise((resolve, reject) => {
        const server = net.createServer();
        server.once('error', reject);
        server.listen(0, '127.0.0.1', () => {
            const address = server.address();
            const port = typeof address === 'object' && address ? address.port : 0;
            server.close(() => (port ? resolve(port) : reject(new Error('No free port'))));
        });
    });
}

async function killTree(pid: number): Promise<void> {
    await new Promise<void>((resolve) => {
        const command =
            process.platform === 'win32'
                ? spawn('taskkill', ['/pid', String(pid), '/T', '/F'], { stdio: 'ignore' })
                : spawn('kill', ['-TERM', `-${pid}`], { stdio: 'ignore' });
        command.on('exit', () => resolve());
        command.on('error', () => resolve());
    });
}

function removeJunction(nodeModules: string): boolean {
    if (!nodeModules || !fs.existsSync(nodeModules)) {
        return true;
    }
    try {
        fs.rmdirSync(nodeModules);
    } catch {
        // Leave a temp directory behind instead of risking the real node_modules.
    }
    // A junction reports as existing while its target does; if it survived the
    // rmdir, the fixture tree must not be deleted recursively.
    return !fs.existsSync(nodeModules);
}

async function dumpPreviewDiagnostics(
    detail: import('@playwright/test').Locator,
    projectPath: string,
    dialogs: string[],
    consoleErrors: string[],
) {
    const text = await detail.innerText().catch(() => '<detail dialog unavailable>');
    const workspace = path.join(PROFILE_DIR, 'catalog-preview');
    const entries: string[] = [];
    try {
        for (const directory of [
            path.join(workspace, 'src'),
            path.join(workspace, 'kumite-preview'),
            path.join(workspace, '__kumite_preview'),
        ]) {
            if (!fs.existsSync(directory)) continue;
            entries.push(
                ...fs
                    .readdirSync(directory, { recursive: true })
                    .map((entry) => path.join(directory, String(entry))),
            );
        }
    } catch (error) {
        entries.push(`<could not list preview workspace: ${String(error)}>`);
    }
    console.error(
        [
            '--- shadcn preview diagnostics ---',
            `fixture: ${projectPath}`,
            `dialogs: ${JSON.stringify(dialogs)}`,
            `detail dialog text:\n${text}`,
            `preview workspace files:\n${entries.join('\n') || '<empty>'}`,
            `renderer console errors:\n${consoleErrors.join('\n') || '<none>'}`,
            '--- end diagnostics ---',
        ].join('\n'),
    );
}

async function selectArtifactTarget(page: Page, app: ElectronApplication) {
    const webview = await page.evaluate(() => {
        const element = document.querySelector('webview')!;
        const rect = element.getBoundingClientRect();
        return { x: rect.x, y: rect.y, width: rect.width, height: rect.height };
    });
    const guestSize = (await guest(page, app, '[innerWidth, innerHeight]')) as [number, number];
    const scale = { x: webview.width / guestSize[0], y: webview.height / guestSize[1] };
    const target = (await guest(
        page,
        app,
        `(() => {
            const el = document.querySelector('[data-testid="artifact-target"]');
            const rect = el.getBoundingClientRect();
            return { x: rect.x, y: rect.y, width: rect.width, height: rect.height };
        })()`,
    )) as { x: number; y: number; width: number; height: number };

    // Click the container's padding, not the label inside it.
    const point = {
        x: webview.x + (target.x + target.width - 12) * scale.x,
        y: webview.y + (target.y + target.height - 12) * scale.y,
    };
    await page.mouse.click(point.x, point.y);
    await page.waitForTimeout(1_000);
}

async function webContentsId(page: Page): Promise<number | null> {
    return page.evaluate(() => {
        const element = document.querySelector('webview') as
            (HTMLElement & { getWebContentsId?: () => number }) | null;
        const id = element?.getWebContentsId?.();
        return typeof id === 'number' ? id : null;
    });
}

async function guest(page: Page, app: ElectronApplication, source: string) {
    const id = await webContentsId(page);
    if (id === null) {
        throw new Error('no canvas');
    }
    return app.evaluate(
        async ({ webContents }, [webContentsId, code]) => {
            const target = webContents.fromId(webContentsId as number);
            return target ? target.executeJavaScript(code as string) : null;
        },
        [id, source] as [number, string],
    );
}
