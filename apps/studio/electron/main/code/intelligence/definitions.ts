import * as t from '@babel/types';
import type { DefinitionExportKind, TemplateNodeDefinition } from '@kumite/models/element';

/**
 * What a file exports, and what it imports.
 *
 * The engine only indexes files the run manager already mapped, so the
 * identities here are the same ones an edit can reach. Nothing is read from
 * disk: the caller supplies the AST it parsed.
 */

export type DeclarationKind = 'function' | 'class' | 'variable';

export interface ComponentDefinition extends TemplateNodeDefinition {
    declarationKind: DeclarationKind;
}

export interface ImportBinding {
    /** Name used at the call site. */
    local: string;
    /** Name exported by the source module (`default` and `*` included). */
    imported: string;
    /** Module specifier exactly as written. */
    specifier: string;
    /** Indexed file the specifier resolved to, when one matched. */
    resolvedPath: string | null;
    /**
     * - `relative`: `./` or `../`, resolved against the importing file
     * - `alias-inferred`: `@/`, `~/` or `#/` matched exactly one indexed file
     * - `external`: a package specifier, outside the mapped project
     * - `unresolved`: a path specifier no indexed file matched
     */
    resolution: 'relative' | 'alias-inferred' | 'external' | 'unresolved';
}

export interface FileDefinitionIndex {
    path: string;
    /** Parsed source, kept only for in-process re-verification. */
    ast: t.File;
    definitions: ComponentDefinition[];
    imports: ImportBinding[];
}

export interface IndexedFile {
    path: string;
    ast: t.File;
}

export interface DefinitionRegistry {
    /** Normalized paths of every indexed file. */
    paths(): string[];
    get(path: string): FileDefinitionIndex | undefined;
    definition(path: string, name: string): ComponentDefinition | undefined;
    /** The definition a default import receives, when the file has one. */
    defaultDefinition(path: string): ComponentDefinition | undefined;
    definitionsNamed(name: string): ComponentDefinition[];
    importsOf(path: string): ImportBinding[];
    resolveImport(path: string, local: string): ImportBinding | undefined;
}

/** Separators are normalized so a Windows and a POSIX path key the same file. */
export function normalizePath(value: string): string {
    const slashed = value.replace(/\\/g, '/');
    const drive = /^[A-Za-z]:/.exec(slashed)?.[0] ?? '';
    const body = slashed.slice(drive.length);
    const segments: string[] = [];
    for (const segment of body.split('/')) {
        if (!segment || segment === '.') {
            continue;
        }
        if (segment === '..') {
            segments.pop();
            continue;
        }
        segments.push(segment);
    }
    const absolute = body.startsWith('/');
    return `${drive}${absolute && !drive ? '/' : ''}${segments.join('/')}`;
}

function dirname(value: string): string {
    const normalized = normalizePath(value);
    const slash = normalized.lastIndexOf('/');
    return slash === -1 ? '' : normalized.slice(0, slash);
}

function joinPath(base: string, relative: string): string {
    return normalizePath(base ? `${base}/${relative}` : relative);
}

const RELATIVE_EXTENSIONS = ['', '.tsx', '.ts', '.jsx', '.js'];
const INDEX_FILES = ['/index.tsx', '/index.ts', '/index.jsx', '/index.js'];

function stripExtension(value: string): string {
    return value.replace(/\.(tsx|ts|jsx|js|mjs|cjs)$/, '');
}

/**
 * Exported definitions of a file.
 *
 * Only top-level declarations are definitions. A component declared inside
 * another component's body is a part, not an importable identity, and is
 * reported through `TemplateNodePart` instead.
 */
export function discoverDefinitions(ast: t.File, filePath: string): FileDefinitionIndex {
    const path = normalizePath(filePath);
    const declarations = collectDeclarations(ast);
    const exports = collectExportKinds(ast);

    const definitions: ComponentDefinition[] = [...declarations.entries()].map(([name, kind]) => ({
        name,
        path,
        exportKind: exports.get(name) ?? 'none',
        declarationKind: kind,
    }));

    return {
        path,
        ast,
        definitions,
        imports: discoverImports(ast),
    };
}

/** Top-level declarations only; a nested component is a part, not an identity. */
export function collectDeclarations(ast: t.File): Map<string, DeclarationKind> {
    const declarations = new Map<string, DeclarationKind>();
    for (const statement of ast.program.body) {
        const declaration = exportedDeclaration(statement);
        if (declaration) {
            collectDeclaration(declaration, declarations);
        }
    }
    return declarations;
}

/** How every top-level name leaves the module. Unlisted names are not exported. */
export function collectExportKinds(ast: t.File): Map<string, DefinitionExportKind> {
    const exports = new Map<string, DefinitionExportKind>();
    for (const statement of ast.program.body) {
        if (t.isExportNamedDeclaration(statement)) {
            if (statement.declaration && t.isDeclaration(statement.declaration)) {
                for (const name of declaredNames(statement.declaration)) {
                    exports.set(name, 'named');
                }
            }
            for (const specifier of statement.specifiers) {
                if (t.isExportSpecifier(specifier) && t.isIdentifier(specifier.local)) {
                    exports.set(specifier.local.name, 'named');
                }
            }
            continue;
        }

        if (t.isExportDefaultDeclaration(statement)) {
            const declaration = statement.declaration;
            if (t.isDeclaration(declaration)) {
                for (const name of declaredNames(declaration)) {
                    exports.set(name, 'default');
                }
            } else if (t.isIdentifier(declaration)) {
                exports.set(declaration.name, 'default');
            }
        }
    }
    return exports;
}

function exportedDeclaration(statement: t.Program['body'][number]): t.Declaration | null {
    if (t.isExportNamedDeclaration(statement) || t.isExportDefaultDeclaration(statement)) {
        const declaration = statement.declaration;
        return declaration && t.isDeclaration(declaration) ? declaration : null;
    }
    return t.isDeclaration(statement) ? statement : null;
}

function collectDeclaration(declaration: t.Declaration, target: Map<string, DeclarationKind>): void {
    if (t.isFunctionDeclaration(declaration) && declaration.id) {
        target.set(declaration.id.name, 'function');
        return;
    }
    if (t.isClassDeclaration(declaration) && declaration.id) {
        target.set(declaration.id.name, 'class');
        return;
    }
    if (t.isVariableDeclaration(declaration)) {
        for (const declarator of declaration.declarations) {
            if (t.isIdentifier(declarator.id)) {
                target.set(declarator.id.name, 'variable');
            }
        }
    }
}

function declaredNames(declaration: t.Declaration): string[] {
    if (t.isFunctionDeclaration(declaration) && declaration.id) {
        return [declaration.id.name];
    }
    if (t.isClassDeclaration(declaration) && declaration.id) {
        return [declaration.id.name];
    }
    if (t.isVariableDeclaration(declaration)) {
        return declaration.declarations
            .map((declarator) => (t.isIdentifier(declarator.id) ? declarator.id.name : null))
            .filter((name): name is string => name !== null);
    }
    return [];
}

function discoverImports(ast: t.File): ImportBinding[] {
    const bindings: ImportBinding[] = [];
    for (const statement of ast.program.body) {
        if (!t.isImportDeclaration(statement) || statement.importKind === 'type') {
            continue;
        }
        const specifier = statement.source.value;
        for (const item of statement.specifiers) {
            if (t.isImportDefaultSpecifier(item)) {
                bindings.push(unresolved(item.local.name, 'default', specifier));
            } else if (t.isImportNamespaceSpecifier(item)) {
                bindings.push(unresolved(item.local.name, '*', specifier));
            } else if (t.isImportSpecifier(item) && item.importKind !== 'type') {
                const imported = t.isIdentifier(item.imported)
                    ? item.imported.name
                    : item.imported.value;
                bindings.push(unresolved(item.local.name, imported, specifier));
            }
        }
    }
    return bindings;
}

function unresolved(local: string, imported: string, specifier: string): ImportBinding {
    return { local, imported, specifier, resolvedPath: null, resolution: 'unresolved' };
}

export function buildDefinitionRegistry(files: IndexedFile[]): DefinitionRegistry {
    const indexed = new Map<string, FileDefinitionIndex>();
    for (const file of files) {
        const path = normalizePath(file.path);
        indexed.set(path, discoverDefinitions(file.ast, path));
    }

    const keys = [...indexed.keys()];
    for (const index of indexed.values()) {
        index.imports = index.imports.map((binding) => resolveBinding(index.path, binding, keys));
    }

    return {
        paths: () => [...indexed.keys()],
        get: (path) => indexed.get(normalizePath(path)),
        definition: (path, name) =>
            indexed.get(normalizePath(path))?.definitions.find((item) => item.name === name),
        defaultDefinition: (path) =>
            indexed
                .get(normalizePath(path))
                ?.definitions.find((item) => item.exportKind === 'default'),
        definitionsNamed: (name) =>
            [...indexed.values()].flatMap((index) =>
                index.definitions.filter((definition) => definition.name === name),
            ),
        importsOf: (path) => indexed.get(normalizePath(path))?.imports ?? [],
        resolveImport: (path, local) =>
            indexed
                .get(normalizePath(path))
                ?.imports.find((binding) => binding.local === local),
    };
}

function resolveBinding(
    fromPath: string,
    binding: ImportBinding,
    keys: string[],
): ImportBinding {
    const specifier = binding.specifier;
    if (specifier.startsWith('.') || specifier.startsWith('/')) {
        const base = specifier.startsWith('/')
            ? normalizePath(specifier)
            : joinPath(dirname(fromPath), specifier);
        const match = probe(base, keys);
        return match
            ? { ...binding, resolvedPath: match, resolution: 'relative' }
            : { ...binding, resolution: 'unresolved' };
    }

    if (/^[@~#]\//.test(specifier)) {
        const match = aliasMatch(specifier, keys);
        return match
            ? { ...binding, resolvedPath: match, resolution: 'alias-inferred' }
            : { ...binding, resolution: 'unresolved' };
    }

    return { ...binding, resolution: 'external' };
}

function probe(base: string, keys: string[]): string | null {
    const candidates = [
        ...RELATIVE_EXTENSIONS.map((extension) => `${base}${extension}`),
        ...INDEX_FILES.map((suffix) => `${base}${suffix}`),
    ];
    return candidates.find((candidate) => keys.includes(normalizePath(candidate))) ?? null;
}

/**
 * An alias is only resolved when exactly one indexed file matches its suffix.
 * A tie is returned as `null`: picking one of two candidates is the kind of
 * guess this engine exists to avoid.
 */
function aliasMatch(specifier: string, keys: string[]): string | null {
    const suffix = `/${specifier.replace(/^[@~#]\//, '').replace(/^\/+/, '')}`;
    const matches = keys.filter((key) => {
        const target = stripExtension(key);
        return target === stripExtension(specifier) || target.endsWith(suffix);
    });
    return matches.length === 1 ? matches[0] : null;
}
