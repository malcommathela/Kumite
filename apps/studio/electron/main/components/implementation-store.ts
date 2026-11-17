import { createHash, randomUUID } from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import {
    deserializeImplementationArtifact,
    serializeImplementationArtifact,
    type ImplementationArtifact,
} from '@kumite/models';
import { hashImplementationArtifact, hashImplementationSource } from './source-resolver';

const ARTIFACT_FILE = 'artifact.json';
const REFERENCES_FILE = 'references.json';

export interface StoredImplementationArtifact {
    artifactId: string;
    artifact: ImplementationArtifact;
    directory: string;
    path: string;
}

export interface ImplementationArtifactReference {
    artifactId: string;
    consumers: string[];
}

export interface ImplementationArtifactGarbageCollectionResult {
    removed: string[];
    retained: string[];
}

const queues = new Map<string, Promise<void>>();

function identity(artifact: ImplementationArtifact): string {
    return artifact.integrity.artifactHash;
}

function artifactDirectory(root: string, artifactId: string): string {
    if (!/^[a-f0-9]{64}$/.test(artifactId)) {
        throw new Error('Invalid content-addressed artifact identity.');
    }
    return path.join(root, 'artifacts', artifactId);
}

function validateArtifact(artifact: ImplementationArtifact): void {
    if (
        hashImplementationSource(artifact) !== artifact.integrity.sourceHash ||
        hashImplementationArtifact(artifact) !== artifact.integrity.artifactHash
    ) {
        throw new Error('Artifact integrity validation failed.');
    }
}

async function writeExclusive(file: string, contents: string): Promise<boolean> {
    const temporary = `${file}.${randomUUID()}.tmp`;
    try {
        await fs.writeFile(temporary, contents, { encoding: 'utf8', flag: 'wx' });
        try {
            // Hard-link publication is atomic and, unlike rename, never replaces an existing snapshot.
            await fs.link(temporary, file);
            return true;
        } catch (error) {
            if ((error as NodeJS.ErrnoException).code === 'EEXIST') {
                return false;
            }
            throw error;
        }
    } finally {
        await fs.rm(temporary, { force: true });
    }
}

async function withArtifactQueue<T>(key: string, work: () => Promise<T>): Promise<T> {
    const previous = queues.get(key) ?? Promise.resolve();
    let release!: () => void;
    const current = new Promise<void>((resolve) => {
        release = resolve;
    });
    queues.set(key, current);
    await previous.catch(() => undefined);
    try {
        return await work();
    } finally {
        release();
        if (queues.get(key) === current) {
            queues.delete(key);
        }
    }
}

export async function storeImplementationArtifact(
    artifact: ImplementationArtifact,
    root: string,
): Promise<StoredImplementationArtifact> {
    validateArtifact(artifact);
    const artifactId = identity(artifact);
    const directory = artifactDirectory(root, artifactId);
    const file = path.join(directory, ARTIFACT_FILE);
    return withArtifactQueue(directory, () =>
        storeArtifactUnlocked(artifact, artifactId, directory, file),
    );
}

async function storeArtifactUnlocked(
    artifact: ImplementationArtifact,
    artifactId: string,
    directory: string,
    file: string,
): Promise<StoredImplementationArtifact> {
    await fs.mkdir(directory, { recursive: true });
    const created = await writeExclusive(file, serializeImplementationArtifact(artifact));
    if (!created) {
        const existing = deserializeImplementationArtifact(await fs.readFile(file, 'utf8'));
        validateArtifact(existing);
        if (existing.integrity.artifactHash !== artifactId) {
            throw new Error('Stored artifact does not match its content-addressed identity.');
        }
    }
    const snapshot = deserializeImplementationArtifact(await fs.readFile(file, 'utf8'));
    return { artifactId, artifact: snapshot, directory, path: file };
}

/** Store and acquire an artifact under one artifact-level lock so GC cannot win
 * the gap between publishing the snapshot and recording its first consumer. */
export async function storeAndReferenceImplementationArtifact(
    artifact: ImplementationArtifact,
    consumerId: string,
    root: string,
): Promise<StoredImplementationArtifact> {
    if (!consumerId.trim()) {
        throw new Error('Artifact reference requires a consumer identity.');
    }
    validateArtifact(artifact);
    const artifactId = identity(artifact);
    const directory = artifactDirectory(root, artifactId);
    const file = path.join(directory, ARTIFACT_FILE);
    return withArtifactQueue(directory, async () => {
        const stored = await storeArtifactUnlocked(artifact, artifactId, directory, file);
        const consumers = new Set((await readConsumers(directory)) ?? []);
        consumers.add(consumerId);
        await writeConsumers(directory, [...consumers]);
        return stored;
    });
}

export async function readStoredImplementationArtifact(
    artifactId: string,
    root: string,
): Promise<StoredImplementationArtifact | null> {
    const directory = artifactDirectory(root, artifactId);
    return withArtifactQueue(directory, () =>
        readStoredArtifactUnlocked(artifactId, root, directory),
    );
}

async function readStoredArtifactUnlocked(
    artifactId: string,
    root: string,
    directory: string,
): Promise<StoredImplementationArtifact | null> {
    const file = path.join(directory, ARTIFACT_FILE);
    try {
        const artifact = deserializeImplementationArtifact(await fs.readFile(file, 'utf8'));
        validateArtifact(artifact);
        if (artifact.integrity.artifactHash !== artifactId) {
            throw new Error('Stored artifact identity does not match its directory.');
        }
        return { artifactId, artifact, directory, path: file };
    } catch (error) {
        if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
            return null;
        }
        throw error;
    }
}

async function readConsumers(directory: string): Promise<string[] | null> {
    try {
        const value: unknown = JSON.parse(
            await fs.readFile(path.join(directory, REFERENCES_FILE), 'utf8'),
        );
        if (
            !value ||
            typeof value !== 'object' ||
            !('consumers' in value) ||
            !Array.isArray(value.consumers) ||
            !value.consumers.every((consumer) => typeof consumer === 'string')
        ) {
            throw new Error('Artifact reference index is invalid.');
        }
        return [...new Set(value.consumers)];
    } catch (error) {
        if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
            return [];
        }
        throw error;
    }
}

async function writeConsumers(directory: string, consumers: string[]): Promise<void> {
    const file = path.join(directory, REFERENCES_FILE);
    const temporary = `${file}.${randomUUID()}.tmp`;
    try {
        await fs.writeFile(
            temporary,
            `${JSON.stringify({ schemaVersion: 1, consumers: [...new Set(consumers)].sort() }, null, 2)}\n`,
            { encoding: 'utf8', flag: 'wx' },
        );
        await fs.rename(temporary, file);
    } finally {
        await fs.rm(temporary, { force: true });
    }
}

export async function setImplementationArtifactReference(
    artifactId: string,
    consumerId: string,
    referenced: boolean,
    root: string,
): Promise<ImplementationArtifactReference> {
    if (!consumerId.trim()) {
        throw new Error('Artifact reference requires a consumer identity.');
    }
    const directory = artifactDirectory(root, artifactId);
    return withArtifactQueue(directory, async () => {
        if (!(await readStoredArtifactUnlocked(artifactId, root, directory))) {
            throw new Error(`Cannot reference missing implementation artifact "${artifactId}".`);
        }
        const consumers = new Set((await readConsumers(directory)) ?? []);
        if (referenced) {
            consumers.add(consumerId);
        } else {
            consumers.delete(consumerId);
        }
        const sorted = [...consumers].sort();
        await writeConsumers(directory, sorted);
        return { artifactId, consumers: sorted };
    });
}

export async function collectUnreferencedImplementationArtifacts(
    root: string,
): Promise<ImplementationArtifactGarbageCollectionResult> {
    const directory = path.join(root, 'artifacts');
    let entries: string[];
    try {
        entries = await fs.readdir(directory);
    } catch (error) {
        if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
            return { removed: [], retained: [] };
        }
        throw error;
    }
    const removed: string[] = [];
    const retained: string[] = [];
    for (const entry of entries) {
        if (!/^[a-f0-9]{64}$/.test(entry)) {
            continue;
        }
        const artifactDir = artifactDirectory(root, entry);
        await withArtifactQueue(artifactDir, async () => {
            let consumers: string[] | null;
            try {
                consumers = await readConsumers(artifactDir);
            } catch {
                // Unknown/corrupt reference state is retained conservatively.
                retained.push(entry);
                return;
            }
            if (consumers === null || consumers.length > 0) {
                retained.push(entry);
                return;
            }
            let files: string[];
            try {
                files = await fs.readdir(artifactDir);
                if (
                    files.some((file) => file !== ARTIFACT_FILE && file !== REFERENCES_FILE) ||
                    !(await readStoredArtifactUnlocked(entry, root, artifactDir))
                ) {
                    retained.push(entry);
                    return;
                }
            } catch {
                retained.push(entry);
                return;
            }
            const tombstone = path.join(directory, `.${entry}.${randomUUID()}.tombstone`);
            try {
                // The rename is the commit point: readers either see the full
                // artifact directory or no artifact, never a partially deleted one.
                await fs.rename(artifactDir, tombstone);
            } catch {
                retained.push(entry);
                return;
            }
            try {
                await fs.rm(tombstone, { recursive: true, force: true });
                removed.push(entry);
            } catch {
                // A tombstone is never visible as an artifact. A later GC pass
                // can safely finish removing this store-owned directory.
                retained.push(entry);
            }
        });
    }
    // Recover GC interrupted after the atomic rename. Tombstones are named
    // exclusively by this store and cannot contain a live artifact reference.
    for (const entry of entries) {
        if (!/^\.[a-f0-9]{64}\.[0-9a-f-]+\.tombstone$/.test(entry)) {
            continue;
        }
        try {
            await fs.rm(path.join(directory, entry), { recursive: true, force: true });
        } catch {
            retained.push(entry);
        }
    }
    return { removed, retained };
}

/** Drop ephemeral preview leases left by a crashed main process. Project and
 * editor consumer identities are durable and are never removed here. */
export async function reconcileStalePreviewArtifactReferences(root: string): Promise<void> {
    const artifactsDirectory = path.join(root, 'artifacts');
    let entries: string[];
    try {
        entries = await fs.readdir(artifactsDirectory);
    } catch (error) {
        if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
            return;
        }
        throw error;
    }
    for (const entry of entries.filter((item) => /^[a-f0-9]{64}$/.test(item))) {
        const directory = artifactDirectory(root, entry);
        await withArtifactQueue(directory, async () => {
            if (!(await readStoredArtifactUnlocked(entry, root, directory))) {
                return;
            }
            const consumers = await readConsumers(directory);
            if (!consumers) {
                return;
            }
            const active = consumers.filter((consumer) => !consumer.startsWith('preview:'));
            if (active.length !== consumers.length) {
                await writeConsumers(directory, active);
            }
        });
    }
}

export function implementationWorkspaceIdentity(
    artifact: Pick<ImplementationArtifact, 'provider' | 'id' | 'integrity'>,
): string {
    const identity = JSON.stringify([
        artifact.provider,
        artifact.id,
        artifact.integrity.sourceHash,
        artifact.integrity.artifactHash,
    ]);
    return createHash('sha256').update(identity).digest('hex');
}
