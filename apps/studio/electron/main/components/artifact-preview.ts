import { createHash } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import type {
    ImplementationArtifact,
    ImplementationRequest,
    ShadcnInstallProgress,
} from '@kumite/models';
import { runPackageManagerInstall } from './cli';
import { projectLifecycle } from '../lifecycle/state';
import { GENERATED_CONFIG_MARKER, buildArtifactPreviewViteConfig } from './preview-vite-config';
import { implementationResolutionService } from './implementation-service';
import { SHADCN_SOURCE_COMMIT } from './source-resolver';
import {
    ImplementationMaterializationError,
    materializeImplementationArtifact,
    type ImplementationMaterializationManifest,
} from './implementation-materializer';
import {
    implementationWorkspaceIdentity,
    reconcileStalePreviewArtifactReferences,
    readStoredImplementationArtifact,
    setImplementationArtifactReference,
    storeAndReferenceImplementationArtifact,
} from './implementation-store';
import { PreviewRuntimeManager, safeEntryId, stableSessionId } from './preview-runtime';
import { buildCatalogHtml } from './preview';
import { buildArtifactPreviewModule } from './artifact-preview-module';
import { generateArtifactPreviewRegistry } from './preview-registry';
import { cleanupArtifactPreviewWorkspace } from './preview-workspace-cleanup';
import { ensureArtifactPreviewStylesheet } from './preview-stylesheet';

const MATERIALIZATIONS_DIRECTORY = '.kumite-materializations';
const SOURCE_ROOT = 'src';
const PREVIEW_START_PORT = 3320;
const DEPENDENCY_MANIFEST = '.kumite-artifact-preview-dependencies.json';

export interface ArtifactCatalogPreviewResult {
    urls: Record<string, string>;
    sessions: Record<string, string>;
    sources: Record<string, 'artifact'>;
    errors: Record<string, string>;
    error: string | null;
    log: string | null;
}

function sha256(content: string | Buffer): string {
    return createHash('sha256').update(content).digest('hex');
}

/**
 * Catalog artifacts are immutable at the pinned upstream commit. Reuse a
 * validated local artifact before asking the source adapter to fetch files
 * again; the content-addressed store lives under Electron userData.
 */
export async function findCachedCatalogArtifact(
    request: ImplementationRequest,
    storeRoot: string,
): Promise<ImplementationArtifact | null> {
    const directory = path.join(storeRoot, 'artifacts');
    let entries: string[];
    try {
        entries = await fs.promises.readdir(directory);
    } catch (error) {
        if ((error as NodeJS.ErrnoException).code === 'ENOENT') return null;
        throw error;
    }

    for (const entry of entries) {
        if (!/^[a-f0-9]{64}$/.test(entry)) continue;
        try {
            const stored = await readStoredImplementationArtifact(entry, storeRoot);
            const artifact = stored?.artifact;
            if (
                artifact &&
                artifact.provider === request.provider &&
                artifact.metadata.name === request.name &&
                artifact.metadata.type === request.kind &&
                artifact.source.commit === SHADCN_SOURCE_COMMIT
            ) {
                return artifact;
            }
        } catch {
            // A corrupt/stale cache entry is not trusted. Resolve a fresh copy.
        }
    }
    return null;
}

function abortIfRequested(signal?: AbortSignal): void {
    if (signal?.aborted) {
        throw new ImplementationMaterializationError(
            'cancelled',
            'Artifact preview preparation was cancelled.',
            { cause: signal.reason },
        );
    }
}

/** Keep registry resolution and filesystem work responsive under scroll bursts. */
async function forEachWithConcurrency<T>(
    items: T[],
    limit: number,
    task: (item: T, index: number) => Promise<void>,
): Promise<void> {
    let next = 0;
    const workers = Array.from({ length: Math.min(Math.max(1, limit), items.length) }, async () => {
        while (next < items.length) {
            const index = next++;
            await task(items[index]!, index);
        }
    });
    await Promise.all(workers);
}

function safePath(root: string, relativePath: string): string {
    const output = path.resolve(root, ...relativePath.split('/'));
    const relative = path.relative(root, output);
    if (relative.startsWith('..') || path.isAbsolute(relative) || relativePath.includes('\\')) {
        throw new Error(`Unsafe artifact preview path "${relativePath}".`);
    }
    return output;
}

function materializationPath(root: string, artifact: ImplementationArtifact): string {
    return path.join(root, MATERIALIZATIONS_DIRECTORY, implementationWorkspaceIdentity(artifact));
}

function readMaterializationManifest(
    directory: string,
    artifact: ImplementationArtifact,
): ImplementationMaterializationManifest {
    const manifestPath = path.join(directory, '.kumite-implementation.json');
    const manifest = JSON.parse(
        fs.readFileSync(manifestPath, 'utf8'),
    ) as ImplementationMaterializationManifest;
    if (
        manifest.schemaVersion !== 1 ||
        manifest.artifact.id !== artifact.id ||
        manifest.artifact.integrity.artifactHash !== artifact.integrity.artifactHash ||
        manifest.files.length !== artifact.files.length
    ) {
        throw new Error('Cached artifact materialization does not match the requested artifact.');
    }
    const materializedBySource = new Map(manifest.files.map((file) => [file.path, file.sha256]));
    if (
        artifact.files.some((file) => materializedBySource.get(file.path) !== file.sha256) ||
        manifest.files.some((file) => !artifact.files.some((source) => source.path === file.path))
    ) {
        throw new Error('Cached source inventory does not match the requested artifact.');
    }
    for (const file of manifest.files) {
        const filePath = safePath(directory, file.path);
        if (!fs.existsSync(filePath) || sha256(fs.readFileSync(filePath)) !== file.sha256) {
            throw new Error(`Cached source file failed integrity validation: ${file.path}`);
        }
    }
    for (const asset of manifest.assets) {
        const assetPath = safePath(directory, asset.path);
        if (
            !fs.existsSync(assetPath) ||
            sha256(fs.readFileSync(assetPath)) !== asset.sha256 ||
            fs.statSync(assetPath).size !== asset.size
        ) {
            throw new Error(`Cached asset failed integrity validation: ${asset.path}`);
        }
    }
    return manifest;
}

const materializations = new Map<
    string,
    Promise<{ directory: string; manifest: ImplementationMaterializationManifest }>
>();

/**
 * Two visible batches can ask for the same artifact at once; the materializer's
 * stage→final rename fails if the winner already moved the directory into
 * place, so concurrent callers share one materialization.
 */
function ensureMaterialization(
    artifact: ImplementationArtifact,
    workspaceRoot: string,
    signal?: AbortSignal,
): Promise<{ directory: string; manifest: ImplementationMaterializationManifest }> {
    const directory = materializationPath(workspaceRoot, artifact);
    if (fs.existsSync(directory)) {
        return Promise.resolve({
            directory,
            manifest: readMaterializationManifest(directory, artifact),
        });
    }
    const pending = materializations.get(directory);
    if (pending) {
        return pending;
    }
    const task = (async () => {
        // The materializer refuses to create its own parent (so a bad path
        // cannot escape), and the preview store owns this directory.
        fs.mkdirSync(path.dirname(directory), { recursive: true });
        await materializeImplementationArtifact(artifact, directory, { signal });
        return { directory, manifest: readMaterializationManifest(directory, artifact) };
    })().finally(() => materializations.delete(directory));
    materializations.set(directory, task);
    return task;
}

function copyVerified(source: string, destination: string, expectedHash: string): void {
    fs.mkdirSync(path.dirname(destination), { recursive: true });
    if (fs.existsSync(destination)) {
        if (
            !fs.statSync(destination).isFile() ||
            sha256(fs.readFileSync(destination)) !== expectedHash
        ) {
            throw new Error(`Artifact preview source collision at "${destination}".`);
        }
        return;
    }
    try {
        fs.copyFileSync(source, destination, fs.constants.COPYFILE_EXCL);
    } catch (error) {
        if ((error as NodeJS.ErrnoException).code !== 'EEXIST') {
            throw error;
        }
    }
    if (sha256(fs.readFileSync(destination)) !== expectedHash) {
        throw new Error(`Artifact preview source integrity mismatch at "${destination}".`);
    }
}

function mergeMaterialization(
    workspaceRoot: string,
    materializationDirectory: string,
    manifest: ImplementationMaterializationManifest,
): void {
    for (const file of manifest.files) {
        copyVerified(
            safePath(materializationDirectory, file.path),
            safePath(path.join(workspaceRoot, SOURCE_ROOT), file.path),
            file.sha256,
        );
    }
    for (const asset of manifest.assets) {
        copyVerified(
            safePath(materializationDirectory, asset.path),
            safePath(workspaceRoot, asset.path),
            asset.sha256,
        );
    }
}

export { buildArtifactPreviewViteConfig } from './preview-vite-config';

/**
 * Configs written by earlier builds start with the plugin import and carry no
 * marker; accept both so an upgrade can migrate in place instead of stranding
 * the workspace.
 */
function isGeneratedViteConfig(contents: string): boolean {
    return (
        contents.startsWith(GENERATED_CONFIG_MARKER) ||
        contents.startsWith("import react from '@vitejs/plugin-react';")
    );
}

function writeViteAliases(workspaceRoot: string): void {
    const config = buildArtifactPreviewViteConfig();
    const configPath = path.join(workspaceRoot, 'vite.config.ts');
    if (!fs.existsSync(configPath)) {
        fs.writeFileSync(configPath, config, { encoding: 'utf8', flag: 'wx' });
        return;
    }
    const existing = fs.readFileSync(configPath, 'utf8');
    if (existing === config) {
        return;
    }
    if (!isGeneratedViteConfig(existing)) {
        throw new Error('Refusing to replace an unrecognized preview workspace Vite config.');
    }
    fs.writeFileSync(configPath, config, 'utf8');
}

async function resolveLatestVersion(name: string, signal?: AbortSignal): Promise<string> {
    const response = await fetch(`https://registry.npmjs.org/${encodeURIComponent(name)}`, {
        signal,
    });
    if (!response.ok) {
        throw new Error(
            `Could not resolve an exact version for "${name}" (HTTP ${response.status}).`,
        );
    }
    const metadata = (await response.json()) as { 'dist-tags'?: { latest?: string } };
    const version = metadata['dist-tags']?.latest;
    if (!version || !/^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?$/.test(version)) {
        throw new Error(`npm returned no valid latest version for "${name}".`);
    }
    return version;
}

async function prepareDependencies(
    workspaceRoot: string,
    artifacts: ImplementationArtifact[],
    onProgress?: (progress: ShadcnInstallProgress) => void,
    signal?: AbortSignal,
): Promise<string> {
    abortIfRequested(signal);
    const packageJsonPath = path.join(workspaceRoot, 'package.json');
    const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8')) as {
        dependencies?: Record<string, string>;
    };
    packageJson.dependencies ??= {};
    const requested = new Map<
        string,
        { version?: string; artifacts: string[]; versionSource: string }
    >();
    for (const artifact of artifacts) {
        for (const dependency of artifact.dependencies) {
            const previous = requested.get(dependency.name);
            if (
                previous?.version &&
                dependency.version &&
                previous.version !== dependency.version
            ) {
                throw new Error(
                    `Artifacts request conflicting versions of "${dependency.name}": ${previous.version} and ${dependency.version}.`,
                );
            }
            requested.set(dependency.name, {
                version: dependency.version ?? previous?.version,
                artifacts: [...new Set([...(previous?.artifacts ?? []), artifact.id])].sort(),
                versionSource: dependency.version
                    ? (dependency.versionSource ?? 'registry')
                    : (previous?.versionSource ?? 'unspecified'),
            });
        }
        if (artifact.files.some((file) => /\.(?:scss|sass)$/.test(file.path))) {
            const sassDependency = requested.get('sass');
            requested.set('sass', {
                ...(sassDependency?.version ? { version: sassDependency.version } : {}),
                artifacts: [...new Set([...(sassDependency?.artifacts ?? []), artifact.id])].sort(),
                versionSource: sassDependency?.versionSource ?? 'unspecified',
            });
        }
    }

    const selected: Record<string, { version: string; policy: string; artifacts: string[] }> = {};
    const existingDependencyManifestPath = path.join(workspaceRoot, DEPENDENCY_MANIFEST);
    let existingDependencyManifest: {
        packages?: Record<string, { version: string; policy: string; artifacts: string[] }>;
    } = {};
    try {
        existingDependencyManifest = JSON.parse(
            fs.readFileSync(existingDependencyManifestPath, 'utf8'),
        ) as typeof existingDependencyManifest;
    } catch {
        existingDependencyManifest = {};
    }
    let changed = false;
    for (const [name, requirement] of requested) {
        abortIfRequested(signal);
        const installedPath = path.join(
            workspaceRoot,
            'node_modules',
            ...name.split('/'),
            'package.json',
        );
        let installedVersion: string | undefined;
        try {
            installedVersion = (
                JSON.parse(fs.readFileSync(installedPath, 'utf8')) as { version?: string }
            ).version;
        } catch {
            installedVersion = undefined;
        }
        // An artifact's exact pin wins. The workspace may already hold another
        // version resolved from npm's "latest" for a dependency the catalog
        // never versioned, and refusing to replace it would strand the artifact.
        const exact =
            requirement.version && /^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?$/.test(requirement.version)
                ? requirement.version
                : undefined;
        const cachedVersion = existingDependencyManifest.packages?.[name]?.version;
        const reusableCachedVersion =
            !exact &&
            typeof cachedVersion === 'string' &&
            /^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?$/.test(cachedVersion)
                ? cachedVersion
                : undefined;
        const keeping = !exact || installedVersion === exact;
        const version = keeping
            ? (installedVersion ?? exact ?? reusableCachedVersion ?? (await resolveLatestVersion(name, signal)))
            : exact!;
        selected[name] = {
            version,
            policy:
                requirement.versionSource === 'unspecified'
                    ? 'npm dist-tags.latest resolved to an exact version and recorded in the isolated workspace'
                    : 'artifact registry version',
            artifacts: requirement.artifacts,
        };
        if ((!installedVersion || !keeping) && packageJson.dependencies[name] !== version) {
            packageJson.dependencies[name] = version;
            changed = true;
        }
    }
    if (changed) {
        fs.writeFileSync(packageJsonPath, `${JSON.stringify(packageJson, null, 4)}\n`, 'utf8');
        onProgress?.({
            component: artifacts.map((artifact) => artifact.metadata.name).join(', '),
            phase: 'installing',
            message: 'Installing artifact dependencies in Kumite’s isolated preview workspace…',
        });
        const result = await runPackageManagerInstall(
            workspaceRoot,
            'bun',
            (progress) => {
                if (progress.chunk) {
                    onProgress?.({
                        component: artifacts.map((artifact) => artifact.metadata.name).join(', '),
                        phase: 'installing',
                        message:
                            'Installing artifact dependencies in Kumite’s isolated preview workspace…',
                        output: progress.chunk,
                    });
                }
            },
            signal,
            true,
        );
        abortIfRequested(signal);
        if (!result.success) {
            throw new Error(`Could not prepare isolated preview dependencies: ${result.output}`);
        }
    }
    for (const [name, item] of Object.entries(selected)) {
        const installedPath = path.join(
            workspaceRoot,
            'node_modules',
            ...name.split('/'),
            'package.json',
        );
        try {
            item.version =
                (JSON.parse(fs.readFileSync(installedPath, 'utf8')) as { version?: string })
                    .version ?? item.version;
        } catch {
            throw new Error(`Preview dependency "${name}" is still missing after installation.`);
        }
    }
    fs.writeFileSync(
        path.join(workspaceRoot, DEPENDENCY_MANIFEST),
        `${JSON.stringify(
            {
                schemaVersion: 1,
                policy: 'exact-version-from-artifact-or-npm-latest',
                packages: { ...existingDependencyManifest.packages, ...selected },
            },
            null,
            2,
        )}\n`,
        'utf8',
    );
    return changed
        ? `Installed ${Object.keys(selected).join(', ')} in the isolated preview workspace.`
        : '';
}

export { buildArtifactPreviewModule } from './artifact-preview-module';

export class ArtifactCatalogPreviewServer {
    private readonly runtime = new PreviewRuntimeManager();
    private readonly ownerArtifacts = new Map<string, Set<string>>();
    private readonly ownerStores = new Map<string, string>();
    private readonly ownerControllers = new Map<string, Set<AbortController>>();
    private readonly ownerTasks = new Map<string, Set<Promise<ArtifactCatalogPreviewResult>>>();
    private dependencyChain: Promise<void> = Promise.resolve();
    private startupReconciliation: Promise<void> | null = null;

    private prepareDependencies(
        workspaceRoot: string,
        artifacts: ImplementationArtifact[],
        onProgress?: (progress: ShadcnInstallProgress) => void,
        signal?: AbortSignal,
    ): Promise<string> {
        const task = this.dependencyChain
            .catch(() => undefined)
            .then(() => prepareDependencies(workspaceRoot, artifacts, onProgress, signal));
        this.dependencyChain = task.then(
            () => undefined,
            () => undefined,
        );
        return task;
    }

    start(
        workspaceRoot: string,
        requests: ImplementationRequest[],
        ownerId: string,
        options: {
            storeRoot: string;
            onProgress?: (progress: ShadcnInstallProgress) => void;
            signal?: AbortSignal;
            /** Verified export names (for example the catalog's `parts`) by request name. */
            preferredExports?: Record<string, string>;
            /** Catalog key for requests that preview an upstream example artifact. */
            previewNames?: Record<string, string>;
        },
    ): Promise<ArtifactCatalogPreviewResult> {
        if (projectLifecycle.isShuttingDown) {
            return Promise.resolve({
                urls: {},
                sessions: {},
                sources: {},
                errors: {},
                error: 'Kumite is shutting down.',
                log: null,
            });
        }
        this.ownerStores.set(ownerId, options.storeRoot);
        const controller = new AbortController();
        const controllers = this.ownerControllers.get(ownerId) ?? new Set<AbortController>();
        controllers.add(controller);
        this.ownerControllers.set(ownerId, controllers);
        const abortFromCaller = () => controller.abort(options.signal?.reason);
        if (options.signal?.aborted) {
            abortFromCaller();
        } else {
            options.signal?.addEventListener('abort', abortFromCaller, { once: true });
        }
        const task = this.resolveAndStart(workspaceRoot, requests, ownerId, {
            ...options,
            signal: controller.signal,
        });
        const tasks =
            this.ownerTasks.get(ownerId) ?? new Set<Promise<ArtifactCatalogPreviewResult>>();
        tasks.add(task);
        this.ownerTasks.set(ownerId, tasks);
        return task.finally(() => {
            options.signal?.removeEventListener('abort', abortFromCaller);
            controllers.delete(controller);
            tasks.delete(task);
            if (controllers.size === 0) {
                this.ownerControllers.delete(ownerId);
            }
            if (tasks.size === 0) {
                this.ownerTasks.delete(ownerId);
            }
        });
    }

    private async resolveAndStart(
        workspaceRoot: string,
        requests: ImplementationRequest[],
        ownerId: string,
        options: {
            storeRoot: string;
            onProgress?: (progress: ShadcnInstallProgress) => void;
            signal?: AbortSignal;
            preferredExports?: Record<string, string>;
            previewNames?: Record<string, string>;
        },
    ): Promise<ArtifactCatalogPreviewResult> {
        const urls: Record<string, string> = {};
        const sessions: Record<string, string> = {};
        const sources: Record<string, 'artifact'> = {};
        const errors: Record<string, string> = {};
        const artifacts: ImplementationArtifact[] = [];
        const previewNames = new Map<ImplementationArtifact, string>();
        if (!this.startupReconciliation) {
            this.startupReconciliation = reconcileStalePreviewArtifactReferences(options.storeRoot);
        }
        try {
            await this.startupReconciliation;
            if (this.runtime.size === 0) {
                cleanupArtifactPreviewWorkspace(workspaceRoot);
            }
        } catch (error) {
            this.startupReconciliation = null;
            return {
                urls,
                sessions,
                sources,
                errors,
                error: `Could not reconcile artifact preview leases: ${error instanceof Error ? error.message : String(error)}`,
                log: null,
            };
        }
        await forEachWithConcurrency(requests, 4, async (request) => {
                if (options.signal?.aborted) {
                    errors[request.name] = 'Artifact preview was cancelled.';
                    return;
                }
                options.onProgress?.({
                    component: request.name,
                    phase: 'running',
                    message: `Resolving ${request.kind} "${request.name}" from its pinned source artifact…`,
                });
                try {
                    const cached = await findCachedCatalogArtifact(request, options.storeRoot);
                    const artifact =
                        cached ??
                        (await implementationResolutionService.resolve(request, options.signal)).artifact;
                    artifacts.push(artifact);
                    previewNames.set(
                        artifact,
                        options.previewNames?.[request.name] ?? artifact.metadata.name,
                    );
                } catch (error) {
                    const displayName = options.previewNames?.[request.name] ?? request.name;
                    errors[displayName] = error instanceof Error ? error.message : String(error);
                }
        });
        const manifests = new Map<
            string,
            { directory: string; manifest: ImplementationMaterializationManifest }
        >();
        let log = '';

        await forEachWithConcurrency(artifacts, 4, async (artifact) => {
            const key = `${artifact.provider}:${artifact.metadata.name}`;
            const displayName = previewNames.get(artifact) ?? artifact.metadata.name;
            try {
                abortIfRequested(options.signal);
                await storeAndReferenceImplementationArtifact(
                    artifact,
                    `preview:${ownerId}:${artifact.integrity.artifactHash}`,
                    options.storeRoot,
                );
                const owner = this.ownerArtifacts.get(ownerId) ?? new Set<string>();
                owner.add(artifact.integrity.artifactHash);
                this.ownerArtifacts.set(ownerId, owner);
                const cached = await ensureMaterialization(artifact, workspaceRoot, options.signal);
                mergeMaterialization(workspaceRoot, cached.directory, cached.manifest);
                manifests.set(key, cached);
            } catch (error) {
                errors[displayName] = error instanceof Error ? error.message : String(error);
            }
        });

        const readyArtifacts = artifacts.filter((artifact) =>
            manifests.has(`${artifact.provider}:${artifact.metadata.name}`),
        );
        if (readyArtifacts.length === 0) {
            const firstError =
                Object.values(errors)[0] ?? 'No implementation artifacts were ready.';
            return { urls, sessions, sources, errors, error: firstError, log: null };
        }

        try {
            writeViteAliases(workspaceRoot);
            ensureArtifactPreviewStylesheet(workspaceRoot);
            const dependencyLog = await this.prepareDependencies(
                workspaceRoot,
                readyArtifacts,
                options.onProgress,
                options.signal,
            );
            log = dependencyLog;
        } catch (error) {
            const message = error instanceof Error ? error.message : String(error);
            for (const artifact of readyArtifacts) {
                errors[previewNames.get(artifact) ?? artifact.metadata.name] = message;
            }
            return { urls, sessions, sources, errors, error: message, log: null };
        }

        const previewModules: Array<{
            key: string; artifactHash: string; kind: string; name: string; source: string;
            sessionId: string; entryId: string; html: string;
        }> = [];
        for (const artifact of readyArtifacts) {
            const displayName = previewNames.get(artifact) ?? artifact.metadata.name;
            try {
                const sessionId = stableSessionId(
                    workspaceRoot,
                    `${ownerId}:${displayName}:${artifact.id}:${artifact.integrity.artifactHash}`,
                    'implementation-catalog',
                );
                const entryId = safeEntryId(displayName);
                previewModules.push({
                    key: `${artifact.provider}:${artifact.metadata.type}:${artifact.id}:${sessionId}`,
                    artifactHash: artifact.integrity.artifactHash,
                    kind: artifact.metadata.type,
                    name: displayName,
                    source: buildArtifactPreviewModule(artifact, sessionId, options.preferredExports?.[displayName]),
                    sessionId,
                    entryId,
                    html: buildCatalogHtml(displayName, sessionId, entryId),
                });
            } catch (error) {
                errors[displayName] = error instanceof Error ? error.message : String(error);
            }
        }
        const registry = await generateArtifactPreviewRegistry(workspaceRoot, previewModules);
        const entries = previewModules.map((module) => ({
            sessionId: module.sessionId,
            entryId: module.entryId,
            html: module.html,
            source: registry.entrySources[module.key]!,
        }));
        if (entries.length === 0) {
            const firstError =
                Object.values(errors)[0] ?? 'No artifact entry points were renderable.';
            return { urls, sessions, sources, errors, error: firstError, log: log || null };
        }
        abortIfRequested(options.signal);

        const viteBin = path.join(workspaceRoot, 'node_modules', 'vite', 'bin', 'vite.js');
        if (!fs.existsSync(viteBin)) {
            return {
                urls,
                sessions,
                sources,
                errors,
                error: 'The isolated artifact preview workspace has no local Vite install.',
                log: log || null,
            };
        }
        const result = await this.runtime.ensure({
            projectPath: workspaceRoot,
            kind: 'implementation-catalog',
            viteBin,
            basePort: PREVIEW_START_PORT,
            entries,
            ownerId,
        });
        if (result.error) {
            return { urls, sessions, sources, errors, error: result.error, log: result.log ?? log };
        }
        for (const [index, artifact] of readyArtifacts
            .filter((value) =>
                entries.some(
                    (entry) =>
                        entry.entryId ===
                        safeEntryId(previewNames.get(value) ?? value.metadata.name),
                ),
            )
            .entries()) {
            const entry = entries[index];
            const url = result.urls[entry.sessionId];
            if (!url) {
                continue;
            }
            const displayName = previewNames.get(artifact) ?? artifact.metadata.name;
            urls[displayName] = url;
            sessions[displayName] = entry.sessionId;
            sources[displayName] = 'artifact';
        }
        return {
            urls,
            sessions,
            sources,
            errors,
            error:
                Object.keys(errors).length > 0
                    ? 'Some artifact previews could not be prepared.'
                    : null,
            log: [log, result.log].filter(Boolean).join('\n\n') || null,
        };
    }

    async releaseOwner(ownerId: string): Promise<void> {
        for (const controller of this.ownerControllers.get(ownerId) ?? []) {
            controller.abort('Preview consumer released.');
        }
        await this.runtime.releaseOwner(ownerId);
        await Promise.allSettled([...(this.ownerTasks.get(ownerId) ?? [])]);
        await this.runtime.releaseOwner(ownerId);
        const artifacts = this.ownerArtifacts.get(ownerId);
        const storeRoot = this.ownerStores.get(ownerId);
        if (!artifacts) {
            this.ownerStores.delete(ownerId);
            if (storeRoot && this.ownerArtifacts.size === 0 && this.runtime.size === 0) {
                cleanupArtifactPreviewWorkspace(path.dirname(storeRoot));
            }
            return;
        }
        if (!storeRoot) {
            throw new Error(`Artifact store root is missing for preview owner "${ownerId}".`);
        }
        for (const artifactId of artifacts) {
            await setImplementationArtifactReference(
                artifactId,
                `preview:${ownerId}:${artifactId}`,
                false,
                storeRoot,
            );
        }
        this.ownerArtifacts.delete(ownerId);
        this.ownerStores.delete(ownerId);
        if (this.ownerArtifacts.size === 0 && this.runtime.size === 0) {
            cleanupArtifactPreviewWorkspace(path.dirname(storeRoot));
        }
    }

    async stop(): Promise<void> {
        await this.runtime.stopAll();
        for (const ownerId of [...this.ownerArtifacts.keys()]) {
            await this.releaseOwner(ownerId);
        }
    }
}

export const artifactCatalogPreviewServer = new ArtifactCatalogPreviewServer();
