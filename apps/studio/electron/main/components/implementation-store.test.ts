import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { after, describe, it } from 'node:test';
import type { ImplementationArtifact } from '@kumite/models';
import {
    collectUnreferencedImplementationArtifacts,
    implementationWorkspaceIdentity,
    readStoredImplementationArtifact,
    setImplementationArtifactReference,
    storeImplementationArtifact,
} from './implementation-store';
import { hashImplementationArtifact, hashImplementationSource } from './source-resolver';

const roots: string[] = [];

after(async () => {
    await Promise.all(roots.map((root) => fs.rm(root, { recursive: true, force: true })));
});

async function makeRoot(): Promise<string> {
    const root = await fs.mkdtemp(path.join(os.tmpdir(), 'kumite-artifact-store-'));
    roots.push(root);
    return root;
}

function sha256(content: string): string {
    return createHash('sha256').update(content).digest('hex');
}

function fixtureArtifact(): ImplementationArtifact {
    const content = 'export function Fixture() { return null; }';
    const artifact = {
        schemaVersion: 1,
        id: 'fixture',
        provider: 'shadcn',
        source: {
            name: 'fixture',
            version: '3.7.0',
            commit: '1e9e337923aaede7db55b6091cb56a72a661b959',
            registryUrl: 'https://example.test/registry.json',
            sourceUrl: 'https://example.test/source',
            retrievedAt: '2026-11-16T12:00:00.000Z',
            provenance: 'official',
            registryItems: [],
        },
        metadata: { name: 'fixture', type: 'component', tags: [] },
        entryPoint: 'registry/fixture.tsx',
        files: [
            {
                path: 'registry/fixture.tsx',
                content,
                role: 'entry',
                sourceUrl: 'https://example.test/fixture.tsx',
                sha256: sha256(content),
            },
        ],
        dependencies: [],
        assets: [],
        graph: { edges: [], cycles: [] },
        requirements: { providers: [], configuration: [] },
        demo: { available: false, preserved: false, files: [], editable: false },
        integrity: { sourceHash: '', artifactHash: '' },
    } as ImplementationArtifact;
    artifact.integrity.sourceHash = hashImplementationSource(artifact);
    artifact.integrity.artifactHash = hashImplementationArtifact(artifact);
    return artifact;
}

describe('implementation artifact store', () => {
    it('stores and reads immutable content-addressed artifacts', async () => {
        const root = await makeRoot();
        const artifact = fixtureArtifact();
        const stored = await storeImplementationArtifact(artifact, root);
        const loaded = await readStoredImplementationArtifact(stored.artifactId, root);

        assert.equal(stored.artifactId, artifact.integrity.artifactHash);
        assert.equal(loaded?.artifact.integrity.sourceHash, artifact.integrity.sourceHash);
        assert.equal(
            implementationWorkspaceIdentity(artifact),
            implementationWorkspaceIdentity(artifact),
        );
        artifact.files[0].content = 'mutated';
        await assert.rejects(storeImplementationArtifact(artifact, root));
        assert.equal((await readStoredImplementationArtifact(stored.artifactId, root))?.artifact.id, 'fixture');
    });

    it('retains referenced artifacts and collects only unreferenced known files', async () => {
        const root = await makeRoot();
        const artifact = fixtureArtifact();
        const stored = await storeImplementationArtifact(artifact, root);
        await setImplementationArtifactReference(stored.artifactId, 'preview:one', true, root);

        const retained = await collectUnreferencedImplementationArtifacts(root);
        assert.deepEqual(retained.removed, []);
        assert.deepEqual(retained.retained, [stored.artifactId]);

        await setImplementationArtifactReference(stored.artifactId, 'preview:one', false, root);
        const collected = await collectUnreferencedImplementationArtifacts(root);
        assert.deepEqual(collected.removed, [stored.artifactId]);
        assert.equal(await readStoredImplementationArtifact(stored.artifactId, root), null);
    });

    it('does not recursively remove unknown files during garbage collection', async () => {
        const root = await makeRoot();
        const stored = await storeImplementationArtifact(fixtureArtifact(), root);
        const unknownFile = path.join(stored.directory, 'user-owned.txt');
        await fs.writeFile(unknownFile, 'keep');

        const result = await collectUnreferencedImplementationArtifacts(root);
        assert.deepEqual(result.retained, [stored.artifactId]);
        assert.equal(await fs.readFile(unknownFile, 'utf8'), 'keep');
    });
});
