import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { after, describe, it } from 'node:test';
import {
    createImplementationResolutionService,
} from './implementation-service';
import { buildArtifactPreviewModule } from './artifact-preview-module';
import { buildArtifactPreviewViteConfig } from './preview-vite-config';
import {
    applyArtifactInsertion,
    cancelArtifactInsertion,
    finishArtifactInsertion,
    getArtifactInsertionApprovalDetails,
    prepareArtifactValueInsertion,
} from './artifact-insertion';
import { materializeImplementationArtifact } from './implementation-materializer';

const enabled = process.env.KUMITE_UPSTREAM_ARTIFACT_TEST === '1';
const testIfEnabled = enabled ? it : it.skip;
const root = enabled ? fs.mkdtempSync(path.join(os.tmpdir(), 'kumite-upstream-chart-')) : '';

after(async () => {
    if (!root) {return;}
    if (process.platform === 'win32') {
        const cleanup = spawnSync(
            'cmd.exe',
            ['/d', '/c', 'rmdir', '/s', '/q', root],
            { encoding: 'utf8', windowsHide: true },
        );
        if (cleanup.status !== 0) {
            const deferred = spawnSync(
                'cmd.exe',
                [
                    '/d',
                    '/c',
                    'start',
                    '""',
                    '/b',
                    'cmd.exe',
                    '/d',
                    '/c',
                    `ping -n 8 127.0.0.1 > nul & rmdir /s /q "${root}"`,
                ],
                { encoding: 'utf8', windowsHide: true },
            );
            if (deferred.status !== 0) {
                throw new Error(
                    `Could not remove disposable upstream fixture: ${cleanup.stderr}${deferred.stderr}`,
                );
            }
        }
    } else {
        fs.rmSync(root, { recursive: true, force: true, maxRetries: 10, retryDelay: 250 });
    }
});

async function resolveExactNpmVersion(name: string): Promise<string> {
    const response = await fetch(`https://registry.npmjs.org/${encodeURIComponent(name)}`);
    if (!response.ok) {throw new Error(`npm metadata request failed for ${name}: HTTP ${response.status}`);}
    const metadata = (await response.json()) as { 'dist-tags'?: { latest?: string } };
    const version = metadata['dist-tags']?.latest;
    if (!version || !/^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?$/.test(version)) {
        throw new Error(`npm did not return an exact version for ${name}`);
    }
    return version;
}

function normalizeChartMarkup(markup: string): string {
    return markup
        .replace(/\bid="[^"]+"/g, 'id="<id>"')
        .replace(/\bclass="recharts-[^"]+"/g, 'class="<recharts-class>"')
        .replace(/\s+/g, ' ')
        .trim();
}

async function renderFixtureRuntime(
    projectRoot: string,
    sessionId: string,
    previewEntry: string,
    insertedEntry?: string,
): Promise<{ previewMarkup: string; insertedMarkup?: string; previewStatus: number; moduleStatus: number }> {
    const runner = path.join(projectRoot, '.kumite-render.mjs');
    fs.writeFileSync(
        runner,
        `import { createServer } from 'vite';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

const server = await createServer({
    root: process.cwd(),
    configFile: './vite.config.ts',
    server: { host: '127.0.0.1', port: 0 },
    optimizeDeps: { noDiscovery: true, include: [] },
    logLevel: 'silent',
});
try {
    await server.listen();
    const origin = server.resolvedUrls.local[0];
    const session = process.argv[2];
    const page = await fetch(new URL(\`/__kumite_preview/\${session}/index.html\`, origin));
    const module = await fetch(new URL(\`/__kumite_preview/\${session}/chart-bar-demo.tsx\`, origin));
    const preview = await server.ssrLoadModule(process.argv[3]);
    const previewMarkup = renderToStaticMarkup(React.createElement(preview.default));
    const insertedPath = process.argv[4];
    const inserted = insertedPath
        ? await server.ssrLoadModule(insertedPath)
        : undefined;
    const insertedMarkup = inserted
        ? renderToStaticMarkup(React.createElement(inserted.default))
        : undefined;
    process.stdout.write(JSON.stringify({
        previewMarkup,
        insertedMarkup,
        previewStatus: page.status,
        moduleStatus: module.status,
    }));
} finally {
    await server.close();
}
`,
    );
    const result = spawnSync('node', [runner, sessionId, previewEntry, insertedEntry ?? ''], {
        cwd: projectRoot,
        encoding: 'utf8',
        timeout: 120_000,
    });
    if (result.status !== 0) {
        throw new Error(`Disposable project SSR failed:\n${result.stdout}\n${result.stderr}`);
    }
    return JSON.parse(result.stdout) as {
        previewMarkup: string;
        insertedMarkup?: string;
        previewStatus: number;
        moduleStatus: number;
    };
}

describe('pinned upstream chart preview/insertion parity', () => {
    testIfEnabled(
        'resolves, previews, inserts, and renders the same chart-bar-demo artifact',
        { timeout: 300_000 },
        async () => {
            const resolved = await createImplementationResolutionService().resolve({
                provider: 'shadcn',
                kind: 'example',
                name: 'chart-bar-demo',
                version: '3.7.0',
                commit: '1e9e337923aaede7db55b6091cb56a72a661b959',
            });
            const artifact = resolved.artifact;
            assert.equal(artifact.source.version, '3.7.0');
            assert.equal(
                artifact.source.commit,
                '1e9e337923aaede7db55b6091cb56a72a661b959',
            );
            assert.equal(artifact.demo.available, true);
            assert.equal(artifact.demo.preserved, true);
            assert.deepEqual(artifact.requirements.providers, []);

            const exactDependencies: Record<string, string> = {
                '@vitejs/plugin-react': '4.7.0',
                '@tailwindcss/vite': await resolveExactNpmVersion('@tailwindcss/vite'),
                tailwindcss: await resolveExactNpmVersion('tailwindcss'),
                react: '18.3.1',
                'react-dom': '18.3.1',
                vite: '6.4.6',
            };
            for (const dependency of artifact.dependencies) {
                if (exactDependencies[dependency.name]) {continue;}
                exactDependencies[dependency.name] =
                    dependency.version && /^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?$/.test(dependency.version)
                        ? dependency.version
                        : await resolveExactNpmVersion(dependency.name);
            }

            fs.writeFileSync(
                path.join(root, 'package.json'),
                JSON.stringify({
                    name: 'kumite-upstream-chart-parity',
                    private: true,
                    type: 'module',
                    dependencies: exactDependencies,
                }, null, 2),
            );
            fs.writeFileSync(
                path.join(root, 'components.json'),
                JSON.stringify({ aliases: { components: '@/components', ui: '@/components/ui' } }),
            );
            fs.writeFileSync(
                path.join(root, 'tsconfig.json'),
                JSON.stringify({ compilerOptions: { paths: { '@/*': ['./src/*'] } } }),
            );
            const npm = spawnSync(
                process.platform === 'win32' ? 'npm.cmd' : 'npm',
                ['install', '--ignore-scripts', '--no-audit', '--no-fund'],
                { cwd: root, encoding: 'utf8', timeout: 300_000, shell: process.platform === 'win32' },
            );
            if (npm.status !== 0) {
                throw new Error(`Disposable fixture npm install failed:\n${npm.stdout}\n${npm.stderr}`);
            }

            const materialization = await materializeImplementationArtifact(
                artifact,
                path.join(root, 'src'),
            );
            fs.writeFileSync(path.join(root, 'src', 'index.css'), '@import "tailwindcss";\n');
            fs.writeFileSync(
                path.join(root, 'vite.config.ts'),
                buildArtifactPreviewViteConfig(),
            );
            fs.writeFileSync(path.join(root, 'index.html'), '<div id="root"></div>');
            const entryFile = artifact.files.find((file) => file.path === artifact.entryPoint);
            assert.ok(entryFile);
            const materializedEntry = materialization.sourceFiles.find(
                (file) => file.relativePath === artifact.entryPoint,
            );
            assert.ok(materializedEntry);
            assert.equal(
                createHash('sha256').update(fs.readFileSync(materializedEntry.path)).digest('hex'),
                entryFile.sha256,
            );
            assert.match(entryFile.content, /January/);
            assert.equal(materialization.assets.length, artifact.assets.length);

            const sessionId = 'upstream-chart-session';
            const previewModule = buildArtifactPreviewModule(artifact, sessionId);
            assert.match(previewModule, /chart-bar-demo/);
            const sessionDirectory = path.join(root, '__kumite_preview', sessionId);
            await fs.promises.mkdir(sessionDirectory, { recursive: true });
            await fs.promises.writeFile(
                path.join(sessionDirectory, 'index.html'),
                `<!doctype html><!-- kumite-preview-session --><div id="root"></div><script type="module" src="./chart-bar-demo.tsx"></script>`,
            );
            await fs.promises.writeFile(
                path.join(sessionDirectory, 'chart-bar-demo.tsx'),
                previewModule,
            );

            const uninstall = spawnSync(
                process.platform === 'win32' ? 'npm.cmd' : 'npm',
                ['uninstall', '--ignore-scripts', '--no-audit', '--no-fund', 'clsx'],
                { cwd: root, encoding: 'utf8', timeout: 300_000, shell: process.platform === 'win32' },
            );
            if (uninstall.status !== 0) {
                throw new Error(`Disposable fixture npm uninstall failed:\n${uninstall.stdout}\n${uninstall.stderr}`);
            }
            const packageBefore = fs.readFileSync(path.join(root, 'package.json'), 'utf8');
            const lockBefore = fs.readFileSync(path.join(root, 'package-lock.json'), 'utf8');

            const rejectedReview = await prepareArtifactValueInsertion(artifact, root, {
                oid: 'chart-target',
                domId: 'chart-target-dom',
                webviewId: 'chart-test-webview',
            });
            const rejectedApproval = getArtifactInsertionApprovalDetails(
                rejectedReview.planId,
                rejectedReview.planHash,
            );
            const clsxApproval = rejectedApproval.dependencies.find((item) => item.name === 'clsx');
            assert.equal(clsxApproval?.action, 'install');
            assert.ok(/^\d+\.\d+\.\d+$/.test(clsxApproval?.version ?? ''));
            assert.ok(clsxApproval?.provenance);
            assert.equal(cancelArtifactInsertion(rejectedReview.planId), true);
            assert.equal(fs.readFileSync(path.join(root, 'package.json'), 'utf8'), packageBefore);
            assert.equal(fs.readFileSync(path.join(root, 'package-lock.json'), 'utf8'), lockBefore);

            const review = await prepareArtifactValueInsertion(artifact, root, {
                oid: 'chart-target',
                domId: 'chart-target-dom',
                webviewId: 'chart-test-webview',
            });
            assert.equal(review.artifact.artifactHash, artifact.integrity.artifactHash);
            assert.deepEqual(review.conflicts, []);
            for (const dependency of review.dependencies) {
                assert.equal(
                    dependency.action,
                    dependency.name === 'clsx' ? 'install' : 'present',
                    `${dependency.name} dependency plan`,
                );
                assert.ok(/^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?$/.test(dependency.version));
            }
            const applied = await applyArtifactInsertion(review.planId, review.planHash);
            assert.equal(applied.artifact.artifactHash, artifact.integrity.artifactHash);
            assert.equal(applied.artifact.sourceHash, artifact.integrity.sourceHash);

            const previewEntryPath = `/src/${artifact.entryPoint.replaceAll('\\', '/')}`;
            const insertedPath = review.filesToCreate.find(
                (file) => file.path.endsWith(path.join(...artifact.entryPoint.split('/'))),
            )?.path;
            assert.ok(insertedPath);
            const parity = await renderFixtureRuntime(
                root,
                sessionId,
                previewEntryPath,
                insertedPath,
            );
            assert.equal(parity.previewStatus, 200);
            assert.equal(parity.moduleStatus, 200);
            assert.equal(normalizeChartMarkup(parity.insertedMarkup!), normalizeChartMarkup(parity.previewMarkup));
            assert.match(parity.previewMarkup, /data-chart=/);
            assert.match(entryFile.content, /chartData/);
            assert.match(await fs.promises.readFile(insertedPath, 'utf8'), /chartData/);

            const packageLock = JSON.parse(
                fs.readFileSync(path.join(root, 'package-lock.json'), 'utf8'),
            ) as { packages?: Record<string, { version?: string }> };
            for (const [name, version] of Object.entries(exactDependencies)) {
                assert.equal(packageLock.packages?.[`node_modules/${name}`]?.version, version);
            }
            await finishArtifactInsertion(root, applied.operationId, false);
            assert.equal(fs.readFileSync(path.join(root, 'package.json'), 'utf8'), packageBefore);
            assert.equal(fs.readFileSync(path.join(root, 'package-lock.json'), 'utf8'), lockBefore);
            assert.ok(insertedPath);
            assert.equal(fs.existsSync(insertedPath), false);
        },
    );
});
