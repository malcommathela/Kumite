import fs from 'node:fs';
import net from 'node:net';
import os from 'node:os';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { _electron as electron, type ElectronApplication, type Page } from '@playwright/test';

const STUDIO_DIR = process.cwd();
const REPO_NODE_MODULES = path.resolve(STUDIO_DIR, '../../node_modules');
const PROFILE_DIR = path.join(os.tmpdir(), 'kumite-e2e-shadcn-profile');

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

function writeFixture(root: string): void {
    fs.mkdirSync(path.join(root, 'src', 'lib'), { recursive: true });
    const dependencyVersion = (name: string): string =>
        JSON.parse(fs.readFileSync(path.join(REPO_NODE_MODULES, name, 'package.json'), 'utf8'))
            .version;
    fs.writeFileSync(
        path.join(root, 'package.json'),
        JSON.stringify(
            {
                name: 'kumite-debug-fixture',
                private: true,
                type: 'module',
                dependencies: {
                    react: dependencyVersion('react'),
                    'react-dom': dependencyVersion('react-dom'),
                },
                devDependencies: {
                    '@vitejs/plugin-react': dependencyVersion('@vitejs/plugin-react'),
                    vite: dependencyVersion('vite'),
                },
            },
            null,
            4,
        ),
    );
    fs.writeFileSync(
        path.join(root, 'vite.config.ts'),
        `import react from '@vitejs/plugin-react';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';
export default defineConfig({
    plugins: [react()],
    resolve: { alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) } },
});
`,
    );
    fs.writeFileSync(
        path.join(root, 'index.html'),
        '<!doctype html><html><body><div id="root"></div><script type="module" src="/src/main.tsx"></script></body></html>',
    );
    fs.writeFileSync(
        path.join(root, 'src', 'main.tsx'),
        `import { createRoot } from 'react-dom/client';
import App from './App';
createRoot(document.getElementById('root')!).render(<App />);
`,
    );
    fs.writeFileSync(
        path.join(root, 'src', 'App.tsx'),
        `export default function App() {
    return <main style={{ padding: 48 }}><h1>Kumite debug fixture</h1><div data-testid="artifact-target" style={{ border: '1px dashed #888', height: 220 }}>target</div></main>;
}
`,
    );
    fs.writeFileSync(path.join(root, 'bun.lock'), '{}\n');
    fs.symlinkSync(REPO_NODE_MODULES, path.join(root, 'node_modules'), 'junction');
}

async function killTree(pid: number): Promise<void> {
    await new Promise<void>((resolve) => {
        const command = spawn('taskkill', ['/pid', String(pid), '/T', '/F'], { stdio: 'ignore' });
        command.on('exit', () => resolve());
        command.on('error', () => resolve());
    });
}

async function frameState(
    page: Page,
    handle: Awaited<ReturnType<Page['$']>>,
    label: string,
): Promise<void> {
    if (!handle) {
        console.log(`[state ${label}] no iframe handle`);
        return;
    }
    const frame = await handle.contentFrame();
    console.log(
        `[state ${label}] frames=${JSON.stringify(page.frames().map((item) => item.url()))}`,
    );
    console.log(`[state ${label}] frame=${frame?.url() ?? '<no content frame>'}`);
    if (!frame) return;
    const body = await frame
        .locator('body')
        .innerText({ timeout: 5_000 })
        .catch((error) => `<innerText error: ${error.message.split('\n')[0]}>`);
    console.log(`[state ${label}] body=${JSON.stringify(body).slice(0, 400)}`);
    const html = await frame
        .content()
        .catch((error) => `<content error: ${error.message.split('\n')[0]}>`);
    console.log(`[state ${label}] html=${html.slice(0, 1200).replace(/\n/g, ' ')}`);
}

const fixtureRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'kumite-electron-debug3-'));
const projectPath = path.join(fixtureRoot, 'site');
const port = await findFreePort();
writeFixture(projectPath);
fs.mkdirSync(PROFILE_DIR, { recursive: true });
const project = {
    id: 'debug-project',
    name: 'Kumite debug',
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
                id: 'debug-frame',
                url: `http://localhost:${port}/`,
                position: { x: 0, y: 0 },
                dimension: { width: 1280, height: 900 },
                aspectRatioLocked: false,
                device: 'Custom:Custom',
                theme: 'system',
                orientation: 'Landscape',
            },
        ],
        activeFrameId: 'debug-frame',
    },
    domains: { base: null, custom: null },
    metadata: null,
    env: {},
};
fs.writeFileSync(path.join(PROFILE_DIR, 'projects.json'), JSON.stringify({ projects: [project] }));
fs.writeFileSync(
    path.join(PROFILE_DIR, 'app-state.json'),
    JSON.stringify({ activeProjectId: project.id }),
);
fs.writeFileSync(
    path.join(PROFILE_DIR, 'user-settings.json'),
    JSON.stringify({ enableAnalytics: false, id: 'kumite-debug' }),
);

const app = await electron.launch({
    args: ['.', `--user-data-dir=${PROFILE_DIR}`],
    cwd: STUDIO_DIR,
    env: { ...process.env, NODE_ENV: 'production' },
    timeout: 180_000,
});
const appPid = app.process().pid ?? null;
app.process().stdout?.on('data', (chunk) => console.log('[main stdout]', chunk.toString().trim()));
app.process().stderr?.on('data', (chunk) => console.log('[main stderr]', chunk.toString().trim()));
const page: Page = await app.firstWindow();
page.on('console', (message) => console.log('[renderer]', message.type(), message.text().slice(0, 300)));
page.on('pageerror', (error) => console.log('[renderer pageerror]', error.message));
page.on('requestfailed', (request) =>
    console.log('[requestfailed]', request.url(), request.failure()?.errorText),
);
page.on('response', (response) => {
    if (response.status() >= 400) {console.log('[response]', response.status(), response.url());}
});
page.on('frameattached', (frame) => console.log('[frameattached]', frame.url()));
page.on('framenavigated', (frame) => console.log('[framenavigated]', frame.url()));
page.on('dialog', async (dialog) => {
    console.log('[dialog]', dialog.message());
    await dialog.accept();
});
await app.evaluate(({ BrowserWindow }) => BrowserWindow.getAllWindows()[0]?.setSize(1600, 1000));

try {
    const play = page.getByRole('button', { name: /Play/ }).first();
    await play.waitFor({ state: 'visible', timeout: 180_000 });
    await play.click();
    await page.waitForTimeout(5_000);
    await page.getByRole('button', { name: 'Library', exact: true }).first().click();
    await page.getByRole('button', { name: /Browse components/ }).click();
    const search = page.getByPlaceholder(/Search/).first();
    await search.waitFor({ state: 'visible', timeout: 30_000 });
    await search.fill('button');
    const card = page
        .getByRole('button', { name: /Displays a button or a component that looks like a button/ })
        .first();
    await card.waitFor({ state: 'visible', timeout: 30_000 });
    await card.click();
    const detail = page.getByRole('dialog').last();
    await detail
        .getByRole('heading', { name: 'Button', exact: true })
        .waitFor({ state: 'visible', timeout: 30_000 });
    console.log('[ui] Button detail open');
    const iframe = detail.locator('iframe[title="Button preview"]');
    await iframe.waitFor({ state: 'attached', timeout: 600_000 });
    console.log('[iframe] count', await detail.locator('iframe').count());
    console.log('[iframe] src', await iframe.getAttribute('src'));
    console.log('[iframe] box', JSON.stringify(await iframe.boundingBox()));
    console.log('[iframe] visible', await iframe.isVisible());
    const frame = detail.frameLocator('iframe[title="Button preview"]');
    for (let attempt = 0; attempt < 24; attempt += 1) {
        const text = await frame
            .locator('body')
            .innerText({ timeout: 5_000 })
            .catch((error) => `<innerText error: ${error.message.split('\n')[0]}>`);
        const shell = await detail
            .innerText()
            .then((value) => value.replace(/\s+/g, ' ').slice(0, 600))
            .catch(() => '<no dialog text>');
        console.log(`[state ${attempt}] body=${JSON.stringify(text).slice(0, 400)}`);
        console.log(`[state ${attempt}] dialog=${shell}`);
        console.log(
            `[state ${attempt}] frames=${JSON.stringify(page.frames().map((item) => item.url()))}`,
        );
        if (text.toLowerCase().includes('button')) {
            console.log('[ui] preview rendered');
            break;
        }
        if (attempt === 0 || attempt === 3 || attempt === 11) {
            await page.screenshot({
                path: path.join(fixtureRoot, `detail-${attempt}.png`),
            });
        }
        await page.waitForTimeout(10_000);
    }
    await page.screenshot({ path: path.join(fixtureRoot, 'detail-final.png') });
} catch (error) {
    console.error('[debug failure]', error);
    await page.screenshot({ path: path.join(fixtureRoot, 'detail-failure.png') }).catch(() => {});
} finally {
    console.log('[fixture]', fixtureRoot);
    await app.close().catch(() => {});
    if (appPid) {await killTree(appPid);}
    try {fs.rmdirSync(path.join(projectPath, 'node_modules'));} catch {}
}
process.exit(0);

