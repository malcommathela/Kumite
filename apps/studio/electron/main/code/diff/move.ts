import type { NodePath } from '@babel/traverse';
import * as t from '@babel/types';
import type { CodeMove } from '@kumite/models/actions';
import { addKeyToElement, getOidFromJsxElement, jsxFilter } from './helpers';

export function moveElementInNode(path: NodePath<t.JSXElement>, element: CodeMove): void {
    const parentOid = getOidFromJsxElement(path.node.openingElement);
    const reparenting =
        Boolean(element.location.originalParentOid) &&
        element.location.originalParentOid !== parentOid;

    const children = path.node.children;
    const jsxElements = children.filter(jsxFilter);

    let elementToMove: t.JSXElement | t.JSXFragment | undefined = jsxElements.find((child) => {
        if (child.type !== 'JSXElement' || !child.openingElement) {
            return false;
        }
        const oid = getOidFromJsxElement(child.openingElement);
        return oid === element.oid;
    });

    if (!elementToMove && reparenting) {
        // The element still lives in its old parent, which may be anywhere in
        // this file. Move the actual AST node so nested ids and props survive.
        const program = path.findParent((candidate) => candidate.isProgram());
        if (!program) {
            console.error('Element not found for move');
            return;
        }
        elementToMove = findJsxNode(program.node, element.oid) ?? undefined;
        if (!elementToMove) {
            console.error(
                'Element not found for move. Reparenting between source files is not supported yet.',
            );
            return;
        }
        if (!detachNode(program.node, elementToMove)) {
            console.error('Could not detach the element from its original parent');
            return;
        }
    }

    if (!elementToMove) {
        console.error('Element not found for move');
        return;
    }

    addKeyToElement(elementToMove);

    if (jsxElements.includes(elementToMove)) {
        // Same-parent reorder: `index` counts siblings without the moved
        // element, so take it out before resolving the insertion point.
        const originalIndex = children.indexOf(elementToMove);
        if (originalIndex !== -1) {
            children.splice(originalIndex, 1);
        }
    }

    const remaining = children.filter(jsxFilter);
    const targetIndex = Math.min(element.location.index, remaining.length);
    if (targetIndex >= remaining.length) {
        children.push(elementToMove);
        return;
    }

    const targetChild = remaining[targetIndex];
    const targetChildIndex = children.indexOf(targetChild);
    children.splice(targetChildIndex, 0, elementToMove);
}

function findJsxNode(node: t.Node, oid: string): t.JSXElement | null {
    if (t.isJSXElement(node) && getOidFromJsxElement(node.openingElement) === oid) {
        return node;
    }
    for (const key of t.VISITOR_KEYS[node.type] ?? []) {
        const value = (node as unknown as Record<string, t.Node | t.Node[] | null | undefined>)[key];
        if (Array.isArray(value)) {
            for (const child of value) {
                if (!child || typeof (child as t.Node).type !== 'string') {
                    continue;
                }
                const found = findJsxNode(child, oid);
                if (found) {
                    return found;
                }
            }
        } else if (value && typeof (value as t.Node).type === 'string') {
            const found = findJsxNode(value as t.Node, oid);
            if (found) {
                return found;
            }
        }
    }
    return null;
}

/** Removes `target` from whichever child array in `root` holds it. */
function detachNode(root: t.Node, target: t.Node): boolean {
    for (const key of t.VISITOR_KEYS[root.type] ?? []) {
        const value = (root as unknown as Record<string, t.Node | t.Node[] | null | undefined>)[key];
        if (Array.isArray(value)) {
            const index = value.indexOf(target);
            if (index !== -1) {
                value.splice(index, 1);
                return true;
            }
            for (const child of value) {
                if (
                    child &&
                    typeof (child as t.Node).type === 'string' &&
                    detachNode(child, target)
                ) {
                    return true;
                }
            }
        } else if (
            value &&
            typeof (value as t.Node).type === 'string' &&
            detachNode(value as t.Node, target)
        ) {
            return true;
        }
    }
    return false;
}
