import { reverseMoveLocation } from '@/lib/editor/engine/history/helpers';
import traverse, { type NodePath } from '@babel/traverse';
import type * as t from '@babel/types';
import {
    CodeActionType,
    type CodeGroup,
    type CodeInsert,
    type CodeMove,
    type CodeUngroup,
    getGroupWrapperClass,
} from '@kumite/models/actions';
import { describe, expect, it } from 'bun:test';
import { parseJsxFile } from '../electron/main/code/helpers';
import { generateCode, getOidFromJsxElement } from '../electron/main/code/diff/helpers';
import { groupElementsInNode, ungroupElementsInNode } from '../electron/main/code/diff/group';
import { createInsertedElement, insertAtIndex } from '../electron/main/code/diff/insert';
import { moveElementInNode } from '../electron/main/code/diff/move';
import { GENERATE_CODE_OPTIONS } from '../electron/main/run/helpers';

function findPath(ast: t.File, oid: string): NodePath<t.JSXElement> | null {
    let found: NodePath<t.JSXElement> | undefined;
    traverse(ast, {
        JSXElement(path) {
            if (getOidFromJsxElement(path.node.openingElement) === oid) {
                found = path;
                path.stop();
            }
        },
    });
    return found ?? null;
}

function page(children: string): string {
    return `export default function Page() {
    return (
        <div data-oid="root">
${children}
        </div>
    );
}`;
}

const departedSource = page(`
            <section data-oid="left">
                <span data-oid="child">moved</span>
            </section>
            <main data-oid="right">
                <p data-oid="target" />
            </main>`);

describe('reverseMoveLocation', () => {
    it('swaps parents when the element moved between them', () => {
        const location = {
            type: 'index' as const,
            targetDomId: 'right-dom',
            targetOid: 'right',
            index: 1,
            originalIndex: 0,
            originalParentDomId: 'left-dom',
            originalParentOid: 'left',
        };

        expect(reverseMoveLocation(location)).toEqual({
            type: 'index',
            targetDomId: 'left-dom',
            targetOid: 'left',
            index: 0,
            originalIndex: 1,
            originalParentDomId: 'right-dom',
            originalParentOid: 'right',
        });
    });

    it('only swaps the index for a same-parent move', () => {
        const location = {
            type: 'index' as const,
            targetDomId: 'left-dom',
            targetOid: 'left',
            index: 2,
            originalIndex: 0,
        };

        expect(reverseMoveLocation(location)).toEqual({
            type: 'index',
            targetDomId: 'left-dom',
            targetOid: 'left',
            index: 0,
            originalIndex: 2,
        });
    });
});

describe('moveElementInNode', () => {
    it('relocates the real node when the parent changes in the same file', () => {
        const ast = parseJsxFile(departedSource);
        expect(ast).toBeDefined();
        const target = findPath(ast!, 'right');
        expect(target).not.toBeNull();

        const move: CodeMove = {
            type: CodeActionType.MOVE,
            oid: 'child',
            location: {
                type: 'index',
                targetDomId: 'right-dom',
                targetOid: 'right',
                index: 0,
                originalIndex: 0,
                originalParentDomId: 'left-dom',
                originalParentOid: 'left',
            },
        };

        moveElementInNode(target!, move);
        const generated = generateCode(ast!, GENERATE_CODE_OPTIONS, departedSource);

        const mainBlock = generated.slice(
            generated.indexOf('data-oid="right"'),
            generated.indexOf('</main>'),
        );
        expect(mainBlock).toContain('data-oid="child"');
        expect(mainBlock).toContain('data-oid="target"');

        const sectionBlock = generated.slice(
            generated.indexOf('data-oid="left"'),
            generated.indexOf('</section>'),
        );
        expect(sectionBlock).not.toContain('data-oid="child"');
    });
});

describe('moveElementInNode reorder', () => {
    const orderedSource = page(`
            <a data-oid="a">A</a>
            <b data-oid="b">B</b>
            <c data-oid="c">C</c>`);

    function orderedMove(index: number): CodeMove {
        return {
            type: CodeActionType.MOVE,
            oid: 'a',
            location: {
                type: 'index',
                targetDomId: 'root-dom',
                targetOid: 'root',
                index,
                originalIndex: 0,
            },
        };
    }

    it('moves an element down without duplicating it', () => {
        const ast = parseJsxFile(orderedSource);
        expect(ast).toBeDefined();
        const target = findPath(ast!, 'root');
        expect(target).not.toBeNull();

        moveElementInNode(target!, orderedMove(1));
        const generated = generateCode(ast!, GENERATE_CODE_OPTIONS, orderedSource);

        expect(generated.match(/data-oid="a"/g) ?? []).toHaveLength(1);
        expect(generated.indexOf('data-oid="b"')).toBeLessThan(generated.indexOf('data-oid="a"'));
        expect(generated.indexOf('data-oid="a"')).toBeLessThan(generated.indexOf('data-oid="c"'));
    });

    it('appends an element moved past the last sibling', () => {
        const ast = parseJsxFile(orderedSource);
        expect(ast).toBeDefined();
        const target = findPath(ast!, 'root');
        expect(target).not.toBeNull();

        moveElementInNode(target!, orderedMove(2));
        const generated = generateCode(ast!, GENERATE_CODE_OPTIONS, orderedSource);

        expect(generated.match(/data-oid="a"/g) ?? []).toHaveLength(1);
        expect(generated.indexOf('data-oid="c"')).toBeLessThan(generated.indexOf('data-oid="a"'));
    });
});

describe('group wrapper', () => {
    it('keeps children in the parent flow for flex and grid layouts', () => {
        expect(getGroupWrapperClass('flex')).toBe('contents');
        expect(getGroupWrapperClass('inline-flex')).toBe('contents');
        expect(getGroupWrapperClass('grid')).toBe('contents');
        expect(getGroupWrapperClass('contents')).toBe('contents');
        expect(getGroupWrapperClass('block')).toBe('');
        expect(getGroupWrapperClass(undefined)).toBe('');
    });

    it('writes the wrapper attributes into the grouped source', () => {
        const source = page(`
            <a data-oid="a">A</a>
            <b data-oid="b">B</b>`);
        const ast = parseJsxFile(source);
        expect(ast).toBeDefined();
        const parent = findPath(ast!, 'root');
        expect(parent).not.toBeNull();

        const group: CodeGroup = {
            type: CodeActionType.GROUP,
            oid: 'group',
            container: {
                domId: 'group-dom',
                oid: 'group',
                tagName: 'div',
                attributes: { className: 'contents' },
            },
            children: [
                { webviewId: 'w', domId: 'a-dom', oid: 'a' },
                { webviewId: 'w', domId: 'b-dom', oid: 'b' },
            ],
        };

        groupElementsInNode(parent!, group);
        const generated = generateCode(ast!, GENERATE_CODE_OPTIONS, source);
        expect(generated).toMatch(/<div className="contents" data-oid="group"/);
        expect(generated).toContain('data-oid="a"');
        expect(generated).toContain('data-oid="b"');
    });
});

describe('ungroup wrapper', () => {
    it('keeps text and expression children when spreading the wrapper', () => {
        const source = page(`
            before <span data-oid="g"><b data-oid="b"/>{value}<i data-oid="i"/></span>{count} after`);
        const ast = parseJsxFile(source);
        const parent = findPath(ast!, 'root');
        expect(parent).not.toBeNull();

        const ungroup: CodeUngroup = {
            type: CodeActionType.UNGROUP,
            oid: 'ungroup',
            container: { domId: 'g-dom', oid: 'g', tagName: 'div', attributes: {} },
            children: [],
        };
        ungroupElementsInNode(parent!, ungroup);
        const generated = generateCode(ast!, GENERATE_CODE_OPTIONS, source);

        expect(generated).toContain('{value}');
        expect(generated).toContain('{count}');
        expect(generated).toContain('before');
        expect(generated).toContain('after');
        expect(generated).not.toContain('data-oid="g"');
    });
});

describe('insertAtIndex', () => {
    it('appends after trailing text instead of inserting before the last child', () => {
        const source = page(`<a data-oid="a"/>tail`);
        const ast = parseJsxFile(source);
        const parent = findPath(ast!, 'root');
        expect(parent).not.toBeNull();

        const insert: CodeInsert = {
            type: CodeActionType.INSERT,
            oid: 'new',
            tagName: 'span',
            attributes: {},
            textContent: 'X',
            pasteParams: null,
            codeBlock: null,
            children: [],
            location: {
                type: 'index',
                targetDomId: 'root-dom',
                targetOid: 'root',
                index: 1,
                originalIndex: 1,
            },
        };
        insertAtIndex(parent!, createInsertedElement(insert), 1);
        const generated = generateCode(ast!, GENERATE_CODE_OPTIONS, source);

        expect(generated.indexOf('tail')).toBeLessThan(generated.indexOf('X'));
    });
});
