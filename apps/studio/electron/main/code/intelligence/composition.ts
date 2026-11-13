import * as t from '@babel/types';
import type { TemplateNode, TemplateNodePart } from '@kumite/models/element';
import { findComponentDeclaration } from '../edit-target/ast';
import type { ComponentDefinition, DefinitionRegistry } from './definitions';
import type { Confidence, Evidence } from './types';

/**
 * Relationships between a mapped node and the definitions around it.
 *
 * Ownership answers "which exported definition does this source node belong
 * to". Composition answers "what does this JSX element render". Both return the
 * proof they used; neither falls back to a name that merely looks right.
 */

export type OwnershipFailure =
    | 'file-not-indexed'
    | 'no-component'
    | 'definition-not-found'
    | 'definition-not-exported'
    | 'part-not-found';

export type OwnershipResolution =
    | {
          ok: true;
          definition: ComponentDefinition;
          part: TemplateNodePart | null;
          confidence: Confidence;
          evidence: Evidence[];
      }
    | {
          ok: false;
          reason: OwnershipFailure;
          confidence: Confidence;
          evidence: Evidence[];
          message: string;
      };

/**
 * Re-verifies the definition/part identity a mapping recorded.
 *
 * A recorded identity is `proven` only when the file still declares the same
 * name, exports it, and (for a part) still declares that part inside the
 * definition. Anything else is a typed failure, not a best guess.
 */
export function resolveOwnership(
    registry: DefinitionRegistry,
    node: TemplateNode,
): OwnershipResolution {
    const file = registry.get(node.path);
    if (!file) {
        return failure(
            'file-not-indexed',
            'ambiguous',
            [],
            `The mapped file is not part of this engine index (${node.path}).`,
        );
    }

    if (!node.component) {
        return failure(
            'no-component',
            'ambiguous',
            [],
            'The node is not inside a component declaration, so it has no owner.',
        );
    }

    const recorded = node.definition;
    if (!recorded) {
        // Older mappings have no identity. A unique exported definition can be
        // re-derived, but that is an inference, not a proof.
        const definition = registry.definition(node.path, node.component);
        if (!definition) {
            return failure(
                'definition-not-found',
                'ambiguous',
                [],
                `${node.component} is not a top-level definition in ${file.path}.`,
            );
        }
        if (definition.exportKind === 'none') {
            return failure(
                'definition-not-exported',
                'ambiguous',
                [],
                `${node.component} is declared in ${file.path} but never exported.`,
            );
        }
        return {
            ok: true,
            definition,
            part: null,
            confidence: 'inferred',
            evidence: [
                {
                    kind: 'declaration',
                    detail: `The mapping names ${node.component}, which is exported from ${file.path}.`,
                    path: file.path,
                },
            ],
        };
    }

    const definition = registry.definition(node.path, recorded.name);
    if (!definition) {
        return failure(
            'definition-not-found',
            'ambiguous',
            [],
            `The recorded definition ${recorded.name} no longer exists in ${file.path}.`,
        );
    }
    if (definition.exportKind === 'none') {
        return failure(
            'definition-not-exported',
            'ambiguous',
            [],
            `The recorded definition ${recorded.name} is no longer exported from ${file.path}.`,
        );
    }

    const evidence: Evidence[] = [
        {
            kind: 'export',
            detail: `${definition.name} is exported ${definition.exportKind === 'default' ? 'as the default' : `by name`} from ${file.path}.`,
            path: file.path,
        },
    ];

    let part: TemplateNodePart | null = null;
    if (node.part) {
        if (node.part.name !== node.component) {
            return failure(
                'part-not-found',
                'ambiguous',
                evidence,
                `The recorded part ${node.part.name} does not match the mapped component ${node.component}.`,
            );
        }
        if (node.part.owner !== definition.name) {
            return failure(
                'part-not-found',
                'ambiguous',
                evidence,
                `The recorded part belongs to ${node.part.owner}, not ${definition.name}.`,
            );
        }
        if (node.part.name !== definition.name && !declaresName(file.ast, definition, node.part.name)) {
            return failure(
                'part-not-found',
                'ambiguous',
                evidence,
                `${definition.name} no longer declares the part ${node.part.name}.`,
            );
        }
        part = node.part;
        evidence.push({
            kind: 'declaration',
            detail:
                part.name === definition.name
                    ? `The node is inside ${definition.name}.`
                    : `${definition.name} declares ${part.name}, which contains the node.`,
            path: file.path,
        });
    }

    return { ok: true, definition, part, confidence: 'proven', evidence };
}

export type ContainmentFailure = 'component-mismatch' | 'component-not-declared';

export type ContainmentResolution =
    | {
          ok: true;
          /** Innermost first: the declarations that contain the node's start tag. */
          enclosing: string[];
          evidence: Evidence[];
      }
    | {
          ok: false;
          reason: ContainmentFailure;
          message: string;
          evidence: Evidence[];
      };

/**
 * Re-derives which declarations contain a mapped node, from its start tag.
 *
 * The mapping records the innermost enclosing declaration in `node.component`.
 * This reads the same fact back from the AST, so a mapping that points at a
 * sibling component — or at a file revision that has since moved — fails here
 * instead of letting an edit reach the wrong source.
 */
export function verifyContainment(ast: t.File, node: TemplateNode): ContainmentResolution {
    const enclosing = enclosingDeclarations(ast, {
        line: node.startTag.start.line,
        // TemplateTag columns are 1-based; Babel locations are 0-based.
        column: node.startTag.start.column - 1,
    });
    const innermost = enclosing.at(0) ?? null;
    const evidence: Evidence[] = [
        {
            kind: 'declaration',
            detail: innermost
                ? `The element starts inside ${innermost}.`
                : 'The element is not inside a function, class or variable declaration.',
            path: node.path,
        },
    ];

    if (innermost !== node.component) {
        return {
            ok: false,
            reason: node.component ? 'component-mismatch' : 'component-not-declared',
            message: innermost
                ? `The mapping says this element belongs to ${node.component ?? 'no component'}, but it starts inside ${innermost}. Re-select the element.`
                : `The mapping says this element belongs to ${node.component}, but it is no longer inside that declaration. Re-select the element.`,
            evidence,
        };
    }

    return { ok: true, enclosing, evidence };
}

interface Span {
    line: number;
    column: number;
}

/**
 * Declaration names containing a position, innermost first.
 *
 * The node kinds mirror the mapping's own component stack: function and class
 * declarations by id, and a variable declaration by its first declarator id.
 */
function enclosingDeclarations(ast: t.File, position: Span): string[] {
    const found: Array<{ name: string; start: Span }> = [];
    collectEnclosing(ast.program, position, found);
    return found
        .sort((a, b) => comparePositions(b.start, a.start))
        .map((item) => item.name);
}

function collectEnclosing(
    node: t.Node,
    position: Span,
    found: Array<{ name: string; start: Span }>,
): void {
    const name = declarationName(node);
    if (name && containsPosition(node, position)) {
        found.push({ name, start: node.loc!.start });
    }
    for (const key of t.VISITOR_KEYS[node.type] ?? []) {
        const value = (node as unknown as Record<string, unknown>)[key];
        if (Array.isArray(value)) {
            for (const item of value) {
                if (isNode(item)) {
                    collectEnclosing(item, position, found);
                }
            }
        } else if (isNode(value)) {
            collectEnclosing(value, position, found);
        }
    }
}

function declarationName(node: t.Node): string | null {
    if (t.isFunctionDeclaration(node) || t.isClassDeclaration(node)) {
        return node.id?.name ?? null;
    }
    if (t.isVariableDeclaration(node)) {
        const first = node.declarations[0];
        return first && t.isIdentifier(first.id) ? first.id.name : null;
    }
    return null;
}

function containsPosition(node: t.Node, position: Span): boolean {
    const loc = node.loc;
    if (!loc) {
        return false;
    }
    return comparePositions(loc.start, position) <= 0 && comparePositions(position, loc.end) <= 0;
}

function comparePositions(a: Span, b: Span): number {
    return a.line - b.line || a.column - b.column;
}

function failure(
    reason: OwnershipFailure,
    confidence: Confidence,
    evidence: Evidence[],
    message: string,
): OwnershipResolution {
    return { ok: false, reason, confidence, evidence, message };
}

/**
 * True when `name` is declared anywhere inside the definition's render function.
 * A local alias or helper (`const Comp = asChild ? Slot : 'button'`) is a part,
 * and this is the proof that it still exists.
 */
function declaresName(ast: t.File, definition: ComponentDefinition, name: string): boolean {
    const declaration = findComponentDeclaration(ast, definition.name);
    return declaration ? containsDeclaration(declaration.fn, name) : false;
}

function containsDeclaration(node: t.Node, name: string): boolean {
    if (t.isFunctionDeclaration(node) && node.id?.name === name) {
        return true;
    }
    if (t.isClassDeclaration(node) && node.id?.name === name) {
        return true;
    }
    if (t.isVariableDeclarator(node) && t.isIdentifier(node.id) && node.id.name === name) {
        return true;
    }
    for (const key of t.VISITOR_KEYS[node.type] ?? []) {
        const value = (node as unknown as Record<string, unknown>)[key];
        if (Array.isArray(value)) {
            for (const item of value) {
                if (isNode(item) && containsDeclaration(item, name)) {
                    return true;
                }
            }
        } else if (isNode(value) && containsDeclaration(value, name)) {
            return true;
        }
    }
    return false;
}

function isNode(value: unknown): value is t.Node {
    return typeof value === 'object' && value !== null && 'type' in value;
}

export type CallSiteRelation =
    | 'dom-element'
    | 'same-file-definition'
    | 'imported-definition'
    | 'external-component'
    | 'unknown-component';

export interface CallSiteComposition {
    element: string;
    relation: CallSiteRelation;
    /** Definition in the indexed files, when the call site resolves to one. */
    target: ComponentDefinition | null;
    specifier: string | null;
    resolvedPath: string | null;
    confidence: Confidence;
    evidence: Evidence[];
}

/**
 * Resolves what a JSX element renders.
 *
 * Intrinsic names stay honest DOM elements. Uppercase names are looked up in
 * the file first, then through its imports. A name with no definition and no
 * import is `unknown-component`: it is usually a local alias or a global, and
 * naming a definition anyway would edit the wrong source.
 */
export function describeCallSite(
    registry: DefinitionRegistry,
    fromPath: string,
    element: t.JSXElement | string,
): CallSiteComposition {
    const name = typeof element === 'string' ? element : jsxElementName(element);
    if (!name) {
        return unknown(fromPath, '<unknown>', 'The JSX element has no readable name.');
    }

    const file = registry.get(fromPath);
    if (!file) {
        return unknown(fromPath, name, `The calling file is not indexed (${fromPath}).`);
    }

    if (isIntrinsic(name)) {
        return {
            element: name,
            relation: 'dom-element',
            target: null,
            specifier: null,
            resolvedPath: null,
            confidence: 'proven',
            evidence: [
                {
                    kind: 'jsx-invocation',
                    detail: `<${name}> is an intrinsic DOM element, not a component.`,
                    path: file.path,
                },
            ],
        };
    }

    const root = rootName(name);
    const definition = registry.definition(file.path, root);
    if (definition && !name.includes('.')) {
        return {
            element: name,
            relation: 'same-file-definition',
            target: definition,
            specifier: null,
            resolvedPath: file.path,
            confidence: 'proven',
            evidence: [
                {
                    kind: 'declaration',
                    detail: `<${name}> is the ${definition.declarationKind} declared in the same file.`,
                    path: file.path,
                },
            ],
        };
    }

    const binding = registry.resolveImport(file.path, root);
    if (!binding) {
        return unknown(
            fromPath,
            name,
            `<${name}> has no local definition and no import; it may be a local alias or a global.`,
        );
    }

    if (binding.resolution === 'external') {
        return {
            element: name,
            relation: 'external-component',
            target: null,
            specifier: binding.specifier,
            resolvedPath: null,
            confidence: 'proven',
            evidence: [
                {
                    kind: 'import',
                    detail: `<${name}> comes from the external package ${binding.specifier}.`,
                    path: file.path,
                },
            ],
        };
    }

    if (!binding.resolvedPath) {
        return unknown(
            fromPath,
            name,
            `The import of ${root} from ${binding.specifier} did not resolve to an indexed file.`,
        );
    }

    const importedName = binding.imported === '*' ? name.split('.').at(-1) ?? root : binding.imported;
    const target =
        binding.imported === 'default'
            ? registry.defaultDefinition(binding.resolvedPath)
            : registry.definition(binding.resolvedPath, importedName);
    if (!target) {
        return unknown(
            fromPath,
            name,
            `${binding.specifier} resolved to ${binding.resolvedPath}, but it does not declare ${importedName}.`,
        );
    }

    const inferred = binding.resolution === 'alias-inferred';
    return {
        element: name,
        relation: 'imported-definition',
        target,
        specifier: binding.specifier,
        resolvedPath: binding.resolvedPath,
        confidence: inferred ? 'inferred' : 'proven',
        evidence: [
            {
                kind: 'import',
                detail: inferred
                    ? `<${name}> resolved through the alias ${binding.specifier}, the only indexed file with that suffix.`
                    : `<${name}> imports ${binding.imported === 'default' ? 'the default export' : importedName} from ${binding.specifier}.`,
                path: file.path,
            },
            {
                kind: 'declaration',
                detail: `${target.name} is declared in ${binding.resolvedPath}.`,
                path: binding.resolvedPath,
            },
        ],
    };
}

function unknown(fromPath: string, element: string, detail: string): CallSiteComposition {
    return {
        element,
        relation: 'unknown-component',
        target: null,
        specifier: null,
        resolvedPath: null,
        confidence: 'ambiguous',
        evidence: [{ kind: 'unresolved', detail, path: fromPath }],
    };
}

function isIntrinsic(name: string): boolean {
    const first = name[0] ?? '';
    return first === first.toLowerCase() && first !== first.toUpperCase();
}

function rootName(name: string): string {
    return name.split('.')[0];
}

/** `Foo`, `Foo.Bar`, or `ns:name`, flattened for evidence and tests. */
export function jsxElementName(element: t.JSXElement): string | null {
    return flattenName(element.openingElement.name);
}

function flattenName(name: t.JSXOpeningElement['name']): string | null {
    if (t.isJSXIdentifier(name)) {
        return name.name;
    }
    if (t.isJSXMemberExpression(name)) {
        const object = flattenName(name.object);
        return object ? `${object}.${name.property.name}` : null;
    }
    if (t.isJSXNamespacedName(name)) {
        return `${name.namespace.name}:${name.name.name}`;
    }
    return null;
}
