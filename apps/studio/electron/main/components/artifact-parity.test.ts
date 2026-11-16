import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { after, describe, it } from 'node:test';
import { gunzipSync } from 'node:zlib';
import { buildArtifactPreviewModule } from './artifact-preview';
import {
    createShadcnSourceResolver,
    type SourceFetcher,
} from './source-resolver';
import { materializeImplementationArtifact } from './implementation-materializer';
import { prepareImplementationInsertion } from './insertion-preparation';

const fixturePath = path.join(import.meta.dirname, 'fixtures', 'dashboard-01-responses.json.gz');
const responses = JSON.parse(
    gunzipSync(fs.readFileSync(fixturePath)).toString('utf8'),
) as Record<string, { status: number; contentType: string; body: string }>;
const roots: string[] = [];

after(() => {
    for (const root of roots) {
        fs.rmSync(root, { recursive: true, force: true });
    }
});

function fixtureFetcher(): SourceFetcher {
    return async (url) => {
        const response = responses[url];
        if (!response) {
            return new Response('not found', { status: 404 });
        }
        return new Response(Buffer.from(response.body, 'base64'), {
            status: response.status,
            headers: { 'content-type': response.contentType },
        });
    };
}

function temporaryDirectory(): string {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'kumite-artifact-parity-'));
    roots.push(root);
    return root;
}

function createProject(root: string): void {
    fs.mkdirSync(path.join(root, 'src'), { recursive: true });
    fs.writeFileSync(
        path.join(root, 'package.json'),
        JSON.stringify({ dependencies: { react: '^19.0.0' }, devDependencies: { vite: '^6.0.0' } }),
    );
    fs.writeFileSync(path.join(root, 'package-lock.json'), '{}');
    fs.writeFileSync(
        path.join(root, 'components.json'),
        JSON.stringify({
            aliases: { components: '@/components', ui: '@/components/ui' },
            tailwind: { css: 'src/index.css' },
        }),
    );
    fs.writeFileSync(
        path.join(root, 'tsconfig.json'),
        JSON.stringify({ compilerOptions: { paths: { '@/*': ['./src/*'] } } }),
    );
    fs.writeFileSync(path.join(root, 'src', 'index.css'), '@import "tailwindcss";');
}

describe('artifact preview and insertion parity', () => {
    it('uses the same dashboard source hashes, page entry, assets, and original demo data', async () => {
        const root = temporaryDirectory();
        const assetCache = path.join(root, 'asset-cache');
        const resolver = createShadcnSourceResolver({
            fetcher: fixtureFetcher(),
            assetDirectory: assetCache,
        });
        const artifact = await resolver.resolve({
            provider: 'shadcn',
            kind: 'block',
            name: 'dashboard-01',
        });
        const materialized = await materializeImplementationArtifact(
            artifact,
            path.join(root, 'materialized'),
            { assetFetcher: fixtureFetcher() },
        );
        const projectRoot = path.join(root, 'project');
        fs.mkdirSync(projectRoot);
        createProject(projectRoot);
        const insertion = prepareImplementationInsertion(artifact, projectRoot);
        const previewModule = buildArtifactPreviewModule(artifact, 'dashboard-preview');

        const artifactHashes = artifact.files
            .map(({ path: sourcePath, sha256 }) => [sourcePath, sha256])
            .sort(([a], [b]) => a!.localeCompare(b!));
        const previewSourceHashes = materialized.manifest.files
            .map(({ path: sourcePath, sha256 }) => [sourcePath, sha256])
            .sort(([a], [b]) => a!.localeCompare(b!));
        const insertionSourceHashes = insertion.files
            .map(({ sourcePath, sha256 }) => [sourcePath, sha256])
            .sort(([a], [b]) => a!.localeCompare(b!));

        assert.deepEqual(previewSourceHashes, artifactHashes);
        assert.deepEqual(insertionSourceHashes, artifactHashes);
        assert.equal(insertion.artifact.artifactHash, artifact.integrity.artifactHash);
        assert.equal(insertion.artifact.sourceHash, artifact.integrity.sourceHash);
        assert.equal(insertion.entryImport.export?.kind, 'default');
        assert.match(previewModule, new RegExp(artifact.entryPoint.replace(/\.tsx$/, '')));
        assert.match(previewModule, /import Implementation from/);
        assert.ok(artifact.demo.inventory?.some((item) => item.itemCount === 68 && !item.editable));
        const dataFile = artifact.files.find((file) => file.path.endsWith('/data.json'));
        assert.ok(dataFile);
        assert.equal(JSON.parse(dataFile.content).length, 68);
        assert.equal(
            materialized.manifest.demo.inventory?.find((item) => item.path === dataFile.path)
                ?.itemCount,
            68,
        );
        assert.deepEqual(
            materialized.manifest.assets.map((asset) => [asset.sourcePath, asset.sha256]).sort(),
            artifact.assets
                .filter((asset) => !asset.external)
                .map((asset) => [asset.path, asset.sha256])
                .sort(),
        );
        assert.equal(fs.existsSync(path.join(projectRoot, 'src', 'registry')), false);
    });
});
