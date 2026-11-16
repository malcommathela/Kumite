import * as t from '@babel/types';
import type { CodeDiffRequest, CodeImport } from '@kumite/models/code';

export function addImportsToFile(ast: t.File, requests: Map<string, CodeDiffRequest>): void {
    const requested = new Map<string, Required<Pick<CodeImport, 'source'>> & CodeImport>();
    for (const request of requests.values()) {
        for (const moduleImport of request.imports ?? []) {
            const existing = requested.get(moduleImport.source);
            if (!existing) {
                requested.set(moduleImport.source, {
                    source: moduleImport.source,
                    defaultImport: moduleImport.defaultImport,
                    namespaceImport: moduleImport.namespaceImport,
                    namedImports: [...(moduleImport.namedImports ?? [])],
                });
                continue;
            }
            if (!existing.defaultImport && moduleImport.defaultImport) {
                existing.defaultImport = moduleImport.defaultImport;
            }
            if (!existing.namespaceImport && moduleImport.namespaceImport) {
                existing.namespaceImport = moduleImport.namespaceImport;
            } else if (
                existing.namespaceImport &&
                moduleImport.namespaceImport &&
                existing.namespaceImport !== moduleImport.namespaceImport
            ) {
                throw new Error(
                    `Cannot safely merge namespace imports from "${moduleImport.source}".`,
                );
            }
            existing.namedImports = [
                ...new Set([
                    ...(existing.namedImports ?? []),
                    ...(moduleImport.namedImports ?? []),
                ]),
            ];
        }
    }
    if (requested.size === 0) {
        return;
    }

    const body = ast.program.body;
    const existingBySource = new Map<string, t.ImportDeclaration>();
    const namespaceBindings = new Map<string, string>();
    let lastImportIndex = -1;
    body.forEach((node, index) => {
        if (!t.isImportDeclaration(node)) {
            return;
        }
        lastImportIndex = index;
        existingBySource.set(node.source.value, node);
        for (const specifier of node.specifiers) {
            if (t.isImportNamespaceSpecifier(specifier)) {
                namespaceBindings.set(specifier.local.name, node.source.value);
            }
        }
    });

    const newDeclarations: t.ImportDeclaration[] = [];
    for (const moduleImport of requested.values()) {
        if (moduleImport.namespaceImport) {
            const existingSource = namespaceBindings.get(moduleImport.namespaceImport);
            if (existingSource && existingSource !== moduleImport.source) {
                throw new Error(
                    `Cannot safely add namespace import "${moduleImport.namespaceImport}" from "${moduleImport.source}" because the name is already used.`,
                );
            }
            if (!existingSource) {
                newDeclarations.push(
                    t.importDeclaration(
                        [t.importNamespaceSpecifier(t.identifier(moduleImport.namespaceImport))],
                        t.stringLiteral(moduleImport.source),
                    ),
                );
                namespaceBindings.set(moduleImport.namespaceImport, moduleImport.source);
            }
        }

        const regularImport = { ...moduleImport, namespaceImport: undefined };
        if (!regularImport.defaultImport && !regularImport.namedImports?.length) {
            continue;
        }
        const existing = existingBySource.get(regularImport.source);
        if (existing) {
            mergeImportDeclaration(existing, regularImport);
            continue;
        }
        const specifiers: Array<t.ImportDefaultSpecifier | t.ImportSpecifier> = [];
        if (regularImport.defaultImport) {
            specifiers.push(t.importDefaultSpecifier(t.identifier(regularImport.defaultImport)));
        }
        for (const name of regularImport.namedImports ?? []) {
            specifiers.push(t.importSpecifier(t.identifier(name), t.identifier(name)));
        }
        if (specifiers.length) {
            newDeclarations.push(
                t.importDeclaration(specifiers, t.stringLiteral(regularImport.source)),
            );
        }
    }
    if (newDeclarations.length) {
        body.splice(lastImportIndex + 1, 0, ...newDeclarations);
    }
}

function mergeImportDeclaration(declaration: t.ImportDeclaration, moduleImport: CodeImport): void {
    if (
        declaration.specifiers.some(t.isImportNamespaceSpecifier) &&
        moduleImport.namedImports?.length
    ) {
        throw new Error(
            `Cannot safely merge named imports with a namespace import from "${moduleImport.source}".`,
        );
    }
    const localNames = new Set(
        declaration.specifiers.filter(t.isImportSpecifier).map((specifier) => specifier.local.name),
    );
    const hasDefault = declaration.specifiers.some(t.isImportDefaultSpecifier);
    if (moduleImport.defaultImport && !hasDefault) {
        declaration.specifiers.unshift(
            t.importDefaultSpecifier(t.identifier(moduleImport.defaultImport)),
        );
    }
    for (const name of moduleImport.namedImports ?? []) {
        if (localNames.has(name)) {
            continue;
        }
        declaration.specifiers.push(t.importSpecifier(t.identifier(name), t.identifier(name)));
        localNames.add(name);
    }
}
