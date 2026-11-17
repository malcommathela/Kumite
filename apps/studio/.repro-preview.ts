import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { chromium } from '@playwright/test';
import { artifactCatalogPreviewServer } from './electron/main/components/artifact-preview';

const workspace =
    process.argv[2] ?? path.join(os.tmpdir(), 'kumite-e2e-shadcn-profile', 'catalog-preview');
const storeRoot = path.join(workspace, '.kumite-artifact-store');
const names = [
    'button-demo',
    'button-group-demo',
    'context-menu-demo',
    'dropdown-menu-demo',
    'popover-demo',
    'radio-group-demo',
    'select-demo',
    'toggle-demo',
    'toggle-group-demo',
];
const requests = names.map((name) => ({ provider: 'shadcn' as const, kind: 'example' as const, name }));
const previewNames = Object.fromEntries(
    names.map((name) => [name, name.replace(/-demo$/, '')]),
);

const result = await artifactCatalogPreviewServer.start(workspace, requests, 'repro', {
    storeRoot,
    previewNames,
    onProgress: (progress) => console.log('[progress]', progress.phase, progress.message),
});
console.log('RESULT', JSON.stringify(result, null, 2));

const sessionUrl = result.urls.button;
if (!sessionUrl) {
    await artifactCatalogPreviewServer.stop();
    process.exit(1);
}
const origin = new URL(sessionUrl).origin;
const entryResponse = await fetch(
    `${origin}/__kumite_preview/${result.sessions.button}/button.tsx`,
);
console.log('entry', entryResponse.status);
console.log(await entryResponse.text());
const index = await fetch(`${origin}/src/.kumite-preview-registry/index.ts`);
console.log('index', index.status);
const manifest = JSON.parse(
    fs.readFileSync(path.join(workspace, 'src/.kumite-preview-registry/manifest.json'), 'utf8'),
);
for (const entry of manifest.entries) {
    const url = `${origin}/src/.kumite-preview-registry/${entry.module}`;
    const response = await fetch(url);
    const body = await response.text();
    console.log('module', entry.name, response.status, body.slice(0, 200).replace(/\n/g, ' | '));
}

const browser = await chromium.launch({
    executablePath: path.join(
        process.env.LOCALAPPDATA!,
        'ms-playwright',
        'chromium_headless_shell-1249',
        'chrome-headless-shell-win64',
        'chrome-headless-shell.exe',
    ),
});
const page = await browser.newPage();
page.on('console', (message) => console.log('[browser console]', message.type(), message.text()));
page.on('pageerror', (error) => console.log('[browser pageerror]', error.message));
page.on('requestfailed', (request) =>
    console.log('[requestfailed]', request.url(), request.failure()?.errorText),
);
page.on('response', (response) => {
    if (response.status() >= 400) {console.log('[response]', response.status(), response.url());}
});
await page.goto(sessionUrl, { waitUntil: 'networkidle', timeout: 120_000 }).catch((error) =>
    console.log('[goto]', error.message),
);
await page.waitForTimeout(10_000);
console.log('[body]', (await page.locator('body').innerText().catch(() => '<none>')).slice(0, 1000));
await browser.close();
await artifactCatalogPreviewServer.releaseOwner('repro');
await artifactCatalogPreviewServer.stop();
process.exit(0);
