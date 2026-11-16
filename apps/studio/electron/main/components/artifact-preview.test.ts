import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import type { ImplementationArtifact } from '@kumite/models';
import {
    buildArtifactPreviewModule,
    buildArtifactPreviewViteConfig,
} from './artifact-preview';

function artifact(
    kind: ImplementationArtifact['metadata']['type'],
    content: string,
): ImplementationArtifact {
    const entryPoint =
        kind === 'component'
            ? 'registry/new-york-v4/ui/fixture.tsx'
            : 'registry/new-york-v4/blocks/fixture/page.tsx';
    return {
        schemaVersion: 1,
        id: `fixture:${kind}`,
        provider: 'shadcn',
        source: {
            name: 'fixture',
            registryUrl: 'https://example.test/registry.json',
            sourceUrl: 'https://example.test/source',
            retrievedAt: '2026-11-16T12:00:00.000Z',
            provenance: 'official',
            registryItems: [],
        },
        metadata: { name: 'fixture', type: kind, tags: [] },
        entryPoint,
        files: [
            {
                path: entryPoint,
                content,
                role: 'entry',
                sourceUrl: 'https://example.test/page.tsx',
                sha256: '0'.repeat(64),
            },
        ],
        dependencies: [],
        assets: [],
        graph: { edges: [], cycles: [] },
        requirements: { providers: [], configuration: [] },
        demo: { available: false, preserved: false, files: [], editable: false },
        integrity: { sourceHash: '0'.repeat(64), artifactHash: '0'.repeat(64) },
    } as ImplementationArtifact;
}

describe('artifact preview adapter', () => {
    it('imports and renders the actual default block entry point', () => {
        const module = buildArtifactPreviewModule(
            artifact('block', 'export default function DashboardPage() { return <main />; }'),
            'preview-session',
        );

        assert.match(
            module,
            /import Implementation from "@\/registry\/new-york-v4\/blocks\/fixture\/page"/,
        );
        assert.match(module, /<Implementation \/>/);
        assert.doesNotMatch(module, /previewCode|insertCode/);
    });

    it('preserves named-export semantics for component entry points', () => {
        const module = buildArtifactPreviewModule(
            artifact(
                'component',
                'export function Button() { return <button type="button" />; }',
            ),
            'preview-session',
        );

        assert.match(
            module,
            /import \{ Button as Implementation \} from "@\/registry\/new-york-v4\/ui\/fixture"/,
        );
    });

    it('rejects a block entry without a default page export', () => {
        assert.throws(
            () => buildArtifactPreviewModule(artifact('block', 'export function Dashboard() {}'), 'session'),
            /does not expose a renderable block export/,
        );
    });

    it('provides valid deterministic Vite aliases for preserved source and asset paths', () => {
        const config = buildArtifactPreviewViteConfig();

        assert.match(config, /registry\/new-york-v4\/ui/);
        assert.match(config, /registry\/new-york-v4\/assets/);
        assert.match(config, /find: \/\^@/);
    });
});
