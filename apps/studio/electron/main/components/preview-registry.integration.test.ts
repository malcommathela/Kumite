import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterAll, describe, it } from 'bun:test';
import { chromium, type Browser } from '@playwright/test';
import { generateArtifactPreviewRegistry } from './preview-registry';
import { buildCatalogHtml } from './preview';
import { PreviewRuntimeManager, stableSessionId } from './preview-runtime';
import { buildArtifactPreviewViteConfig } from './preview-vite-config';
import { ensureArtifactPreviewStylesheet } from './preview-stylesheet';

const roots: string[] = [];
const managers: PreviewRuntimeManager[] = [];
const browsers: Browser[] = [];

afterAll(async () => {
    await Promise.all(managers.map((manager) => manager.stopAll()));
    await Promise.all(browsers.map((browser) => browser.close()));
    await Promise.all(roots.map((root) => fs.promises.rm(root, { recursive: true, force: true })));
});

describe('artifact preview registry Vite integration', () => {
    it('loads the generated lazy module through Vite and mounts its React component', async () => {
        const root = await fs.promises.mkdtemp(path.join(os.tmpdir(), 'kumite-registry-vite-'));
        roots.push(root);
        await fs.promises.symlink(path.resolve(process.cwd(), '../../node_modules'), path.join(root, 'node_modules'), 'junction');
        await fs.promises.mkdir(path.join(root, 'src'), { recursive: true });
        await fs.promises.writeFile(path.join(root, 'package.json'), '{"type":"module"}\n');
        ensureArtifactPreviewStylesheet(root);
        await fs.promises.writeFile(path.join(root, 'vite.config.ts'), buildArtifactPreviewViteConfig());
        const key = 'shadcn:component:registry-vite-fixture:session';
        const moduleSource = `
import React from 'react';
import { createRoot } from 'react-dom/client';
function RegistryFixture() {
    return <main data-testid="registry-preview-mounted" className="flex min-h-24 items-center justify-center gap-4 rounded-lg bg-background p-6 text-foreground">
        <span className="rounded-md bg-primary px-4 py-2 text-primary-foreground">Styled shadcn preview</span>
    </main>;
}
createRoot(document.getElementById('root')!).render(<RegistryFixture />);
`;
        const registry = await generateArtifactPreviewRegistry(root, [{
            key, artifactHash: 'a'.repeat(64), kind: 'component', name: 'Registry fixture', source: moduleSource,
        }]);
        const sessionId = stableSessionId(root, key, 'registry-integration');
        const manager = new PreviewRuntimeManager({ startTimeoutMs: 30_000, idleTimeoutMs: 5 * 60_000 });
        managers.push(manager);
        console.info('[preview-integration] starting Vite runtime');
        const result = await manager.ensure({
            projectPath: root, kind: 'registry-integration',
            viteBin: path.resolve(process.cwd(), '../../node_modules/vite/bin/vite.js'),
            basePort: 38941, ownerId: 'registry-integration-test',
            entries: [{ sessionId, entryId: 'registry-fixture', html: buildCatalogHtml('Registry fixture', sessionId, 'registry-fixture'), source: registry.entrySources[key]! }],
        });
        assert.equal(result.error, null, `Vite failed to start: ${result.error ?? 'unknown error'}\n${result.log ?? '(no Vite output captured)'}`);
        const url = result.urls[sessionId];
        assert.ok(url, 'Vite did not return a URL for the registry preview');
        console.info('[preview-integration] launching Chromium');
        const browser = await chromium.launch({
            headless: true,
            timeout: 60_000,
            // Use Playwright's bundled full Chromium in its modern headless mode.
            // The Windows hosted runner's Edge desktop channel can hang during
            // startup on Server SKU images; channel "chromium" avoids Edge and
            // avoids the separate chromium-headless-shell executable.
            ...(process.platform === 'win32' ? { channel: 'chromium' as const } : {}),
        });
        browsers.push(browser);
        const page = await browser.newPage();
        const pageErrors: string[] = [];
        page.on('pageerror', (error) => pageErrors.push(error.message));
        console.info(`[preview-integration] navigating to ${url}`);
        const response = await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30_000 });
        assert.equal(response?.status(), 200);
        console.info('[preview-integration] waiting for React mount');
        await page.getByTestId('registry-preview-mounted').waitFor({ state: 'visible', timeout: 30_000 });
        const preview = page.getByTestId('registry-preview-mounted');
        assert.match(await preview.textContent() ?? '', /Styled shadcn preview/);
        const computed = await preview.evaluate((element) => {
            const style = getComputedStyle(element);
            return {
                display: style.display,
                alignItems: style.alignItems,
                justifyContent: style.justifyContent,
                padding: style.padding,
                backgroundColor: style.backgroundColor,
                color: style.color,
                borderRadius: style.borderRadius,
                minHeight: style.minHeight,
            };
        });
        assert.equal(computed.display, 'flex');
        assert.equal(computed.alignItems, 'center');
        assert.equal(computed.justifyContent, 'center');
        assert.equal(computed.padding, '24px');
        assert.notEqual(computed.backgroundColor, 'rgba(0, 0, 0, 0)');
        assert.notEqual(computed.color, 'rgba(0, 0, 0, 0)');
        assert.equal(computed.borderRadius, '8px');
        assert.equal(computed.minHeight, '96px');
        assert.deepEqual(pageErrors, []);
    }, 90_000);
});
