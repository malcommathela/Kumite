import { createHash } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import type { ImplementationArtifact, PackageManager } from '@kumite/models';
import { ImplementationArtifactSchema } from '@kumite/models';
import { Project, SyntaxKind } from 'ts-morph';
import { hashImplementationArtifact, hashImplementationSource } from './source-resolver';
import {
    describeMissingEntryExport,
    findMissingArtifactProviders,
    readEntrySourceFile,
    resolveRuntimeEntryExport,
} from './entry-export';

export type InsertionFileAction = 'add' | 'reuse' | 'conflict';

export interface PreparedInsertionFile {
    sourcePath: string;
    destinationPath: string;
    sha256: string;
    transformedSha256: string;
    content: string;
    transformations: Array<{ kind: 'alias-import'; from: string; to: string }>;
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
        action: 'add' | 'reuse' | 'conflict' | 'external';
    }>;
    entryImport: {
        source: string;
        export: { kind: 'default' } | { kind: 'named'; name: string } | null;
    };
    transformations: Array<{
        sourcePath: string;
        destinationPath: string;
        sourceHash: string;
        transformedHash: string;
        operations: Array<{ kind: 'alias-import'; from: string; to: string }>;
    }>;
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

function packageManagers(root: string): PackageManager[] {
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
    return managers;
}

function packageManager(root: string): PackageManager | null {
    const managers = packageManagers(root);
    return managers.length === 1 ? managers[0] : null;
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

function resolveConfiguredAlias(
    root: string,
    tsconfigPath: string | null,
    alias: string,
    fallbackRoot: string,
): string {
    if (alias.startsWith('@/') || alias.startsWith('~/')) {
        const prefix = alias.startsWith('@/') ? '@/*' : '~/*';
        const config = tsconfigPath ? readJson(tsconfigPath) : null;
        const target = (config?.compilerOptions?.paths as Record<string, string[]> | undefined)?.[
            prefix
        ]?.[0];
        const base = target?.includes('*')
            ? path.resolve(path.dirname(tsconfigPath!), target.replace(/\*.*$/, ''))
            : fallbackRoot;
        return path.resolve(base, alias.slice(2));
    }
    return path.resolve(root, alias);
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
        sourcePath
            .split('/')
            .some((segment) => segment === '' || segment === '.' || segment === '..')
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

function transformSourceFile(
    sourcePath: string,
    content: string,
): {
    content: string;
    operations: Array<{ kind: 'alias-import'; from: string; to: string }>;
} {
    if (!/\.(tsx|jsx|ts|js)$/.test(sourcePath)) {
        return { content, operations: [] };
    }
    const project = new Project({
        skipAddingFilesFromTsConfig: true,
        useInMemoryFileSystem: true,
    });
    const sourceFile = project.createSourceFile('implementation-source.tsx', content);
    const operations: Array<{ kind: 'alias-import'; from: string; to: string }> = [];
    const rewrite = (specifier: string): string => {
        const mappings = [
            ['@/registry/new-york-v4/', 'registry/new-york-v4/'],
            ['~/registry/new-york-v4/', 'registry/new-york-v4/'],
            ['@/components/ui/', 'registry/new-york-v4/ui/'],
            ['~/components/ui/', 'registry/new-york-v4/ui/'],
            ['@/components/', 'registry/new-york-v4/components/'],
            ['~/components/', 'registry/new-york-v4/components/'],
            ['@/assets/', 'registry/new-york-v4/assets/'],
            ['~/assets/', 'registry/new-york-v4/assets/'],
            ['@/hooks/', 'registry/new-york-v4/hooks/'],
            ['~/hooks/', 'registry/new-york-v4/hooks/'],
            ['@/lib/', 'registry/new-york-v4/lib/'],
            ['~/lib/', 'registry/new-york-v4/lib/'],
        ];
        const mapping = mappings.find(([prefix]) => specifier.startsWith(prefix));
        if (!mapping) {
            return specifier;
        }
        const target = `${mapping[1]}${specifier.slice(mapping[0].length)}`;
        const fromDirectory = path.posix.dirname(sourcePath);
        let relative = path.posix.relative(fromDirectory, target);
        if (!relative.startsWith('.')) {
            relative = `./${relative}`;
        }
        operations.push({ kind: 'alias-import', from: specifier, to: relative });
        return relative;
    };
    for (const declaration of [
        ...sourceFile.getImportDeclarations(),
        ...sourceFile.getExportDeclarations(),
    ]) {
        const original = declaration.getModuleSpecifierValue();
        if (original === undefined) {
            continue;
        }
        const updated = rewrite(original);
        if (updated !== original) {
            declaration.setModuleSpecifier(updated);
        }
    }
    for (const call of sourceFile.getDescendantsOfKind(SyntaxKind.CallExpression)) {
        const expression = call.getExpression();
        const isImport = expression.getKind() === SyntaxKind.ImportKeyword;
        const isRequire =
            expression.getKind() === SyntaxKind.Identifier && expression.getText() === 'require';
        const argument = call.getArguments()[0];
        if ((!isImport && !isRequire) || !argument?.isKind(SyntaxKind.StringLiteral)) {
            continue;
        }
        const original = argument.getLiteralValue();
        const updated = rewrite(original);
        if (updated !== original) {
            argument.setLiteralValue(updated);
        }
    }
    return { content: sourceFile.getFullText(), operations };
}

/**
 * Read-only project analysis. It deliberately does not install dependencies,
 * edit configuration, create files, or choose overwrite behavior.
 */
export function prepareImplementationInsertion(
    artifactValue: ImplementationArtifact,
    projectRoot: string,
    options?: {
        /** Verified primary export name (for example the catalog's first `part`). */
        preferredExport?: string;
    },
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
    const componentsAlias =
        typeof componentsJson?.aliases?.components === 'string'
            ? componentsJson.aliases.components
            : '@/components';
    const componentsRoot = resolveConfiguredAlias(root, tsconfigPath, componentsAlias, aliasRoot);
    const namespace = `kumite/${artifact.integrity.artifactHash}`;
    const namespaceRoot = path.join(componentsRoot, namespace);
    const namespaceAliasBase =
        componentsAlias.startsWith('@/') || componentsAlias.startsWith('~/')
            ? componentsAlias
            : '@/components';
    const namespaceAlias = `${namespaceAliasBase}/${namespace}`;
    const tsconfig = tsconfigPath ? readJson(tsconfigPath) : null;
    const configuredPaths = tsconfig?.compilerOptions?.paths as
        Record<string, string[]> | undefined;
    const hasNamespaceAlias =
        componentsAlias.startsWith('@/') && Boolean(configuredPaths?.['@/*']?.length)
            ? true
            : componentsAlias.startsWith('~/') && Boolean(configuredPaths?.['~/*']?.length);
    const files = artifact.files.map((file) => {
        const destinationPath = destinationFor(root, namespaceRoot, file.path);
        const transformed = transformSourceFile(file.path, file.content);
        const transformedSha256 = sha256(transformed.content);
        let action: InsertionFileAction = 'add';
        if (fs.existsSync(destinationPath)) {
            action =
                fs.lstatSync(destinationPath).isFile() &&
                sha256(fs.readFileSync(destinationPath)) === transformedSha256
                    ? 'reuse'
                    : 'conflict';
        }
        return {
            sourcePath: file.path,
            destinationPath,
            sha256: file.sha256,
            transformedSha256,
            content: transformed.content,
            transformations: transformed.operations,
            action,
        };
    });
    const dependencies = artifact.dependencies.map((dependency) => {
        const installedVersion = installedPackage(root, dependency.name);
        const declaredVersion =
            manifest.dependencies?.[dependency.name] ?? manifest.devDependencies?.[dependency.name];
        const versionSource =
            dependency.versionSource ?? (dependency.version ? 'registry' : 'unspecified');
        const compatible: boolean | 'unknown' =
            !installedVersion || !dependency.version
                ? 'unknown'
                : /^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?$/.test(dependency.version)
                  ? installedVersion === dependency.version
                  : declaredVersion === dependency.version
                    ? 'unknown'
                    : 'unknown';
        return {
            name: dependency.name,
            ...(dependency.version ? { requestedVersion: dependency.version } : {}),
            versionSource,
            ...(installedVersion ? { installedVersion } : {}),
            action:
                installedVersion && declaredVersion ? ('present' as const) : ('install' as const),
            compatible,
        };
    });
    const dependenciesToInstall = dependencies
        .filter((dependency) => dependency.action === 'install')
        .map((dependency) => dependency.name);
    const localAssets = artifact.assets.map((asset) => {
        const destinationPath = asset.external
            ? null
            : asset.path.startsWith('public/')
              ? destinationFor(root, root, asset.path)
              : destinationFor(root, namespaceRoot, asset.path);
        const action: 'add' | 'reuse' | 'conflict' | 'external' =
            asset.external || !destinationPath
                ? 'external'
                : !fs.existsSync(destinationPath)
                  ? 'add'
                  : asset.sha256 &&
                      fs.lstatSync(destinationPath).isFile() &&
                      sha256(fs.readFileSync(destinationPath)) === asset.sha256
                    ? 'reuse'
                    : 'conflict';
        return {
            sourcePath: asset.path,
            destinationPath,
            external: asset.external,
            ...(asset.sha256 ? { sha256: asset.sha256 } : {}),
            action,
        };
    });
    const conflicts = [
        ...files.filter((file) => file.action === 'conflict').map((file) => file.destinationPath),
        ...localAssets
            .filter((asset) => asset.action === 'conflict' && asset.destinationPath)
            .map((asset) => asset.destinationPath!),
    ];
    const filesToAdd = files
        .filter((file) => file.action === 'add')
        .map((file) => file.destinationPath);
    const existingFiles = files
        .filter((file) => file.action === 'reuse')
        .map((file) => file.destinationPath);
    const configurationChanges = artifact.requirements.configuration.filter(
        (requirement) => requirement !== 'upstream-example',
    );
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
        unsupportedRequirements.push(
            'No tsconfig.json or jsconfig.json was found for source aliases.',
        );
    } else if (!hasNamespaceAlias) {
        unsupportedRequirements.push(
            'The project has no matching TypeScript path alias for its configured components alias.',
        );
    }
    const packageManagersFound = packageManagers(root);
    if (packageManagersFound.length !== 1) {
        unsupportedRequirements.push(
            packageManagersFound.length === 0
                ? 'No package-manager lockfile was found; insertion requires one to manage approved dependencies safely.'
                : `Conflicting package-manager lockfiles were found (${packageManagersFound.join(', ')}). Keep exactly one before insertion.`,
        );
    }
    if (configurationChanges.length > 0) {
        unsupportedRequirements.push(
            ...configurationChanges.map(
                (requirement) =>
                    `Required project configuration "${requirement}" has no safe automatic writer yet.`,
            ),
        );
    }
    const missingProviders = findMissingArtifactProviders(artifact);
    if (missingProviders.length > 0) {
        unsupportedRequirements.push(
            ...missingProviders.map(
                (provider) =>
                    `Required provider "${provider}" is not present in the artifact entry composition.`,
            ),
        );
    }
    if (artifact.assets.some((asset) => asset.external)) {
        warnings.push('The artifact references external assets that will not be downloaded.');
    }
    if (dependencies.some((dependency) => dependency.versionSource === 'unspecified')) {
        warnings.push(
            'Some package versions are unspecified upstream; no version has been selected or installed.',
        );
    }
    const incompatibleDependencies = dependencies.filter(
        (dependency) => dependency.compatible === false,
    );
    if (incompatibleDependencies.length > 0) {
        unsupportedRequirements.push(
            ...incompatibleDependencies.map(
                (dependency) =>
                    `Installed ${dependency.name}@${dependency.installedVersion} conflicts with required ${dependency.requestedVersion}.`,
            ),
        );
    }
    if (conflicts.length > 0) {
        warnings.push('Conflicting project files must be resolved explicitly before insertion.');
    }
    for (const file of artifact.files) {
        if (
            /\.(?:css|scss|sass)$/.test(file.path) &&
            /(?:@import|@use|url\()\s*['"(]?[~@]\//.test(file.content)
        ) {
            unsupportedRequirements.push(
                `Stylesheet alias transformation is not supported for "${file.path}".`,
            );
        }
    }
    const entryFile = artifact.files.find((file) => file.path === artifact.entryPoint);
    let entryExport: { kind: 'default' } | { kind: 'named'; name: string } | null = null;
    if (entryFile) {
        const sourceFile = readEntrySourceFile(entryFile.content);
        entryExport = resolveRuntimeEntryExport(sourceFile, artifact, options?.preferredExport);
    }
    if (!entryExport) {
        unsupportedRequirements.push(
            describeMissingEntryExport(artifact.entryPoint, artifact.metadata.type),
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
        dependenciesToInstall,
        configurationChanges,
        assetPaths: localAssets,
        entryImport: {
            source: `${namespaceAlias}/${artifact.entryPoint.replace(/\.(tsx|jsx|ts|js)$/, '')}`,
            export: entryExport,
        },
        transformations: files.map((file) => ({
            sourcePath: file.sourcePath,
            destinationPath: file.destinationPath,
            sourceHash: file.sha256,
            transformedHash: file.transformedSha256,
            operations: file.transformations,
        })),
        requiredProviders: artifact.requirements.providers,
        warnings,
        unsupportedRequirements,
    };
}
