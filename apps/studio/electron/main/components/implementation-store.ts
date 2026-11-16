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

async function withArtifactQueue<T>(
    key: string,
    work: () => Promise<T>,
): Promise<T> {
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
    return withArtifactQueue(file, async () => {
        await fs.mkdir(directory, { recursive: true });
        const serialized = serializeImplementationArtifact(artifact);
        const created = await writeExclusive(file, serialized);
        if (!created) {
            const existing = deserializeImplementationArtifact(await fs.readFile(file, 'utf8'));
            validateArtifact(existing);
            if (existing.integrity.artifactHash !== artifactId) {
                throw new Error('Stored artifact does not match its content-addressed identity.');
            }
        }
        const snapshot = deserializeImplementationArtifact(await fs.readFile(file, 'utf8'));
        return { artifactId, artifact: snapshot, directory, path: file };
    });
}

export async function readStoredImplementationArtifact(
    artifactId: string,
    root: string,
): Promise<StoredImplementationArtifact | null> {
    const directory = artifactDirectory(root, artifactId);
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
    return withArtifactQueue(path.join(directory, REFERENCES_FILE), async () => {
        if (!(await readStoredImplementationArtifact(artifactId, root))) {
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
        await withArtifactQueue(path.join(artifactDir, REFERENCES_FILE), async () => {
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
                    !(await readStoredImplementationArtifact(entry, root))
                ) {
                    retained.push(entry);
                    return;
                }
            } catch {
                retained.push(entry);
                return;
            }
            const artifactFile = path.join(artifactDir, ARTIFACT_FILE);
            const referencesFile = path.join(artifactDir, REFERENCES_FILE);
            await fs.rm(artifactFile, { force: true });
            await fs.rm(referencesFile, { force: true });
            try {
                await fs.rmdir(artifactDir);
                removed.push(entry);
            } catch {
                // Leave unknown files/directories in place; never recursively delete them.
                retained.push(entry);
            }
        });
    }
    return { removed, retained };
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
