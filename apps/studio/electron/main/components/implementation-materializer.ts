import { createHash } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { ImplementationArtifactSchema, type ImplementationArtifact } from '@kumite/models';
import {
    hashImplementationArtifact,
    hashImplementationSource,
    materializeImplementationAsset,
    SourceResolutionError,
    type SourceFetcher,
} from './source-resolver';

const MANIFEST_FILENAME = '.kumite-implementation.json';
const INTERNAL_ASSET_CACHE = '.kumite-asset-cache';

const materializationFlights = new Map<string, { artifactHash: string; promise: Promise<ImplementationMaterializationResult> }>();
const activeMaterializationDirectories = new Map<string, number>();

export function isImplementationMaterializationActive(destinationDirectory: string): boolean {
    return (activeMaterializationDirectories.get(path.resolve(destinationDirectory)) ?? 0) > 0;
}

async function publishStageDirectory(stageDirectory: string, destinationDirectory: string): Promise<void> {
    const transientCodes = new Set(['EPERM', 'EBUSY', 'EACCES']);
    const maxAttempts = process.platform === 'win32' ? 6 : 1;
    for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
        try {
            if (fs.existsSync(destinationDirectory)) {
                throw new ImplementationMaterializationError('destination-exists', `Materialization destination appeared while resolving: ${destinationDirectory}`);
            }
            fs.renameSync(stageDirectory, destinationDirectory);
            return;
        } catch (error) {
            if (error instanceof ImplementationMaterializationError) throw error;
            const code = (error as NodeJS.ErrnoException).code;
            if (!transientCodes.has(code ?? '') || attempt === maxAttempts - 1) throw error;
            if (!fs.existsSync(stageDirectory) || fs.existsSync(destinationDirectory)) throw error;
            await new Promise((resolve) => setTimeout(resolve, 40 * (attempt + 1)));
        }
    }
}

type FileRole = ImplementationArtifact['files'][number]['role'];

export interface ImplementationMaterializationOptions {
    assetFetcher?: SourceFetcher;
    signal?: AbortSignal;
}

export interface MaterializedSourceFile {
    path: string;
    relativePath: string;
    role: FileRole;
    sha256: string;
    sourceUrl: string;
}

export interface MaterializedLocalAsset {
    path: string;
    relativePath: string;
    sourcePath: string;
    source: string;
    mediaType: string;
    sha256: string;
    size: number;
    referencedBy: string[];
}

export interface ImplementationMaterializationManifest {
    schemaVersion: 1;
    artifact: {
        id: string;
        provider: ImplementationArtifact['provider'];
        source: Omit<ImplementationArtifact['source'], 'retrievedAt'>;
        integrity: ImplementationArtifact['integrity'];
    };
    entryPoint: string;
    publicAssetRoot: 'public';
    files: Array<{
        path: string;
        role: FileRole;
        sha256: string;
        sourceUrl: string;
        registryType?: string;
        target?: string;
    }>;
    assets: Array<{
        sourcePath: string;
        path: string;
        source: string;
        mediaType: string;
        sha256: string;
        size: number;
        referencedBy: string[];
    }>;
    externalAssets: Array<{
        sourcePath: string;
        source: string;
        mediaType: string;
        sha256?: string;
        size?: number;
        referencedBy: string[];
    }>;
    dependencyPlan: {
        packages: ImplementationArtifact['dependencies'];
        provenanceComplete: boolean;
        providers: string[];
        configuration: string[];
    };
    sourceAliases: Array<{
        specifierPrefix: string;
        relativePath: string;
    }>;
    demo: ImplementationArtifact['demo'];
}

export interface ImplementationMaterializationResult {
    artifactId: string;
    integrity: ImplementationArtifact['integrity'];
    materializationDirectory: string;
    entryPoint: string;
    manifestPath: string;
    sourceFiles: MaterializedSourceFile[];
    assets: MaterializedLocalAsset[];
    externalAssets: ImplementationMaterializationManifest['externalAssets'];
    dependencyPlan: ImplementationMaterializationManifest['dependencyPlan'];
    manifest: ImplementationMaterializationManifest;
}

export type ImplementationMaterializationErrorCode =
    | 'invalid-artifact'
    | 'integrity'
    | 'unsafe-path'
    | 'path-conflict'
    | 'destination-exists'
    | 'destination-parent'
    | 'asset'
    | 'cancelled'
    | 'io';

export class ImplementationMaterializationError extends Error {
    constructor(
        readonly code: ImplementationMaterializationErrorCode,
        message: string,
        options?: ErrorOptions,
    ) {
        super(message, options);
        this.name = 'ImplementationMaterializationError';
    }
}

interface FilePlan {
    relativePath: string;
    artifactFile: ImplementationArtifact['files'][number];
}

interface AssetPlan {
    sourcePath: string;
    relativePath: string;
    asset: ImplementationArtifact['assets'][number];
    referencedBy: string[];
}

function sha256(content: string | Uint8Array): string {
    return createHash('sha256').update(content).digest('hex');
}

function abortIfRequested(signal?: AbortSignal): void {
    if (signal?.aborted) {
        throw new ImplementationMaterializationError(
            'cancelled',
            'Implementation materialization was cancelled.',
            { cause: signal.reason },
        );
    }
}

function wrapError(
    error: unknown,
    code: ImplementationMaterializationErrorCode,
    prefix: string,
): ImplementationMaterializationError {
    if (error instanceof ImplementationMaterializationError) {
        return error;
    }
    if (error instanceof SourceResolutionError) {
        return new ImplementationMaterializationError(code, `${prefix}: ${error.message}`, {
            cause: error,
        });
    }
    return new ImplementationMaterializationError(
        code,
        `${prefix}: ${error instanceof Error ? error.message : String(error)}`,
        { cause: error },
    );
}

function validateRelativePath(value: string, context: string): string {
    const invalid = () =>
        new ImplementationMaterializationError(
            'unsafe-path',
            `${context} is not a safe relative path: ${JSON.stringify(value)}`,
        );
    if (
        !value ||
        value.includes('\0') ||
        value.includes('\\') ||
        value.startsWith('/') ||
        path.posix.isAbsolute(value) ||
        path.win32.isAbsolute(value) ||
        /^[a-zA-Z]:/.test(value) ||
        value !== value.normalize('NFC')
    ) {
        throw invalid();
    }
    const segments = value.split('/');
    if (
        segments.some(
            (segment) =>
                !segment ||
                segment === '.' ||
                segment === '..' ||
                segment.includes(':') ||
                /[<>"|?*]/.test(segment) ||
                [...segment].some((character) => character.charCodeAt(0) < 0x20) ||
                /[. ]$/.test(segment) ||
                /^(?:con|prn|aux|nul|com[1-9]|lpt[1-9])(?:\..*)?$/i.test(segment),
        ) ||
        path.posix.normalize(value) !== value
    ) {
        throw invalid();
    }
    return value;
}

function portablePathKey(relativePath: string): string {
    return relativePath.normalize('NFC').toLocaleLowerCase('en-US');
}

function isInside(root: string, destination: string): boolean {
    const relative = path.relative(root, destination);
    return (
        relative !== '' &&
        relative !== '..' &&
        !relative.startsWith(`..${path.sep}`) &&
        !path.isAbsolute(relative)
    );
}

function destinationRoot(destinationDirectory: string): string {
    if (!destinationDirectory || destinationDirectory.includes('\0')) {
        throw new ImplementationMaterializationError(
            'destination-parent',
            'A destination directory is required.',
        );
    }
    const requested = path.resolve(destinationDirectory);
    let existing: fs.Stats | undefined;
    try {
        existing = fs.lstatSync(requested);
    } catch (error) {
        if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
            throw wrapError(error, 'io', `Could not inspect destination ${requested}`);
        }
    }
    if (existing) {
        throw new ImplementationMaterializationError(
            'destination-exists',
            `Materialization destination already exists: ${requested}`,
        );
    }

    const requestedParent = path.dirname(requested);
    let parentStats: fs.Stats;
    let canonicalParent: string;
    try {
        parentStats = fs.statSync(requestedParent);
        if (!parentStats.isDirectory()) {
            throw new Error('Parent path is not a directory.');
        }
        canonicalParent = fs.realpathSync(requestedParent);
    } catch (error) {
        throw wrapError(
            error,
            'destination-parent',
            `Materialization parent must already exist: ${requestedParent}`,
        );
    }
    return path.join(canonicalParent, path.basename(requested));
}

function verifyArtifact(artifactValue: ImplementationArtifact): ImplementationArtifact {
    let artifact: ImplementationArtifact;
    try {
        artifact = ImplementationArtifactSchema.parse(artifactValue);
    } catch (error) {
        throw wrapError(error, 'invalid-artifact', 'Artifact schema validation failed');
    }
    if (artifact.provider !== 'shadcn') {
        throw new ImplementationMaterializationError(
            'invalid-artifact',
            `The ${artifact.provider} provider does not yet support materialization.`,
        );
    }
    for (const file of artifact.files) {
        if (sha256(file.content) !== file.sha256) {
            throw new ImplementationMaterializationError(
                'integrity',
                `Source file hash mismatch for "${file.path}".`,
            );
        }
    }
    if (
        hashImplementationSource({
            registryItems: artifact.source.registryItems,
            files: artifact.files,
            assets: artifact.assets,
        }) !== artifact.integrity.sourceHash
    ) {
        throw new ImplementationMaterializationError(
            'integrity',
            'Artifact source hash does not match its registry metadata, files, and assets.',
        );
    }
    if (hashImplementationArtifact(artifact) !== artifact.integrity.artifactHash) {
        throw new ImplementationMaterializationError(
            'integrity',
            'Artifact hash does not match the artifact contents.',
        );
    }

    const paths = new Set<string>();
    for (const file of artifact.files) {
        validateRelativePath(file.path, 'Source file path');
        if (file.target) {
            validateRelativePath(file.target, `Registry target for ${file.path}`);
        }
        paths.add(file.path);
    }
    for (const registryItem of artifact.source.registryItems) {
        for (const filePath of registryItem.files) {
            validateRelativePath(filePath, `Registry file path for ${registryItem.name}`);
            if (!paths.has(filePath)) {
                throw new ImplementationMaterializationError(
                    'integrity',
                    `Registry file "${filePath}" from "${registryItem.name}" is missing from the artifact.`,
                );
            }
        }
    }
    validateRelativePath(artifact.entryPoint, 'Entry point');
    const entries = artifact.files.filter((file) => file.path === artifact.entryPoint);
    if (entries.length !== 1 || entries[0]?.role !== 'entry') {
        throw new ImplementationMaterializationError(
            'integrity',
            `Entry point "${artifact.entryPoint}" must identify exactly one entry-role source file.`,
        );
    }
    for (const asset of artifact.assets) {
        if (asset.external) {
            let externalUrl: URL;
            try {
                externalUrl = new URL(asset.source);
            } catch (error) {
                throw wrapError(error, 'asset', `Invalid external asset URL "${asset.source}"`);
            }
            if (!['http:', 'https:', 'data:', 'blob:'].includes(externalUrl.protocol)) {
                throw new ImplementationMaterializationError(
                    'asset',
                    `External asset "${asset.path}" uses an unsupported URL scheme: "${externalUrl.protocol}".`,
                );
            }
            continue;
        }
        validateRelativePath(asset.path, 'Local asset path');
        if (!asset.sha256 || asset.size === undefined) {
            throw new ImplementationMaterializationError(
                'integrity',
                `Local asset "${asset.path}" is missing its hash or byte size.`,
            );
        }
        for (const filePath of asset.referencedBy) {
            validateRelativePath(filePath, `Asset reference for ${asset.path}`);
            if (!paths.has(filePath)) {
                throw new ImplementationMaterializationError(
                    'integrity',
                    `Asset "${asset.path}" references missing source file "${filePath}".`,
                );
            }
        }
    }
    const registryNames = new Set(
        artifact.source.registryItems.map((registryItem) => `registry:${registryItem.name}`),
    );
    for (const edge of artifact.graph.edges) {
        if (edge.kind === 'import' && (!paths.has(edge.from) || !paths.has(edge.to))) {
            throw new ImplementationMaterializationError(
                'integrity',
                `Import graph edge "${edge.from}" -> "${edge.to}" references a missing source file.`,
            );
        }
        if (edge.kind === 'registry') {
            const sourceExists = paths.has(edge.from) || registryNames.has(edge.from);
            const targetExists = paths.has(edge.to) || registryNames.has(edge.to);
            if (!sourceExists || !targetExists) {
                throw new ImplementationMaterializationError(
                    'integrity',
                    `Registry graph edge "${edge.from}" -> "${edge.to}" references a missing item or file.`,
                );
            }
        }
        if (edge.kind === 'asset') {
            const found = artifact.assets.some((asset) => {
                if (asset.external) {
                    if (asset.source === edge.to) {
                        return true;
                    }
                    return (
                        edge.to.startsWith(`${edge.from}#`) &&
                        asset.source === edge.to.slice(edge.from.length + 1) &&
                        asset.referencedBy.includes(edge.from)
                    );
                }
                return (
                    sourceAssetDestination(artifact, asset) === edge.to &&
                    asset.referencedBy.includes(edge.from)
                );
            });
            if (!found) {
                throw new ImplementationMaterializationError(
                    'integrity',
                    `Asset graph edge "${edge.from}" -> "${edge.to}" has no matching asset metadata.`,
                );
            }
        }
    }
    for (const demoPath of artifact.demo.files) {
        validateRelativePath(demoPath, 'Demo file path');
        if (!paths.has(demoPath)) {
            throw new ImplementationMaterializationError(
                'integrity',
                `Demo file "${demoPath}" is missing from the artifact.`,
            );
        }
    }
    return artifact;
}

function sourceAssetDestination(
    artifact: ImplementationArtifact,
    asset: ImplementationArtifact['assets'][number],
): string {
    const commit = artifact.source.commit;
    if (!commit) {
        throw new ImplementationMaterializationError(
            'asset',
            `Local asset "${asset.path}" has no pinned upstream commit.`,
        );
    }
    let sourceUrl: URL;
    try {
        sourceUrl = new URL(asset.source);
    } catch (error) {
        throw wrapError(error, 'asset', `Invalid source URL for asset "${asset.path}"`);
    }
    const prefix = `/shadcn-ui/ui/${commit}/apps/v4/`;
    if (
        sourceUrl.origin !== 'https://raw.githubusercontent.com' ||
        !sourceUrl.pathname.startsWith(prefix)
    ) {
        throw new ImplementationMaterializationError(
            'asset',
            `Asset "${asset.path}" is not from the artifact's pinned shadcn source.`,
        );
    }
    if (sourceUrl.search || sourceUrl.hash) {
        throw new ImplementationMaterializationError(
            'asset',
            `Asset "${asset.path}" has a non-deterministic source URL.`,
        );
    }
    let repositoryPath: string;
    try {
        repositoryPath = decodeURIComponent(sourceUrl.pathname.slice(prefix.length));
    } catch (error) {
        throw wrapError(error, 'asset', `Invalid encoded source path for asset "${asset.path}"`);
    }
    const safeAssetPath = validateRelativePath(asset.path, 'Local asset path');
    if (repositoryPath.startsWith('public/')) {
        const publicPath = repositoryPath.slice('public/'.length);
        if (publicPath !== safeAssetPath) {
            throw new ImplementationMaterializationError(
                'integrity',
                `Public asset path "${safeAssetPath}" does not match upstream path "${publicPath}".`,
            );
        }
        return validateRelativePath(`public/${publicPath}`, 'Materialized public asset path');
    }
    if (!repositoryPath.startsWith('registry/') || repositoryPath !== safeAssetPath) {
        throw new ImplementationMaterializationError(
            'integrity',
            `Relative asset path "${safeAssetPath}" does not match upstream path "${repositoryPath}".`,
        );
    }
    return safeAssetPath;
}

function planFiles(artifact: ImplementationArtifact): FilePlan[] {
    const plans = new Map<string, FilePlan>();
    const portableKeys = new Map<string, string>();
    for (const artifactFile of artifact.files) {
        const relativePath = validateRelativePath(artifactFile.path, 'Source file path');
        const key = portablePathKey(relativePath);
        const previousPath = portableKeys.get(key);
        if (previousPath && previousPath !== relativePath) {
            throw new ImplementationMaterializationError(
                'path-conflict',
                `Source paths "${previousPath}" and "${relativePath}" collide on a case-insensitive filesystem.`,
            );
        }
        portableKeys.set(key, relativePath);
        const previous = plans.get(relativePath);
        if (previous) {
            if (
                previous.artifactFile.content !== artifactFile.content ||
                previous.artifactFile.role !== artifactFile.role ||
                previous.artifactFile.sourceUrl !== artifactFile.sourceUrl ||
                previous.artifactFile.sha256 !== artifactFile.sha256 ||
                previous.artifactFile.registryType !== artifactFile.registryType ||
                previous.artifactFile.target !== artifactFile.target
            ) {
                throw new ImplementationMaterializationError(
                    'path-conflict',
                    `Conflicting source files target "${relativePath}".`,
                );
            }
            continue;
        }
        plans.set(relativePath, { relativePath, artifactFile });
    }
    return [...plans.values()].sort((a, b) => a.relativePath.localeCompare(b.relativePath));
}

function planAssets(
    artifact: ImplementationArtifact,
    filePlans: FilePlan[],
): { local: AssetPlan[]; external: ImplementationMaterializationManifest['externalAssets'] } {
    const sourceFiles = new Set(filePlans.map((file) => file.relativePath));
    const local = new Map<string, AssetPlan>();
    const external: ImplementationMaterializationManifest['externalAssets'] = [];
    const portableKeys = new Map<string, string>();
    for (const asset of artifact.assets) {
        for (const sourcePath of asset.referencedBy) {
            if (!sourceFiles.has(sourcePath)) {
                throw new ImplementationMaterializationError(
                    'integrity',
                    `Asset "${asset.path}" references missing source file "${sourcePath}".`,
                );
            }
        }
        if (asset.external) {
            external.push({
                sourcePath: asset.path,
                source: asset.source,
                mediaType: asset.mediaType,
                ...(asset.sha256 ? { sha256: asset.sha256 } : {}),
                ...(asset.size !== undefined ? { size: asset.size } : {}),
                referencedBy: [...asset.referencedBy].sort(),
            });
            continue;
        }
        const relativePath = sourceAssetDestination(artifact, asset);
        const key = portablePathKey(relativePath);
        const previousPath = portableKeys.get(key);
        if (previousPath && previousPath !== relativePath) {
            throw new ImplementationMaterializationError(
                'path-conflict',
                `Asset paths "${previousPath}" and "${relativePath}" collide on a case-insensitive filesystem.`,
            );
        }
        portableKeys.set(key, relativePath);
        const previous = local.get(relativePath);
        if (previous) {
            if (previous.asset.sha256 !== asset.sha256 || previous.asset.size !== asset.size) {
                throw new ImplementationMaterializationError(
                    'path-conflict',
                    `Conflicting assets target "${relativePath}".`,
                );
            }
            previous.referencedBy = [...new Set([...previous.referencedBy, ...asset.referencedBy])];
            continue;
        }
        local.set(relativePath, {
            sourcePath: asset.path,
            relativePath,
            asset,
            referencedBy: [...asset.referencedBy],
        });
    }
    return {
        local: [...local.values()].sort((a, b) => a.relativePath.localeCompare(b.relativePath)),
        external: external.sort((a, b) => a.source.localeCompare(b.source)),
    };
}

const SOURCE_ALIASES: ImplementationMaterializationManifest['sourceAliases'] = [
    { specifierPrefix: '@/registry/new-york-v4/', relativePath: 'registry/new-york-v4/' },
    { specifierPrefix: '@/components/ui/', relativePath: 'registry/new-york-v4/ui/' },
    { specifierPrefix: '@/components/', relativePath: 'registry/new-york-v4/components/' },
    { specifierPrefix: '@/assets/', relativePath: 'registry/new-york-v4/assets/' },
    { specifierPrefix: '@/hooks/', relativePath: 'registry/new-york-v4/hooks/' },
    { specifierPrefix: '@/lib/', relativePath: 'registry/new-york-v4/lib/' },
    { specifierPrefix: '~/registry/new-york-v4/', relativePath: 'registry/new-york-v4/' },
    { specifierPrefix: '~/components/ui/', relativePath: 'registry/new-york-v4/ui/' },
    { specifierPrefix: '~/components/', relativePath: 'registry/new-york-v4/components/' },
    { specifierPrefix: '~/assets/', relativePath: 'registry/new-york-v4/assets/' },
    { specifierPrefix: '~/hooks/', relativePath: 'registry/new-york-v4/hooks/' },
    { specifierPrefix: '~/lib/', relativePath: 'registry/new-york-v4/lib/' },
];

export async function materializeImplementationArtifact(
    artifactValue: ImplementationArtifact,
    destinationDirectory: string,
    options: ImplementationMaterializationOptions = {},
): Promise<ImplementationMaterializationResult> {
    let artifact: ImplementationArtifact;
    try {
        artifact = verifyArtifact(artifactValue);
    } catch (error) {
        throw wrapError(error, 'integrity', 'Artifact validation failed');
    }
    abortIfRequested(options.signal);
    const directory = destinationRoot(destinationDirectory);
    const filePlans = planFiles(artifact);
    const assetPlans = planAssets(artifact, filePlans);
    const reservedManifest = portablePathKey(MANIFEST_FILENAME);
    const reservedCache = portablePathKey(INTERNAL_ASSET_CACHE);
    const isReservedPath = (relativePath: string) => {
        const key = portablePathKey(relativePath);
        return (
            key === reservedManifest || key === reservedCache || key.startsWith(`${reservedCache}/`)
        );
    };
    for (const file of filePlans) {
        if (isReservedPath(file.relativePath)) {
            throw new ImplementationMaterializationError(
                'path-conflict',
                `Source file "${file.relativePath}" conflicts with materializer metadata.`,
            );
        }
    }
    for (const asset of assetPlans.local) {
        if (isReservedPath(asset.relativePath)) {
            throw new ImplementationMaterializationError(
                'path-conflict',
                `Asset "${asset.relativePath}" conflicts with materializer metadata.`,
            );
        }
    }
    const destinationKeys = new Map<string, { path: string; sha256: string }>();
    for (const file of filePlans) {
        const key = portablePathKey(file.relativePath);
        const previous = destinationKeys.get(key);
        if (previous && previous.sha256 !== file.artifactFile.sha256) {
            throw new ImplementationMaterializationError(
                'path-conflict',
                `Conflicting materialization files target "${file.relativePath}".`,
            );
        }
        destinationKeys.set(key, { path: file.relativePath, sha256: file.artifactFile.sha256 });
    }
    for (const asset of assetPlans.local) {
        const key = portablePathKey(asset.relativePath);
        const previous = destinationKeys.get(key);
        if (previous && previous.sha256 !== asset.asset.sha256) {
            throw new ImplementationMaterializationError(
                'path-conflict',
                `Source file "${previous.path}" and asset "${asset.relativePath}" have conflicting contents.`,
            );
        }
        if (previous && previous.path !== asset.relativePath) {
            throw new ImplementationMaterializationError(
                'path-conflict',
                `Source file "${previous.path}" and asset "${asset.relativePath}" collide on a case-insensitive filesystem.`,
            );
        }
        destinationKeys.set(key, { path: asset.relativePath, sha256: asset.asset.sha256! });
    }

    let stageDirectory: string | null = null;
    try {
        abortIfRequested(options.signal);
        if (fs.existsSync(directory)) {
            throw new ImplementationMaterializationError(
                'destination-exists',
                `Materialization destination already exists: ${directory}`,
            );
        }
        const parent = path.dirname(directory);
        stageDirectory = fs.mkdtempSync(path.join(parent, '.kumite-implementation-stage-'));
        for (const plan of filePlans) {
            abortIfRequested(options.signal);
            const output = path.resolve(stageDirectory, ...plan.relativePath.split('/'));
            if (!isInside(stageDirectory, output)) {
                throw new ImplementationMaterializationError(
                    'unsafe-path',
                    `Source path escaped the staging directory: "${plan.relativePath}".`,
                );
            }
            fs.mkdirSync(path.dirname(output), { recursive: true });
            fs.writeFileSync(output, plan.artifactFile.content, { encoding: 'utf8', flag: 'wx' });
            const actualHash = sha256(fs.readFileSync(output));
            if (actualHash !== plan.artifactFile.sha256) {
                throw new ImplementationMaterializationError(
                    'integrity',
                    `Written source file hash mismatch for "${plan.relativePath}".`,
                );
            }
        }

        const cacheDirectory = path.join(stageDirectory, INTERNAL_ASSET_CACHE);
        const cachedAssets = new Map<string, Promise<string>>();
        const materializedAssets: MaterializedLocalAsset[] = [];
        for (const plan of assetPlans.local) {
            abortIfRequested(options.signal);
            const asset = plan.asset;
            const key = `${asset.sha256}:${asset.size}`;
            let cachedAsset = cachedAssets.get(key);
            if (!cachedAsset) {
                cachedAsset = materializeImplementationAsset(asset, {
                    fetcher: options.assetFetcher,
                    signal: options.signal,
                    assetDirectory: cacheDirectory,
                });
                cachedAssets.set(key, cachedAsset);
            }
            let cachedPath: string;
            try {
                cachedPath = await cachedAsset;
            } catch (error) {
                abortIfRequested(options.signal);
                throw wrapError(error, 'asset', `Could not materialize asset "${asset.path}"`);
            }
            abortIfRequested(options.signal);
            const bytes = fs.readFileSync(cachedPath);
            if (sha256(bytes) !== asset.sha256 || bytes.byteLength !== asset.size) {
                throw new ImplementationMaterializationError(
                    'integrity',
                    `Materialized asset integrity mismatch for "${asset.path}".`,
                );
            }
            const output = path.resolve(stageDirectory, ...plan.relativePath.split('/'));
            if (!isInside(stageDirectory, output)) {
                throw new ImplementationMaterializationError(
                    'unsafe-path',
                    `Asset path escaped the staging directory: "${plan.relativePath}".`,
                );
            }
            fs.mkdirSync(path.dirname(output), { recursive: true });
            if (!fs.existsSync(output)) {
                fs.writeFileSync(output, bytes, { flag: 'wx' });
            }
            const written = fs.readFileSync(output);
            if (sha256(written) !== asset.sha256 || written.byteLength !== asset.size) {
                throw new ImplementationMaterializationError(
                    'integrity',
                    `Written asset integrity mismatch for "${plan.relativePath}".`,
                );
            }
            materializedAssets.push({
                path: path.join(directory, ...plan.relativePath.split('/')),
                relativePath: plan.relativePath,
                sourcePath: plan.sourcePath,
                source: asset.source,
                mediaType: asset.mediaType,
                sha256: asset.sha256!,
                size: asset.size!,
                referencedBy: [...plan.referencedBy].sort(),
            });
        }
        if (fs.existsSync(cacheDirectory)) {
            fs.rmSync(cacheDirectory, { recursive: true, force: false });
        }

        const deterministicSource = {
            name: artifact.source.name,
            ...(artifact.source.version ? { version: artifact.source.version } : {}),
            ...(artifact.source.commit ? { commit: artifact.source.commit } : {}),
            registryUrl: artifact.source.registryUrl,
            sourceUrl: artifact.source.sourceUrl,
            provenance: artifact.source.provenance,
            ...(artifact.source.license ? { license: artifact.source.license } : {}),
            registryItems: artifact.source.registryItems,
        };
        const manifest: ImplementationMaterializationManifest = {
            schemaVersion: 1,
            artifact: {
                id: artifact.id,
                provider: artifact.provider,
                source: deterministicSource,
                integrity: artifact.integrity,
            },
            entryPoint: artifact.entryPoint,
            publicAssetRoot: 'public',
            files: filePlans.map(({ relativePath, artifactFile }) => ({
                path: relativePath,
                role: artifactFile.role,
                sha256: artifactFile.sha256,
                sourceUrl: artifactFile.sourceUrl,
                ...(artifactFile.registryType ? { registryType: artifactFile.registryType } : {}),
                ...(artifactFile.target ? { target: artifactFile.target } : {}),
            })),
            assets: materializedAssets.map((asset) => ({
                sourcePath: asset.sourcePath,
                path: asset.relativePath,
                source: asset.source,
                mediaType: asset.mediaType,
                sha256: asset.sha256,
                size: asset.size,
                referencedBy: asset.referencedBy,
            })),
            externalAssets: assetPlans.external,
            dependencyPlan: {
                packages: artifact.dependencies.map((dependency) => ({
                    ...dependency,
                    ...(dependency.origins ? { origins: [...dependency.origins].sort() } : {}),
                })),
                provenanceComplete: artifact.dependencies.every(
                    (dependency) =>
                        dependency.origins !== undefined && dependency.versionSource !== undefined,
                ),
                providers: [...artifact.requirements.providers].sort(),
                configuration: [...artifact.requirements.configuration].sort(),
            },
            sourceAliases: SOURCE_ALIASES,
            demo: { ...artifact.demo, files: [...artifact.demo.files] },
        };
        const manifestPath = path.join(stageDirectory, MANIFEST_FILENAME);
        fs.writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, {
            encoding: 'utf8',
            flag: 'wx',
        });
        abortIfRequested(options.signal);
        await publishStageDirectory(stageDirectory, directory);
        stageDirectory = null;

        return {
            artifactId: artifact.id,
            integrity: { ...artifact.integrity },
            materializationDirectory: directory,
            entryPoint: path.join(directory, ...artifact.entryPoint.split('/')),
            manifestPath: path.join(directory, MANIFEST_FILENAME),
            sourceFiles: filePlans.map(({ relativePath, artifactFile }) => ({
                path: path.join(directory, ...relativePath.split('/')),
                relativePath,
                role: artifactFile.role,
                sha256: artifactFile.sha256,
                sourceUrl: artifactFile.sourceUrl,
            })),
            assets: materializedAssets.map((asset) => ({
                ...asset,
                path: path.join(directory, ...asset.relativePath.split('/')),
            })),
            externalAssets: assetPlans.external,
            dependencyPlan: manifest.dependencyPlan,
            manifest,
        };
    } catch (error) {
        throw wrapError(error, 'io', 'Implementation materialization failed');
    } finally {
        if (stageDirectory && fs.existsSync(stageDirectory)) {
            try {
                fs.rmSync(stageDirectory, { recursive: true, force: true });
            } catch {
                // Preserve the original materialization error.
            }
        }
    }
}


export function materializeImplementationArtifact(
    artifactValue: ImplementationArtifact,
    destinationDirectory: string,
    options: ImplementationMaterializationOptions = {},
): Promise<ImplementationMaterializationResult> {
    const directory = path.resolve(destinationDirectory);
    const artifactHash = artifactValue?.integrity?.artifactHash ?? '';
    const pending = materializationFlights.get(directory);
    if (pending?.artifactHash === artifactHash) return pending.promise;
    const task = (async () => {
        activeMaterializationDirectories.set(directory, (activeMaterializationDirectories.get(directory) ?? 0) + 1);
        try {
            if (pending) await pending.promise.catch(() => undefined);
            return await materializeImplementationArtifactUnlocked(artifactValue, destinationDirectory, options);
        } finally {
            const remaining = (activeMaterializationDirectories.get(directory) ?? 1) - 1;
            if (remaining > 0) activeMaterializationDirectories.set(directory, remaining);
            else activeMaterializationDirectories.delete(directory);
        }
    })();
    materializationFlights.set(directory, { artifactHash, promise: task });
    const clear = () => {
        if (materializationFlights.get(directory)?.promise === task) materializationFlights.delete(directory);
    };
    void task.then(clear, clear);
    return task;
}
