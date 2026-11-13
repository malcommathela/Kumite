import * as t from '@babel/types';

/**
 * Visits JSX elements in source order.
 *
 * A plain walk is used instead of `@babel/traverse` because call-site indices
 * depend on document order being exactly the order an author reads, and the
 * visitor must be able to stop early.
 *
 * Returns `false` when the visitor asked to stop.
 */
export function walkJsxElements(
    node: t.Node,
    visit: (element: t.JSXElement) => boolean | void,
): boolean {
    if (t.isJSXElement(node) && visit(node) === false) {
        return false;
    }
    const keys = t.VISITOR_KEYS[node.type] ?? [];
    for (const key of keys) {
        const child = (node as unknown as Record<string, unknown>)[key];
        if (Array.isArray(child)) {
            for (const item of child) {
                if (isNode(item) && walkJsxElements(item, visit) === false) {
                    return false;
                }
            }
        } else if (isNode(child) && walkJsxElements(child, visit) === false) {
            return false;
        }
    }
    return true;
}

function isNode(value: unknown): value is t.Node {
    return typeof value === 'object' && value !== null && 'type' in value;
}
