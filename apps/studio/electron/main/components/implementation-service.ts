import {
    ImplementationArtifactSchema,
    type ImplementationArtifact,
    type ImplementationKind,
    type ImplementationProvider,
    type ImplementationRequest,
} from '@kumite/models';
import { SHADCN_BLOCKS, SHADCN_COMPONENTS } from '@kumite/models';
import {
    hashImplementationArtifact,
    hashImplementationSource,
    createShadcnSourceResolver,
    type ShadcnSourceResolverOptions,
} from './source-resolver';

export type ImplementationResolutionPhase = 'discovering' | 'resolving' | 'validating' | 'complete';

export interface ImplementationCatalogEntry {
    provider: ImplementationProvider;
    kind: ImplementationKind;
    name: string;
    title: string;
    version?: string;
    commit?: string;
}

export interface ImplementationResolutionProgress {
    phase: ImplementationResolutionPhase;
    message: string;
    provider: ImplementationProvider;
    name?: string;
}

export interface ImplementationResolutionResult {
    artifact: ImplementationArtifact;
    artifactId: string;
    hashes: ImplementationArtifact['integrity'];
    provider: ImplementationProvider;
    version?: string;
    commit?: string;
    entryPoint: string;
    sourceFiles: Array<{
        path: string;
        role: ImplementationArtifact['files'][number]['role'];
        sha256: string;
    }>;
    assets: ImplementationArtifact['assets'];
    dependencies: ImplementationArtifact['dependencies'];
    demo: ImplementationArtifact['demo'];
    requirements: ImplementationArtifact['requirements'];
    license: NonNullable<ImplementationArtifact['source']['license']>;
}

export interface ImplementationSourceAdapter {
    readonly provider: ImplementationProvider;
    discover(options?: { signal?: AbortSignal }): Promise<ImplementationCatalogEntry[]>;
    resolve(
        request: ImplementationRequest,
        options?: { signal?: AbortSignal },
    ): Promise<ImplementationArtifact>;
}

export interface ImplementationResolutionOptions {
    adapters?: ImplementationSourceAdapter[];
    onProgress?: (progress: ImplementationResolutionProgress) => void;
    signal?: AbortSignal;
    resolverOptions?: ShadcnSourceResolverOptions;
}

export type ImplementationResolutionErrorCode =
    | 'unsupported-provider'
    | 'cancelled'
    | 'resolution-failed'
    | 'invalid-artifact'
    | 'kind-mismatch'
    | 'version-mismatch'
    | 'commit-mismatch';

export class ImplementationResolutionError extends Error {
    constructor(
        readonly code: ImplementationResolutionErrorCode,
        message: string,
        options?: ErrorOptions,
    ) {
        super(message, options);
        this.name = 'ImplementationResolutionError';
    }
}

function throwIfAborted(signal?: AbortSignal): void {
    if (signal?.aborted) {
        throw new ImplementationResolutionError(
            'cancelled',
            'Implementation resolution was cancelled.',
            { cause: signal.reason },
        );
    }
}

const SHADCN_COMMIT = '1e9e337923aaede7db55b6091cb56a72a661b959';
const SHADCN_VERSION = '3.7.0';

function createShadcnAdapter(
    resolverOptions: ShadcnSourceResolverOptions = {},
): ImplementationSourceAdapter {
    return {
        provider: 'shadcn',
        async discover({ signal } = {}) {
            throwIfAborted(signal);
            return [
                ...SHADCN_COMPONENTS.map((item) => ({
                    provider: 'shadcn' as const,
                    kind: 'component' as const,
                    name: item.name,
                    title: item.title,
                    version: SHADCN_VERSION,
                    commit: SHADCN_COMMIT,
                })),
                ...SHADCN_BLOCKS.map((item) => ({
                    provider: 'shadcn' as const,
                    kind: 'block' as const,
                    name: item.name,
                    title: item.title,
                    version: SHADCN_VERSION,
                    commit: SHADCN_COMMIT,
                })),
            ];
        },
        async resolve(request, { signal } = {}) {
            if (request.version && request.version !== SHADCN_VERSION) {
                throw new ImplementationResolutionError(
                    'version-mismatch',
                    `shadcn version "${request.version}" is unsupported; this resolver is pinned to ${SHADCN_VERSION}.`,
                );
            }
            if (request.commit && request.commit !== SHADCN_COMMIT) {
                throw new ImplementationResolutionError(
                    'commit-mismatch',
                    `shadcn commit "${request.commit}" is unsupported; this resolver is pinned to ${SHADCN_COMMIT}.`,
                );
            }
            return createShadcnSourceResolver({ ...resolverOptions, signal }).resolve(request);
        },
    };
}

export function createImplementationResolutionService(
    options: ImplementationResolutionOptions = {},
) {
    const adapters = options.adapters ?? [createShadcnAdapter(options.resolverOptions)];
    const adapterByProvider = new Map(adapters.map((adapter) => [adapter.provider, adapter]));

    async function discover(
        provider: ImplementationProvider,
        signal = options.signal,
    ): Promise<ImplementationCatalogEntry[]> {
        throwIfAborted(signal);
        const adapter = adapterByProvider.get(provider);
        if (!adapter) {
            throw new ImplementationResolutionError(
                'unsupported-provider',
                `Provider "${provider}" is not supported. No source fallback was attempted.`,
            );
        }
        options.onProgress?.({
            phase: 'discovering',
            provider,
            message: `Discovering ${provider} catalog…`,
        });
        return adapter.discover({ signal });
    }

    async function resolve(
        request: ImplementationRequest,
        signal = options.signal,
    ): Promise<ImplementationResolutionResult> {
        throwIfAborted(signal);
        const adapter = adapterByProvider.get(request.provider);
        if (!adapter) {
            throw new ImplementationResolutionError(
                'unsupported-provider',
                `Provider "${request.provider}" is not supported. No source fallback was attempted.`,
            );
        }
        options.onProgress?.({
            phase: 'resolving',
            provider: request.provider,
            name: request.name,
            message: `Resolving ${request.kind} "${request.name}" from ${request.provider}…`,
        });

        let artifact: ImplementationArtifact;
        try {
            artifact = await adapter.resolve(request, { signal });
        } catch (error) {
            if (error instanceof ImplementationResolutionError) {
                throw error;
            }
            if (signal?.aborted) {
                throw new ImplementationResolutionError(
                    'cancelled',
                    'Implementation resolution was cancelled.',
                    { cause: signal.reason ?? error },
                );
            }
            throw new ImplementationResolutionError(
                'resolution-failed',
                error instanceof Error ? error.message : String(error),
                { cause: error },
            );
        }

        throwIfAborted(signal);
        options.onProgress?.({
            phase: 'validating',
            provider: request.provider,
            name: request.name,
            message: 'Validating artifact schema and integrity…',
        });

        try {
            artifact = ImplementationArtifactSchema.parse(artifact);
        } catch (error) {
            throw new ImplementationResolutionError(
                'invalid-artifact',
                `Resolved artifact did not match the implementation schema: ${error instanceof Error ? error.message : String(error)}`,
                { cause: error },
            );
        }
        if (artifact.provider !== request.provider || artifact.metadata.name !== request.name) {
            throw new ImplementationResolutionError(
                'invalid-artifact',
                'Resolved artifact identity does not match the requested provider and name.',
            );
        }
        if (artifact.metadata.type !== request.kind) {
            throw new ImplementationResolutionError(
                'kind-mismatch',
                `Requested a ${request.kind}, but the provider returned a ${artifact.metadata.type}.`,
            );
        }
        if (hashImplementationSource(artifact) !== artifact.integrity.sourceHash) {
            throw new ImplementationResolutionError(
                'invalid-artifact',
                'Resolved artifact source hash does not match its source inventory.',
            );
        }
        if (hashImplementationArtifact(artifact) !== artifact.integrity.artifactHash) {
            throw new ImplementationResolutionError(
                'invalid-artifact',
                'Resolved artifact hash does not match its contents.',
            );
        }

        options.onProgress?.({
            phase: 'complete',
            provider: request.provider,
            name: request.name,
            message: 'Implementation artifact is ready.',
        });
        return {
            artifact,
            artifactId: artifact.id,
            hashes: artifact.integrity,
            provider: artifact.provider,
            version: artifact.source.version,
            commit: artifact.source.commit,
            entryPoint: artifact.entryPoint,
            sourceFiles: artifact.files.map(({ path, role, sha256 }) => ({ path, role, sha256 })),
            assets: artifact.assets,
            dependencies: artifact.dependencies,
            demo: artifact.demo,
            requirements: artifact.requirements,
            license: artifact.source.license ?? { status: 'unknown' },
        };
    }

    return { discover, resolve };
}

export const implementationResolutionService = createImplementationResolutionService();
