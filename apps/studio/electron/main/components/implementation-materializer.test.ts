import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { gunzipSync } from 'node:zlib';
import { after, describe, it } from 'node:test';
import { type ImplementationArtifact, type ImplementationKind } from '@kumite/models';
import {
    createShadcnSourceResolver,
    hashImplementationArtifact,
    hashImplementationSource,
    type SourceFetcher,
} from './source-resolver';
import {
    ImplementationMaterializationError,
    materializeImplementationArtifact,
} from './implementation-materializer';

const FIXTURE_PATH = path.join(import.meta.dirname, 'fixtures', 'dashboard-01-responses.json.gz');
const PINNED_COMMIT = '1e9e337923aaede7db55b6091cb56a72a661b959';
const REGISTRY_ROOT =
    `https://raw.githubusercontent.com/shadcn-ui/ui/${PINNED_COMMIT}` +
    '/apps/v4/public/r/styles/new-york-v4';
const roots: string[] = [];

after(() => {
    for (const root of roots) {
        fs.rmSync(root, { recursive: true, force: true });
    }
});

interface CapturedResponse {
    status: number;
    contentType: string;
    body: string;
}

const capturedResponses = JSON.parse(
    gunzipSync(fs.readFileSync(FIXTURE_PATH)).toString('utf8'),
) as Record<string, CapturedResponse>;

function temporaryDirectory(prefix = 'kumite-materializer-'): string {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), prefix));
    roots.push(root);
    return root;
}

function fixtureFetcher(overrides: Record<string, Buffer | string> = {}): SourceFetcher {
    return async (url) => {
        const override = overrides[url];
        if (override !== undefined) {
            return new Response(
                typeof override === 'string' ? override : new Uint8Array(override),
                { status: 200 },
            );
        }
        const captured = capturedResponses[url];
        if (!captured) {
            return new Response('not found', { status: 404 });
        }
        return new Response(new Uint8Array(Buffer.from(captured.body, 'base64')), {
            status: captured.status,
            headers: { 'content-type': captured.contentType },
        });
    };
}

async function resolveFixture(
    kind: ImplementationKind,
    name: string,
    cacheDirectory = temporaryDirectory('kumite-resolver-assets-'),
): Promise<ImplementationArtifact> {
    return createShadcnSourceResolver({
        fetcher: fixtureFetcher(),
        assetDirectory: cacheDirectory,
        now: () => new Date('2026-11-16T12:00:00.000Z'),
    }).resolve({ provider: 'shadcn', kind, name });
}

async function materialize(
    artifact: ImplementationArtifact,
    options: Parameters<typeof materializeImplementationArtifact>[2] = {},
) {
    const root = temporaryDirectory();
    return {
        root,
        destination: path.join(root, 'implementation'),
        result: await materializeImplementationArtifact(
            artifact,
            path.join(root, 'implementation'),
            options,
        ),
    };
}

function cloneArtifact(artifact: ImplementationArtifact): ImplementationArtifact {
    return JSON.parse(JSON.stringify(artifact)) as ImplementationArtifact;
}

function recomputeIntegrity(artifact: ImplementationArtifact): void {
    artifact.integrity.sourceHash = hashImplementationSource({
        registryItems: artifact.source.registryItems,
        files: artifact.files,
        assets: artifact.assets,
    });
    artifact.integrity.artifactHash = hashImplementationArtifact(artifact);
}

function assetFixtureFetcher(responses: Record<string, Buffer>): SourceFetcher {
    return async (url) => {
        const bytes = responses[url];
        return bytes
            ? new Response(new Uint8Array(bytes), { status: 200 })
            : new Response('not found', { status: 404 });
    };
}

async function resolveAssetPathFixture() {
    const registryUrl = `${REGISTRY_ROOT}/materializer-paths.json`;
    const item = JSON.stringify({
        name: 'materializer-paths',
        type: 'registry:example',
        files: [
            {
                path: 'registry/new-york-v4/examples/materializer-paths/page.tsx',
                type: 'registry:example',
                content: [
                    'import logo from "@/assets/logo.svg";',
                    'import logoCopy from "@/assets/logo-copy.svg";',
                    'import "./styles.css";',
                    'import config from "./config/preview.ts";',
                    'import data from "./data.json";',
                    'export default function Page() {',
                    '  return <><img src="/brand.png" /><img src="https://images.example.test/remote.png" /><img src="data:image/svg+xml;base64,PHN2Zy8+" /><img src="blob:https://images.example.test/asset-id" />{[logo, logoCopy, config, data]}</>;',
                    '}',
                ].join('\n'),
            },
            {
                path: 'registry/new-york-v4/examples/materializer-paths/styles.css',
                type: 'registry:style',
                content:
                    'body { background-image: url("./pattern.svg"); mask-image: url("@/assets/texture.svg"); }',
            },
            {
                path: 'registry/new-york-v4/examples/materializer-paths/config/preview.ts',
                type: 'registry:file',
                content: 'export default { mode: "source" };',
            },
            {
                path: 'registry/new-york-v4/examples/materializer-paths/data.json',
                type: 'registry:file',
                content: '[{"header":"Original row","value":23}]',
            },
        ],
    });
    const bytes = {
        logo: Buffer.from('<svg>same logo</svg>'),
        texture: Buffer.from('<svg>texture</svg>'),
        pattern: Buffer.from('<svg>pattern</svg>'),
        brand: Buffer.from('original brand bytes'),
    };
    const responses: Record<string, Buffer> = {
        [`${SHADCN_RAW_ROOT}/apps/v4/registry/new-york-v4/assets/logo.svg`]: bytes.logo,
        [`${SHADCN_RAW_ROOT}/apps/v4/registry/new-york-v4/assets/logo-copy.svg`]: bytes.logo,
        [`${SHADCN_RAW_ROOT}/apps/v4/registry/new-york-v4/assets/texture.svg`]: bytes.texture,
        [`${SHADCN_RAW_ROOT}/apps/v4/registry/new-york-v4/examples/materializer-paths/pattern.svg`]:
            bytes.pattern,
        [`${SHADCN_RAW_ROOT}/apps/v4/public/brand.png`]: bytes.brand,
    };
    const artifact = await createShadcnSourceResolver({
        fetcher: async (url) => {
            if (url === registryUrl) {
                return new Response(item, { status: 200 });
            }
            const responseBytes = responses[url];
            return responseBytes
                ? new Response(new Uint8Array(responseBytes), { status: 200 })
                : new Response('not found', { status: 404 });
        },
        assetDirectory: temporaryDirectory('kumite-resolver-assets-'),
        now: () => new Date('2026-11-16T12:00:00.000Z'),
    }).resolve({ provider: 'shadcn', kind: 'example', name: 'materializer-paths' });
    return { artifact, bytes, responses, registryUrl };
}

const SHADCN_RAW_ROOT = `https://raw.githubusercontent.com/shadcn-ui/ui/${PINNED_COMMIT}`;

describe('implementation artifact materializer', () => {
    it('materializes a component source tree and writes a relative deterministic manifest', async () => {
        const artifact = await resolveFixture('component', 'button');
        const original = cloneArtifact(artifact);
        const { destination, result } = await materialize(artifact);

        assert.equal(result.artifactId, artifact.id);
        assert.equal(result.entryPoint, path.join(destination, ...artifact.entryPoint.split('/')));
        assert.equal(fs.existsSync(result.entryPoint), true);
        assert.equal(path.isAbsolute(result.manifest.entryPoint), false);
        assert.deepEqual(artifact, original);
        assert.equal(
            fs.readFileSync(result.entryPoint, 'utf8'),
            artifact.files.find((file) => file.path === artifact.entryPoint)?.content,
        );
        assert.equal(fs.existsSync(result.manifestPath), true);
        assert.deepEqual(JSON.parse(fs.readFileSync(result.manifestPath, 'utf8')), result.manifest);
        assert.ok(result.manifest.files.every((file) => !path.isAbsolute(file.path)));
        assert.equal('retrievedAt' in result.manifest.artifact.source, false);
    });

    it('preserves example demo source and data byte-for-byte', async () => {
        const artifact = await resolveFixture('example', 'chart-bar-demo');
        const { result } = await materialize(artifact);
        const example = artifact.files.find((file) => file.path === artifact.entryPoint);
        const materializedExample = result.sourceFiles.find(
            (file) => file.relativePath === artifact.entryPoint,
        );

        assert.ok(example);
        assert.ok(materializedExample);
        assert.equal(fs.readFileSync(materializedExample.path, 'utf8'), example.content);
        assert.equal(result.manifest.demo.available, true);
        assert.deepEqual(result.manifest.demo.files, artifact.demo.files);
    });

    it('materializes the complete dashboard block, original rows, and public avatar', async () => {
        const artifact = await resolveFixture('block', 'dashboard-01');
        const dataFile = artifact.files.find((file) =>
            file.path.endsWith('/dashboard-01/data.json'),
        );
        const { destination, result } = await materialize(artifact, {
            assetFetcher: fixtureFetcher(),
        });

        assert.ok(dataFile);
        assert.equal(
            JSON.parse(fs.readFileSync(path.join(destination, dataFile.path), 'utf8')).length,
            68,
        );
        assert.equal(
            fs.readFileSync(path.join(destination, dataFile.path), 'utf8'),
            dataFile.content,
        );
        assert.ok(
            fs.existsSync(
                path.join(destination, 'registry/new-york-v4/blocks/dashboard-01/page.tsx'),
            ),
        );
        assert.ok(
            fs.existsSync(
                path.join(
                    destination,
                    'registry/new-york-v4/blocks/dashboard-01/components/data-table.tsx',
                ),
            ),
        );
        assert.ok(fs.existsSync(path.join(destination, 'registry/new-york-v4/ui/sidebar.tsx')));
        assert.ok(fs.existsSync(path.join(destination, 'public/avatars/shadcn.jpg')));
        assert.deepEqual(
            result.manifest.files.map((file) => file.path).sort(),
            artifact.files.map((file) => file.path).sort(),
        );
        for (const sourceFile of artifact.files) {
            const output = path.join(destination, ...sourceFile.path.split('/'));
            assert.equal(
                createHash('sha256').update(fs.readFileSync(output)).digest('hex'),
                sourceFile.sha256,
                sourceFile.path,
            );
        }
        assert.ok(
            result.manifest.files.some(
                (file) =>
                    file.path === artifact.entryPoint &&
                    file.registryType === 'registry:page' &&
                    file.target === 'app/dashboard/page.tsx',
            ),
        );
        assert.ok(result.manifest.files.length >= 30);
        assert.ok(
            result.assets.some((asset) => asset.relativePath === 'public/avatars/shadcn.jpg'),
        );
    });

    it('preserves nested import paths, CSS/config files, public and relative assets, and external references', async () => {
        const { artifact, bytes, responses } = await resolveAssetPathFixture();
        const calls = new Map<string, number>();
        const fetcher: SourceFetcher = async (url) => {
            calls.set(url, (calls.get(url) ?? 0) + 1);
            const responseBytes = responses[url];
            return responseBytes
                ? new Response(new Uint8Array(responseBytes), { status: 200 })
                : new Response('unexpected external request', { status: 404 });
        };
        const { destination, result } = await materialize(artifact, { assetFetcher: fetcher });

        assert.equal(
            fs.readFileSync(path.join(destination, artifact.entryPoint), 'utf8'),
            artifact.files.find((file) => file.path === artifact.entryPoint)?.content,
        );
        assert.equal(
            fs.readFileSync(
                path.join(
                    destination,
                    'registry/new-york-v4/examples/materializer-paths/styles.css',
                ),
                'utf8',
            ),
            artifact.files.find((file) => file.path.endsWith('/styles.css'))?.content,
        );
        assert.equal(
            fs.readFileSync(
                path.join(
                    destination,
                    'registry/new-york-v4/examples/materializer-paths/config/preview.ts',
                ),
                'utf8',
            ),
            artifact.files.find((file) => file.path.endsWith('/config/preview.ts'))?.content,
        );
        assert.deepEqual(
            fs.readFileSync(path.join(destination, 'registry/new-york-v4/assets/logo.svg')),
            bytes.logo,
        );
        assert.deepEqual(
            fs.readFileSync(
                path.join(
                    destination,
                    'registry/new-york-v4/examples/materializer-paths/pattern.svg',
                ),
            ),
            bytes.pattern,
        );
        assert.deepEqual(fs.readFileSync(path.join(destination, 'public/brand.png')), bytes.brand);
        assert.ok(result.manifest.files.some((file) => file.role === 'stylesheet'));
        assert.ok(result.manifest.files.some((file) => file.role === 'configuration'));
        assert.ok(
            result.externalAssets.some(
                (asset) => asset.source === 'https://images.example.test/remote.png',
            ),
        );
        assert.ok(
            result.externalAssets.some((asset) => asset.source.startsWith('data:image/svg+xml')),
        );
        assert.ok(result.externalAssets.some((asset) => asset.source.startsWith('blob:')));
        assert.equal(calls.has('https://images.example.test/remote.png'), false);
        assert.equal(calls.has('data:image/svg+xml;base64,PHN2Zy8+'), false);
        assert.equal(calls.has('blob:https://images.example.test/asset-id'), false);
        const deduplicatedLogoRequests = [
            `${SHADCN_RAW_ROOT}/apps/v4/registry/new-york-v4/assets/logo.svg`,
            `${SHADCN_RAW_ROOT}/apps/v4/registry/new-york-v4/assets/logo-copy.svg`,
        ].reduce((count, url) => count + (calls.get(url) ?? 0), 0);
        assert.equal(deduplicatedLogoRequests, 1);
        assert.ok(
            result.manifest.sourceAliases.some(
                (alias) => alias.specifierPrefix === '@/components/ui/',
            ),
        );
    });

    it('preserves dependency versions and provenance without installing packages', async () => {
        const artifact = await resolveFixture('block', 'dashboard-01');
        const { result } = await materialize(artifact, { assetFetcher: fixtureFetcher() });
        const registryDependency = result.dependencyPlan.packages.find(
            (dependency) => dependency.name === 'recharts',
        );
        const sourceOnly = result.dependencyPlan.packages.find(
            (dependency) => dependency.name === 'react',
        );

        assert.equal(registryDependency?.version, '2.15.4');
        assert.deepEqual(registryDependency?.origins, ['registry', 'source-import']);
        assert.equal(registryDependency?.versionSource, 'registry');
        assert.deepEqual(sourceOnly?.origins, ['source-import']);
        assert.equal(result.dependencyPlan.provenanceComplete, true);
        assert.equal(
            fs.existsSync(path.join(result.materializationDirectory, 'package.json')),
            false,
        );
    });

    it('produces the same manifest for the same artifact independent of retrieval time and root path', async () => {
        const artifact = await resolveFixture('block', 'dashboard-01');
        const secondArtifact = cloneArtifact(artifact);
        secondArtifact.source.retrievedAt = '2027-01-01T00:00:00.000Z';
        const first = await materialize(artifact, { assetFetcher: fixtureFetcher() });
        const second = await materialize(secondArtifact, { assetFetcher: fixtureFetcher() });

        assert.notEqual(first.destination, second.destination);
        assert.deepEqual(first.result.manifest, second.result.manifest);
    });

    it('rejects artifacts that fail schema validation', async () => {
        const artifact = await resolveFixture('component', 'button');
        const invalid = {
            ...artifact,
            provider: 'unsupported-provider',
        } as unknown as ImplementationArtifact;

        await assert.rejects(
            materializeImplementationArtifact(invalid, path.join(temporaryDirectory(), 'out')),
            (error: unknown) =>
                error instanceof ImplementationMaterializationError &&
                error.code === 'invalid-artifact',
        );
    });

    it('rejects source files whose content no longer matches their SHA-256', async () => {
        const artifact = cloneArtifact(await resolveFixture('component', 'button'));
        artifact.files[0]!.content += '\n// modified\n';

        await assert.rejects(
            materializeImplementationArtifact(artifact, path.join(temporaryDirectory(), 'out')),
            /Source file hash mismatch/,
        );
    });

    it('rejects downloaded assets with incorrect SHA-256 metadata', async () => {
        const { artifact, responses } = await resolveAssetPathFixture();
        const corrupted = cloneArtifact(artifact);
        const localAsset = corrupted.assets.find((asset) => !asset.external)!;
        localAsset.sha256 = '0'.repeat(64);
        recomputeIntegrity(corrupted);

        await assert.rejects(
            materializeImplementationArtifact(corrupted, path.join(temporaryDirectory(), 'out'), {
                assetFetcher: assetFixtureFetcher(responses),
            }),
            (error: unknown) =>
                error instanceof ImplementationMaterializationError && error.code === 'asset',
        );
    });

    it('rejects downloaded assets with incorrect byte-size metadata', async () => {
        const { artifact, responses } = await resolveAssetPathFixture();
        const corrupted = cloneArtifact(artifact);
        const localAsset = corrupted.assets.find((asset) => !asset.external)!;
        localAsset.size = (localAsset.size ?? 0) + 1;
        recomputeIntegrity(corrupted);

        await assert.rejects(
            materializeImplementationArtifact(corrupted, path.join(temporaryDirectory(), 'out'), {
                assetFetcher: assetFixtureFetcher(responses),
            }),
            (error: unknown) =>
                error instanceof ImplementationMaterializationError && error.code === 'asset',
        );
    });

    it('rejects an artifact that omits a source asset referenced by its dependency graph', async () => {
        const { artifact } = await resolveAssetPathFixture();
        const incomplete = cloneArtifact(artifact);
        incomplete.assets = incomplete.assets.filter(
            (asset) => !asset.path.endsWith('/pattern.svg'),
        );
        recomputeIntegrity(incomplete);

        await assert.rejects(
            materializeImplementationArtifact(incomplete, path.join(temporaryDirectory(), 'out')),
            (error: unknown) =>
                error instanceof ImplementationMaterializationError &&
                error.code === 'integrity' &&
                error.message.includes('has no matching asset metadata'),
        );
    });

    it('rejects a missing entry point before creating a destination', async () => {
        const artifact = cloneArtifact(await resolveFixture('component', 'button'));
        artifact.entryPoint = 'registry/new-york-v4/ui/not-installed.tsx';
        recomputeIntegrity(artifact);
        const root = temporaryDirectory();
        const destination = path.join(root, 'out');

        await assert.rejects(
            materializeImplementationArtifact(artifact, destination),
            /Entry point/,
        );
        assert.equal(fs.existsSync(destination), false);
    });

    it('rejects conflicting duplicate destination paths before writing', async () => {
        const artifact = cloneArtifact(await resolveFixture('component', 'button'));
        const original = artifact.files[0]!;
        artifact.files.push({
            ...original,
            content: `${original.content}\n// conflicting source\n`,
            sha256: createHash('sha256')
                .update(`${original.content}\n// conflicting source\n`)
                .digest('hex'),
        });
        recomputeIntegrity(artifact);
        const root = temporaryDirectory();

        await assert.rejects(
            materializeImplementationArtifact(artifact, path.join(root, 'out')),
            (error: unknown) =>
                error instanceof ImplementationMaterializationError &&
                error.code === 'path-conflict',
        );
        assert.deepEqual(fs.readdirSync(root), []);
    });

    it('rejects traversal, absolute, drive-qualified, and UNC artifact paths', async () => {
        const source = await resolveFixture('component', 'button');
        for (const unsafePath of [
            '../outside.tsx',
            '/outside.tsx',
            'C:/outside.tsx',
            '\\\\server\\share\\outside.tsx',
        ]) {
            const artifact = cloneArtifact(source);
            const file = artifact.files[0]!;
            artifact.files[0] = { ...file, path: unsafePath };
            recomputeIntegrity(artifact);
            const root = temporaryDirectory();

            await assert.rejects(
                materializeImplementationArtifact(artifact, path.join(root, 'out')),
                (error: unknown) =>
                    error instanceof ImplementationMaterializationError &&
                    error.code === 'unsafe-path',
                unsafePath,
            );
            assert.deepEqual(fs.readdirSync(root), []);
        }
    });

    it('refuses an existing destination without changing its files', async () => {
        const artifact = await resolveFixture('component', 'button');
        const root = temporaryDirectory();
        const destination = path.join(root, 'out');
        fs.mkdirSync(destination);
        fs.writeFileSync(path.join(destination, 'user.txt'), 'owned');

        await assert.rejects(
            materializeImplementationArtifact(artifact, destination),
            (error: unknown) =>
                error instanceof ImplementationMaterializationError &&
                error.code === 'destination-exists',
        );
        assert.equal(fs.readFileSync(path.join(destination, 'user.txt'), 'utf8'), 'owned');
        assert.deepEqual(fs.readdirSync(root), ['out']);
    });

    it('does not modify neighboring project files during successful materialization', async () => {
        const artifact = await resolveFixture('component', 'button');
        const root = temporaryDirectory();
        const sentinel = path.join(root, 'keep.txt');
        fs.writeFileSync(sentinel, 'owned');

        await materializeImplementationArtifact(artifact, path.join(root, 'out'));

        assert.equal(fs.readFileSync(sentinel, 'utf8'), 'owned');
        assert.deepEqual(fs.readdirSync(root).sort(), ['keep.txt', 'out']);
    });

    it('cleans staging output after a required local asset fails to download', async () => {
        const { artifact } = await resolveAssetPathFixture();
        const root = temporaryDirectory();
        const sentinel = path.join(root, 'keep.txt');
        fs.writeFileSync(sentinel, 'untouched');

        await assert.rejects(
            materializeImplementationArtifact(artifact, path.join(root, 'out'), {
                assetFetcher: async () => new Response('missing', { status: 404 }),
            }),
            (error: unknown) =>
                error instanceof ImplementationMaterializationError && error.code === 'asset',
        );
        assert.deepEqual(fs.readdirSync(root), ['keep.txt']);
        assert.equal(fs.readFileSync(sentinel, 'utf8'), 'untouched');
    });

    it('honors cancellation and removes staging output', async () => {
        const { artifact } = await resolveAssetPathFixture();
        const root = temporaryDirectory();
        const controller = new AbortController();

        await assert.rejects(
            materializeImplementationArtifact(artifact, path.join(root, 'out'), {
                signal: controller.signal,
                assetFetcher: async (_url, signal) => {
                    controller.abort(new Error('cancelled by test'));
                    signal?.throwIfAborted();
                    return new Response('unreachable');
                },
            }),
            (error: unknown) =>
                error instanceof ImplementationMaterializationError && error.code === 'cancelled',
        );
        assert.deepEqual(fs.readdirSync(root), []);
    });

    it('does not mutate the source artifact or its resolver cache asset', async () => {
        const cacheDirectory = temporaryDirectory('kumite-source-cache-');
        const artifact = await resolveFixture('block', 'dashboard-01', cacheDirectory);
        const before = JSON.stringify(artifact);
        const avatar = artifact.assets.find((asset) => asset.path.endsWith('shadcn.jpg'))!;
        const cacheFile = path.join(
            cacheDirectory,
            `${avatar.sha256}${path.posix.extname(avatar.path)}`,
        );
        const cachedBytes = fs.readFileSync(cacheFile);
        await materialize(artifact, { assetFetcher: fixtureFetcher() });

        assert.equal(JSON.stringify(artifact), before);
        assert.deepEqual(fs.readFileSync(cacheFile), cachedBytes);
    });

    it('reports case-insensitive destination collisions', async () => {
        const artifact = cloneArtifact(await resolveFixture('component', 'button'));
        const file = artifact.files[0]!;
        artifact.files.push({ ...file, path: file.path.toUpperCase() });
        recomputeIntegrity(artifact);

        await assert.rejects(
            materializeImplementationArtifact(artifact, path.join(temporaryDirectory(), 'out')),
            (error: unknown) =>
                error instanceof ImplementationMaterializationError &&
                error.code === 'path-conflict',
        );
    });

    it('rejects source-file and asset paths that collide with different content', async () => {
        const { artifact } = await resolveAssetPathFixture();
        const conflicting = cloneArtifact(artifact);
        const content = 'not the upstream brand image';
        conflicting.files.push({
            path: 'public/brand.png',
            content,
            role: 'source',
            sourceUrl: `${SHADCN_RAW_ROOT}/apps/v4/registry/new-york-v4/public/brand.png`,
            sha256: createHash('sha256').update(content).digest('hex'),
        });
        recomputeIntegrity(conflicting);

        await assert.rejects(
            materializeImplementationArtifact(conflicting, path.join(temporaryDirectory(), 'out')),
            (error: unknown) =>
                error instanceof ImplementationMaterializationError &&
                error.code === 'path-conflict',
        );
    });
});
