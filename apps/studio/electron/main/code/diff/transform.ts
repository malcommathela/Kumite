import traverse, { type NodePath } from '@babel/traverse';
import * as t from '@babel/types';
import { type CodeAction, CodeActionType } from '@kumite/models/actions';
import type { CodeDiffFailureReason, CodeDiffRequest, ContentChange } from '@kumite/models/code';
import { applyContentChanges } from './content';
import { groupElementsInNode, ungroupElementsInNode } from './group';
import { getOidFromJsxElement } from './helpers';
import { insertImageToNode, removeImageFromNode } from './image';
import { insertElementToNode } from './insert';
import { moveElementInNode } from './move';
import { removeElementFromNode } from './remove';
import { addClassToNode, replaceNodeClasses, updateNodeProp } from './style';
import { updateNodeTextContent } from './text';
import { addImportsToFile } from './imports';
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
