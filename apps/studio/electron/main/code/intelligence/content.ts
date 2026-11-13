import * as t from '@babel/types';
import type { ContentSpan } from '@kumite/models/code';
import type { TemplateNode } from '@kumite/models/element';
import type { AdapterExtraction, ComponentAdapter } from './adapters';
import type { Evidence, Lookup } from './types';

/**
 * Content intelligence: what a mapped element says, and whether it can be
 * changed without deleting logic.
 *
 * The rule from the baseline audit is the one enforced here: a field is editable
 * only when the source proves it is a plain value. A JSX text run that is
 * actually `{title}` is not a text field; an array that is imported is not a
 * data table; a property that is computed is not a cell. Nothing is inferred
 * from the rendered DOM, because the DOM cannot say where a value came from.
 */

export type ContentFieldKind = 'text' | 'attribute' | 'data';

export interface ContentField {
    kind: ContentFieldKind;
    /** Stable label a caller can show: `Text`, `alt`, `items[0].title`. */
    label: string;
    /** What the source currently says, as a user should read it. */
    value: string;
    /** Exact literal at the span; the write guard compares against this. */
    raw: string;
    /** Null when the field is empty and has no literal to address. */
    span: ContentSpan | null;
    editable: boolean;
    /** Why the field is not editable, when it is not. */
    reason: string | null;
}

export interface DataRow {
    index: number;
    fields: ContentField[];
}

export interface DataTable {
    /** Local identifier the element maps over. */
    source: string;
    span: ContentSpan;
    rows: DataRow[];
}

export interface NodeContent {
    /** Element name, e.g. `section` or `Card`. */
    element: string | null;
    text: ContentField;
    attributes: ContentField[];
    data: DataTable | null;
    /** Why a data table is absent, when the element looks data-driven. */
    dataReason: string | null;
    /** Set when a registry adapter owns this element's semantics. */
    adapter: AdapterExtraction | null;
    evidence: Evidence[];
}

/** Attributes that belong to the style path or are not content. */
const NON_CONTENT_ATTRIBUTES = new Set(['className', 'key', 'ref', 'style']);

export function extractContent(
    ast: t.File,
    node: TemplateNode,
    adapters: readonly ComponentAdapter[] = [],
): Lookup<NodeContent> {
    const element = findElementAt(ast, node);
    if (!element) {
        return {
            ok: false,
            reason: 'element-not-found',
            message: `No element starts at the mapped position in ${node.path}. Re-select the element.`,
        };
    }

    const evidence: Evidence[] = [
        {
            kind: 'declaration',
            detail: `The element at the mapped position is <${elementName(element)}>.`,
            path: node.path,
        },
    ];
    const text = textContentField(element);
    evidence.push({
        kind: 'children',
        detail: text.editable
            ? text.span
                ? 'The element has exactly one plain text run.'
                : 'The element has no children, so text can be added.'
            : `The element's children are not plain text: ${text.reason}`,
        path: node.path,
    });

    const attributes = attributeFields(element);
    if (attributes.length > 0) {
        evidence.push({
            kind: 'jsx-invocation',
            detail: `${attributes.length} string attribute${attributes.length === 1 ? '' : 's'} can be edited as content.`,
            path: node.path,
        });
    }

    const data = extractDataTable(ast, element);
    if (data.ok) {
        evidence.push({
            kind: 'alias',
            detail: `The element maps over ${data.value.source}, a local array literal with ${data.value.rows.length} row${data.value.rows.length === 1 ? '' : 's'}.`,
            path: node.path,
        });
    }

    const adapter = adapters.find((candidate) => candidate.elements.includes(elementName(element)));
    const adapterExtraction = adapter ? adapter.extract(ast, element, node.path) : null;
    if (adapterExtraction) {
        evidence.push(...adapterExtraction.evidence);
    }

    return {
        ok: true,
        value: {
            element: elementName(element),
            text,
            attributes,
            data: data.ok ? data.value : adapterExtraction?.data ?? null,
            dataReason: data.ok
                ? null
                : (adapterExtraction?.data ? null : (adapterExtraction?.reason ?? data.message)),
            adapter: adapterExtraction,
            evidence,
        },
    };
}

/**
 * The text rule, shared by the UI gate and the write guard so they cannot
 * disagree about what is editable.
 */
export function textContentField(element: t.JSXElement): ContentField {
    const base: ContentField = {
        kind: 'text',
        label: 'Text',
        value: '',
        raw: '',
        span: null,
        editable: true,
        reason: null,
    };

    if (elementName(element).toLowerCase() === 'img') {
        return { ...base, editable: false, reason: 'Images have no text content.' };
    }

    const children = element.children;
    if (children.length === 0) {
        return base;
    }
    if (children.some((child) => !t.isJSXText(child))) {
        return {
            ...base,
            editable: false,
            reason: 'The element contains elements or expressions, so replacing its children would delete logic.',
        };
    }

    const texts = children as t.JSXText[];
    const meaningful = texts.filter((child) => child.value.trim() !== '');
    if (meaningful.length === 0) {
        return base;
    }
    if (meaningful.length > 1) {
        return {
            ...base,
            editable: false,
            reason: 'The element has more than one text run, so there is no single value to replace.',
        };
    }

    const text = meaningful[0];
    return {
        ...base,
        value: text.value.trim(),
        raw: text.value,
        span: spanOf(text),
    };
}

function attributeFields(element: t.JSXElement): ContentField[] {
    const fields: ContentField[] = [];
    for (const attribute of element.openingElement.attributes) {
        if (!t.isJSXAttribute(attribute) || !t.isJSXIdentifier(attribute.name)) {
            continue;
        }
        const name = attribute.name.name;
        if (NON_CONTENT_ATTRIBUTES.has(name)) {
            continue;
        }
        const value = attribute.value;
        if (!t.isStringLiteral(value)) {
            continue;
        }
        fields.push({
            kind: 'attribute',
            label: name,
            value: value.value,
            raw: value.value,
            span: spanOf(value),
            editable: true,
            reason: null,
        });
    }
    return fields;
}

/**
 * A data table is the array literal the element's single `.map()` iterates,
 * and only when it is a local `const` in the same file with literal-valued
 * properties. Imported data, inline expressions and computed keys are refused:
 * their source is not in this file, so the model cannot address an edit.
 */
function extractDataTable(ast: t.File, element: t.JSXElement): DataTableLookup {
    const containers = element.children.filter(
        (child): child is t.JSXExpressionContainer => t.isJSXExpressionContainer(child),
    );
    if (containers.length !== 1) {
        return noTable('The element does not render one array expression.');
    }

    const expression = containers[0].expression;
    if (!t.isCallExpression(expression) || !t.isMemberExpression(expression.callee)) {
        return noTable('The element does not map over an array.');
    }
    const callee = expression.callee;
    if (!t.isIdentifier(callee.object) || !t.isIdentifier(callee.property)) {
        return noTable('The mapped value is not a plain local identifier.');
    }
    if (callee.property.name !== 'map') {
        return noTable(`The element calls ${callee.property.name}(), not map().`);
    }

    const name = callee.object.name;
    const declaration = findLocalConst(ast, name);
    if (!declaration || !t.isArrayExpression(declaration)) {
        return noTable(
            `${name} is not a local array literal in this file, so its rows have no source to edit.`,
        );
    }
    return dataTableFromArray(name, declaration);
}

export type DataTableLookup = { ok: true; value: DataTable } | { ok: false; message: string };

/**
 * The row rule, shared by the generic model and adapters: an array of object
 * literals whose values are plain strings or numbers. Anything else is refused
 * rather than flattened, so a cell always addresses one literal.
 */
export function dataTableFromArray(
    source: string,
    array: t.ArrayExpression,
): DataTableLookup {
    const tableSpan = spanOf(array);
    if (!tableSpan) {
        return noTable(`${source} has no source location.`);
    }

    const rows: DataRow[] = [];
    for (const [index, item] of array.elements.entries()) {
        if (!item) {
            return noTable(`${source} has a hole at index ${index}.`);
        }
        if (!t.isObjectExpression(item)) {
            return noTable(`${source}[${index}] is not an object literal.`);
        }
        const fields: ContentField[] = [];
        for (const property of item.properties) {
            if (!t.isObjectProperty(property) || property.computed) {
                return noTable(`${source}[${index}] has a spread or computed key.`);
            }
            if (!t.isIdentifier(property.key) && !t.isStringLiteral(property.key)) {
                return noTable(`${source}[${index}] has a non-identifier key.`);
            }
            const key = t.isIdentifier(property.key) ? property.key.name : property.key.value;
            const value = property.value;
            if (!t.isStringLiteral(value) && !t.isNumericLiteral(value)) {
                return noTable(`${source}[${index}].${key} is not a string or number literal.`);
            }
            const raw = t.isStringLiteral(value) ? value.value : String(value.value);
            fields.push({
                kind: 'data',
                label: `${source}[${index}].${key}`,
                value: raw,
                raw,
                span: spanOf(value),
                editable: true,
                reason: null,
            });
        }
        rows.push({ index, fields });
    }

    return {
        ok: true,
        value: { source, span: tableSpan, rows },
    };
}

function noTable(message: string): DataTableLookup {
    return { ok: false, message };
}

/**
 * Resolves a top-level `const` in this file, unwrapping `as`, `satisfies` and
 * parentheses so a typed literal (`{...} satisfies ChartConfig`) is still read.
 */
export function findLocalConst(ast: t.File, name: string): t.Expression | null {
    for (const statement of ast.program.body) {
        const declaration = t.isExportNamedDeclaration(statement) ? statement.declaration : statement;
        if (!t.isVariableDeclaration(declaration)) {
            continue;
        }
        for (const declarator of declaration.declarations) {
            if (
                t.isIdentifier(declarator.id) &&
                declarator.id.name === name &&
                declarator.init
            ) {
                return unwrapExpression(declarator.init);
            }
        }
    }
    return null;
}

export function unwrapExpression(node: t.Node): t.Expression | null {
    if (
        t.isTSAsExpression(node) ||
        t.isTSSatisfiesExpression(node) ||
        t.isTSNonNullExpression(node) ||
        t.isParenthesizedExpression(node)
    ) {
        return unwrapExpression(node.expression);
    }
    return t.isExpression(node) ? node : null;
}

/** Locates the element whose opening tag starts at the node's recorded position. */
export function findElementAt(ast: t.File, node: TemplateNode): t.JSXElement | null {
    const target = {
        line: node.startTag.start.line,
        column: node.startTag.start.column - 1,
    };
    let found: t.JSXElement | null = null;
    walk(ast.program, (candidate) => {
        if (found || !t.isJSXElement(candidate)) {
            return;
        }
        const loc = candidate.openingElement.loc;
        if (loc && loc.start.line === target.line && loc.start.column === target.column) {
            found = candidate;
        }
    });
    return found;
}

export function elementName(element: t.JSXElement): string {
    return jsxName(element.openingElement.name);
}

function jsxName(
    name: t.JSXIdentifier | t.JSXMemberExpression | t.JSXNamespacedName,
): string {
    if (t.isJSXIdentifier(name)) {
        return name.name;
    }
    if (t.isJSXMemberExpression(name)) {
        return `${jsxName(name.object)}.${name.property.name}`;
    }
    return `${name.namespace.name}:${name.name.name}`;
}

function spanOf(node: t.Node): ContentSpan | null {
    const loc = node.loc;
    if (!loc) {
        return null;
    }
    return {
        start: { line: loc.start.line, column: loc.start.column },
        end: { line: loc.end.line, column: loc.end.column },
    };
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
