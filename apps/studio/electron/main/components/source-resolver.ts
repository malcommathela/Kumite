import { createHash } from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { Node, Project, ts } from 'ts-morph';
import {
    ImplementationArtifactSchema,
    type ImplementationArtifact,
    type ImplementationKind,
    type ImplementationRequest,
} from '@kumite/models';
import { COMPONENT_CLI_VERSION } from '@kumite/models';

const UPSTREAM_COMMIT = '1e9e337923aaede7db55b6091cb56a72a661b959';
const RAW_ROOT = `https://raw.githubusercontent.com/shadcn-ui/ui/${UPSTREAM_COMMIT}`;
const REGISTRY_ROOT = `${RAW_ROOT}/apps/v4/public/r/styles/new-york-v4`;
const REGISTRY_SOURCE_ROOT = 'registry/new-york-v4';
const SOURCE_FILE_EXTENSIONS = ['.tsx', '.ts', '.jsx', '.js', '.json', '.css', '.scss'];
const ASSET_EXTENSIONS = /\.(?:avif|gif|jpe?g|png|svg|webp|ico|woff2?|ttf|otf|mp4|webm|pdf)$/i;

interface RegistryFile {
    path: string;
    content: string;
    type?: string;
    target?: string;
}

interface RegistryItem {
    name: string;
    type: string;
    description?: string;
    categories?: string[];
    dependencies?: string[];
    registryDependencies?: string[];
    files: RegistryFile[];
}

interface RegistryRecord {
    item: RegistryItem;
    url: string;
    sha256: string;
}

interface CachedResponse {
    bytes: Uint8Array;
    contentType: string;
}

export type SourceFetcher = (url: string, signal?: AbortSignal) => Promise<Response>;

export interface ShadcnSourceResolverOptions {
    fetcher?: SourceFetcher;
    signal?: AbortSignal;
    now?: () => Date;
    assetDirectory?: string;
}

export interface SourceResolutionIssue {
    kind: 'registry' | 'file' | 'asset' | 'metadata';
    source: string;
    from?: string;
    message: string;
}

export class SourceResolutionError extends Error {
    readonly issues: SourceResolutionIssue[];

    constructor(issue: SourceResolutionIssue) {
        super(`${issue.message}${issue.from ? ` (imported by ${issue.from})` : ''}`);
        this.name = 'SourceResolutionError';
        this.issues = [issue];
    }
}

function sha256(content: string | Uint8Array): string {
    return createHash('sha256').update(content).digest('hex');
}

function defaultAssetDirectory(): string {
    if (process.platform === 'win32') {
        return path.join(
            process.env.LOCALAPPDATA ?? path.join(os.homedir(), 'AppData', 'Local'),
            'Kumite',
            'implementation-assets',
        );
    }
    if (process.platform === 'darwin') {
        return path.join(
            os.homedir(),
            'Library',
            'Application Support',
            'Kumite',
            'implementation-assets',
        );
    }
    return path.join(
        process.env.XDG_CACHE_HOME ?? path.join(os.homedir(), '.cache'),
        'Kumite',
        'implementation-assets',
    );
}

function storeAsset(
    bytes: Uint8Array,
    digest: string,
    sourcePath: string,
    directory: string,
): string {
    const target = path.join(directory, `${digest}${path.posix.extname(sourcePath)}`);
    fs.mkdirSync(directory, { recursive: true });
    if (fs.existsSync(target)) {
        if (sha256(fs.readFileSync(target)) !== digest) {
            throw new Error(`Cached asset integrity mismatch at ${target}.`);
        }
        return target;
    }
    try {
        fs.writeFileSync(target, bytes, { flag: 'wx' });
    } catch (error) {
        if (
            error &&
            typeof error === 'object' &&
            'code' in error &&
            error.code === 'EEXIST' &&
            sha256(fs.readFileSync(target)) === digest
        ) {
            return target;
        }
        throw error;
    }
    return target;
}

function stableStringify(value: unknown): string {
    if (Array.isArray(value)) {
        return `[${value.map(stableStringify).join(',')}]`;
    }
    if (value && typeof value === 'object') {
        const record = value as Record<string, unknown>;
        const keys = Object.keys(record)
            .filter((key) => key !== 'retrievedAt' && key !== 'artifactHash' && key !== 'cachePath')
            .sort();
        return `{${keys.map((key) => `${JSON.stringify(key)}:${stableStringify(record[key])}`).join(',')}}`;
    }
    return JSON.stringify(value);
}

export function hashImplementationArtifact(artifact: ImplementationArtifact): string {
    return sha256(stableStringify(artifact));
}

function registryUrlFor(name: string): string {
    return `${REGISTRY_ROOT}/${encodeURIComponent(name)}.json`;
}

function registryItemNameFor(url: string): string {
    const filename = new URL(url).pathname.split('/').at(-1) ?? '';
    return decodeURIComponent(filename.replace(/\.json$/, ''));
}

function validateRegistryUrl(url: string, from?: string): void {
    let valid = false;
    try {
        const base = new URL(`${REGISTRY_ROOT}/`);
        const candidate = new URL(url);
        const itemName = candidate.pathname.slice(base.pathname.length);
        valid =
            candidate.origin === base.origin &&
            candidate.pathname.startsWith(base.pathname) &&
            itemName.length > 5 &&
            !itemName.includes('/') &&
            itemName.endsWith('.json') &&
            candidate.search.length === 0 &&
            candidate.hash.length === 0;
    } catch {
        valid = false;
    }
    if (!valid) {
        throw new SourceResolutionError({
            kind: 'registry',
            source: url,
            from,
            message: `Registry URL is outside the pinned shadcn registry: ${url}`,
        });
    }
}

function sourceUrlForRegistryPath(sourcePath: string): string {
    return `${RAW_ROOT}/apps/v4/${sourcePath
        .split('/')
        .map((segment) => encodeURIComponent(segment))
        .join('/')}`;
}

function expectedRegistryType(kind: ImplementationKind): string[] {
    switch (kind) {
        case 'component':
            return ['registry:ui', 'registry:component'];
        case 'example':
            return ['registry:example'];
        case 'block':
            return ['registry:block'];
    }
}

function normalizeSourcePath(value: string, from?: string): string {
    const normalized = path.posix.normalize(value.replaceAll('\\', '/')).replace(/^\.\/+/, '');
    if (
        !normalized ||
        normalized === '.' ||
        normalized.startsWith('/') ||
        normalized === '..' ||
        normalized.startsWith('../')
    ) {
        throw new SourceResolutionError({
            kind: 'file',
            source: value,
            from,
            message: `Upstream source path is unsafe: ${value}`,
        });
    }
    return normalized;
}

function packageName(specifier: string): string {
    if (specifier.startsWith('@')) {
        const [scope, name] = specifier.split('/');
        const packagePart = name?.split('@')[0];
        return packagePart ? `${scope}/${packagePart}` : specifier;
    }
    return specifier.split('/')[0].split('@')[0];
}

function dependencyName(dependency: string): { name: string; version?: string } {
    const at = dependency.startsWith('@') ? dependency.indexOf('@', 1) : dependency.indexOf('@');
    if (at < 0) {
        return { name: dependency };
    }
    return { name: dependency.slice(0, at), version: dependency.slice(at + 1) || undefined };
}

function isLocalSpecifier(value: string): boolean {
    return (
        value.startsWith('.') ||
        value.startsWith('/') ||
        value.startsWith('@/') ||
        value.startsWith('~/')
    );
}

function resolveImportPath(from: string, specifier: string): string {
    if (specifier.startsWith('./') || specifier.startsWith('../')) {
        return normalizeSourcePath(path.posix.join(path.posix.dirname(from), specifier), from);
    }
    if (specifier.startsWith('@/registry/')) {
        return normalizeSourcePath(specifier.slice(2), from);
    }
    if (specifier.startsWith('@/') || specifier.startsWith('~/')) {
        const aliasPath = specifier.slice(2);
        const sourcePath = aliasPath.startsWith('registry/')
            ? aliasPath
            : `${REGISTRY_SOURCE_ROOT}/${aliasPath
                  .replace(/^components\/ui\//, 'ui/')
                  .replace(/^components\//, 'components/')}`;
        return normalizeSourcePath(sourcePath, from);
    }
    if (specifier.startsWith('/')) {
        return normalizeSourcePath(specifier.slice(1), from);
    }
    return normalizeSourcePath(path.posix.join(path.posix.dirname(from), specifier), from);
}

function pathCandidates(sourcePath: string): string[] {
    if (path.posix.extname(sourcePath)) {
        return [sourcePath];
    }
    return [
        ...SOURCE_FILE_EXTENSIONS.map((extension) => `${sourcePath}${extension}`),
        ...SOURCE_FILE_EXTENSIONS.map((extension) => `${sourcePath}/index${extension}`),
    ];
}

function classifyFile(
    file: RegistryFile,
    isEntry: boolean,
): ImplementationArtifact['files'][number]['role'] {
    if (isEntry) {
        return 'entry';
    }
    if (file.type === 'registry:hook' || /\/hooks\//.test(file.path)) {
        return 'hook';
    }
    if (/\.(?:css|scss)$/.test(file.path)) {
        return 'stylesheet';
    }
    if (
        /\.(?:json|csv)$/.test(file.path) ||
        /(?:^|\/)(?:data|seed|demo)(?:\.|\/)/i.test(file.path)
    ) {
        return 'demo-data';
    }
    if (file.type === 'registry:ui' || file.type === 'registry:component') {
        return 'component';
    }
    if (file.type === 'registry:lib' || /\/(?:lib|utils)\//.test(file.path)) {
        return 'utility';
    }
    if (/\/(?:config|configs)\//.test(file.path)) {
        return 'configuration';
    }
    return 'source';
}

function importedSpecifiers(sourcePath: string, content: string): string[] {
    if (/\.(?:css|scss)$/.test(sourcePath)) {
        return [...content.matchAll(/@import\s+(?:url\()?['"]?([^'")\s;]+)['"]?\)?/g)].map(
            (match) => match[1],
        );
    }

    const project = new Project({
        useInMemoryFileSystem: true,
        compilerOptions: { allowJs: true, jsx: ts.JsxEmit.Preserve },
    });
    const sourceFile = project.createSourceFile(
        `/source${path.posix.extname(sourcePath) || '.tsx'}`,
        content,
    );
    const specifiers = [
        ...sourceFile.getImportDeclarations().map((entry) => entry.getModuleSpecifierValue()),
        ...sourceFile
            .getExportDeclarations()
            .map((entry) => entry.getModuleSpecifierValue())
            .filter((entry): entry is string => Boolean(entry)),
    ];
    for (const call of sourceFile.getDescendantsOfKind(ts.SyntaxKind.CallExpression)) {
        const expression = call.getExpression();
        if (
            expression.getKind() !== ts.SyntaxKind.ImportKeyword &&
            expression.getText() !== 'require'
        ) {
            continue;
        }
        const argument = call.getArguments()[0];
        if (argument && Node.isStringLiteral(argument)) {
            specifiers.push(argument.getLiteralValue());
        }
    }
    for (const declaration of sourceFile.getDescendantsOfKind(
        ts.SyntaxKind.ImportEqualsDeclaration,
    )) {
        const reference = declaration.getModuleReference();
        if (Node.isExternalModuleReference(reference)) {
            const expression = reference.getExpression();
            if (Node.isStringLiteral(expression)) {
                specifiers.push(expression.getLiteralValue());
            }
        }
    }
    return [...new Set(specifiers)];
}

function referencedAssetPaths(sourcePath: string, content: string): string[] {
    const refs = new Set<string>();
    if (!/\.(?:css|scss)$/.test(sourcePath)) {
        const project = new Project({
            useInMemoryFileSystem: true,
            compilerOptions: { allowJs: true, jsx: ts.JsxEmit.Preserve },
        });
        const sourceFile = project.createSourceFile(
            `/asset${path.posix.extname(sourcePath) || '.tsx'}`,
            content,
        );
        for (const attribute of sourceFile.getDescendantsOfKind(ts.SyntaxKind.JsxAttribute)) {
            const attributeName = attribute.getNameNode().getText().toLowerCase();
            if (!['src', 'srcset', 'poster', 'href'].includes(attributeName)) {
                continue;
            }
            const initializer = attribute.getInitializer();
            if (initializer && Node.isStringLiteral(initializer)) {
                const value = initializer.getLiteralValue();
                for (const candidate of value.split(/\s*,\s*/)) {
                    if (ASSET_EXTENSIONS.test(candidate)) {
                        refs.add(candidate);
                    }
                }
            }
        }
    }
    for (const match of content.matchAll(/url\(\s*['"]?([^)'"]+)['"]?\s*\)/g)) {
        const reference = match[1].trim();
        if (ASSET_EXTENSIONS.test(reference) || /^(?:https?:|data:|blob:)/i.test(reference)) {
            refs.add(reference);
        }
    }
    for (const match of content.matchAll(
        /['"`]([^'"`]+\.(?:avif|gif|jpe?g|png|svg|webp|ico|woff2?|ttf|otf|mp4|webm|pdf)(?:[?#][^'"`]*)?)['"`]/gi,
    )) {
        refs.add(match[1]);
    }
    return [...refs];
}

function findCycles(edges: ImplementationArtifact['graph']['edges']): string[][] {
    const adjacency = new Map<string, string[]>();
    for (const edge of edges) {
        if (edge.kind === 'asset') {
            continue;
        }
        const targets = adjacency.get(edge.from) ?? [];
        targets.push(edge.to);
        adjacency.set(edge.from, targets);
    }
    for (const targets of adjacency.values()) {
        targets.sort();
    }
    const visited = new Set<string>();
    const stack: string[] = [];
    const active = new Map<string, number>();
    const cycles: string[][] = [];
    const cycleKeys = new Set<string>();

    const visit = (node: string) => {
        if (active.has(node)) {
            const cycle = [...stack.slice(active.get(node)!), node];
            const key = cycle.slice(0, -1).sort().join('|');
            if (!cycleKeys.has(key)) {
                cycleKeys.add(key);
                cycles.push(cycle);
            }
            return;
        }
        if (visited.has(node)) {
            return;
        }
        active.set(node, stack.length);
        stack.push(node);
        for (const target of adjacency.get(node) ?? []) {
            visit(target);
        }
        stack.pop();
        active.delete(node);
        visited.add(node);
    };

    for (const node of [
        ...new Set([...adjacency.keys(), ...[...adjacency.values()].flat()]),
    ].sort()) {
        visit(node);
    }
    return cycles;
}

export function createShadcnSourceResolver(options: ShadcnSourceResolverOptions = {}) {
    const fetcher: SourceFetcher = options.fetcher ?? ((url, signal) => fetch(url, { signal }));
    const now = options.now ?? (() => new Date());
    const assetDirectory = options.assetDirectory ?? defaultAssetDirectory();
    const responseCache = new Map<string, Promise<CachedResponse>>();

    async function getResponse(url: string): Promise<CachedResponse> {
        let cached = responseCache.get(url);
        if (!cached) {
            cached = (async () => {
                const response = await fetcher(url, options.signal);
                if (!response.ok) {
                    throw new SourceResolutionError({
                        kind: 'registry',
                        source: url,
                        message: `Upstream returned HTTP ${response.status} for ${url}`,
                    });
                }
                return {
                    bytes: new Uint8Array(await response.arrayBuffer()),
                    contentType: response.headers.get('content-type') ?? '',
                };
            })();
            responseCache.set(url, cached);
            cached.catch(() => responseCache.delete(url));
        }
        return cached;
    }

    async function getRegistryItem(url: string, from?: string): Promise<RegistryRecord> {
        try {
            validateRegistryUrl(url, from);
            const response = await getResponse(url);
            const raw = new TextDecoder().decode(response.bytes);
            const value = JSON.parse(raw) as RegistryItem;
            if (
                !value ||
                typeof value.name !== 'string' ||
                typeof value.type !== 'string' ||
                !Array.isArray(value.files)
            ) {
                throw new Error('Registry item is missing its name, type, or files array.');
            }
            for (const file of value.files) {
                if (typeof file.path !== 'string' || typeof file.content !== 'string') {
                    throw new Error(
                        `Registry item "${value.name}" has a file without path/content.`,
                    );
                }
                normalizeSourcePath(file.path, value.name);
            }
            return { item: value, url, sha256: sha256(response.bytes) };
        } catch (error) {
            if (error instanceof SourceResolutionError) {
                if (!from) {
                    throw error;
                }
                throw new SourceResolutionError({
                    ...error.issues[0],
                    from,
                    message: error.issues[0].message,
                });
            }
            throw new SourceResolutionError({
                kind: 'registry',
                source: url,
                from,
                message: `Invalid registry metadata: ${error instanceof Error ? error.message : String(error)}`,
            });
        }
    }

    async function resolve(request: ImplementationRequest): Promise<ImplementationArtifact> {
        if (request.provider !== 'shadcn') {
            throw new SourceResolutionError({
                kind: 'metadata',
                source: request.provider,
                message: `Provider "${request.provider}" is not implemented by this resolver.`,
            });
        }
        const rootUrl = request.registryUrl ?? registryUrlFor(request.name);
        const root = await getRegistryItem(rootUrl);
        if (!expectedRegistryType(request.kind).includes(root.item.type)) {
            throw new SourceResolutionError({
                kind: 'metadata',
                source: rootUrl,
                message: `Expected ${request.kind} registry metadata for "${request.name}", received ${root.item.type}.`,
            });
        }
        if (root.item.name !== request.name) {
            throw new SourceResolutionError({
                kind: 'metadata',
                source: rootUrl,
                message: `Registry item name mismatch: requested "${request.name}", received "${root.item.name}".`,
            });
        }

        const registryItems = new Map<string, RegistryRecord>([[rootUrl, root]]);
        const files = new Map<string, ImplementationArtifact['files'][number]>();
        const assets = new Map<string, ImplementationArtifact['assets'][number]>();
        const edges: ImplementationArtifact['graph']['edges'] = [];
        const dependencies = new Map<string, string | undefined>();
        const providers = new Set<string>();
        const configuration = new Set<string>();
        const pendingItems = [root];
        const visitedRegistry = new Set<string>();

        const addRegistryFiles = (record: RegistryRecord) => {
            for (const registryFile of record.item.files) {
                const sourcePath = normalizeSourcePath(registryFile.path, record.item.name);
                edges.push({
                    from: `registry:${record.item.name}`,
                    to: sourcePath,
                    kind: 'registry',
                });
                const existing = files.get(sourcePath);
                const digest = sha256(registryFile.content);
                if (existing) {
                    if (existing.sha256 !== digest) {
                        throw new SourceResolutionError({
                            kind: 'file',
                            source: sourcePath,
                            from: record.item.name,
                            message: `Registry items provide different content for "${sourcePath}".`,
                        });
                    }
                    continue;
                }
                files.set(sourcePath, {
                    path: sourcePath,
                    content: registryFile.content,
                    role: classifyFile(registryFile, false),
                    sourceUrl: sourceUrlForRegistryPath(sourcePath),
                    sha256: digest,
                    ...(registryFile.type ? { registryType: registryFile.type } : {}),
                    ...(registryFile.target ? { target: registryFile.target } : {}),
                });
            }
        };

        while (pendingItems.length > 0) {
            const current = pendingItems.shift()!;
            if (visitedRegistry.has(current.url)) {
                continue;
            }
            visitedRegistry.add(current.url);
            addRegistryFiles(current);
            const fromNode = `registry:${current.item.name}`;
            for (const dependency of current.item.dependencies ?? []) {
                const parsed = dependencyName(dependency);
                const previous = dependencies.get(parsed.name);
                if (previous && parsed.version && previous !== parsed.version) {
                    throw new SourceResolutionError({
                        kind: 'metadata',
                        source: parsed.name,
                        from: current.item.name,
                        message: `Conflicting upstream versions for package "${parsed.name}": ${previous} and ${parsed.version}.`,
                    });
                }
                dependencies.set(parsed.name, parsed.version ?? previous);
            }
            for (const registryDependency of current.item.registryDependencies ?? []) {
                const url = /^https?:\/\//i.test(registryDependency)
                    ? registryDependency
                    : registryUrlFor(registryDependency);
                validateRegistryUrl(url, current.item.name);
                const known = registryItems.get(url);
                const next = known ?? (await getRegistryItem(url, current.item.name));
                if (next.item.name !== registryItemNameFor(url)) {
                    throw new SourceResolutionError({
                        kind: 'metadata',
                        source: url,
                        from: current.item.name,
                        message: `Registry dependency name mismatch: expected "${registryItemNameFor(url)}", received "${next.item.name}".`,
                    });
                }
                registryItems.set(url, next);
                edges.push({
                    from: fromNode,
                    to: `registry:${next.item.name}`,
                    kind: 'registry',
                });
                if (!visitedRegistry.has(url)) {
                    pendingItems.push(next);
                }
            }
        }

        const rootEntry = root.item.files.find(
            (file) =>
                file.type === 'registry:page' ||
                file.type === 'registry:example' ||
                file.type === 'registry:component' ||
                file.type === 'registry:ui',
        );
        if (!rootEntry) {
            throw new SourceResolutionError({
                kind: 'metadata',
                source: rootUrl,
                message: `Registry item "${request.name}" has no page, example, or component entry file.`,
            });
        }
        const entryPoint = normalizeSourcePath(rootEntry.path, request.name);
        const entry = files.get(entryPoint);
        if (!entry) {
            throw new SourceResolutionError({
                kind: 'file',
                source: entryPoint,
                from: request.name,
                message: `Registry entry file "${entryPoint}" was not collected.`,
            });
        }
        entry.role = 'entry';
        if (rootEntry.type === 'registry:example') {
            configuration.add('upstream-example');
        }
        if ([...files.values()].some((file) => /(^|\n)\s*["']use client["']/.test(file.content))) {
            configuration.add('react-client-components');
        }

        const resolvedFilePaths = new Set<string>();
        const resolveFile = async (sourcePath: string, from?: string): Promise<string> => {
            const normalized = normalizeSourcePath(sourcePath, from);
            const candidates = pathCandidates(normalized);
            const existing = candidates.find((candidate) => files.has(candidate));
            if (existing) {
                return existing;
            }
            let lastError: unknown;
            for (const candidate of candidates) {
                const url = sourceUrlForRegistryPath(candidate);
                try {
                    const response = await getResponse(url);
                    if (ASSET_EXTENSIONS.test(candidate)) {
                        const digest = sha256(response.bytes);
                        assets.set(candidate, {
                            path: candidate,
                            source: url,
                            mediaType: response.contentType || 'application/octet-stream',
                            sha256: digest,
                            size: response.bytes.byteLength,
                            cachePath: storeAsset(
                                response.bytes,
                                digest,
                                candidate,
                                assetDirectory,
                            ),
                            external: false,
                            referencedBy: from ? [from] : [],
                        });
                        return candidate;
                    }
                    const content = new TextDecoder().decode(response.bytes);
                    files.set(candidate, {
                        path: candidate,
                        content,
                        role: classifyFile({ path: candidate, content }, false),
                        sourceUrl: url,
                        sha256: sha256(content),
                    });
                    return candidate;
                } catch (error) {
                    lastError = error;
                }
            }
            throw new SourceResolutionError({
                kind: 'file',
                source: normalized,
                from,
                message: `Could not resolve local import "${normalized}"${lastError instanceof Error ? `: ${lastError.message}` : ''}.`,
            });
        };

        const resolveAsset = async (reference: string, from: string): Promise<string> => {
            if (/^(?:data:|blob:)/i.test(reference)) {
                const key = `${from}#${reference}`;
                assets.set(key, {
                    path: reference,
                    source: reference,
                    mediaType: reference.startsWith('data:')
                        ? reference.slice(5).split(';')[0]
                        : '',
                    external: true,
                    referencedBy: [from],
                });
                return key;
            }
            if (/^https?:\/\//i.test(reference)) {
                const current = assets.get(reference);
                if (current) {
                    current.referencedBy.push(from);
                } else {
                    assets.set(reference, {
                        path: reference,
                        source: reference,
                        mediaType: '',
                        external: true,
                        referencedBy: [from],
                    });
                }
                return reference;
            }

            const cleanReference = reference.split(/[?#]/)[0];
            const resolved = cleanReference.startsWith('/')
                ? `public${cleanReference}`
                : path.posix.join(path.posix.dirname(from), cleanReference);
            const assetPath = normalizeSourcePath(resolved, from);
            const existing = assets.get(assetPath);
            if (existing) {
                if (!existing.referencedBy.includes(from)) {
                    existing.referencedBy.push(from);
                }
                return assetPath;
            }
            const url = `${RAW_ROOT}/apps/v4/${assetPath
                .split('/')
                .map((segment) => encodeURIComponent(segment))
                .join('/')}`;
            try {
                const response = await getResponse(url);
                assets.set(assetPath, {
                    path: assetPath.replace(/^public\//, ''),
                    source: url,
                    mediaType: response.contentType || 'application/octet-stream',
                    sha256: sha256(response.bytes),
                    size: response.bytes.byteLength,
                    cachePath: storeAsset(
                        response.bytes,
                        sha256(response.bytes),
                        assetPath,
                        assetDirectory,
                    ),
                    external: false,
                    referencedBy: [from],
                });
                return assetPath;
            } catch (error) {
                throw new SourceResolutionError({
                    kind: 'asset',
                    source: url,
                    from,
                    message: `Could not retrieve referenced asset "${reference}"${error instanceof Error ? `: ${error.message}` : ''}.`,
                });
            }
        };

        const scanFile = async (sourcePath: string): Promise<void> => {
            const normalized = normalizeSourcePath(sourcePath);
            if (resolvedFilePaths.has(normalized)) {
                return;
            }
            resolvedFilePaths.add(normalized);
            const file = files.get(normalized);
            if (!file) {
                throw new SourceResolutionError({
                    kind: 'file',
                    source: normalized,
                    message: `Resolved source file "${normalized}" is missing from the artifact.`,
                });
            }
            if (/\.(?:css|scss)$/.test(normalized)) {
                configuration.add('stylesheet');
            }
            for (const importSource of importedSpecifiers(normalized, file.content)) {
                if (/^node:/i.test(importSource)) {
                    continue;
                }
                if (/^https?:\/\//i.test(importSource)) {
                    await resolveAsset(importSource, normalized);
                    edges.push({ from: normalized, to: importSource, kind: 'asset' });
                    continue;
                }
                if (!isLocalSpecifier(importSource)) {
                    const name = packageName(importSource);
                    if (name) {
                        dependencies.set(name, dependencies.get(name));
                    }
                    continue;
                }
                const cleanImportSource = importSource.split(/[?#]/)[0];
                const base = resolveImportPath(normalized, cleanImportSource);
                if (ASSET_EXTENSIONS.test(base)) {
                    const assetPath = await resolveAsset(importSource, normalized);
                    edges.push({ from: normalized, to: assetPath, kind: 'asset' });
                    continue;
                }
                const localPath = await resolveFile(base, normalized);
                edges.push({ from: normalized, to: localPath, kind: 'import' });
                await scanFile(localPath);
            }
            for (const assetReference of referencedAssetPaths(normalized, file.content)) {
                const assetPath = await resolveAsset(assetReference, normalized);
                edges.push({ from: normalized, to: assetPath, kind: 'asset' });
            }
            for (const match of file.content.matchAll(/<([A-Z][A-Za-z0-9]*Provider)\b/g)) {
                providers.add(match[1]);
            }
        };

        await scanFile(entryPoint);
        // Registry dependencies are part of the implementation even where a
        // particular entry file imports them indirectly or by generated code.
        for (const file of [...files.keys()].sort()) {
            if (!resolvedFilePaths.has(file)) {
                await scanFile(file);
            }
        }

        const registryRecords = [...registryItems.values()].sort((a, b) =>
            a.item.name.localeCompare(b.item.name),
        );
        const artifactFiles = [...files.values()].sort((a, b) => a.path.localeCompare(b.path));
        const artifactAssets = [...assets.values()]
            .map((asset) => ({
                ...asset,
                referencedBy: [...new Set(asset.referencedBy)].sort(),
            }))
            .sort((a, b) => a.path.localeCompare(b.path));
        const artifactDependencies = [...dependencies.entries()]
            .map(([name, version]) => ({ name, ...(version ? { version } : {}) }))
            .sort((a, b) => a.name.localeCompare(b.name));
        const rootFilePaths = new Set(root.item.files.map((file) => file.path));
        const sourceHash = sha256(
            stableStringify({
                registryItems: registryRecords.map(({ item, url, sha256: hash }) => ({
                    name: item.name,
                    type: item.type,
                    url,
                    sha256: hash,
                    ...(item.description ? { description: item.description } : {}),
                    categories: [...(item.categories ?? [])],
                    dependencies: [...(item.dependencies ?? [])],
                    registryDependencies: [...(item.registryDependencies ?? [])],
                    files: item.files.map((file) => file.path),
                })),
                files: artifactFiles.map(({ path: filePath, sha256: hash }) => ({
                    path: filePath,
                    sha256: hash,
                })),
                assets: artifactAssets.map(({ path: assetPath, sha256: hash, source }) => ({
                    path: assetPath,
                    sha256: hash,
                    source,
                })),
            }),
        );
        const candidate: ImplementationArtifact = {
            schemaVersion: 1,
            id: `shadcn:new-york-v4:${request.kind}:${request.name}@${UPSTREAM_COMMIT}`,
            provider: 'shadcn',
            source: {
                name: request.name,
                version: COMPONENT_CLI_VERSION,
                commit: UPSTREAM_COMMIT,
                registryUrl: rootUrl,
                sourceUrl: sourceUrlForRegistryPath(rootEntry.path),
                retrievedAt: now().toISOString(),
                provenance: 'official',
                registryItems: registryRecords.map(({ item, url, sha256: hash }) => ({
                    name: item.name,
                    type: item.type,
                    url,
                    sha256: hash,
                    ...(item.description ? { description: item.description } : {}),
                    categories: [...(item.categories ?? [])],
                    dependencies: [...(item.dependencies ?? [])],
                    registryDependencies: [...(item.registryDependencies ?? [])],
                    files: item.files.map((file) => file.path),
                })),
            },
            metadata: {
                name: root.item.name,
                ...(root.item.description ? { description: root.item.description } : {}),
                type: request.kind,
                tags: [...(root.item.categories ?? [])],
            },
            entryPoint,
            files: artifactFiles,
            dependencies: artifactDependencies,
            assets: artifactAssets,
            graph: { edges, cycles: findCycles(edges) },
            requirements: {
                providers: [...providers].sort(),
                configuration: [...configuration].sort(),
            },
            demo: {
                available:
                    request.kind !== 'component' ||
                    artifactFiles.some((file) => file.role === 'demo-data'),
                preserved: true,
                files: artifactFiles
                    .filter(
                        (file) =>
                            file.role === 'demo-data' ||
                            (request.kind !== 'component' && rootFilePaths.has(file.path)),
                    )
                    .map((file) => file.path),
                editable: true,
            },
            integrity: { sourceHash, artifactHash: '' },
        };
        candidate.integrity.artifactHash = hashImplementationArtifact(candidate);
        return ImplementationArtifactSchema.parse(candidate);
    }

    return { resolve };
}

const defaultResolver = createShadcnSourceResolver();

export function resolveShadcnImplementation(
    request: Omit<ImplementationRequest, 'provider'>,
    options?: ShadcnSourceResolverOptions,
): Promise<ImplementationArtifact> {
    return options
        ? createShadcnSourceResolver(options).resolve({ ...request, provider: 'shadcn' })
        : defaultResolver.resolve({ ...request, provider: 'shadcn' });
}
