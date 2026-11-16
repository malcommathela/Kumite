import { createHash } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import type { ImplementationArtifact, PackageManager } from '@kumite/models';
import { ImplementationArtifactSchema } from '@kumite/models';
import { Project } from 'ts-morph';
import { hashImplementationArtifact, hashImplementationSource } from './source-resolver';

export type InsertionFileAction = 'add' | 'reuse' | 'conflict';

export interface PreparedInsertionFile {
    sourcePath: string;
    destinationPath: string;
    sha256: string;
    action: InsertionFileAction;
}

export interface PreparedInsertionDependency {
    name: string;
    requestedVersion?: string;
    versionSource: 'registry' | 'unspecified';
    installedVersion?: string;
    action: 'present' | 'install';
    compatible: boolean | 'unknown';
}

export interface ImplementationInsertionPreparation {
    artifact: {
        id: string;
        provider: ImplementationArtifact['provider'];
        version?: string;
        commit?: string;
        sourceHash: string;
        artifactHash: string;
        entryPoint: string;
        kind: ImplementationArtifact['metadata']['type'];
    };
    project: {
        root: string;
        framework: 'vite' | 'next' | 'react' | 'unknown';
        packageManager: PackageManager | null;
        componentsAlias: string | null;
        uiAlias: string | null;
        tsconfigPath: string | null;
        tailwindConfigPath: string | null;
        stylesheetPath: string | null;
        compatible: boolean;
    };
    files: PreparedInsertionFile[];
    filesToAdd: string[];
    existingFiles: string[];
    conflicts: string[];
    dependencies: PreparedInsertionDependency[];
    dependenciesToInstall: string[];
    configurationChanges: string[];
    assetPaths: Array<{
        sourcePath: string;
        destinationPath: string | null;
        external: boolean;
        sha256?: string;
    }>;
    entryImport: {
        source: string;
        export: { kind: 'default' } | { kind: 'named'; name: string } | null;
    };
    requiredProviders: string[];
    warnings: string[];
    unsupportedRequirements: string[];
}

function readJson(filePath: string): Record<string, any> | null {
    try {
        return JSON.parse(fs.readFileSync(filePath, 'utf8')) as Record<string, any>;
    } catch {
        return null;
    }
}

function sha256(content: string | Buffer): string {
    return createHash('sha256').update(content).digest('hex');
}

function packageManager(root: string): PackageManager | null {
    if (fs.existsSync(path.join(root, 'bun.lock')) || fs.existsSync(path.join(root, 'bun.lockb'))) {
        return 'bun';
    }
    if (fs.existsSync(path.join(root, 'pnpm-lock.yaml'))) {
        return 'pnpm';
    }
    if (fs.existsSync(path.join(root, 'yarn.lock'))) {
        return 'yarn';
    }
    if (fs.existsSync(path.join(root, 'package-lock.json'))) {
        return 'npm';
    }
    return null;
}

function findConfig(root: string, names: string[]): string | null {
    return names.map((name) => path.join(root, name)).find((file) => fs.existsSync(file)) ?? null;
}

function resolveProjectAliasRoot(
    root: string,
    tsconfigPath: string | null,
    componentsJson: Record<string, any> | null,
): string {
    const config = tsconfigPath ? readJson(tsconfigPath) : null;
    const paths = config?.compilerOptions?.paths as Record<string, string[]> | undefined;
    const atPath = paths?.['@/*']?.[0] ?? paths?.['~/*']?.[0];
    if (atPath?.includes('*')) {
        return path.resolve(path.dirname(tsconfigPath!), atPath.replace(/\*.*$/, ''));
    }
    const componentsAlias = componentsJson?.aliases?.components;
    if (typeof componentsAlias === 'string' && componentsAlias.startsWith('@/')) {
        return path.resolve(root, 'src');
    }
    return fs.existsSync(path.join(root, 'src')) ? path.join(root, 'src') : root;
}

function detectFramework(manifest: Record<string, any>): 'vite' | 'next' | 'react' | 'unknown' {
    const all = { ...manifest.dependencies, ...manifest.devDependencies };
    if (all.next) {
        return 'next';
    }
    if (all.vite) {
        return 'vite';
    }
    if (all.react) {
        return 'react';
    }
    return 'unknown';
}

function installedPackage(root: string, name: string): string | undefined {
    try {
        const packagePath = path.join(root, 'node_modules', ...name.split('/'), 'package.json');
        return readJson(packagePath)?.version;
    } catch {
        return undefined;
    }
}

function destinationFor(root: string, aliasRoot: string, sourcePath: string): string {
    if (
        !sourcePath ||
        sourcePath.includes('\0') ||
        sourcePath.includes('\\') ||
        sourcePath.startsWith('/') ||
        path.posix.isAbsolute(sourcePath) ||
        path.win32.isAbsolute(sourcePath) ||
        /^[a-zA-Z]:/.test(sourcePath) ||
        sourcePath.split('/').some((segment) => segment === '' || segment === '.' || segment === '..')
    ) {
        throw new Error(`Artifact source path is unsafe: ${sourcePath}`);
    }
    const destination = path.resolve(aliasRoot, sourcePath);
    const relative = path.relative(aliasRoot, destination);
    if (relative.startsWith('..') || path.isAbsolute(relative)) {
        throw new Error(`Artifact source path escapes its source root: ${sourcePath}`);
    }
    const projectRelative = path.relative(root, destination);
    if (projectRelative.startsWith('..') || path.isAbsolute(projectRelative)) {
        throw new Error(`Artifact source path escapes the project: ${sourcePath}`);
    }
    return destination;
}

function formatImportSpecifier(root: string, sourceRoot: string, entryPoint: string): string {
    const absolute = path.resolve(sourceRoot, entryPoint);
    const relative = path.relative(root, absolute).split(path.sep).join('/');
    const withoutExtension = relative.replace(/\.(tsx|jsx|ts|js)$/, '');
    return `./${withoutExtension}`;
}

/**
 * Read-only project analysis. It deliberately does not install dependencies,
 * edit configuration, create files, or choose overwrite behavior.
 */
export function prepareImplementationInsertion(
    artifactValue: ImplementationArtifact,
    projectRoot: string,
): ImplementationInsertionPreparation {
    const artifact = ImplementationArtifactSchema.parse(artifactValue);
    if (
        hashImplementationSource(artifact) !== artifact.integrity.sourceHash ||
        hashImplementationArtifact(artifact) !== artifact.integrity.artifactHash
    ) {
        throw new Error('Cannot prepare insertion: implementation artifact integrity failed.');
    }
    const root = path.resolve(projectRoot);
    const packageJsonPath = path.join(root, 'package.json');
    const manifest = readJson(packageJsonPath);
    if (!manifest) {
        throw new Error('Cannot prepare insertion: project package.json is missing or invalid.');
    }
    const componentsJsonPath = path.join(root, 'components.json');
    const componentsJson = readJson(componentsJsonPath);
    const tsconfigPath = findConfig(root, ['tsconfig.json', 'jsconfig.json']);
    const tailwindConfigPath = findConfig(root, [
        'tailwind.config.ts',
        'tailwind.config.js',
        'tailwind.config.cjs',
        'tailwind.config.mjs',
    ]);
    const stylesheet = componentsJson?.tailwind?.css;
    const stylesheetPath =
        typeof stylesheet === 'string' && fs.existsSync(path.resolve(root, stylesheet))
            ? path.resolve(root, stylesheet)
            : null;
    const framework = detectFramework(manifest);
    const hasReact = Boolean(manifest.dependencies?.react || manifest.devDependencies?.react);
    const aliasRoot = resolveProjectAliasRoot(root, tsconfigPath, componentsJson);
    const files = artifact.files.map((file) => {
        const destinationPath = destinationFor(root, aliasRoot, file.path);
        let action: InsertionFileAction = 'add';
        if (fs.existsSync(destinationPath)) {
            action =
                fs.statSync(destinationPath).isFile() &&
                sha256(fs.readFileSync(destinationPath)) === file.sha256
                    ? 'reuse'
                    : 'conflict';
        }
        return {
            sourcePath: file.path,
            destinationPath,
            sha256: file.sha256,
            action,
        };
    });
    const dependencies = artifact.dependencies.map((dependency) => {
        const installedVersion = installedPackage(root, dependency.name);
        const declaredVersion =
            manifest.dependencies?.[dependency.name] ??
            manifest.devDependencies?.[dependency.name];
        const versionSource = dependency.versionSource ?? (dependency.version ? 'registry' : 'unspecified');
        const compatible: boolean | 'unknown' =
            !installedVersion || !dependency.version
                ? 'unknown'
                : installedVersion === dependency.version
                  ? true
                  : declaredVersion === dependency.version
                    ? true
                    : 'unknown';
        return {
            name: dependency.name,
            ...(dependency.version ? { requestedVersion: dependency.version } : {}),
            versionSource,
            ...(installedVersion ? { installedVersion } : {}),
            action: installedVersion ? ('present' as const) : ('install' as const),
            compatible,
        };
    });
    const localAssets = artifact.assets.map((asset) => {
        const destinationPath = asset.external
            ? null
            : destinationFor(root, aliasRoot, asset.path);
        return {
            sourcePath: asset.path,
            destinationPath,
            external: asset.external,
            ...(asset.sha256 ? { sha256: asset.sha256 } : {}),
        };
    });
    const conflicts = files.filter((file) => file.action === 'conflict').map((file) => file.destinationPath);
    const filesToAdd = files.filter((file) => file.action === 'add').map((file) => file.destinationPath);
    const existingFiles = files.filter((file) => file.action === 'reuse').map((file) => file.destinationPath);
    const configurationChanges: string[] = [];
    const unsupportedRequirements: string[] = [];
    const warnings: string[] = [];
    if (!hasReact) {
        unsupportedRequirements.push('React is not declared by this project.');
    }
    if (framework !== 'vite' && framework !== 'next') {
        unsupportedRequirements.push(
            'Only supported React/Vite and Next/React project configurations can be prepared.',
        );
    }
    if (!tsconfigPath) {
        unsupportedRequirements.push('No tsconfig.json or jsconfig.json was found for source aliases.');
    }
    if (artifact.requirements.configuration.length > 0) {
        configurationChanges.push(...artifact.requirements.configuration);
    }
    if (artifact.requirements.providers.length > 0) {
        unsupportedRequirements.push(...artifact.requirements.providers.map((provider) => `Required provider: ${provider}`));
    }
    if (artifact.assets.some((asset) => asset.external)) {
        warnings.push('The artifact references external assets that will not be downloaded.');
    }
    if (dependencies.some((dependency) => dependency.versionSource === 'unspecified')) {
        warnings.push('Some package versions are unspecified upstream; no version has been selected or installed.');
    }
    if (conflicts.length > 0) {
        warnings.push('Conflicting project files must be resolved explicitly before insertion.');
    }
    const sourceRoot = aliasRoot;
    const entryFile = artifact.files.find((file) => file.path === artifact.entryPoint);
    let entryExport: { kind: 'default' } | { kind: 'named'; name: string } | null = null;
    if (entryFile) {
        const sourceFile = new Project({
            skipAddingFilesFromTsConfig: true,
            useInMemoryFileSystem: true,
        }).createSourceFile('implementation-entry.tsx', entryFile.content);
        const exports = sourceFile.getExportedDeclarations();
        if (exports.has('default')) {
            entryExport = { kind: 'default' };
        } else if (artifact.metadata.type === 'component') {
            const named = [...exports.keys()].filter((name) => /^[A-Z]/.test(name)).sort()[0];
            if (named) {
                entryExport = { kind: 'named', name: named };
            }
        }
    }
    if (!entryExport) {
        unsupportedRequirements.push(
            `Artifact entry point "${artifact.entryPoint}" does not expose a supported ${artifact.metadata.type} export.`,
        );
    }

    return {
        artifact: {
            id: artifact.id,
            provider: artifact.provider,
            ...(artifact.source.version ? { version: artifact.source.version } : {}),
            ...(artifact.source.commit ? { commit: artifact.source.commit } : {}),
            sourceHash: artifact.integrity.sourceHash,
            artifactHash: artifact.integrity.artifactHash,
            entryPoint: artifact.entryPoint,
            kind: artifact.metadata.type,
        },
        project: {
            root,
            framework,
            packageManager: packageManager(root),
            componentsAlias:
                typeof componentsJson?.aliases?.components === 'string'
                    ? componentsJson.aliases.components
                    : null,
            uiAlias:
                typeof componentsJson?.aliases?.ui === 'string' ? componentsJson.aliases.ui : null,
            tsconfigPath,
            tailwindConfigPath,
            stylesheetPath,
            compatible: hasReact && Boolean(tsconfigPath) && unsupportedRequirements.length === 0,
        },
        files,
        filesToAdd,
        existingFiles,
        conflicts,
        dependencies,
        dependenciesToInstall: dependencies
            .filter((dependency) => dependency.action === 'install')
            .map((dependency) => dependency.name),
        configurationChanges,
        assetPaths: localAssets,
        entryImport: {
            source: formatImportSpecifier(root, sourceRoot, artifact.entryPoint),
            export: entryExport,
        },
        requiredProviders: artifact.requirements.providers,
        warnings,
        unsupportedRequirements,
    };
}
