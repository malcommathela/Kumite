import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { gunzipSync } from 'node:zlib';
import { performance } from 'node:perf_hooks';
import {
    createShadcnSourceResolver,
    type SourceFetcher,
} from '../electron/main/components/source-resolver';
import { ensureMaterialization } from '../electron/main/components/artifact-preview';
import { buildArtifactPreviewModule } from '../electron/main/components/artifact-preview-module';
import { generateArtifactPreviewRegistry } from '../electron/main/components/preview-registry';
import { buildCatalogHtml } from '../electron/main/components/preview';
import { PreviewRuntimeManager } from '../electron/main/components/preview-runtime';

const STUDIO = process.cwd();
const REPO_ROOT = path.resolve(STUDIO, '../..');
const FIXTURE = path.join(
    STUDIO,
    'electron/main/components/fixtures/dashboard-01-responses.json.gz',
);
const captured = JSON.parse(gunzipSync(fs.readFileSync(FIXTURE)).toString('utf8')) as Record<
    string,
    { status: number; contentType: string; body: string }
>;
const fetcher: SourceFetcher = async (url) => {
    const entry = captured[url];
    if (!entry) {return new Response('not found', { status: 404 });}
    return new Response(new Uint8Array(Buffer.from(entry.body, 'base64')), {
        status: entry.status,
        headers: { 'content-type': entry.contentType },
    });
};

const items = [
    { kind: 'component' as const, name: 'button' },
    { kind: 'component' as const, name: 'avatar' },
    { kind: 'block' as const, name: 'dashboard-01' },
    { kind: 'example' as const, name: 'chart-bar-demo' },
];

const marks: Array<{ label: string; ms: number }> = [];
function mark(label: string, started: number): number {
    const ms = performance.now() - started;
    marks.push({ label, ms });
    return ms;
}
function round(ms: number): string {
    return `${ms.toFixed(1)} ms`;
}
function sha256(value: string): string {
    return require('node:crypto').createHash('sha256').update(value).digest('hex');
}

const workspace = fs.mkdtempSync(path.join(os.tmpdir(), 'kumite-bench-'));
fs.symlinkSync(path.join(REPO_ROOT, 'node_modules'), path.join(workspace, 'node_modules'), 'junction');
fs.mkdirSync(path.join(workspace, 'src'), { recursive: true });
fs.writeFileSync(path.join(workspace, 'src', 'index.css'), 'body { margin: 0; }\n');
fs.writeFileSync(
    path.join(workspace, 'package.json'),
    JSON.stringify({ name: 'kumite-bench', private: true, type: 'module' }, null, 2),
);
fs.writeFileSync(
    path.join(workspace, 'vite.config.ts'),
    `import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath } from 'node:url';

const source = (path: string) => fileURLToPath(new URL(path, import.meta.url));

export default defineConfig({
    plugins: [react()],
    resolve: {
        alias: [
            { find: /^@\\/registry\\/new-york-v4\\//, replacement: source('./src/registry/new-york-v4/') },
            { find: /^@\\/components\\/ui\\//, replacement: source('./src/registry/new-york-v4/ui/') },
            { find: /^@\\/components\\//, replacement: source('./src/registry/new-york-v4/components/') },
            { find: /^@\\/assets\\//, replacement: source('./src/registry/new-york-v4/assets/') },
            { find: /^@\\/hooks\\//, replacement: source('./src/registry/new-york-v4/hooks/') },
            { find: /^@\\/lib\\//, replacement: source('./src/registry/new-york-v4/lib/') },
            { find: '@', replacement: source('./src/') },
        ],
    },
});
`,
);

const manager = new PreviewRuntimeManager({ startTimeoutMs: 60_000 });
let exitCode = 0;
try {
    const resolver = createShadcnSourceResolver({
        fetcher,
        assetDirectory: path.join(workspace, '.kumite-artifact-store'),
        now: () => new Date('2026-11-16T12:00:00.000Z'),
    });
    const artifacts = [];
    let t = performance.now();
    for (const item of items) {
        const started = performance.now();
        const artifact = await resolver.resolve({ provider: 'shadcn', ...item });
        mark(`resolve ${item.name}`, started);
        artifacts.push(artifact);
    }
    mark('resolve all (4 artifacts)', t);

    const modules = [];
    for (const artifact of artifacts) {
        const started = performance.now();
        const result = await ensureMaterialization(artifact, workspace);
        mark(`materialize cold ${artifact.metadata.name}`, started);
        for (const file of result.manifest.files) {
            const destination = path.join(workspace, 'src', ...file.path.split('/'));
            fs.mkdirSync(path.dirname(destination), { recursive: true });
            fs.copyFileSync(path.join(result.directory, ...file.path.split('/')), destination);
        }
        for (const asset of result.manifest.assets) {
            const destination = path.join(workspace, ...asset.path.split('/'));
            fs.mkdirSync(path.dirname(destination), { recursive: true });
            fs.copyFileSync(path.join(result.directory, ...asset.path.split('/')), destination);
        }
        const built = performance.now();
        const source = buildArtifactPreviewModule(artifact);
        mark(`build preview module ${artifact.metadata.name}`, built);
        modules.push({
            key: `${artifact.provider}:${artifact.metadata.type}:${artifact.id}`,
            artifactHash: artifact.integrity.artifactHash,
            kind: artifact.metadata.type,
            name: artifact.metadata.name,
            source,
        });
    }

    for (const artifact of artifacts) {
        const started = performance.now();
        await ensureMaterialization(artifact, workspace);
        mark(`materialize warm ${artifact.metadata.name}`, started);
    }

    t = performance.now();
    const registryCold = await generateArtifactPreviewRegistry(workspace, modules);
    mark('registry cold (write 4 modules + index)', t);
    t = performance.now();
    const registryWarm = await generateArtifactPreviewRegistry(workspace, modules);
    mark('registry warm (no rewrites)', t);
    if (registryCold.writtenModules !== 4 || registryWarm.writtenModules !== 0) {
        throw new Error(
            `unexpected registry writes: cold=${registryCold.writtenModules} warm=${registryWarm.writtenModules}`,
        );
    }

    const entries = modules.map((module, index) => ({
        sessionId: `bench-${index}`,
        entryId: `bench-${index}`,
        html: buildCatalogHtml(module.name, `bench-${index}`, `bench-${index}`),
        source: registryCold.entrySources[module.key]!,
    }));
    t = performance.now();
    const started = await manager.ensure({
        projectPath: workspace,
        kind: 'benchmark',
        viteBin: path.join(workspace, 'node_modules', 'vite', 'bin', 'vite.js'),
        basePort: 38940,
        ownerId: 'benchmark',
        entries,
    });
    mark('vite cold start', t);
    if (started.error) {throw new Error(started.error);}
    const origin = new URL(started.urls['bench-0']!).origin;

    for (const [index, module] of modules.entries()) {
        const url = `${origin}/src/.kumite-preview-registry/modules/${sha256(module.source)}.tsx`;
        const cold = performance.now();
        const first = await fetch(url);
        if (first.status !== 200) {throw new Error(`${module.name}: HTTP ${first.status}`);}
        await first.text();
        mark(`vite transform cold ${module.name}`, cold);
        const warm = performance.now();
        const second = await fetch(url);
        await second.text();
        mark(`vite transform warm ${module.name}`, warm);
        if (second.status !== 200) {throw new Error(`${module.name} warm: HTTP ${second.status}`);}
    }

    // Consecutive preview batches reuse the same server and registry.
    t = performance.now();
    const secondBatch = await manager.ensure({
        projectPath: workspace,
        kind: 'benchmark',
        viteBin: path.join(workspace, 'node_modules', 'vite', 'bin', 'vite.js'),
        basePort: 38940,
        ownerId: 'benchmark',
        entries: entries.map((entry) => ({
            ...entry,
            sessionId: `${entry.sessionId}-repeat`,
            entryId: `${entry.entryId}-repeat`,
        })),
    });
    mark('consecutive batch (warm server)', t);
    if (secondBatch.error) {throw new Error(secondBatch.error);}

    // Concurrent previews: four sessions requested at once from one owner.
    t = performance.now();
    const concurrent = await manager.ensure({
        projectPath: workspace,
        kind: 'benchmark',
        viteBin: path.join(workspace, 'node_modules', 'vite', 'bin', 'vite.js'),
        basePort: 38940,
        ownerId: 'benchmark',
        entries: entries.map((entry) => ({
            ...entry,
            sessionId: `${entry.sessionId}-concurrent`,
            entryId: `${entry.entryId}-concurrent`,
        })),
    });
    mark('concurrent batch (4 sessions)', t);
    if (concurrent.error) {throw new Error(concurrent.error);}
    for (const url of Object.values(concurrent.urls)) {
        if ((await fetch(url)).status !== 200) {throw new Error(`session ${url} failed`);}
    }
    mark('fetch 4 concurrent session entries', t);
} catch (error) {
    exitCode = 1;
    console.error(error);
} finally {
    await manager.stopAll().catch((error) => console.error(error));
    fs.rmSync(workspace, { recursive: true, force: true, maxRetries: 5 });
}

console.log(`\nKumite preview pipeline benchmark (${process.platform}, Bun ${process.versions.bun})\n`);
for (const { label, ms } of marks) {console.log(`${label.padEnd(48)} ${round(ms)}`);}
process.exit(exitCode);
