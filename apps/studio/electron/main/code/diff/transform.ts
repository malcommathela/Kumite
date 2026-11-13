import traverse, { type NodePath } from '@babel/traverse';
import * as t from '@babel/types';
import { type CodeAction, CodeActionType } from '@kumite/models/actions';
import type {
    CodeDiffFailureReason,
    CodeDiffRequest,
    CodeImport,
    ContentChange,
} from '@kumite/models/code';
import { applyContentChanges } from './content';
import { groupElementsInNode, ungroupElementsInNode } from './group';
import { getOidFromJsxElement } from './helpers';
import { insertImageToNode, removeImageFromNode } from './image';
import { insertElementToNode } from './insert';
import { moveElementInNode } from './move';
import { removeElementFromNode } from './remove';
import { addClassToNode, replaceNodeClasses, updateNodeProp } from './style';
import { updateNodeTextContent } from './text';
import { assertNever } from '/common/helpers';

export interface TransformReport {
    /** How many source nodes each requested oid matched. Must be 1 to be writable. */
    matched: Map<string, number>;
    /** Transformations that could not be applied without changing existing logic. */
    failures: Array<{ oid: string; message: string; reason?: CodeDiffFailureReason }>;
}

export function transformAst(
    ast: t.File,
    oidToCodeDiff: Map<string, CodeDiffRequest>,
): TransformReport {
    const report: TransformReport = { matched: new Map(), failures: [] };

    // Content changes are addressed by the spans the model read, so they are
    // applied before any other transform can move or replace a node.
    for (const failure of applyContentChanges(ast, collectContentChanges(oidToCodeDiff))) {
        report.failures.push({ ...failure, reason: 'stale-content' });
    }

    traverse(ast, {
        JSXElement(path) {
            const currentOid = getOidFromJsxElement(path.node.openingElement);
            if (!currentOid) {
                console.error('No oid found for jsx element');
                return;
            }
            const codeDiffRequest = oidToCodeDiff.get(currentOid);
            if (codeDiffRequest) {
                report.matched.set(currentOid, (report.matched.get(currentOid) ?? 0) + 1);
                const { attributes, textContent, structureChanges } = codeDiffRequest;

                if (attributes) {
                    Object.entries(attributes).forEach(([key, value]) => {
                        if (key === 'className') {
                            const result = codeDiffRequest.overrideClasses
                                ? replaceNodeClasses(path.node, value as string)
                                : addClassToNode(path.node, value as string);
                            if (!result.ok) {
                                report.failures.push({ oid: currentOid, message: result.message });
                            }
                        } else {
                            updateNodeProp(path.node, key, value);
                        }
                    });
                }

                if (textContent !== undefined && textContent !== null) {
                    const result = updateNodeTextContent(path.node, textContent);
                    if (!result.ok) {
                        report.failures.push({
                            oid: currentOid,
                            message: result.message ?? 'This element does not hold plain text.',
                            reason: 'text-content-unsupported',
                        });
                    }
                }

                applyStructureChanges(path, structureChanges);
            }
        },
    });

    addImportsToFile(ast, oidToCodeDiff);
    return report;
}

function collectContentChanges(
    oidToCodeDiff: Map<string, CodeDiffRequest>,
): Array<{ oid: string; change: ContentChange }> {
    const changes: Array<{ oid: string; change: ContentChange }> = [];
    for (const [oid, request] of oidToCodeDiff) {
        for (const change of request.contentChanges ?? []) {
            changes.push({ oid, change });
        }
    }
    return changes;
}

function addImportsToFile(ast: t.File, oidToCodeDiff: Map<string, CodeDiffRequest>): void {
    const requested = new Map<string, Required<Pick<CodeImport, 'source'>> & CodeImport>();
    for (const request of oidToCodeDiff.values()) {
        for (const moduleImport of request.imports ?? []) {
            const existing = requested.get(moduleImport.source);
            if (!existing) {
                requested.set(moduleImport.source, {
                    source: moduleImport.source,
                    defaultImport: moduleImport.defaultImport,
                    namedImports: [...(moduleImport.namedImports ?? [])],
                });
                continue;
            }
            if (!existing.defaultImport && moduleImport.defaultImport) {
                existing.defaultImport = moduleImport.defaultImport;
            }
            const names = new Set(existing.namedImports ?? []);
            for (const name of moduleImport.namedImports ?? []) {
                names.add(name);
            }
            existing.namedImports = [...names];
        }
    }
    if (requested.size === 0) {
        return;
    }

    const body = ast.program.body;
    const existingBySource = new Map<string, t.ImportDeclaration>();
    let lastImportIndex = -1;
    body.forEach((node, index) => {
        if (t.isImportDeclaration(node)) {
            lastImportIndex = index;
            existingBySource.set(node.source.value, node);
        }
    });

    const newDeclarations: t.ImportDeclaration[] = [];
    for (const moduleImport of requested.values()) {
        const existing = existingBySource.get(moduleImport.source);
        if (existing) {
            mergeImportDeclaration(existing, moduleImport);
            continue;
        }
        const specifiers: Array<t.ImportDefaultSpecifier | t.ImportSpecifier> = [];
        if (moduleImport.defaultImport) {
            specifiers.push(t.importDefaultSpecifier(t.identifier(moduleImport.defaultImport)));
        }
        for (const name of moduleImport.namedImports ?? []) {
            specifiers.push(t.importSpecifier(t.identifier(name), t.identifier(name)));
        }
        if (specifiers.length === 0) {
            continue;
        }
        newDeclarations.push(t.importDeclaration(specifiers, t.stringLiteral(moduleImport.source)));
    }

    if (newDeclarations.length > 0) {
        body.splice(lastImportIndex + 1, 0, ...newDeclarations);
    }
}

function mergeImportDeclaration(declaration: t.ImportDeclaration, moduleImport: CodeImport): void {
    const localNames = new Set(
        declaration.specifiers
            .filter((specifier) => t.isImportSpecifier(specifier))
            .map((specifier) => specifier.local.name),
    );
    const hasDefault = declaration.specifiers.some(
        (specifier) =>
            t.isImportDefaultSpecifier(specifier) || t.isImportNamespaceSpecifier(specifier),
    );
    const additions: t.ImportSpecifier[] = [];
    if (moduleImport.defaultImport && !hasDefault) {
        declaration.specifiers.unshift(t.importDefaultSpecifier(t.identifier(moduleImport.defaultImport)));
    }
    for (const name of moduleImport.namedImports ?? []) {
        if (localNames.has(name)) {
            continue;
        }
        additions.push(t.importSpecifier(t.identifier(name), t.identifier(name)));
        localNames.add(name);
    }
    declaration.specifiers.push(...additions);
}

function applyStructureChanges(path: NodePath<t.JSXElement>, actions: CodeAction[]): void {
    if (actions.length === 0) {
        return;
    }
    for (const action of actions) {
        switch (action.type) {
            case CodeActionType.MOVE:
                moveElementInNode(path, action);
                break;
            case CodeActionType.INSERT:
                insertElementToNode(path, action);
                break;
            case CodeActionType.REMOVE:
                removeElementFromNode(path, action);
                break;
            case CodeActionType.GROUP:
                groupElementsInNode(path, action);
                break;
            case CodeActionType.UNGROUP:
                ungroupElementsInNode(path, action);
                break;
            case CodeActionType.INSERT_IMAGE:
                insertImageToNode(path, action);
                break;
            case CodeActionType.REMOVE_IMAGE:
                removeImageFromNode(path, action);
                break;
            default:
                assertNever(action);
        }
    }
}
