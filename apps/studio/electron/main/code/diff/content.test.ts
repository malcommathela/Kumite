import { generate } from '@babel/generator';
import { parse } from '@babel/parser';
import * as t from '@babel/types';
import type { ContentSpan } from '@kumite/models/code';
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { applyContentChanges } from './content';

/**
 * Stage 4 write path. The guard is the point: a change is applied only when the
 * literal at the recorded span still says what the model read.
 */

const PARSE_OPTIONS = {
    plugins: ['typescript', 'jsx'] as const,
    sourceType: 'module' as const,
};

function parseFile(code: string): t.File {
    return parse(code, PARSE_OPTIONS as never) as t.File;
}

function spanOf(node: t.Node): ContentSpan {
    assert.ok(node.loc, 'fixture node has no location');
    return {
        start: { line: node.loc.start.line, column: node.loc.start.column },
        end: { line: node.loc.end.line, column: node.loc.end.column },
    };
}

function findLiteral(ast: t.File, value: string): t.StringLiteral {
    let found: t.StringLiteral | null = null;
    walk(ast.program, (node) => {
        if (!found && t.isStringLiteral(node) && node.value === value) {
            found = node;
        }
    });
    assert.ok(found, `fixture has no string literal "${value}"`);
    return found;
}

function findNumber(ast: t.File, value: number): t.NumericLiteral {
    let found: t.NumericLiteral | null = null;
    walk(ast.program, (node) => {
        if (!found && t.isNumericLiteral(node) && node.value === value) {
            found = node;
        }
    });
    assert.ok(found, `fixture has no number ${value}`);
    return found;
}

function findText(ast: t.File, value: string): t.JSXText {
    let found: t.JSXText | null = null;
    walk(ast.program, (node) => {
        if (!found && t.isJSXText(node) && node.value === value) {
            found = node;
        }
    });
    assert.ok(found, `fixture has no text "${value}"`);
    return found;
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

describe('content write-back', () => {
    it('replaces a string literal at its recorded span', () => {
        const ast = parseFile(`const items = [{ title: 'First' }];`);
        const literal = findLiteral(ast, 'First');
        const failures = applyContentChanges(ast, [
            {
                oid: 'row-0',
                change: { span: spanOf(literal), expected: 'First', value: 'Second' },
            },
        ]);
        assert.deepEqual(failures, []);
        assert.match(generate(ast).code, /["']Second["']/);
    });

    it('replaces a JSX text run at its recorded span', () => {
        const ast = parseFile(`export const A = () => <p>Hello</p>;`);
        const text = findText(ast, 'Hello');
        const failures = applyContentChanges(ast, [
            { oid: 'text', change: { span: spanOf(text), expected: 'Hello', value: 'Goodbye' } },
        ]);
        assert.deepEqual(failures, []);
        assert.match(generate(ast).code, />Goodbye</);
    });

    it('refuses when the source no longer says what the model read', () => {
        const ast = parseFile(`const items = [{ title: 'First' }];`);
        const literal = findLiteral(ast, 'First');
        const failures = applyContentChanges(ast, [
            {
                oid: 'row-0',
                change: { span: spanOf(literal), expected: 'Other', value: 'Second' },
            },
        ]);
        assert.equal(failures.length, 1);
        assert.equal(failures[0].oid, 'row-0');
        assert.match(failures[0].message, /changed since it was read/);
        assert.equal(generate(ast).code.includes('Second'), false);
    });

    it('refuses when the span no longer exists', () => {
        const ast = parseFile(`const items = [{ title: 'First' }];`);
        const failures = applyContentChanges(ast, [
            {
                oid: 'row-0',
                change: {
                    span: { start: { line: 40, column: 0 }, end: { line: 40, column: 6 } },
                    expected: 'First',
                    value: 'Second',
                },
            },
        ]);
        assert.equal(failures.length, 1);
        assert.match(failures[0].message, /no longer at the recorded position/);
    });

    it('reports every failing change in a batch', () => {
        const ast = parseFile(`const items = [{ title: 'First' }, { title: 'Third' }];`);
        const first = findLiteral(ast, 'First');
        const third = findLiteral(ast, 'Third');
        const failures = applyContentChanges(ast, [
            { oid: 'a', change: { span: spanOf(first), expected: 'First', value: 'Second' } },
            { oid: 'b', change: { span: spanOf(third), expected: 'Moved', value: 'Fourth' } },
        ]);
        assert.equal(failures.length, 1);
        assert.equal(failures[0].oid, 'b');
    });

    it('replaces a numeric literal without turning it into a string', () => {
        const ast = parseFile(`const chartData = [{ month: 'January', desktop: 186 }];`);
        const literal = findNumber(ast, 186);
        const failures = applyContentChanges(ast, [
            { oid: 'row-0', change: { span: spanOf(literal), expected: '186', value: '200' } },
        ]);
        assert.deepEqual(failures, []);
        const code = generate(ast).code;
        assert.match(code, /desktop: 200/);
        assert.equal(code.includes("'200'"), false);
    });

    it('refuses a non-numeric value for a numeric cell', () => {
        const ast = parseFile(`const chartData = [{ month: 'January', desktop: 186 }];`);
        const literal = findNumber(ast, 186);
        const failures = applyContentChanges(ast, [
            { oid: 'row-0', change: { span: spanOf(literal), expected: '186', value: 'lots' } },
        ]);
        assert.equal(failures.length, 1);
        assert.match(failures[0].message, /is not a number/);
        assert.match(generate(ast).code, /desktop: 186/);
    });
});
