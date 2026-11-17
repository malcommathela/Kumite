import { createHash, randomUUID } from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import type { ImplementationArtifact, ImplementationRequest, PackageManager } from '@kumite/models';
import { implementationResolutionService } from './implementation-service';
import { prepareImplementationInsertion } from './insertion-preparation';
import { materializeImplementationArtifact } from './implementation-materializer';

const PLAN_TTL_MS = 10 * 60 * 1000;
const plans = new Map<
    string,
    {
        expiresAt: number;
        projectRoot: string;
        artifact: Awaited<ReturnType<typeof implementationResolutionService.resolve>>['artifact'];
        preparation: ReturnType<typeof prepareImplementationInsertion>;
        dependencyVersions: Record<string, string>;
        dependencyProvenance: Record<string, string>;
        dependencyLifecycleScripts: Record<string, string[] | null>;
        editorTarget?: { oid: string; domId: string; webviewId: string };
        planHash: string;
    }
>();
const activeInsertions = new Map<string, AbortController>();

function hash(value: string | Buffer): string {
    return createHash('sha256').update(value).digest('hex');
}

function packageManager(root: string): PackageManager {
    const managers: PackageManager[] = [];
    if (fs.existsSync(path.join(root, 'bun.lock')) || fs.existsSync(path.join(root, 'bun.lockb'))) {
        managers.push('bun');
    }
    if (fs.existsSync(path.join(root, 'pnpm-lock.yaml'))) {
        managers.push('pnpm');
    }
    if (fs.existsSync(path.join(root, 'yarn.lock'))) {
        managers.push('yarn');
    }
    if (fs.existsSync(path.join(root, 'package-lock.json'))) {
        managers.push('npm');
    }
    if (managers.length !== 1) {
        throw new Error(
            managers.length
                ? `Conflicting package-manager lockfiles were found (${managers.join(', ')}). Keep exactly one.`
                : 'A package-manager lockfile is required for safe artifact insertion.',
        );
    }
    return managers[0];
}

function lockfilesForApproval(
    root: string,
    manager: PackageManager | null,
    hasInstall: boolean,
): string[] {
    if (!hasInstall || !manager) {return [];}
    const lockfile = manager === 'npm'
        ? 'package-lock.json'
        : manager === 'pnpm'
          ? 'pnpm-lock.yaml'
          : manager === 'yarn'
            ? 'yarn.lock'
            : fs.existsSync(path.join(root, 'bun.lockb')) && !fs.existsSync(path.join(root, 'bun.lock'))
              ? 'bun.lockb'
              : 'bun.lock';
    return ['package.json', lockfile];
}

function installedPackageVersion(root: string, name: string): string | undefined {
    try {
        const manifest = JSON.parse(
            fs.readFileSync(
                path.join(root, 'node_modules', ...name.split('/'), 'package.json'),
                'utf8',
            ),
        ) as { version?: string };
        return manifest.version;
    } catch {
        return undefined;
    }
}

async function resolveExactVersion(name: string): Promise<string> {
    const response = await fetch(`https://registry.npmjs.org/${encodeURIComponent(name)}`);
    if (!response.ok) {
        throw new Error(
            `Could not resolve an exact version for "${name}" (HTTP ${response.status}).`,
        );
    }
    const metadata = (await response.json()) as { 'dist-tags'?: { latest?: string } };
    const version = metadata['dist-tags']?.latest;
    if (!version || !/^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?$/.test(version)) {
        throw new Error(`npm returned no exact version for "${name}".`);
    }
    return version;
}

async function packageLifecycleScripts(
    projectRoot: string,
    name: string,
    version: string,
): Promise<string[] | null> {
    try {
        const installed = JSON.parse(
            fs.readFileSync(
                path.join(projectRoot, 'node_modules', ...name.split('/'), 'package.json'),
                'utf8',
            ),
        ) as { version?: string; scripts?: Record<string, string> };
        if (installed.version === version) {
            return ['preinstall', 'install', 'postinstall', 'prepare'].filter(
                (script) => Boolean(installed.scripts?.[script]),
            );
        }
    } catch {
        // Query the exact upstream manifest for a package not currently installed.
    }
    try {
        const response = await fetch(
            `https://registry.npmjs.org/${encodeURIComponent(name)}/${version}`,
        );
        if (!response.ok) {return null;}
        const metadata = (await response.json()) as { scripts?: Record<string, string> };
        return ['preinstall', 'install', 'postinstall', 'prepare'].filter(
            (script) => Boolean(metadata.scripts?.[script]),
        );
    } catch {
        return null;
    }
}

function writeJsonAtomic(file: string, value: unknown): void {
    const temporary = `${file}.${randomUUID()}.tmp`;
    fs.writeFileSync(temporary, `${JSON.stringify(value, null, 2)}\n`, { flag: 'wx' });
    fs.renameSync(temporary, file);
}

function pathInside(root: string, file: string): boolean {
    const relative = path.relative(root, file);
    return relative !== '' && !relative.startsWith('..') && !path.isAbsolute(relative);
}

function validateDestination(root: string, destination: string): void {
    if (!pathInside(root, destination)) {
        throw new Error(`Insertion destination is outside the target project: ${destination}`);
    }
    if (fs.existsSync(destination) && fs.lstatSync(destination).isSymbolicLink()) {
        throw new Error(
            `Insertion destination is a symlink; resolve it before insertion: ${destination}`,
        );
    }
    let cursor = path.dirname(destination);
    while (pathInside(root, cursor)) {
        if (fs.existsSync(cursor)) {
            const real = fs.realpathSync(cursor);
            if (!pathInside(root, real)) {
                throw new Error(
                    `Insertion destination traverses a symlink outside the project: ${cursor}`,
                );
            }
        }
        cursor = path.dirname(cursor);
    }
}

function safePackageName(name: string): boolean {
    return /^(?:@[a-z0-9][a-z0-9._-]*\/)?[a-z0-9][a-z0-9._-]*$/i.test(name);
}

async function prepareProjectSnapshot(
    artifact: ImplementationArtifact,
    projectRoot: string,
    signal?: AbortSignal,
) {
    const preparation = prepareImplementationInsertion(artifact, projectRoot);
    const assetPreflightRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'kumite-insertion-assets-'));
    const assetPreflight = path.join(assetPreflightRoot, 'materialization');
    try {
        const materialized = await materializeImplementationArtifact(
            artifact,
            assetPreflight,
            { signal },
        );
        for (const asset of preparation.assetPaths) {
            if (asset.external || !asset.destinationPath) {
                continue;
            }
            const verified = materialized.assets.find(
                (item) => item.sourcePath === asset.sourcePath,
            );
            if (!verified) {
                throw new Error(`Could not verify required local asset "${asset.sourcePath}".`);
            }
            asset.sha256 = verified.sha256;
            asset.action = !fs.existsSync(asset.destinationPath)
                ? 'add'
                : fs.lstatSync(asset.destinationPath).isFile() &&
                    hash(fs.readFileSync(asset.destinationPath)) === verified.sha256
                  ? 'reuse'
                  : 'conflict';
        }
    } finally {
        fs.rmSync(assetPreflightRoot, { recursive: true, force: true });
    }
    preparation.conflicts = [
        ...preparation.files
            .filter((file) => file.action === 'conflict')
            .map((file) => file.destinationPath),
        ...preparation.assetPaths
            .filter((asset) => asset.action === 'conflict' && asset.destinationPath)
            .map((asset) => asset.destinationPath!),
    ];
    for (const file of preparation.files) {
        validateDestination(projectRoot, file.destinationPath);
    }
    for (const asset of preparation.assetPaths) {
        if (asset.destinationPath) {
            validateDestination(projectRoot, asset.destinationPath);
        }
    }
    return preparation;
}

function abortIfCancelled(signal: AbortSignal): void {
    if (signal.aborted) {
        throw new Error('Artifact insertion was cancelled.');
    }
}

export function cancelArtifactInsertion(planId: string): boolean {
    const active = activeInsertions.get(planId);
    if (active) {
        active.abort('Insertion cancelled by the user.');
        return true;
    }
    return plans.delete(planId);
}

function planIdentity(
    artifactHash: string,
    root: string,
    preparation: ReturnType<typeof prepareImplementationInsertion>,
    dependencyVersions: Record<string, string>,
    dependencyProvenance: Record<string, string>,
    dependencyLifecycleScripts: Record<string, string[] | null>,
    editorTarget?: { oid: string; domId: string; webviewId: string },
): string {
    return hash(
        JSON.stringify({
            artifactHash,
            root,
            project: preparation.project,
            files: preparation.files.map(
                ({ sourcePath, destinationPath, sha256, transformedSha256, action }) => ({
                    sourcePath,
                    destinationPath,
                    sha256,
                    transformedSha256,
                    action,
                }),
            ),
            assets: preparation.assetPaths,
            conflicts: preparation.conflicts,
            dependencies: preparation.dependencies,
            selectedVersions: dependencyVersions,
            dependencyProvenance,
            dependencyLifecycleScripts,
            providers: preparation.requiredProviders,
            configuration: preparation.configurationChanges,
            unsupported: preparation.unsupportedRequirements,
            warnings: preparation.warnings,
            entryImport: preparation.entryImport,
            editorTarget,
        }),
    );
}

function resolvePlanWarnings(preparation: ReturnType<typeof prepareImplementationInsertion>): void {
    preparation.warnings = preparation.warnings.map((warning) =>
        warning ===
        'Some package versions are unspecified upstream; no version has been selected or installed.'
            ? 'Unspecified upstream package versions were resolved to exact versions shown in this approval plan.'
            : warning,
    );
}

export async function prepareArtifactInsertion(
    request: ImplementationRequest,
    projectPath: string,
    editorTarget?: { oid: string; domId: string; webviewId: string },
) {
    if (
        !request ||
        request.provider !== 'shadcn' ||
        !['component', 'example', 'block'].includes(request.kind) ||
        !/^[a-z0-9][a-z0-9-]*$/i.test(request.name)
    ) {
        throw new Error('Invalid or unsupported implementation request.');
    }
    const result = await implementationResolutionService.resolve(request);
    return prepareArtifactValueInsertion(result.artifact, projectPath, editorTarget);
}

export async function prepareArtifactValueInsertion(
    artifact: ImplementationArtifact,
    projectPath: string,
    editorTarget?: { oid: string; domId: string; webviewId: string },
) {
    const projectRoot = fs.realpathSync(path.resolve(projectPath));
    if (
        !fs.statSync(projectRoot).isDirectory() ||
        !fs.existsSync(path.join(projectRoot, 'package.json'))
    ) {
        throw new Error('The target project root is invalid or has no package.json.');
    }
    const preparation = await prepareProjectSnapshot(artifact, projectRoot);
    if (
        preparation.project.packageManager &&
        preparation.project.packageManager !== packageManager(projectRoot)
    ) {
        throw new Error('The project package manager changed during preparation; retry insertion.');
    }
    const exactVersions: Record<string, string> = {};
    const dependencyProvenance: Record<string, string> = {};
    for (const dependency of preparation.dependencies) {
        if (!safePackageName(dependency.name)) {
            throw new Error(`Artifact contains an unsafe npm package name: "${dependency.name}".`);
        }
        const installed = dependency.installedVersion;
        const requestedVersion = dependency.requestedVersion;
        if (requestedVersion && /^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?$/.test(requestedVersion)) {
            exactVersions[dependency.name] = requestedVersion;
            dependencyProvenance[dependency.name] = 'exact version pinned by the shadcn registry';
        } else if (installed) {
            exactVersions[dependency.name] = installed;
            dependencyProvenance[dependency.name] = 'existing installed project version';
        } else {
            exactVersions[dependency.name] = await resolveExactVersion(dependency.name);
            dependencyProvenance[dependency.name] =
                'npm dist-tags.latest resolved to an exact version during preparation';
        }
    }
    resolvePlanWarnings(preparation);
    const dependencyLifecycleScripts: Record<string, string[] | null> = {};
    for (const [name, version] of Object.entries(exactVersions)) {
        dependencyLifecycleScripts[name] = await packageLifecycleScripts(
            projectRoot,
            name,
            version,
        );
    }
    for (const dependency of preparation.dependencies.filter((item) => item.action === 'install')) {
        const scripts = dependencyLifecycleScripts[dependency.name];
        if (scripts === null) {
            preparation.unsupportedRequirements.push(
                `Could not verify lifecycle scripts for ${dependency.name}@${exactVersions[dependency.name]}; installation is blocked.`,
            );
        } else if (scripts.length > 0) {
            preparation.unsupportedRequirements.push(
                `${dependency.name}@${exactVersions[dependency.name]} declares lifecycle scripts (${scripts.join(', ')}). Kumite disables package scripts; this dependency cannot be installed safely yet.`,
            );
        }
    }
    const id = randomUUID();
    const planHash = planIdentity(
        artifact.integrity.artifactHash,
        projectRoot,
        preparation,
        exactVersions,
        dependencyProvenance,
        dependencyLifecycleScripts,
        editorTarget,
    );
    plans.set(id, {
        expiresAt: Date.now() + PLAN_TTL_MS,
        projectRoot,
        artifact,
        preparation,
        dependencyVersions: exactVersions,
        dependencyProvenance,
        dependencyLifecycleScripts,
        editorTarget,
        planHash,
    });
    for (const [key, value] of plans) {
        if (value.expiresAt <= Date.now()) {
            plans.delete(key);
        }
    }
    while (plans.size > 100) {
        plans.delete(plans.keys().next().value!);
    }
    return {
        planId: id,
        planHash,
        artifact: {
            id: artifact.id,
            provider: artifact.provider,
            sourceHash: artifact.integrity.sourceHash,
            artifactHash: artifact.integrity.artifactHash,
            entryPoint: artifact.entryPoint,
            demo: artifact.demo,
        },
        project: preparation.project,
        editorTarget,
        filesToCreate: preparation.files
            .filter((file) => file.action === 'add')
            .map((file) => ({
                path: file.destinationPath,
                sourceHash: file.sha256,
                publishedHash: file.transformedSha256,
                transformations: file.transformations,
            })),
        reusedFiles: preparation.existingFiles,
        conflicts: preparation.conflicts,
        dependencies: preparation.dependencies.map((dependency) => ({
            name: dependency.name,
            version: exactVersions[dependency.name],
            action: dependency.action,
            provenance: dependencyProvenance[dependency.name],
            lifecycleScripts: dependencyLifecycleScripts[dependency.name],
        })),
        lockfilesToChange: lockfilesForApproval(
            projectRoot,
            preparation.project.packageManager,
            preparation.dependencies.some((dependency) => dependency.action === 'install'),
        ),
        transitiveDependencyNote:
            preparation.dependencies.some((dependency) => dependency.action === 'install')
                ? 'The package manager will resolve transitive dependencies and pin their exact versions in the listed lockfile; the transitive diff is not enumerated before installation.'
                : 'No package installation is planned.',
        assets: preparation.assetPaths,
        providers: preparation.requiredProviders,
        configurationChanges: preparation.configurationChanges,
        warnings: preparation.warnings,
        unsupportedRequirements: preparation.unsupportedRequirements,
        entryImport: preparation.entryImport,
    };
}

export function getArtifactInsertionApprovalDetails(planId: string, planHash: string) {
    const prepared = plans.get(planId);
    if (!prepared || prepared.expiresAt <= Date.now() || prepared.planHash !== planHash) {
        throw new Error('The insertion approval plan is missing, expired, or changed.');
    }
    return {
        artifactId: prepared.artifact.id,
        artifactHash: prepared.artifact.integrity.artifactHash,
        projectRoot: prepared.projectRoot,
        editorTarget: prepared.editorTarget,
        framework: prepared.preparation.project.framework,
        packageManager: prepared.preparation.project.packageManager,
        aliases: {
            components: prepared.preparation.project.componentsAlias,
            ui: prepared.preparation.project.uiAlias,
        },
        files: prepared.preparation.files
            .filter((file) => file.action === 'add')
            .map((file) => ({
                path: file.destinationPath,
                sourceHash: file.sha256,
                publishedHash: file.transformedSha256,
                transformations: file.transformations,
            })),
        assets: prepared.preparation.assetPaths
            .filter((asset) => asset.action === 'add')
            .map((asset) => ({
                path: asset.destinationPath,
                sha256: asset.sha256,
            })),
        dependencies: Object.entries(prepared.dependencyVersions).map(([name, version]) => ({
            name,
            version,
            action: prepared.preparation.dependencies.find((item) => item.name === name)?.action,
            provenance: prepared.dependencyProvenance[name],
            lifecycleScripts: prepared.dependencyLifecycleScripts[name],
        })),
        lockfilesToChange: lockfilesForApproval(
            prepared.projectRoot,
            prepared.preparation.project.packageManager,
            prepared.preparation.dependencies.some((dependency) => dependency.action === 'install'),
        ),
        transitiveDependencyNote:
            prepared.preparation.dependencies.some((dependency) => dependency.action === 'install')
                ? 'The package manager will resolve transitive dependencies and pin their exact versions in the listed lockfile; the transitive diff is not enumerated before installation.'
                : 'No package installation is planned.',
        providers: prepared.preparation.requiredProviders,
        configurationChanges: prepared.preparation.configurationChanges,
        conflicts: prepared.preparation.conflicts,
        unsupportedRequirements: prepared.preparation.unsupportedRequirements,
    };
}

interface OperationJournal {
    schemaVersion: 1;
    operationId: string;
    projectRoot: string;
    artifactId: string;
    artifactSourceHash: string;
    artifactHash: string;
    source: ImplementationArtifact['source'];
    planHash: string;
    state:
        | 'installing'
        | 'publishing'
        | 'awaiting-editor'
        | 'committed'
        | 'rolled-back'
        | 'recovery-required';
    files: Array<{
        path: string;
        hash: string;
        sourceHash?: string;
        transformations?: Array<{ kind: 'alias-import'; from: string; to: string }>;
    }>;
    createdFiles: Array<{ path: string; hash: string }>;
    originalPackageFiles: Record<string, string | null>;
    installedPackageFiles: Record<string, string>;
    dependencyVersions: Record<string, string>;
    dependencyProvenance: Record<string, string>;
    dependencyLifecycleScripts: Record<string, string[] | null>;
    packageManager: PackageManager;
    dependencyInstallAttempted: boolean;
    error?: string;
}

function journalPath(root: string, id: string): string {
    return path.join(root, '.kumite', 'operations', `${id}.json`);
}

function commitStagedFile(
    root: string,
    staged: string,
    destination: string,
    expectedHash: string,
): void {
    fs.mkdirSync(path.dirname(destination), { recursive: true });
    validateDestination(root, destination);
    try {
        fs.linkSync(staged, destination);
    } catch (error) {
        if ((error as NodeJS.ErrnoException).code === 'EEXIST') {
            throw new Error(
                `Destination appeared after approval; refusing to overwrite ${destination}.`,
            );
        }
        throw error;
    }
    if (hash(fs.readFileSync(destination)) !== expectedHash) {
        fs.rmSync(destination, { force: true });
        throw new Error(`Published file failed hash verification: ${destination}`);
    }
    fs.rmSync(staged, { force: true });
}

async function rollbackOperation(journal: OperationJournal, filePath: string): Promise<void> {
    const root = journal.projectRoot;
    const recovery: string[] = [];
    for (const file of journal.createdFiles) {
        try {
            if (fs.existsSync(file.path) && hash(fs.readFileSync(file.path)) === file.hash) {
                fs.rmSync(file.path);
            } else if (fs.existsSync(file.path)) {
                recovery.push(`Preserved modified file ${file.path}`);
            }
        } catch (error) {
            recovery.push(`Could not remove ${file.path}: ${String(error)}`);
        }
    }
    for (const [relative, original] of Object.entries(journal.originalPackageFiles)) {
        const file = path.join(root, relative);
        try {
            const currentHash = fs.existsSync(file) ? hash(fs.readFileSync(file)) : null;
            const originalHash = original === null ? null : hash(Buffer.from(original, 'base64'));
            if (currentHash === originalHash) {
                continue;
            }
            if (
                !journal.installedPackageFiles[relative] ||
                currentHash !== journal.installedPackageFiles[relative]
            ) {
                recovery.push(`Preserved package file changed outside this operation: ${file}`);
                continue;
            }
            if (original === null) {
                fs.rmSync(file, { force: true });
            } else {
                fs.mkdirSync(path.dirname(file), { recursive: true });
                fs.writeFileSync(file, Buffer.from(original, 'base64'));
            }
        } catch (error) {
            recovery.push(`Could not restore ${file}: ${String(error)}`);
        }
    }
    for (const planned of journal.files) {
        if (journal.createdFiles.some((created) => created.path === planned.path)) {
            continue;
        }
        if (fs.existsSync(planned.path)) {
            recovery.push(
                `Preserved a destination whose publication ownership is uncertain: ${planned.path}`,
            );
        }
    }
    if (recovery.length === 0 && journal.dependencyInstallAttempted) {
        const { runPackageManagerInstall } = await import('./cli');
        const restore = await runPackageManagerInstall(
            root,
            journal.packageManager,
            undefined,
            undefined,
            true,
        );
        if (!restore.success) {
            recovery.push(`Package installation rollback failed: ${restore.output}`);
        }
    }
    journal.state = recovery.length ? 'recovery-required' : 'rolled-back';
    if (recovery.length) {
        journal.error = recovery.join('\n');
    }
    writeJsonAtomic(filePath, journal);
}

export async function applyArtifactInsertion(planId: string, approvedPlanHash: string) {
    const prepared = plans.get(planId);
    if (!prepared || prepared.expiresAt <= Date.now()) {
        plans.delete(planId);
        throw new Error('The insertion plan expired. Prepare and review it again.');
    }
    if (approvedPlanHash !== prepared.planHash) {
        throw new Error('The approved plan hash does not match the prepared plan.');
    }
    const controller = new AbortController();
    activeInsertions.set(planId, controller);
    try {
    const {
        projectRoot,
        artifact,
        preparation,
        dependencyVersions,
        dependencyProvenance,
        dependencyLifecycleScripts,
    } = prepared;
    if (fs.realpathSync(projectRoot) !== projectRoot) {
        throw new Error('The target project identity changed after approval.');
    }
    const fresh = await prepareProjectSnapshot(artifact, projectRoot, controller.signal);
    abortIfCancelled(controller.signal);
    resolvePlanWarnings(fresh);
    if (
        planIdentity(
            artifact.integrity.artifactHash,
            projectRoot,
            fresh,
            dependencyVersions,
            dependencyProvenance,
            dependencyLifecycleScripts,
            prepared.editorTarget,
        ) !== prepared.planHash
    ) {
        plans.delete(planId);
        throw new Error('The project or insertion plan changed after approval. Review a new plan.');
    }
    if (preparation.conflicts.length || preparation.unsupportedRequirements.length) {
        throw new Error(
            [
                ...preparation.conflicts.map(
                    (file) => `Resolve the existing-file conflict: ${file}`,
                ),
                ...preparation.unsupportedRequirements,
            ].join('\n'),
        );
    }
    const operationId = randomUUID();
    const operationDirectory = path.join(projectRoot, '.kumite', 'operations');
    fs.mkdirSync(operationDirectory, { recursive: true });
    const journalFile = journalPath(projectRoot, operationId);
    const files = preparation.files
        .filter((file) => file.action === 'add')
        .map((file) => ({
            path: file.destinationPath,
            hash: file.transformedSha256,
            sourceHash: file.sha256,
            transformations: file.transformations,
        }));
    const lockfiles = [
        'package.json',
        'package-lock.json',
        'pnpm-lock.yaml',
        'yarn.lock',
        'bun.lock',
        'bun.lockb',
    ];
    const originalPackageFiles = Object.fromEntries(
        lockfiles.map((file) => [
            file,
            fs.existsSync(path.join(projectRoot, file))
                ? fs.readFileSync(path.join(projectRoot, file)).toString('base64')
                : null,
        ]),
    );
    const journal: OperationJournal = {
        schemaVersion: 1,
        operationId,
        projectRoot,
        artifactId: artifact.id,
        artifactSourceHash: artifact.integrity.sourceHash,
        artifactHash: artifact.integrity.artifactHash,
        source: artifact.source,
        planHash: prepared.planHash,
        state: 'installing',
        files,
        createdFiles: [],
        originalPackageFiles,
        installedPackageFiles: {},
        dependencyVersions,
        dependencyProvenance,
        dependencyLifecycleScripts,
        packageManager: preparation.project.packageManager!,
        dependencyInstallAttempted: false,
    };
    writeJsonAtomic(journalFile, journal);

    const staging = path.join(projectRoot, '.kumite', 'staging', operationId);
    try {
        fs.mkdirSync(staging, { recursive: true });
        const install = preparation.dependencies
            .filter((dependency) => dependency.action === 'install')
            .map((dependency) => `${dependency.name}@${dependencyVersions[dependency.name]}`);
        if (install.length) {
            journal.dependencyInstallAttempted = true;
            writeJsonAtomic(journalFile, journal);
            const { runPackageManagerCommand } = await import('./cli');
            const exactFlag =
                preparation.project.packageManager === 'npm' ||
                preparation.project.packageManager === 'pnpm'
                    ? '--save-exact'
                    : '--exact';
            const result = await runPackageManagerCommand(
                projectRoot,
                preparation.project.packageManager!,
                [...install, exactFlag, '--ignore-scripts'],
                undefined,
                controller.signal,
            );
            if (!result.success) {
                throw new Error(`Approved dependency installation failed: ${result.output}`);
            }
            const manifest = JSON.parse(
                fs.readFileSync(path.join(projectRoot, 'package.json'), 'utf8'),
            ) as {
                dependencies?: Record<string, string>;
                devDependencies?: Record<string, string>;
            };
            for (const dependency of preparation.dependencies.filter(
                (item) => item.action === 'install',
            )) {
                const selectedVersion = dependencyVersions[dependency.name];
                const installedVersion = installedPackageVersion(projectRoot, dependency.name);
                const declaredVersion =
                    manifest.dependencies?.[dependency.name] ??
                    manifest.devDependencies?.[dependency.name];
                if (installedVersion !== selectedVersion || declaredVersion !== selectedVersion) {
                    throw new Error(
                        `Package-manager verification failed for ${dependency.name}: requested ${selectedVersion}, installed ${installedVersion ?? 'missing'}, declared ${declaredVersion ?? 'missing'}.`,
                    );
                }
            }
            if (packageManager(projectRoot) !== preparation.project.packageManager) {
                throw new Error('Package-manager lockfile changed during approved installation.');
            }
        }
        for (const relative of lockfiles) {
            const file = path.join(projectRoot, relative);
            if (fs.existsSync(file)) {
                journal.installedPackageFiles[relative] = hash(fs.readFileSync(file));
            }
        }
        journal.state = 'publishing';
        writeJsonAtomic(journalFile, journal);

        const materialized = path.join(staging, 'materialized');
        const materialization = await materializeImplementationArtifact(
            artifact,
            materialized,
            { signal: controller.signal },
        );
        const stagedFiles: Array<{ staged: string; destination: string; hash: string }> = [];
        for (const file of preparation.files.filter((item) => item.action === 'add')) {
            const staged = path.join(staging, 'files', String(stagedFiles.length));
            fs.mkdirSync(path.dirname(staged), { recursive: true });
            fs.writeFileSync(staged, file.content, { flag: 'wx' });
            if (hash(fs.readFileSync(staged)) !== file.transformedSha256) {
                throw new Error(`Staged source failed hash validation: ${file.sourcePath}`);
            }
            stagedFiles.push({
                staged,
                destination: file.destinationPath,
                hash: file.transformedSha256,
            });
        }
        for (const asset of preparation.assetPaths) {
            if (!asset.destinationPath || asset.external || asset.action !== 'add') {
                continue;
            }
            const materializedAsset = materialization.assets.find(
                (item) => item.sourcePath === asset.sourcePath,
            );
            if (!materializedAsset) {
                throw new Error(`Required local asset is missing: ${asset.sourcePath}`);
            }
            const staged = path.join(staging, 'assets', String(stagedFiles.length));
            fs.mkdirSync(path.dirname(staged), { recursive: true });
            fs.copyFileSync(materializedAsset.path, staged, fs.constants.COPYFILE_EXCL);
            const expected = asset.sha256 ?? materializedAsset.sha256;
            if (hash(fs.readFileSync(staged)) !== expected) {
                throw new Error(`Staged asset failed hash validation: ${asset.sourcePath}`);
            }
            stagedFiles.push({ staged, destination: asset.destinationPath, hash: expected });
            journal.files.push({ path: asset.destinationPath, hash: expected });
            writeJsonAtomic(journalFile, journal);
        }
        for (const file of stagedFiles) {
            abortIfCancelled(controller.signal);
            validateDestination(projectRoot, file.destination);
            commitStagedFile(projectRoot, file.staged, file.destination, file.hash);
            journal.createdFiles.push({ path: file.destination, hash: file.hash });
            writeJsonAtomic(journalFile, journal);
        }
        journal.state = 'awaiting-editor';
        writeJsonAtomic(journalFile, journal);
        return {
            operationId,
            artifact: {
                id: artifact.id,
                artifactHash: artifact.integrity.artifactHash,
                entryPoint: artifact.entryPoint,
                sourceHash: artifact.integrity.sourceHash,
            },
            entryImport: preparation.entryImport,
            providerRequirements: preparation.requiredProviders,
        };
    } catch (error) {
        await rollbackOperation(journal, journalFile);
        throw error;
    } finally {
        fs.rmSync(staging, { recursive: true, force: true });
    }
    } finally {
        activeInsertions.delete(planId);
        plans.delete(planId);
    }
}

export async function finishArtifactInsertion(
    projectPath: string,
    operationId: string,
    committed: boolean,
): Promise<void> {
    if (!/^[0-9a-f-]{36}$/i.test(operationId)) {
        throw new Error('Invalid artifact insertion operation id.');
    }
    const root = fs.realpathSync(path.resolve(projectPath));
    const file = journalPath(root, operationId);
    const journal = JSON.parse(fs.readFileSync(file, 'utf8')) as OperationJournal;
    if (
        journal.projectRoot !== root ||
        journal.operationId !== operationId ||
        journal.state !== 'awaiting-editor'
    ) {
        throw new Error('Artifact insertion operation is not awaiting editor completion.');
    }
    if (committed) {
        journal.state = 'committed';
        writeJsonAtomic(file, journal);
    } else {
        await rollbackOperation(journal, file);
    }
}

export async function recoverArtifactInsertions(projectPath: string): Promise<string[]> {
    const root = fs.realpathSync(path.resolve(projectPath));
    const directory = path.join(root, '.kumite', 'operations');
    if (!fs.existsSync(directory)) {
        return [];
    }
    const recovered: string[] = [];
    for (const name of fs
        .readdirSync(directory)
        .filter((item) => /^[0-9a-f-]{36}\.json$/i.test(item))) {
        const file = path.join(directory, name);
        let journal: OperationJournal;
        try {
            journal = JSON.parse(fs.readFileSync(file, 'utf8')) as OperationJournal;
        } catch {
            recovered.push(`Invalid operation journal preserved: ${file}`);
            continue;
        }
        if (
            journal.projectRoot !== root ||
            journal.state === 'committed' ||
            journal.state === 'rolled-back'
        ) {
            continue;
        }
        if (journal.state === 'recovery-required') {
            recovered.push(
                `Operation ${journal.operationId} requires manual recovery: ${journal.error ?? 'state is ambiguous.'}`,
            );
            continue;
        }
        if (journal.state === 'awaiting-editor') {
            recovered.push(
                `Operation ${journal.operationId} remains awaiting editor recovery; published files were preserved.`,
            );
            continue;
        }
        await rollbackOperation(journal, file);
        recovered.push(
            journal.error
                ? `Operation ${journal.operationId} requires recovery: ${journal.error}`
                : `Rolled back interrupted operation ${journal.operationId}.`,
        );
    }
    return recovered;
}
