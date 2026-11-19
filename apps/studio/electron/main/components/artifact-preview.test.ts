import assert from 'node:assert/strict';
import { describe, it } from 'bun:test';
import { getShadcnExampleName, getShadcnLibraryItem } from '@kumite/models';
import type { ImplementationArtifact } from '@kumite/models';
import { buildArtifactPreviewModule } from './artifact-preview-module';

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
    it('associates supported catalog components with verified upstream examples', () => {
        assert.equal(getShadcnExampleName(getShadcnLibraryItem('button')!), 'button-demo');
        assert.equal(getShadcnExampleName(getShadcnLibraryItem('chart')!), 'chart-bar-demo');
        assert.equal(getShadcnExampleName(getShadcnLibraryItem('sidebar')!), undefined);
    });

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
        assert.match(module, /h-full w-full items-center justify-center overflow-hidden/);
        assert.doesNotMatch(module, /previewCode|insertCode/);
    });

    it('preserves named-export semantics for component entry points', () => {
        const module = buildArtifactPreviewModule(
            artifact('component', 'export function Button() { return <button type="button" />; }'),
            'preview-session',
        );

        assert.match(
            module,
            /import \{ Button as Implementation \} from "@\/registry\/new-york-v4\/ui\/fixture"/,
        );
        assert.match(module, /max-w-2xl items-center justify-center overflow-hidden/);
        assert.match(module, /<main className=\"flex h-full min-h-0 w-full items-center justify-center overflow-hidden\">/);
    });

    it('skips type-only exports when picking a runtime component export', () => {
        // `ChartConfig` sorts before `ChartContainer` but is a compiler-only
        // type; the import must target the runtime value.
        const module = buildArtifactPreviewModule(
            artifact(
                'component',
                [
                    'export type ChartConfig = {',
                    '  desktop: { label: string; color: string };',
                    '};',
                    'export const ChartContainer = () => <div className="chart" />;',
                ].join('\n'),
            ),
            'preview-session',
        );

        assert.match(
            module,
            /import \{ ChartContainer as Implementation \} from "@\/registry\/new-york-v4\/ui\/fixture"/,
        );
        assert.doesNotMatch(module, /ChartConfig/);
    });

    it('prefers verified registry metadata over alphabetical order', () => {
        const module = buildArtifactPreviewModule(
            artifact(
                'component',
                [
                    'export type ChartConfig = { desktop: { label: string } };',
                    'export const ChartLegendContent = () => <div />;',
                    'export const ChartContainer = () => <div className="chart" />;',
                ].join('\n'),
            ),
            'preview-session',
            'ChartContainer',
        );

        assert.match(
            module,
            /import \{ ChartContainer as Implementation \} from "@\/registry\/new-york-v4\/ui\/fixture"/,
        );
    });

    it('ignores a preferred export that is not a runtime value', () => {
        const module = buildArtifactPreviewModule(
            artifact(
                'component',
                [
                    'export type ChartConfig = { desktop: { label: string } };',
                    'export const ChartContainer = () => <div className="chart" />;',
                ].join('\n'),
            ),
            'preview-session',
            'ChartConfig',
        );

        assert.match(
            module,
            /import \{ ChartContainer as Implementation \} from "@\/registry\/new-york-v4\/ui\/fixture"/,
        );
    });

    it('fails explicitly when an entry exposes only type exports', () => {
        assert.throws(
            () =>
                buildArtifactPreviewModule(
                    artifact('component', 'export type ChartConfig = { label: string };'),
                    'session',
                ),
            /does not expose a renderable component export/,
        );
    });

    it('rejects a block entry without a default page export', () => {
        assert.throws(
            () =>
                buildArtifactPreviewModule(
                    artifact('block', 'export function Dashboard() {}'),
                    'session',
                ),
            /does not expose a renderable block export/,
        );
    });

    it('fails explicitly when a required provider is absent from the example composition', () => {
        const value = artifact('example', 'export default function Example() { return <main />; }');
        value.requirements.providers = ['SidebarProvider'];

        assert.throws(
            () => buildArtifactPreviewModule(value, 'session'),
            /cannot safely construct required provider: SidebarProvider/,
        );
    });

    it('does not mistake ambient declarations or enums for React component exports', () => {
        assert.throws(
            () =>
                buildArtifactPreviewModule(
                    artifact(
                        'component',
                        [
                            'export declare const ChartConfig: unknown;',
                            'export declare function ChartRuntime(): void;',
                            'export enum ChartMode { Bar, Line }',
                        ].join('\n'),
                    ),
                    'session',
                ),
            /does not expose a renderable component export/,
        );
    });
});
