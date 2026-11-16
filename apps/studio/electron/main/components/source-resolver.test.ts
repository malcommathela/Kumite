import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { gunzipSync } from 'node:zlib';
import { after, describe, it } from 'node:test';
import { deserializeImplementationArtifact, serializeImplementationArtifact } from '@kumite/models';
import {
    createShadcnSourceResolver,
    hashImplementationArtifact,
    SourceResolutionError,
} from './source-resolver';

const FIXTURE_PATH = path.join(import.meta.dirname, 'fixtures', 'dashboard-01-responses.json.gz');
const PINNED_COMMIT = '1e9e337923aaede7db55b6091cb56a72a661b959';
const ASSET_CACHE = fs.mkdtempSync(path.join(os.tmpdir(), 'kumite-source-assets-'));

after(() => {
    fs.rmSync(ASSET_CACHE, { recursive: true, force: true });
});

interface CapturedResponse {
    status: number;
    contentType: string;
    body: string;
}

const capturedResponses = JSON.parse(
    gunzipSync(fs.readFileSync(FIXTURE_PATH)).toString('utf8'),
) as Record<string, CapturedResponse>;

function fixtureFetcher(overrides: Record<string, string> = {}) {
    return async (url: string): Promise<Response> => {
        const override = overrides[url];
        if (override !== undefined) {
            return new Response(override, {
                status: 200,
                headers: { 'content-type': 'application/json' },
            });
        }
        const response = capturedResponses[url];
        if (!response) {
            return new Response('not found', { status: 404 });
        }
        return new Response(Buffer.from(response.body, 'base64'), {
            status: response.status,
            headers: { 'content-type': response.contentType },
        });
    };
}

function createFixtureResolver(options: Parameters<typeof createShadcnSourceResolver>[0] = {}) {
    return createShadcnSourceResolver({
        assetDirectory: ASSET_CACHE,
        ...options,
    });
}

function registryItem(
    name: string,
    type: string,
    files: Array<{ path: string; content: string; type?: string }>,
): string {
    return JSON.stringify({ name, type, files });
}

const rootRegistryUrl =
    'https://raw.githubusercontent.com/shadcn-ui/ui/' +
    `${PINNED_COMMIT}/apps/v4/public/r/styles/new-york-v4`;

describe('shadcn source resolver', () => {
    it('resolves a real registry component and preserves upstream provenance', async () => {
        const artifact = await createFixtureResolver({
            fetcher: fixtureFetcher(),
            now: () => new Date('2026-11-16T12:00:00.000Z'),
        }).resolve({ provider: 'shadcn', kind: 'component', name: 'button' });

        assert.equal(artifact.metadata.type, 'component');
        assert.equal(artifact.source.name, 'button');
        assert.equal(artifact.source.commit, PINNED_COMMIT);
        assert.equal(artifact.source.version, '3.7.0');
        assert.equal(artifact.source.provenance, 'official');
        assert.equal(artifact.entryPoint, 'registry/new-york-v4/ui/button.tsx');
        assert.equal(artifact.demo.available, false);
        assert.deepEqual(artifact.demo.files, []);
        assert.ok(artifact.files.some((file) => file.path === artifact.entryPoint));
        assert.ok(artifact.source.registryItems.some((item) => item.name === 'button'));
    });

    it('resolves the upstream chart example with its complete original dataset', async () => {
        const artifact = await createFixtureResolver({
            fetcher: fixtureFetcher(),
        }).resolve({ provider: 'shadcn', kind: 'example', name: 'chart-bar-demo' });
        const example = artifact.files.find((file) => file.path === artifact.entryPoint);

        assert.ok(example);
        assert.match(example.content, /January/);
        assert.match(example.content, /February/);
        assert.match(example.content, /June/);
        assert.match(example.content, /desktop: 214, mobile: 140/);
        assert.ok(artifact.demo.files.includes(artifact.entryPoint));
        assert.equal(artifact.demo.available, true);
        assert.equal(artifact.demo.preserved, true);
    });

    it('resolves the complete dashboard page, components, dependencies, and data file', async () => {
        const artifact = await createFixtureResolver({
            fetcher: fixtureFetcher(),
        }).resolve({ provider: 'shadcn', kind: 'block', name: 'dashboard-01' });
        const dashboardUrl = `${rootRegistryUrl}/dashboard-01.json`;
        const upstreamBlock = JSON.parse(
            Buffer.from(capturedResponses[dashboardUrl].body, 'base64').toString('utf8'),
        ) as { files: Array<{ path: string; content: string }> };
        const page = artifact.files.find((file) => file.path === artifact.entryPoint);
        const dataFile = artifact.files.find((file) =>
            file.path.endsWith('/dashboard-01/data.json'),
        );

        assert.deepEqual(
            upstreamBlock.files.map((file) => file.path).sort(),
            artifact.files
                .map((file) => file.path)
                .filter((filePath) => upstreamBlock.files.some((file) => file.path === filePath))
                .sort(),
        );
        for (const upstreamFile of upstreamBlock.files) {
            assert.equal(
                artifact.files.find((file) => file.path === upstreamFile.path)?.content,
                upstreamFile.content,
                `${upstreamFile.path} must remain byte-for-byte source-equivalent`,
            );
        }
        assert.ok(page);
        assert.equal(
            page.content,
            upstreamBlock.files.find((file) => file.path === artifact.entryPoint)?.content,
        );
        assert.match(page.content, /<AppSidebar variant="inset" \/>/);
        assert.match(page.content, /<ChartAreaInteractive \/>/);
        assert.match(page.content, /<DataTable data=\{data\} \/>/);
        assert.ok(dataFile);
        assert.equal(
            dataFile.content,
            upstreamBlock.files.find((file) => file.path === dataFile.path)?.content,
        );
        assert.equal(JSON.parse(dataFile.content).length, 68);
        assert.ok(artifact.files.some((file) => file.path.endsWith('/components/data-table.tsx')));
        assert.ok(
            artifact.files.some((file) =>
                file.path.endsWith('/components/chart-area-interactive.tsx'),
            ),
        );
        assert.ok(
            artifact.files.some((file) => file.path.endsWith('/components/section-cards.tsx')),
        );
        assert.ok(artifact.demo.files.includes(dataFile.path));
        assert.ok(
            artifact.demo.files.some((filePath) =>
                filePath.endsWith('/components/chart-area-interactive.tsx'),
            ),
        );
        assert.equal(artifact.demo.available, true);
        assert.equal(artifact.demo.preserved, true);
    });

    it('follows imports recursively across block, hook, utility, and UI files', async () => {
        const artifact = await createFixtureResolver({
            fetcher: fixtureFetcher(),
        }).resolve({ provider: 'shadcn', kind: 'block', name: 'dashboard-01' });
        const edgePairs = new Set(artifact.graph.edges.map((edge) => `${edge.from} -> ${edge.to}`));

        assert.ok(
            edgePairs.has(
                `${artifact.entryPoint} -> registry/new-york-v4/blocks/dashboard-01/components/app-sidebar.tsx`,
            ),
        );
        assert.ok(
            edgePairs.has(
                `registry:dashboard-01 -> registry/new-york-v4/blocks/dashboard-01/page.tsx`,
            ),
        );
        assert.ok(artifact.files.some((file) => file.path.endsWith('/hooks/use-mobile.ts')));
        assert.ok(artifact.files.some((file) => file.path.endsWith('/lib/utils.ts')));
        assert.ok(artifact.files.some((file) => file.path.endsWith('/ui/sidebar.tsx')));
        assert.ok(artifact.files.some((file) => file.path.endsWith('/ui/chart.tsx')));
    });

    it('collects registry and source-import package dependencies with versions', async () => {
        const artifact = await createFixtureResolver({
            fetcher: fixtureFetcher(),
        }).resolve({ provider: 'shadcn', kind: 'block', name: 'dashboard-01' });
        const dependencies = new Map(
            artifact.dependencies.map(({ name, version }) => [name, version]),
        );

        assert.ok(dependencies.has('@dnd-kit/core'));
        assert.ok(dependencies.has('@tanstack/react-table'));
        assert.ok(dependencies.has('recharts'));
        assert.ok(dependencies.has('react'));
        assert.equal(dependencies.get('recharts'), '2.15.4');
    });

    it('retrieves and hashes referenced local assets without losing their source path', async () => {
        const artifact = await createFixtureResolver({
            fetcher: fixtureFetcher(),
        }).resolve({ provider: 'shadcn', kind: 'block', name: 'dashboard-01' });
        const avatar = artifact.assets.find((asset) => asset.path.endsWith('shadcn.jpg'));

        assert.ok(avatar);
        assert.equal(avatar.external, false);
        assert.ok(avatar.sha256);
        assert.ok(avatar.cachePath);
        assert.equal(fs.existsSync(avatar.cachePath), true);
        assert.equal(
            createHash('sha256').update(fs.readFileSync(avatar.cachePath)).digest('hex'),
            avatar.sha256,
        );
        assert.equal(fs.readFileSync(avatar.cachePath).byteLength, avatar.size);
        assert.ok(avatar.referencedBy.some((file) => file.includes('dashboard-01')));
    });

    it('records source-provider requirements and registry metadata', async () => {
        const artifact = await createFixtureResolver({
            fetcher: fixtureFetcher(),
        }).resolve({ provider: 'shadcn', kind: 'block', name: 'dashboard-01' });

        assert.ok(artifact.requirements.providers.includes('SidebarProvider'));
        assert.ok(artifact.requirements.configuration.includes('react-client-components'));
        assert.ok(artifact.source.registryItems.length > 1);
        assert.ok(
            artifact.source.registryItems.every((item) => /^[a-f0-9]{64}$/.test(item.sha256)),
        );
        const dashboardMetadata = artifact.source.registryItems.find(
            (item) => item.name === 'dashboard-01',
        );
        assert.ok(dashboardMetadata);
        assert.ok(dashboardMetadata.registryDependencies.includes('sidebar'));
        assert.ok(dashboardMetadata.dependencies.includes('@dnd-kit/core'));
        assert.ok(
            dashboardMetadata.files.every((file) =>
                artifact.files.some((resolvedFile) => resolvedFile.path === file),
            ),
        );
    });

    it('detects circular local imports without dropping either source file', async () => {
        const rootUrl = `${rootRegistryUrl}/cycle-block.json`;
        const cyclic = registryItem('cycle-block', 'registry:block', [
            {
                path: 'registry/new-york-v4/blocks/cycle-block/a.tsx',
                type: 'registry:page',
                content: 'import { b } from "./b"; export default function Page() { return b; }',
            },
            {
                path: 'registry/new-york-v4/blocks/cycle-block/b.tsx',
                type: 'registry:component',
                content: 'import Page from "./a"; export const b = Page;',
            },
        ]);
        const artifact = await createFixtureResolver({
            fetcher: fixtureFetcher({ [rootUrl]: cyclic }),
        }).resolve({ provider: 'shadcn', kind: 'block', name: 'cycle-block' });

        assert.equal(artifact.graph.cycles.length, 1);
        assert.ok(artifact.files.some((file) => file.path.endsWith('/a.tsx')));
        assert.ok(artifact.files.some((file) => file.path.endsWith('/b.tsx')));
    });

    it('fails explicitly when a referenced local file cannot be retrieved', async () => {
        const rootUrl = `${rootRegistryUrl}/missing-file.json`;
        const missing = registryItem('missing-file', 'registry:example', [
            {
                path: 'registry/new-york-v4/examples/missing-file.tsx',
                type: 'registry:example',
                content: 'import Missing from "./not-published"; export default Missing;',
            },
        ]);

        await assert.rejects(
            createFixtureResolver({
                fetcher: fixtureFetcher({ [rootUrl]: missing }),
            }).resolve({ provider: 'shadcn', kind: 'example', name: 'missing-file' }),
            (error: unknown) =>
                error instanceof SourceResolutionError &&
                error.message.includes('Could not resolve local import') &&
                error.message.includes('missing-file.tsx'),
        );
    });

    it('fails explicitly when a referenced local asset cannot be retrieved', async () => {
        const rootUrl = `${rootRegistryUrl}/missing-asset.json`;
        const missing = registryItem('missing-asset', 'registry:example', [
            {
                path: 'registry/new-york-v4/examples/missing-asset.tsx',
                type: 'registry:example',
                content: 'export default function Example() { return <img src="/missing.jpg" />; }',
            },
        ]);

        await assert.rejects(
            createFixtureResolver({
                fetcher: fixtureFetcher({ [rootUrl]: missing }),
            }).resolve({ provider: 'shadcn', kind: 'example', name: 'missing-asset' }),
            (error: unknown) =>
                error instanceof SourceResolutionError &&
                error.issues[0].kind === 'asset' &&
                error.message.includes('/missing.jpg'),
        );
    });

    it('round-trips artifact serialization without changing source files', async () => {
        const artifact = await createFixtureResolver({
            fetcher: fixtureFetcher(),
        }).resolve({ provider: 'shadcn', kind: 'block', name: 'dashboard-01' });
        const roundTrip = deserializeImplementationArtifact(
            serializeImplementationArtifact(artifact),
        );

        assert.deepEqual(roundTrip, artifact);
        assert.equal(
            roundTrip.files.find((file) => file.path === artifact.entryPoint)?.content,
            artifact.files.find((file) => file.path === artifact.entryPoint)?.content,
        );
    });

    it('produces a stable integrity hash when source input is unchanged', async () => {
        const first = await createFixtureResolver({
            fetcher: fixtureFetcher(),
            now: () => new Date('2026-11-16T12:00:00.000Z'),
        }).resolve({ provider: 'shadcn', kind: 'block', name: 'dashboard-01' });
        const second = await createFixtureResolver({
            fetcher: fixtureFetcher(),
            now: () => new Date('2026-11-17T12:00:00.000Z'),
        }).resolve({ provider: 'shadcn', kind: 'block', name: 'dashboard-01' });

        assert.notEqual(first.source.retrievedAt, second.source.retrievedAt);
        assert.equal(first.integrity.sourceHash, second.integrity.sourceHash);
        assert.equal(first.integrity.artifactHash, second.integrity.artifactHash);
        assert.equal(hashImplementationArtifact(first), first.integrity.artifactHash);
    });

    it('rejects registry entries with a mismatched kind', async () => {
        const rootUrl = `${rootRegistryUrl}/not-a-block.json`;
        const item = registryItem('not-a-block', 'registry:ui', [
            {
                path: 'registry/new-york-v4/ui/not-a-block.tsx',
                type: 'registry:ui',
                content: 'export function NotABlock() { return null; }',
            },
        ]);
        await assert.rejects(
            createFixtureResolver({
                fetcher: fixtureFetcher({ [rootUrl]: item }),
            }).resolve({ provider: 'shadcn', kind: 'block', name: 'not-a-block' }),
            /Expected block registry metadata/,
        );
    });

    it('rejects malformed registry JSON instead of producing an incomplete artifact', async () => {
        const rootUrl = `${rootRegistryUrl}/malformed.json`;

        await assert.rejects(
            createFixtureResolver({
                fetcher: fixtureFetcher({ [rootUrl]: '{"name":' }),
            }).resolve({ provider: 'shadcn', kind: 'component', name: 'malformed' }),
            (error: unknown) =>
                error instanceof SourceResolutionError &&
                error.issues[0].kind === 'registry' &&
                error.message.includes('Invalid registry metadata'),
        );
    });

    it('rejects a missing registry dependency instead of returning partial source', async () => {
        const rootUrl = `${rootRegistryUrl}/missing-dependency.json`;
        const root = JSON.stringify({
            name: 'missing-dependency',
            type: 'registry:ui',
            registryDependencies: ['not-published'],
            files: [
                {
                    path: 'registry/new-york-v4/ui/missing-dependency.tsx',
                    type: 'registry:ui',
                    content: 'export function MissingDependency() { return null; }',
                },
            ],
        });

        await assert.rejects(
            createFixtureResolver({
                fetcher: fixtureFetcher({ [rootUrl]: root }),
            }).resolve({ provider: 'shadcn', kind: 'component', name: 'missing-dependency' }),
            (error: unknown) =>
                error instanceof SourceResolutionError &&
                error.issues[0].kind === 'registry' &&
                error.message.includes('not-published.json'),
        );
    });
});
