import { createHash } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import type {
    ImplementationArtifact,
    ImplementationRequest,
    ShadcnInstallProgress,
} from '@kumite/models';
import { Project } from 'ts-morph';
import { runPackageManagerInstall } from './cli';
import { projectLifecycle } from '../lifecycle/state';
import { CATALOG_PREVIEW_VITE_CONFIG } from './catalog';
import { implementationResolutionService } from './implementation-service';
import {
    ImplementationMaterializationError,
    materializeImplementationArtifact,
    type ImplementationMaterializationManifest,
} from './implementation-materializer';
import {
    implementationWorkspaceIdentity,
    setImplementationArtifactReference,
    storeImplementationArtifact,
} from './implementation-store';
import {
    PreviewRuntimeManager,
    safeEntryId,
    stableSessionId,
} from './preview-runtime';
import { buildCatalogHtml } from './preview';

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

function abortIfRequested(signal?: AbortSignal): void {
    if (signal?.aborted) {
        throw new ImplementationMaterializationError(
            'cancelled',
            'Artifact preview preparation was cancelled.',
            { cause: signal.reason },
        );
    }
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
    const materializedBySource = new Map(
        manifest.files.map((file) => [file.path, file.sha256]),
    );
    if (
        artifact.files.some((file) => materializedBySource.get(file.path) !== file.sha256) ||
        manifest.files.some(
            (file) => !artifact.files.some((source) => source.path === file.path),
        )
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

async function ensureMaterialization(
    artifact: ImplementationArtifact,
    workspaceRoot: string,
    signal?: AbortSignal,
): Promise<{ directory: string; manifest: ImplementationMaterializationManifest }> {
    const directory = materializationPath(workspaceRoot, artifact);
    if (fs.existsSync(directory)) {
        return { directory, manifest: readMaterializationManifest(directory, artifact) };
    }
    await materializeImplementationArtifact(artifact, directory, { signal });
    return { directory, manifest: readMaterializationManifest(directory, artifact) };
}

function copyVerified(source: string, destination: string, expectedHash: string): void {
    fs.mkdirSync(path.dirname(destination), { recursive: true });
    if (fs.existsSync(destination)) {
        if (!fs.statSync(destination).isFile() || sha256(fs.readFileSync(destination)) !== expectedHash) {
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

export function buildArtifactPreviewViteConfig(): string {
    return `import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';

const source = (path: string) => fileURLToPath(new URL(path, import.meta.url));

export default defineConfig({
    plugins: [react(), tailwindcss()],
    resolve: {
        alias: [
            { find: /^@\\/registry\\/new-york-v4\\//, replacement: source('./src/registry/new-york-v4/') },
            { find: /^@\\/components\\/ui\\//, replacement: source('./src/registry/new-york-v4/ui/') },
            { find: /^@\\/components\\//, replacement: source('./src/registry/new-york-v4/components/') },
            { find: /^@\\/assets\\//, replacement: source('./src/registry/new-york-v4/assets/') },
            { find: /^@\\/hooks\\//, replacement: source('./src/registry/new-york-v4/hooks/') },
            { find: /^@\\/lib\\//, replacement: source('./src/registry/new-york-v4/lib/') },
            { find: /^~\\/registry\\/new-york-v4\\//, replacement: source('./src/registry/new-york-v4/') },
            { find: /^~\\/components\\/ui\\//, replacement: source('./src/registry/new-york-v4/ui/') },
            { find: /^~\\/components\\//, replacement: source('./src/registry/new-york-v4/components/') },
            { find: /^~\\/assets\\//, replacement: source('./src/registry/new-york-v4/assets/') },
            { find: /^~\\/hooks\\//, replacement: source('./src/registry/new-york-v4/hooks/') },
            { find: /^~\\/lib\\//, replacement: source('./src/registry/new-york-v4/lib/') },
            { find: '@', replacement: source('./src/') },
            { find: '~', replacement: source('./src/') },
        ],
    },
});
`;
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
    if (existing !== CATALOG_PREVIEW_VITE_CONFIG) {
        throw new Error('Refusing to replace an unrecognized preview workspace Vite config.');
    }
    fs.writeFileSync(configPath, config, 'utf8');
}

async function resolveLatestVersion(name: string, signal?: AbortSignal): Promise<string> {
    const response = await fetch(`https://registry.npmjs.org/${encodeURIComponent(name)}`, {
        signal,
    });
    if (!response.ok) {
        throw new Error(`Could not resolve an exact version for "${name}" (HTTP ${response.status}).`);
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
            if (previous?.version && dependency.version && previous.version !== dependency.version) {
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
        const installedPath = path.join(workspaceRoot, 'node_modules', ...name.split('/'), 'package.json');
        let installedVersion: string | undefined;
        try {
            installedVersion = (
                JSON.parse(fs.readFileSync(installedPath, 'utf8')) as { version?: string }
            ).version;
        } catch {
            installedVersion = undefined;
        }
        if (
            installedVersion &&
            requirement.version &&
            /^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?$/.test(requirement.version) &&
            installedVersion !== requirement.version
        ) {
            throw new Error(
                `Preview workspace has ${name}@${installedVersion}, but the artifact requires ${requirement.version}; no downgrade or replacement was attempted.`,
            );
        }
        const version =
            installedVersion ??
            requirement.version ??
            (await resolveLatestVersion(name, signal));
        selected[name] = {
            version,
            policy:
                requirement.versionSource === 'unspecified'
                    ? 'npm dist-tags.latest resolved to an exact version and recorded in the isolated workspace'
                    : 'artifact registry version',
            artifacts: requirement.artifacts,
        };
        if (!installedVersion) {
            if (
                requirement.version &&
                packageJson.dependencies[name] &&
                packageJson.dependencies[name] !== requirement.version
            ) {
                throw new Error(
                    `Preview workspace manifest already pins ${name}@${packageJson.dependencies[name]}, which conflicts with ${requirement.version}.`,
                );
            }
            if (packageJson.dependencies[name] !== version) {
                packageJson.dependencies[name] = version;
                changed = true;
            }
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
                        message: 'Installing artifact dependencies in Kumite’s isolated preview workspace…',
                        output: progress.chunk,
                    });
                }
            },
            signal,
        );
        abortIfRequested(signal);
        if (!result.success) {
            throw new Error(`Could not prepare isolated preview dependencies: ${result.output}`);
        }
    }
    for (const [name, item] of Object.entries(selected)) {
        const installedPath = path.join(workspaceRoot, 'node_modules', ...name.split('/'), 'package.json');
        try {
            item.version =
                (JSON.parse(fs.readFileSync(installedPath, 'utf8')) as { version?: string }).version ??
                item.version;
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
    return changed ? `Installed ${Object.keys(selected).join(', ')} in the isolated preview workspace.` : '';
}

function exportedEntry(
    artifact: ImplementationArtifact,
): { kind: 'default' } | { kind: 'named'; name: string } {
    const entry = artifact.files.find((file) => file.path === artifact.entryPoint);
    if (!entry) {
        throw new Error(`Artifact entry point "${artifact.entryPoint}" is missing.`);
    }
    const sourceFile = new Project({
        skipAddingFilesFromTsConfig: true,
        useInMemoryFileSystem: true,
    }).createSourceFile('preview-entry.tsx', entry.content);
    const exports = sourceFile.getExportedDeclarations();
    if (exports.has('default')) {
        return { kind: 'default' };
    }
    if (artifact.metadata.type === 'component') {
        const name = [...exports.keys()].filter((value) => /^[A-Z]/.test(value)).sort()[0];
        if (name) {
            return { kind: 'named', name };
        }
    }
    throw new Error(
        `Artifact entry point "${artifact.entryPoint}" does not expose a renderable ${artifact.metadata.type} export.`,
    );
}

function extensionless(value: string): string {
    return value.replace(/\.(tsx|jsx|ts|js)$/, '');
}

export function buildArtifactPreviewModule(
    artifact: ImplementationArtifact,
    sessionId: string,
): string {
    const entry = exportedEntry(artifact);
    const source = `@/${extensionless(artifact.entryPoint)}`;
    const importLine =
        entry.kind === 'default'
            ? `import Implementation from ${JSON.stringify(source)};`
            : `import { ${entry.name} as Implementation } from ${JSON.stringify(source)};`;
    return `/* kumite artifact preview */
import React from 'react';
import { createRoot } from 'react-dom/client';
import '@/index.css';
${importLine}
function Handshake() {
    React.useEffect(() => window.__kumitePreview?.post('mounted'), []);
    return null;
}
class Boundary extends React.Component {
    state = { error: null };
    static getDerivedStateFromError(error) { return { error: error?.message || 'Preview crashed.' }; }
    componentDidCatch(error) { window.__kumitePreview?.post('error', error?.message || 'Preview crashed.'); }
    render() {
        return this.state.error
            ? <pre className="whitespace-pre-wrap p-5 text-sm text-red-600">{this.state.error}</pre>
            : this.props.children;
    }
}
function Preview() {
    return <React.StrictMode><Boundary><Handshake /><Implementation /></Boundary></React.StrictMode>;
}
createRoot(document.getElementById('root')!).render(<Preview />);
void ${JSON.stringify(sessionId)};
`;
}

export class ArtifactCatalogPreviewServer {
    private readonly runtime = new PreviewRuntimeManager();
    private readonly ownerArtifacts = new Map<string, Set<string>>();
    private readonly ownerStores = new Map<string, string>();
    private readonly ownerControllers = new Map<string, Set<AbortController>>();
    private readonly ownerTasks = new Map<string, Set<Promise<ArtifactCatalogPreviewResult>>>();
    private dependencyChain: Promise<void> = Promise.resolve();

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
        const tasks = this.ownerTasks.get(ownerId) ?? new Set<Promise<ArtifactCatalogPreviewResult>>();
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
        },
    ): Promise<ArtifactCatalogPreviewResult> {
        const urls: Record<string, string> = {};
        const sessions: Record<string, string> = {};
        const sources: Record<string, 'artifact'> = {};
        const errors: Record<string, string> = {};
        const artifacts: ImplementationArtifact[] = [];
        await Promise.all(
            requests.map(async (request) => {
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
                    const resolved = await implementationResolutionService.resolve(
                        request,
                        options.signal,
                    );
                    artifacts.push(resolved.artifact);
                } catch (error) {
                    errors[request.name] = error instanceof Error ? error.message : String(error);
                }
            }),
        );
        const manifests = new Map<string, { directory: string; manifest: ImplementationMaterializationManifest }>();
        let log = '';

        for (const artifact of artifacts) {
            const key = `${artifact.provider}:${artifact.metadata.name}`;
            try {
                abortIfRequested(options.signal);
                await storeImplementationArtifact(artifact, options.storeRoot);
                await setImplementationArtifactReference(
                    artifact.integrity.artifactHash,
                    `preview:${ownerId}:${artifact.integrity.artifactHash}`,
                    true,
                    options.storeRoot,
                );
                const owner = this.ownerArtifacts.get(ownerId) ?? new Set<string>();
                owner.add(artifact.integrity.artifactHash);
                this.ownerArtifacts.set(ownerId, owner);
                const cached = await ensureMaterialization(artifact, workspaceRoot, options.signal);
                mergeMaterialization(workspaceRoot, cached.directory, cached.manifest);
                manifests.set(key, cached);
            } catch (error) {
                errors[artifact.metadata.name] =
                    error instanceof Error ? error.message : String(error);
            }
        }

        const readyArtifacts = artifacts.filter((artifact) =>
            manifests.has(`${artifact.provider}:${artifact.metadata.name}`),
        );
        if (readyArtifacts.length === 0) {
            const firstError = Object.values(errors)[0] ?? 'No implementation artifacts were ready.';
            return { urls, sessions, sources, errors, error: firstError, log: null };
        }

        try {
            writeViteAliases(workspaceRoot);
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
                errors[artifact.metadata.name] = message;
            }
            return { urls, sessions, sources, errors, error: message, log: null };
        }

        const entries = readyArtifacts.flatMap((artifact) => {
            try {
                const sessionId = stableSessionId(
                    workspaceRoot,
                    `${ownerId}:${artifact.id}:${artifact.integrity.artifactHash}`,
                    'implementation-catalog',
                );
                const entryId = safeEntryId(artifact.metadata.name);
                return [
                    {
                        sessionId,
                        entryId,
                        html: buildCatalogHtml(artifact.metadata.name, sessionId, entryId),
                        source: buildArtifactPreviewModule(artifact, sessionId),
                    },
                ];
            } catch (error) {
                errors[artifact.metadata.name] =
                    error instanceof Error ? error.message : String(error);
                return [];
            }
        });
        if (entries.length === 0) {
            const firstError = Object.values(errors)[0] ?? 'No artifact entry points were renderable.';
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
        for (const [index, artifact] of readyArtifacts.filter((value) =>
            entries.some((entry) => entry.entryId === safeEntryId(value.metadata.name)),
        ).entries()) {
            const entry = entries[index];
            const url = result.urls[entry.sessionId];
            if (!url) {
                continue;
            }
            urls[artifact.metadata.name] = url;
            sessions[artifact.metadata.name] = entry.sessionId;
            sources[artifact.metadata.name] = 'artifact';
        }
        return {
            urls,
            sessions,
            sources,
            errors,
            error: Object.keys(errors).length > 0 ? 'Some artifact previews could not be prepared.' : null,
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
        if (!artifacts) {
            this.ownerStores.delete(ownerId);
            return;
        }
        const storeRoot = this.ownerStores.get(ownerId);
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
    }

    async stop(): Promise<void> {
        await this.runtime.stopAll();
        for (const ownerId of [...this.ownerArtifacts.keys()]) {
            await this.releaseOwner(ownerId);
        }
    }
}

export const artifactCatalogPreviewServer = new ArtifactCatalogPreviewServer();
