import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { describe, it } from 'node:test';
import type { ImplementationArtifact, ImplementationRequest } from '@kumite/models';
import {
    createImplementationResolutionService,
    ImplementationResolutionError,
} from './implementation-service';
import { hashImplementationArtifact, hashImplementationSource } from './source-resolver';

function fixtureArtifact(type: ImplementationArtifact['metadata']['type'] = 'component') {
    const artifact = {
        schemaVersion: 1,
        id: 'fixture-button',
        provider: 'shadcn',
        source: {
            name: 'button',
            version: '3.7.0',
            commit: '1e9e337923aaede7db55b6091cb56a72a661b959',
            registryUrl: 'https://example.test/registry.json',
            sourceUrl: 'https://example.test/source',
            retrievedAt: '2026-11-16T12:00:00.000Z',
            provenance: 'official',
            registryItems: [],
        },
        metadata: { name: 'button', type, tags: [] },
        entryPoint: 'registry/button.tsx',
        files: [
            {
                path: 'registry/button.tsx',
                content: 'export function Button() { return null; }',
                role: 'entry',
                sourceUrl: 'https://example.test/button.tsx',
                sha256: '',
            },
        ],
        dependencies: [],
        assets: [],
        graph: { edges: [], cycles: [] },
        requirements: { providers: [], configuration: [] },
        demo: { available: false, preserved: false, files: [], editable: false },
        integrity: { sourceHash: '', artifactHash: '' },
    } as ImplementationArtifact;
    artifact.files[0].sha256 = sha256(artifact.files[0].content);
    artifact.integrity.sourceHash = hashImplementationSource(artifact);
    artifact.integrity.artifactHash = hashImplementationArtifact(artifact);
    return artifact;
}

function sha256(content: string): string {
    return createHash('sha256').update(content).digest('hex');
}

describe('implementation resolution service', () => {
    it('returns an explicit unsupported-provider error without falling back', async () => {
        const service = createImplementationResolutionService();
        await assert.rejects(
            service.resolve({ provider: 'magic-ui', kind: 'component', name: 'button' }),
            (error: unknown) =>
                error instanceof ImplementationResolutionError &&
                error.code === 'unsupported-provider',
        );
    });

    it('validates and returns a resolved artifact with hashes and inventories', async () => {
        const artifact = fixtureArtifact();
        const service = createImplementationResolutionService({
            adapters: [
                {
                    provider: 'shadcn',
                    async discover() {
                        return [];
                    },
                    async resolve() {
                        return artifact;
                    },
                },
            ],
        });
        const result = await service.resolve({
            provider: 'shadcn',
            kind: 'component',
            name: 'button',
        });

        assert.equal(result.artifactId, artifact.id);
        assert.equal(result.entryPoint, artifact.entryPoint);
        assert.deepEqual(
            result.sourceFiles.map((file) => file.path),
            [artifact.entryPoint],
        );
        assert.equal(result.license.status, 'unknown');
    });

    it('rejects a provider result whose kind differs from the request', async () => {
        const service = createImplementationResolutionService({
            adapters: [
                {
                    provider: 'shadcn',
                    async discover() {
                        return [];
                    },
                    async resolve() {
                        return fixtureArtifact('block');
                    },
                },
            ],
        });
        const request: ImplementationRequest = {
            provider: 'shadcn',
            kind: 'component',
            name: 'button',
        };
        await assert.rejects(
            service.resolve(request),
            (error: unknown) =>
                error instanceof ImplementationResolutionError && error.code === 'kind-mismatch',
        );
    });

    it('propagates cancellation before provider work starts', async () => {
        const controller = new AbortController();
        controller.abort();
        let called = false;
        const service = createImplementationResolutionService({
            signal: controller.signal,
            adapters: [
                {
                    provider: 'shadcn',
                    async discover() {
                        return [];
                    },
                    async resolve() {
                        called = true;
                        return fixtureArtifact();
                    },
                },
            ],
        });
        await assert.rejects(
            service.resolve({ provider: 'shadcn', kind: 'component', name: 'button' }),
            (error: unknown) =>
                error instanceof ImplementationResolutionError && error.code === 'cancelled',
        );
        assert.equal(called, false);
    });
});
