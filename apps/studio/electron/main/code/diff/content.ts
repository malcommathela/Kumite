import * as t from '@babel/types';
import type { ContentChange } from '@kumite/models/code';

/**
 * Applies span-addressed content edits to the parsed file.
 *
 * The model that produced the span also recorded the exact literal. If the file
 * no longer says that at that position, the edit is refused rather than applied
 * to whatever happens to be there now. This is the same fail-closed rule the
 * class path uses, applied to content.
 */

export interface ContentChangeFailure {
    oid: string;
    message: string;
}

interface AddressedChange {
    oid: string;
    change: ContentChange;
}

type ContentNode = t.JSXText | t.StringLiteral | t.NumericLiteral;

export function applyContentChanges(
    ast: t.File,
    changes: AddressedChange[],
): ContentChangeFailure[] {
    if (changes.length === 0) {
        return [];
    }

    const index = new Map<string, ContentNode>();
    walk(ast.program, (node) => {
        if (!t.isJSXText(node) && !t.isStringLiteral(node) && !t.isNumericLiteral(node)) {
            return;
        }
        const loc = node.loc;
        if (!loc) {
            return;
        }
        index.set(
            keyOf(loc.start.line, loc.start.column, loc.end.line, loc.end.column),
            node,
        );
    });

    const failures: ContentChangeFailure[] = [];
    for (const { oid, change } of changes) {
        const span = change.span;
        const node = index.get(keyOf(span.start.line, span.start.column, span.end.line, span.end.column));
        if (!node) {
            failures.push({
                oid,
                message: `The content this edit targets is no longer at the recorded position (line ${span.start.line}). Re-open the element and retry.`,
            });
            continue;
        }
        if (valueOf(node) !== change.expected) {
            failures.push({
                oid,
                message: `The content changed since it was read (expected "${change.expected}"). Re-open the element and retry.`,
            });
            continue;
        }
        if (t.isNumericLiteral(node)) {
            const numeric = Number(change.value);
            if (!Number.isFinite(numeric)) {
                failures.push({
                    oid,
                    message: `"${change.value}" is not a number, and this cell holds a number.`,
                });
                continue;
            }
            node.value = numeric;
            continue;
        }
        node.value = change.value;
    }

    return failures;
}

function valueOf(node: ContentNode): string {
    return t.isNumericLiteral(node) ? String(node.value) : node.value;
}

function keyOf(
    startLine: number,
    startColumn: number,
    endLine: number,
    endColumn: number,
): string {
    return `${startLine}:${startColumn}-${endLine}:${endColumn}`;
}

function walk(node: t.Node, visit: (candidate: t.Node) => void): void {
    visit(node);
    for (const key of t.VISITOR_KEYS[node.type] ?? []) {
        const value = (node as unknown as Record<string, unknown>)[key];
        if (Array.isArray(value)) {
            for (const item of value) {
                if (isNode(item)) {
                    walk(item, visit);
                }
            }
        } else if (isNode(value)) {
            walk(value, visit);
        }
    }
}

function isNode(value: unknown): value is t.Node {
    return typeof value === 'object' && value !== null && 'type' in value;
}
