import * as t from '@babel/types';
import { isSupportedClassUtilityCall, readStaticClassValue } from '../diff/class-expression';
import { checkClassNameForwarding, findComponentDeclaration } from '../edit-target/ast';
import { jsxElementName } from './composition';
import type { ComponentDefinition, DefinitionRegistry } from './definitions';
import type { Confidence, Evidence, Lookup } from './types';

/**
 * What a definition can prove about itself.
 *
 * Every capability is derived from the AST: props bindings, the element that
 * receives className, and the class expression on it. There is no per-component
 * table, so a component added tomorrow is measured the same way as Button.
 */

export type ClassExpressionKind =
    | 'none'
    | 'static'
    | 'template-static'
    | 'utility-call'
    | 'template-dynamic'
    | 'conditional'
    | 'computed';

export interface ClassExpressionProof {
    kind: ClassExpressionKind;
    /** Classes the expression always contributes, when it is fully static. */
    staticClasses: string[] | null;
    /** Utility helper name when kind is `utility-call`. */
    utility: string | null;
    /** Appending one more string argument preserves the expression's meaning. */
    appendable: boolean;
    evidence: Evidence[];
}

export type ClassNameStatus = 'proven-root' | 'proven-nested' | 'absent' | 'ambiguous';

export interface ClassNameProof {
    status: ClassNameStatus;
    /** Element that receives the call-site className, when one was found. */
    element: string | null;
    /** Elements between the definition's root and the receiving element. */
    depth: number | null;
    /**
     * How a spread on the receiving element interacts with className.
     *
     * - `none`: no spread
     * - `safe-rest`: the spread is the rest object after `className` was
     *   destructured, so it cannot overwrite the call-site class
     * - `unsafe`: the spread can carry className (whole props object, or an
     *   object the AST does not account for)
     */
    spread: 'none' | 'safe-rest' | 'unsafe';
    expression: ClassExpressionProof;
    confidence: Confidence;
    evidence: Evidence[];
}

export interface ChildrenProof {
    forwarded: boolean;
    via: 'element-children' | 'spread' | null;
    element: string | null;
    confidence: Confidence;
    evidence: Evidence[];
}

export interface ComponentCapabilities {
    definition: ComponentDefinition;
    /** `alias` covers `const Dialog = DialogPrimitive.Root`, which has no body. */
    body: 'available' | 'alias' | 'missing';
    className: ClassNameProof;
    /**
     * Mirrors the Phase 3C gate exactly: root forwarding only, and no spread
     * that can overwrite the call-site class. `proven-nested` forwarding is
     * reported but does not widen the gate.
     */
    classNameEditable: boolean;
    children: ChildrenProof;
}

interface PropsShape {
    /** Param is a plain object (`props`), not a destructuring pattern. */
    wholeName: string | null;
    classNameName: string | null;
    childrenName: string | null;
    /** Rest object after destructuring, e.g. `props` in `({ className, ...props })`. */
    restName: string | null;
}

export function getCapabilities(
    registry: DefinitionRegistry,
    path: string,
    name: string,
): Lookup<ComponentCapabilities> {
    const file = registry.get(path);
    if (!file) {
        return {
            ok: false,
            reason: 'file-not-indexed',
            message: `The definition file is not indexed (${path}).`,
        };
    }

    const definition = registry.definition(path, name);
    if (!definition) {
        return {
            ok: false,
            reason: 'component-not-found',
            message: `${name} is not a top-level definition in ${file.path}.`,
        };
    }

    const declaration = findComponentDeclaration(file.ast, name);
    if (!declaration) {
        return {
            ok: true,
            value: {
                definition,
                body: hasInitializer(file.ast, name) ? 'alias' : 'missing',
                className: ambiguousClassName(file.path, definition, 'no inspectable render body'),
                classNameEditable: false,
                children: {
                    forwarded: false,
                    via: null,
                    element: null,
                    confidence: 'ambiguous',
                    evidence: [
                        {
                            kind: 'alias',
                            detail: `${name} has no local render function to inspect.`,
                            path: file.path,
                        },
                    ],
                },
            },
        };
    }

    const shape = readPropsShape(declaration.fn);
    const elements = collectElements(declaration.fn);
    const receiving = elements.find(
        (item) => forwardsClassName(item.element.openingElement.attributes, shape),
    );

    const explicitClassName = receiving
        ? explicitClassNameForwarding(receiving.element.openingElement.attributes, shape)
        : false;
    const spread = receiving
        ? classifySpread(receiving.element.openingElement.attributes, shape, explicitClassName)
        : 'none';
    const expression = receiving
        ? readExpression(receiving.element.openingElement, file.path)
        : emptyExpression(file.path);

    const status: ClassNameStatus = receiving
        ? receiving.depth === 0
            ? 'proven-root'
            : 'proven-nested'
        : 'absent';

    const forwarding = checkClassNameForwarding(file.ast, name);
    const className: ClassNameProof = {
        status,
        element: receiving ? jsxElementName(receiving.element) : null,
        depth: receiving?.depth ?? null,
        spread,
        expression,
        confidence: status === 'absent' || status === 'proven-root' || status === 'proven-nested'
            ? 'proven'
            : 'ambiguous',
        evidence: [
            ...(receiving
                ? [
                      {
                          kind: 'className-forwarding' as const,
                          detail: `\`className\` reaches <${jsxElementName(receiving.element) ?? '?'}> at depth ${receiving.depth}.`,
                          path: file.path,
                      },
                  ]
                : [
                      {
                          kind: 'className-forwarding' as const,
                          detail: `${name} never passes props to a JSX element, so a call-site className cannot render.`,
                          path: file.path,
                      },
                  ]),
            ...(forwarding.ok
                ? []
                : [
                      {
                          kind: 'className-forwarding' as const,
                          detail: forwarding.message,
                          path: file.path,
                      },
                  ]),
            ...expression.evidence,
        ],
    };

    const children = readChildren(elements, shape, file.path);

    return {
        ok: true,
        value: {
            definition,
            body: 'available',
            className,
            classNameEditable: forwarding.ok && spread !== 'unsafe',
            children,
        },
    };
}

function ambiguousClassName(
    path: string,
    definition: ComponentDefinition,
    reason: string,
): ClassNameProof {
    return {
        status: 'ambiguous',
        element: null,
        depth: null,
        spread: 'none',
        expression: emptyExpression(path),
        confidence: 'ambiguous',
        evidence: [
            {
                kind: 'alias',
                detail: `${definition.name}: ${reason}.`,
                path,
            },
        ],
    };
}

function emptyExpression(path: string): ClassExpressionProof {
    return {
        kind: 'none',
        staticClasses: null,
        utility: null,
        appendable: false,
        evidence: [
            {
                kind: 'class-expression',
                detail: 'No className expression was found on the receiving element.',
                path,
            },
        ],
    };
}

function readPropsShape(fn: t.Function): PropsShape {
    const shape: PropsShape = {
        wholeName: null,
        classNameName: null,
        childrenName: null,
        restName: null,
    };
    const param = fn.params[0];
    if (!param) {
        return shape;
    }
    if (t.isIdentifier(param)) {
        shape.wholeName = param.name;
        return shape;
    }
    if (!t.isObjectPattern(param)) {
        return shape;
    }
    for (const property of param.properties) {
        if (t.isRestElement(property) && t.isIdentifier(property.argument)) {
            shape.restName = property.argument.name;
            continue;
        }
        if (!t.isObjectProperty(property) || !t.isIdentifier(property.key)) {
            continue;
        }
        const local = bindingName(property.value);
        if (property.key.name === 'className') {
            shape.classNameName = local;
        } else if (property.key.name === 'children') {
            shape.childrenName = local;
        }
    }
    return shape;
}

function bindingName(value: t.ObjectProperty['value']): string | null {
    if (t.isIdentifier(value)) {
        return value.name;
    }
    if (t.isAssignmentPattern(value) && t.isIdentifier(value.left)) {
        return value.left.name;
    }
    return null;
}

interface ElementAtDepth {
    element: t.JSXElement;
    depth: number;
}

/**
 * JSX elements in source order with their distance from the returned root.
 * The first element is the root (depth 0); a nested component receives depth 1.
 */
function collectElements(fn: t.Function): ElementAtDepth[] {
    const elements: ElementAtDepth[] = [];
    walk(fn, 0);
    return elements;

    function walk(node: t.Node | null | undefined, depth: number): void {
        if (!node) {
            return;
        }
        if (t.isJSXElement(node)) {
            elements.push({ element: node, depth });
            for (const child of node.children) {
                walk(child, depth + 1);
            }
            return;
        }
        for (const key of t.VISITOR_KEYS[node.type] ?? []) {
            const value = (node as unknown as Record<string, unknown>)[key];
            if (Array.isArray(value)) {
                for (const item of value) {
                    if (isNode(item)) {
                        walk(item, depth);
                    }
                }
            } else if (isNode(value)) {
                walk(value, depth);
            }
        }
    }
}

function forwardsClassName(attributes: t.JSXOpeningElement['attributes'], shape: PropsShape): boolean {
    const explicit = explicitClassNameForwarding(attributes, shape);
    if (explicit) {
        return true;
    }
    return attributes.some((attribute) => {
        if (!t.isJSXSpreadAttribute(attribute)) {
            return false;
        }
        const source = spreadSource(attribute.argument, shape);
        // The rest object carries className only when it was not destructured out.
        return source === 'whole' || (source === 'rest' && shape.classNameName === null);
    });
}

function explicitClassNameForwarding(
    attributes: t.JSXOpeningElement['attributes'],
    shape: PropsShape,
): boolean {
    const attribute = attributes.find(
        (item): item is t.JSXAttribute =>
            t.isJSXAttribute(item) && item.name.name === 'className',
    );
    return attribute ? referencesProp(attribute.value, shape, 'className') : false;
}

function spreadSource(
    argument: t.JSXSpreadAttribute['argument'],
    shape: PropsShape,
): 'whole' | 'rest' | 'other' {
    if (t.isIdentifier(argument)) {
        if (shape.wholeName && argument.name === shape.wholeName) {
            return 'whole';
        }
        if (shape.restName && argument.name === shape.restName) {
            return 'rest';
        }
    }
    return 'other';
}

function classifySpread(
    attributes: t.JSXOpeningElement['attributes'],
    shape: PropsShape,
    explicitClassName: boolean,
): 'none' | 'safe-rest' | 'unsafe' {
    const sources = attributes
        .filter((attribute): attribute is t.JSXSpreadAttribute => t.isJSXSpreadAttribute(attribute))
        .map((attribute) => spreadSource(attribute.argument, shape));

    if (sources.length === 0) {
        return 'none';
    }
    if (sources.some((source) => source === 'other' || source === 'whole')) {
        return 'unsafe';
    }
    // All spreads are the destructured rest object. It excludes className when
    // className was destructured, and there is nothing to overwrite otherwise.
    return !explicitClassName || shape.classNameName !== null ? 'safe-rest' : 'unsafe';
}

function readExpression(
    openingElement: t.JSXOpeningElement,
    path: string,
): ClassExpressionProof {
    const attribute = openingElement.attributes.find(
        (item): item is t.JSXAttribute =>
            t.isJSXAttribute(item) && item.name.name === 'className',
    );
    if (!attribute) {
        return emptyExpression(path);
    }

    const staticClasses = readStaticClassValue(attribute.value);
    const value = attribute.value;
    if (t.isStringLiteral(value) || (t.isJSXExpressionContainer(value) && t.isStringLiteral(value.expression))) {
        return proof('static', staticClasses ?? [], null, true, path, 'className is a static string.');
    }

    if (!t.isJSXExpressionContainer(value)) {
        return proof('none', null, null, false, path, 'className has a value this engine cannot read.');
    }

    const expression = value.expression;
    if (t.isTemplateLiteral(expression)) {
        if (staticClasses) {
            return proof('template-static', staticClasses, null, true, path, 'className is a template literal without interpolations.');
        }
        return proof('template-dynamic', null, null, false, path, 'className is a template literal with interpolations.');
    }
    if (t.isCallExpression(expression) && isSupportedClassUtilityCall(expression)) {
        const utility = t.isIdentifier(expression.callee) ? expression.callee.name : null;
        return proof('utility-call', null, utility, true, path, `className is an argument to ${utility}().`);
    }
    if (t.isConditionalExpression(expression) || t.isLogicalExpression(expression)) {
        return proof('conditional', null, null, false, path, 'className is conditional.');
    }
    return proof('computed', null, null, false, path, 'className is an expression this engine cannot append to.');
}

function proof(
    kind: ClassExpressionKind,
    staticClasses: string[] | null,
    utility: string | null,
    appendable: boolean,
    path: string,
    detail: string,
): ClassExpressionProof {
    return {
        kind,
        staticClasses,
        utility,
        appendable,
        evidence: [{ kind: 'class-expression', detail, path }],
    };
}

function readChildren(
    elements: ElementAtDepth[],
    shape: PropsShape,
    path: string,
): ChildrenProof {
    for (const { element } of elements) {
        const rendersChildren = element.children.some((child) =>
            t.isJSXExpressionContainer(child)
                ? referencesProp(child.expression, shape, 'children')
                : false,
        );
        if (rendersChildren) {
            return {
                forwarded: true,
                via: 'element-children',
                element: jsxElementName(element),
                confidence: 'proven',
                evidence: [
                    {
                        kind: 'children',
                        detail: `{${shape.childrenName ?? 'children'}} is rendered by <${jsxElementName(element) ?? '?'}>.`,
                        path,
                    },
                ],
            };
        }
    }

    for (const { element } of elements) {
        const spreads = element.openingElement.attributes.some((attribute) => {
            if (!t.isJSXSpreadAttribute(attribute)) {
                return false;
            }
            const source = spreadSource(attribute.argument, shape);
            return source === 'whole' || (source === 'rest' && shape.childrenName === null);
        });
        if (spreads) {
            return {
                forwarded: true,
                via: 'spread',
                element: jsxElementName(element),
                confidence: 'proven',
                evidence: [
                    {
                        kind: 'children',
                        detail: `Props are spread onto <${jsxElementName(element) ?? '?'}>, which carries children through.`,
                        path,
                    },
                ],
            };
        }
    }

    return {
        forwarded: false,
        via: null,
        element: null,
        confidence: 'proven',
        evidence: [
            {
                kind: 'children',
                detail: 'No element renders or spreads children.',
                path,
            },
        ],
    };
}

function referencesProp(
    node: t.Node | null | undefined,
    shape: PropsShape,
    key: 'className' | 'children',
): boolean {
    if (!node) {
        return false;
    }
    const direct = key === 'className' ? shape.classNameName : shape.childrenName;
    if (t.isIdentifier(node) && direct && node.name === direct) {
        return true;
    }
    if (
        t.isMemberExpression(node) &&
        !node.computed &&
        t.isIdentifier(node.property) &&
        node.property.name === key &&
        t.isIdentifier(node.object) &&
        (node.object.name === shape.wholeName || node.object.name === shape.restName)
    ) {
        return true;
    }
    for (const childKey of t.VISITOR_KEYS[node.type] ?? []) {
        const value = (node as unknown as Record<string, unknown>)[childKey];
        if (Array.isArray(value)) {
            for (const item of value) {
                if (isNode(item) && referencesProp(item, shape, key)) {
                    return true;
                }
            }
        } else if (isNode(value) && referencesProp(value, shape, key)) {
            return true;
        }
    }
    return false;
}

function hasInitializer(ast: t.File, name: string): boolean {
    for (const statement of ast.program.body) {
        const declaration =
            t.isExportNamedDeclaration(statement) || t.isExportDefaultDeclaration(statement)
                ? statement.declaration
                : statement;
        if (!t.isVariableDeclaration(declaration)) {
            continue;
        }
        for (const declarator of declaration.declarations) {
            if (t.isIdentifier(declarator.id) && declarator.id.name === name) {
                return declarator.init !== null;
            }
        }
    }
    return false;
}

function isNode(value: unknown): value is t.Node {
    return typeof value === 'object' && value !== null && 'type' in value;
}
