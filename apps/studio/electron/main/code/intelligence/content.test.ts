import { parse } from '@babel/parser';
import * as t from '@babel/types';
import type { TemplateNode } from '@kumite/models/element';
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { ComponentIntelligence } from './index';
import { extractContent, findElementAt, textContentField } from './content';

/**
 * Stage 4 content model. Every fixture states what the source proves, and the
 * refusals are as important as the extractions: dynamic text, imported data and
 * computed keys must not become editable fields.
 */

const PARSE_OPTIONS = {
    plugins: ['typescript', 'jsx'] as const,
    sourceType: 'module' as const,
    allowImportExportEverywhere: true,
};

const PATH = 'C:/repo/src/page.tsx';

function parseFile(code: string): t.File {
    return parse(code, PARSE_OPTIONS as never) as t.File;
}

function collectJsxElements(ast: t.Node): t.JSXElement[] {
    const elements: t.JSXElement[] = [];
    visit(ast);
    return elements;

    function visit(node: t.Node): void {
        if (t.isJSXElement(node)) {
            elements.push(node);
        }
        for (const key of t.VISITOR_KEYS[node.type] ?? []) {
            const value = (node as unknown as Record<string, unknown>)[key];
            if (Array.isArray(value)) {
                for (const item of value) {
                    if (isNode(item)) {
                        visit(item);
                    }
                }
            } else if (isNode(value)) {
                visit(value);
            }
        }
    }
}

function elementNamed(ast: t.Node, name: string): t.JSXElement {
    const element = collectJsxElements(ast).find((item) => {
        const tag = item.openingElement.name;
        return t.isJSXIdentifier(tag) && tag.name === name;
    });
    assert.ok(element, `fixture has no <${name}> element`);
    return element;
}

function nodeFor(element: t.JSXElement, filePath = PATH): TemplateNode {
    assert.ok(element.openingElement.loc, 'fixture element has no location');
    return {
        path: filePath,
        startTag: {
            start: {
                line: element.openingElement.loc.start.line,
                column: element.openingElement.loc.start.column + 1,
            },
            end: {
                line: element.openingElement.loc.end.line,
                column: element.openingElement.loc.end.column,
            },
        },
        endTag: null,
        component: null,
    };
}

function isNode(value: unknown): value is t.Node {
    return typeof value === 'object' && value !== null && 'type' in value;
}

describe('content extraction', () => {
    it('reads a single plain text run', () => {
        const ast = parseFile(`export function Page() { return <p>Hello there</p>; }`);
        const element = elementNamed(ast, 'p');
        const field = textContentField(element);
        assert.equal(field.editable, true);
        assert.equal(field.value, 'Hello there');
        assert.equal(field.raw, 'Hello there');
        assert.ok(field.span);
    });

    it('refuses text that is actually an expression', () => {
        const ast = parseFile(`export function Page({ title }: { title: string }) {
    return <p>{title}</p>;
}`);
        const field = textContentField(elementNamed(ast, 'p'));
        assert.equal(field.editable, false);
        assert.match(field.reason ?? '', /elements or expressions/);
    });

    it('refuses text next to an element child', () => {
        const ast = parseFile(`export function Page() {
    return <p>Hello <strong>world</strong></p>;
}`);
        const field = textContentField(elementNamed(ast, 'p'));
        assert.equal(field.editable, false);
    });

    it('allows text to be added to an empty element', () => {
        const ast = parseFile(`export function Page() { return <p></p>; }`);
        const field = textContentField(elementNamed(ast, 'p'));
        assert.equal(field.editable, true);
        assert.equal(field.value, '');
        assert.equal(field.span, null);
    });

    it('refuses text on an image', () => {
        const ast = parseFile(`export function Page() { return <img src="/a.png" alt="A" />; }`);
        const field = textContentField(elementNamed(ast, 'img'));
        assert.equal(field.editable, false);
        assert.match(field.reason ?? '', /Images/);
    });

    it('extracts string attributes and skips style props', () => {
        const ast = parseFile(`export function Page({ title }: { title: string }) {
    return <img src="/a.png" alt="A photo" className="rounded" style={{}} title={title} />;
}`);
        const content = extractContent(ast, nodeFor(elementNamed(ast, 'img')));
        assert.equal(content.ok, true);
        if (!content.ok) {
            return;
        }
        assert.deepEqual(
            content.value.attributes.map((field) => [field.label, field.value]),
            [
                ['src', '/a.png'],
                ['alt', 'A photo'],
            ],
        );
    });

    it('reads a data table from a local array the element maps over', () => {
        const ast = parseFile(`const items = [
    { title: 'First', description: 'One' },
    { title: 'Second', description: 'Two' },
];
export function Page() {
    return (
        <ul>
            {items.map((item) => (
                <li key={item.title}>{item.title}</li>
            ))}
        </ul>
    );
}`);
        const content = extractContent(ast, nodeFor(elementNamed(ast, 'ul')));
        assert.equal(content.ok, true);
        if (!content.ok) {
            return;
        }
        const table = content.value.data;
        assert.ok(table, content.value.dataReason ?? 'expected a data table');
        assert.equal(table.source, 'items');
        assert.equal(table.rows.length, 2);
        assert.deepEqual(
            table.rows[1].fields.map((field) => [field.label, field.value]),
            [
                ['items[1].title', 'Second'],
                ['items[1].description', 'Two'],
            ],
        );
        assert.ok(table.rows[1].fields[0].span);
    });

    it('reads numeric cells as editable data fields', () => {
        const ast = parseFile(`const chartData = [
    { month: 'January', desktop: 186 },
    { month: 'February', desktop: 305 },
];
export function Page() {
    return <ul>{chartData.map((row) => <li key={row.month}>{row.desktop}</li>)}</ul>;
}`);
        const content = extractContent(ast, nodeFor(elementNamed(ast, 'ul')));
        assert.equal(content.ok, true);
        if (!content.ok) {
            return;
        }
        const table = content.value.data;
        assert.ok(table, content.value.dataReason ?? 'expected a data table');
        assert.deepEqual(
            table.rows[1].fields.map((field) => [field.label, field.value]),
            [
                ['chartData[1].month', 'February'],
                ['chartData[1].desktop', '305'],
            ],
        );
        assert.ok(table.rows[1].fields[1].span);
    });

    it('unwraps a typed literal before reading its rows', () => {
        const ast = parseFile(`const items = [{ title: 'First' }] as const;
export function Page() {
    return <ul>{items.map((item) => <li key={item.title} />)}</ul>;
}`);
        const content = extractContent(ast, nodeFor(elementNamed(ast, 'ul')));
        assert.equal(content.ok, true);
        if (!content.ok) {
            return;
        }
        assert.equal(content.value.data?.rows.length, 1);
    });

    it('refuses data that comes from an import', () => {
        const ast = parseFile(`import { items } from './data';
export function Page() {
    return <ul>{items.map((item) => <li key={item}>{item}</li>)}</ul>;
}`);
        const content = extractContent(ast, nodeFor(elementNamed(ast, 'ul')));
        assert.equal(content.ok, true);
        if (!content.ok) {
            return;
        }
        assert.equal(content.value.data, null);
        assert.match(content.value.dataReason ?? '', /not a local array literal/);
    });

    it('refuses a computed property in the data table', () => {
        const ast = parseFile(`const items = [{ [key]: 'First' }];
export function Page() {
    return <ul>{items.map((item) => <li key={item.key} />)}</ul>;
}`);
        const content = extractContent(ast, nodeFor(elementNamed(ast, 'ul')));
        assert.equal(content.ok, true);
        if (!content.ok) {
            return;
        }
        assert.equal(content.value.data, null);
        assert.match(content.value.dataReason ?? '', /computed key/);
    });

    it('finds the element at the mapped position, not its sibling', () => {
        const ast = parseFile(`export function Page() {
    return (
        <section>
            <p>One</p>
            <p>Two</p>
        </section>
    );
}`);
        const paragraphs = collectJsxElements(ast).filter(
            (element) => t.isJSXIdentifier(element.openingElement.name) && element.openingElement.name.name === 'p',
        );
        assert.equal(paragraphs.length, 2);
        const second = findElementAt(ast, nodeFor(paragraphs[1]));
        assert.equal(second, paragraphs[1]);
    });

    it('refuses a node whose position no longer has an element', () => {
        const ast = parseFile(`export function Page() { return <p>One</p>; }`);
        const stale: TemplateNode = {
            path: PATH,
            startTag: { start: { line: 99, column: 1 }, end: { line: 99, column: 3 } },
            endTag: null,
            component: null,
        };
        const content = extractContent(ast, stale);
        assert.equal(content.ok, false);
        assert.equal(content.ok === false && content.reason, 'element-not-found');
    });

    it('exposes the model through the engine facade', () => {
        const ast = parseFile(`export function Page() { return <p>Hello</p>; }`);
        const engine = new ComponentIntelligence([{ path: PATH, ast }]);
        const content = engine.content(nodeFor(elementNamed(ast, 'p')));
        assert.equal(content.ok, true);
        assert.equal(content.ok && content.value.text.value, 'Hello');

        const missing = engine.content(nodeFor(elementNamed(ast, 'p'), 'C:/repo/src/other.tsx'));
        assert.equal(missing.ok, false);
        assert.equal(missing.ok === false && missing.reason, 'file-not-indexed');
    });
});
