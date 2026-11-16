import assert from 'node:assert/strict';
import { createHash, randomUUID } from 'node:crypto';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { after, describe, it } from 'node:test';
import { recoverArtifactInsertions } from './artifact-insertion';

const roots: string[] = [];

after(async () => {
    await Promise.all(roots.map((root) => fs.rm(root, { recursive: true, force: true })));
});

function sha256(value: string): string {
    return createHash('sha256').update(value).digest('hex');
}

async function fixture() {
    const root = await fs.mkdtemp(path.join(os.tmpdir(), 'kumite-insertion-recovery-'));
    roots.push(root);
    await fs.writeFile(path.join(root, 'package.json'), '{"name":"fixture"}\n');
    await fs.writeFile(path.join(root, 'package-lock.json'), '{}\n');
    const inserted = path.join(root, 'src', 'components', 'published.tsx');
    await fs.mkdir(path.dirname(inserted), { recursive: true });
    const contents = 'export function Published() { return null; }\n';
    await fs.writeFile(inserted, contents);
    const id = randomUUID();
    const operations = path.join(root, '.kumite', 'operations');
    await fs.mkdir(operations, { recursive: true });
    const journal = {
        schemaVersion: 1,
        operationId: id,
        projectRoot: root,
        artifactId: 'shadcn:fixture',
        artifactSourceHash: '1'.repeat(64),
        artifactHash: '2'.repeat(64),
        source: {
            name: 'fixture',
            registryUrl: 'https://example.test/registry.json',
            sourceUrl: 'https://example.test/source',
            retrievedAt: '2026-11-16T12:00:00.000Z',
            provenance: 'official',
            registryItems: [],
        },
        planHash: '3'.repeat(64),
        state: 'publishing',
        files: [{ path: inserted, hash: sha256(contents) }],
        createdFiles: [{ path: inserted, hash: sha256(contents) }],
        originalPackageFiles: {
            'package.json': Buffer.from('{"name":"fixture"}\n').toString('base64'),
            'package-lock.json': Buffer.from('{}\n').toString('base64'),
        },
        installedPackageFiles: {},
        dependencyVersions: {},
        packageManager: 'npm',
    };
    await fs.writeFile(path.join(operations, `${id}.json`), JSON.stringify(journal));
    return { root, inserted, id, journalPath: path.join(operations, `${id}.json`) };
}

describe('artifact insertion crash recovery', () => {
    it('removes only files recorded as created by an interrupted operation', async () => {
        const operation = await fixture();
        const result = await recoverArtifactInsertions(operation.root);

        assert.deepEqual(result, [`Rolled back interrupted operation ${operation.id}.`]);
        await assert.rejects(fs.stat(operation.inserted), { code: 'ENOENT' });
        const journal = JSON.parse(await fs.readFile(operation.journalPath, 'utf8')) as {
            state: string;
        };
        assert.equal(journal.state, 'rolled-back');
    });

    it('preserves an unowned destination and reports recovery instead of deleting it', async () => {
        const operation = await fixture();
        const journal = JSON.parse(await fs.readFile(operation.journalPath, 'utf8')) as {
            createdFiles: Array<{ path: string; hash: string }>;
            state: string;
        };
        journal.createdFiles = [];
        await fs.writeFile(operation.journalPath, JSON.stringify(journal));

        const result = await recoverArtifactInsertions(operation.root);

        assert.match(result[0], /requires recovery/);
        assert.equal(
            await fs.readFile(operation.inserted, 'utf8'),
            'export function Published() { return null; }\n',
        );
        const recovered = JSON.parse(await fs.readFile(operation.journalPath, 'utf8')) as {
            state: string;
            error: string;
        };
        assert.equal(recovered.state, 'recovery-required');
        assert.match(recovered.error, /ownership is uncertain/);
    });
});
