import type { ImplementationArtifact } from '@kumite/models';
import { Node, Project, SyntaxKind, type SourceFile } from 'ts-morph';

export type RuntimeEntryExport = { kind: 'default' } | { kind: 'named'; name: string };

const RUNTIME_DECLARATION_KINDS = new Set([
    SyntaxKind.FunctionDeclaration,
    SyntaxKind.ClassDeclaration,
    SyntaxKind.VariableDeclaration,
    SyntaxKind.EnumDeclaration,
]);

/**
 * A runtime-valued declaration survives TypeScript erasure: a function, a
 * class, a variable, or a non-const enum. Interfaces and type aliases exist
 * only for the compiler, so importing one as the preview's implementation
 * renders nothing (alphabetical selection once picked `ChartConfig` over
 * `ChartContainer` because both start with an uppercase letter).
 */
function declarationIsRuntimeValue(declaration: Node): boolean {
    const statement = Node.isVariableDeclaration(declaration)
        ? declaration.getParent().getParent()
        : declaration;
    if (/^(?:export\s+)?declare\b/.test(statement.getText())) {
        return false;
    }
    if (Node.isEnumDeclaration(declaration)) {
        // A `const enum` has no runtime object of its own under isolatedModules.
        return !declaration.isConstEnum();
    }
    return RUNTIME_DECLARATION_KINDS.has(declaration.getKind());
}

function declarationIsRenderableExport(declaration: Node): boolean {
    return !Node.isEnumDeclaration(declaration) && declarationIsRuntimeValue(declaration);
}

export function readEntrySourceFile(content: string): SourceFile {
    return new Project({
        skipAddingFilesFromTsConfig: true,
        useInMemoryFileSystem: true,
    }).createSourceFile('preview-entry.tsx', content);
}

export function findMissingArtifactProviders(artifact: ImplementationArtifact): string[] {
    const reachable = new Set<string>([artifact.entryPoint]);
    const pending = [artifact.entryPoint];
    while (pending.length > 0) {
        const from = pending.shift()!;
        for (const edge of artifact.graph.edges) {
            if (edge.kind === 'import' && edge.from === from && !reachable.has(edge.to)) {
                reachable.add(edge.to);
                pending.push(edge.to);
            }
        }
    }
    const source = artifact.files
        .filter((file) => reachable.has(file.path))
        .map((file) => file.content)
        .join('\n');
    return artifact.requirements.providers.filter(
        (provider) => !new RegExp(`<${provider}\\b`).test(source),
    );
}

/**
 * Selects the export a preview or insertion must import:
 *
 * 1. An explicitly preferred export (verified registry metadata such as the
 *    catalog's `parts`) when it really holds a runtime value.
 * 2. The default export when it is runtime-valued.
 * 3. The first runtime-valued uppercase named export in name order.
 *
 * Returns `null` when no valid runtime component export can be identified, so
 * callers fail explicitly instead of generating a type-only import.
 */
export function resolveRuntimeEntryExport(
    sourceFile: SourceFile,
    artifact: Pick<ImplementationArtifact, 'metadata'>,
    preferredExport?: string,
): RuntimeEntryExport | null {
    const exports = sourceFile.getExportedDeclarations();
    const runtimeExport = (name: string): boolean =>
        (exports.get(name) ?? []).some(declarationIsRenderableExport);

    if (preferredExport && runtimeExport(preferredExport)) {
        return { kind: 'named', name: preferredExport };
    }
    if (exports.has('default') && runtimeExport('default')) {
        return { kind: 'default' };
    }
    if (artifact.metadata.type === 'component' || artifact.metadata.type === 'example') {
        const name = [...exports.keys()]
            .filter((value) => /^[A-Z]/.test(value) && runtimeExport(value))
            .sort()[0];
        if (name) {
            return { kind: 'named', name };
        }
    }
    return null;
}

export function describeMissingEntryExport(
    entryPoint: string,
    kind: ImplementationArtifact['metadata']['type'],
): string {
    return `Artifact entry point "${entryPoint}" does not expose a renderable ${kind} export.`;
}
