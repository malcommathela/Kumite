import * as t from '@babel/types';
import { getOidFromJsxElement } from '../diff/helpers';
import { walkJsxElements } from '../jsx-walk';

export type ClassNameForwardingFailure =
    | 'component-not-found'
    | 'no-classname-forwarding'
    | 'no-classname-prop';

export type ClassNameForwarding =
    | { ok: true; component: string; path: string | null }
    | { ok: false; reason: ClassNameForwardingFailure; message: string };

/** Number of JSX elements carrying this oid. A writable target must be exactly 1. */
export function countOidOccurrences(ast: t.File, oid: string): number {
    let count = 0;
    walkJsxElements(ast, (element) => {
        if (getOidFromJsxElement(element.openingElement) === oid) {
            count++;
        }
    });
    return count;
}

/**
 * Proves that the component accepts `className` from its props and passes it to
 * its root element. Anything else is refused: a call-site className that the
 * component ignores would report a change that never renders.
 */
export function checkClassNameForwarding(ast: t.File, component: string): ClassNameForwarding {
    const declaration = findComponentDeclaration(ast, component);
    if (!declaration) {
        return {
            ok: false,
            reason: 'component-not-found',
            message: `No component definition named ${component} was found in the implementation file.`,
        };
    }

    const bindings = getPropsBindings(declaration.fn);
    if (bindings.size === 0) {
        return {
            ok: false,
            reason: 'no-classname-prop',
            message: `${component} does not accept props, so a call-site className cannot reach its markup.`,
        };
    }

    const root = getRootElement(declaration.fn);
    if (!root) {
        return {
            ok: false,
            reason: 'no-classname-forwarding',
            message: `${component} does not return a single JSX root element.`,
        };
    }

    const openingElement = root.openingElement;
    const forwards = openingElement.attributes.some((attribute) => {
        if (t.isJSXSpreadAttribute(attribute)) {
            return referencesIdentifier(attribute.argument, bindings);
        }
        if (t.isJSXAttribute(attribute) && attribute.name.name === 'className') {
            return referencesIdentifier(attribute.value, bindings);
        }
        return false;
    });

    if (!forwards) {
        return {
            ok: false,
            reason: 'no-classname-forwarding',
            message: `${component} does not pass className (or its props) to its root element.`,
        };
    }
    return { ok: true, component, path: null };
}

export interface ComponentDeclaration {
    fn: t.Function;
}

/**
 * Wrappers that hand their render function the component's props. The function
 * passed to them is the component, so it must be inspected as such.
 */
const COMPONENT_WRAPPERS = new Set(['forwardRef', 'memo']);

export function findComponentDeclaration(
    ast: t.File,
    component: string,
): ComponentDeclaration | null {
    for (const node of ast.program.body) {
        const declaration = unwrapDeclaration(node);
        if (t.isFunctionDeclaration(declaration) && declaration.id?.name === component) {
            return { fn: declaration };
        }
        if (t.isVariableDeclaration(declaration)) {
            for (const declarator of declaration.declarations) {
                if (!t.isIdentifier(declarator.id) || declarator.id.name !== component) {
                    continue;
                }
                const fn = unwrapComponentFunction(declarator.init);
                if (fn) {
                    return { fn };
                }
            }
        }
    }
    return null;
}

/**
 * The render function of a component expression: the function itself, or the
 * function passed to `forwardRef` / `memo`.
 */
function unwrapComponentFunction(node: t.Node | null | undefined): t.Function | null {
    if (!node) {
        return null;
    }
    if (t.isArrowFunctionExpression(node) || t.isFunctionExpression(node)) {
        return node;
    }
    if (t.isCallExpression(node) && isComponentWrapper(node.callee)) {
        for (const argument of node.arguments) {
            const fn = unwrapComponentFunction(argument as t.Node);
            if (fn) {
                return fn;
            }
        }
    }
    return null;
}

function isComponentWrapper(callee: t.CallExpression['callee']): boolean {
    const name = t.isIdentifier(callee)
        ? callee.name
        : t.isMemberExpression(callee) && t.isIdentifier(callee.property)
          ? callee.property.name
          : null;
    return name !== null && COMPONENT_WRAPPERS.has(name);
}

function unwrapDeclaration(node: t.Program['body'][number]): t.Node {
    if (t.isExportNamedDeclaration(node) || t.isExportDefaultDeclaration(node)) {
        return node.declaration ?? node;
    }
    return node;
}

function getRootElement(fn: t.Function): t.JSXElement | null {
    const body = fn.body;
    if (t.isJSXElement(body)) {
        return body;
    }
    if (!t.isBlockStatement(body)) {
        return null;
    }
    for (const statement of body.body) {
        if (t.isReturnStatement(statement) && t.isJSXElement(statement.argument)) {
            return statement.argument;
        }
    }
    return null;
}

/** Names through which the component can receive `className`. */
function getPropsBindings(fn: t.Function): Set<string> {
    const bindings = new Set<string>();
    const param = fn.params.at(0);
    if (!param) {
        return bindings;
    }
    if (t.isIdentifier(param)) {
        bindings.add(param.name);
        return bindings;
    }
    if (t.isObjectPattern(param)) {
        for (const property of param.properties) {
            if (t.isRestElement(property) && t.isIdentifier(property.argument)) {
                bindings.add(property.argument.name);
                continue;
            }
            if (!t.isObjectProperty(property) || !t.isIdentifier(property.key)) {
                continue;
            }
            if (property.key.name !== 'className') {
                continue;
            }
            const value = property.value;
            if (t.isIdentifier(value)) {
                bindings.add(value.name);
            } else if (t.isAssignmentPattern(value) && t.isIdentifier(value.left)) {
                bindings.add(value.left.name);
            }
        }
    }
    return bindings;
}

function referencesIdentifier(node: t.Node | null | undefined, names: Set<string>): boolean {
    if (!node) {
        return false;
    }
    if (t.isIdentifier(node)) {
        return names.has(node.name);
    }
    for (const key of Object.keys(node)) {
        if (key === 'loc' || key === 'start' || key === 'end' || key.endsWith('Comments')) {
            continue;
        }
        const value = (node as unknown as Record<string, unknown>)[key];
        if (Array.isArray(value)) {
            for (const item of value) {
                if (isNode(item) && referencesIdentifier(item, names)) {
                    return true;
                }
            }
        } else if (isNode(value) && referencesIdentifier(value, names)) {
            return true;
        }
    }
    return false;
}

function isNode(value: unknown): value is t.Node {
    return typeof value === 'object' && value !== null && 'type' in value;
}
