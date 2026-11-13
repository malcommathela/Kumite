import { EditorAttributes } from '@kumite/models/constants';
import type { TemplateNode } from '@kumite/models/element';
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { createMappingFromContent } from '../../run/setup';
import { parseJsxFile } from '../helpers';
import { checkOwnership } from './ownership';

/**
 * Stage 3 policy tests. Every case starts from a real mapping built by the run
 * manager, so the gate is exercised against the identity the product actually
 * records rather than a hand-written fixture.
 */

const OID = EditorAttributes.DATA_KUMITE_ID;
const PATH = 'C:/repo/src/card.tsx';

function mappingOf(source: string, path = PATH): Record<string, TemplateNode> {
    const mapping = createMappingFromContent(source, path);
    assert.ok(mapping, 'expected the source to map');
    return mapping;
}

function astOf(source: string) {
    const ast = parseJsxFile(source);
    assert.ok(ast, 'expected the source to parse');
    return ast;
}

describe('ownership gate', () => {
    const CARD_SOURCE = `export function Card({ className }: { className?: string }) {
    const Part = () => <div ${OID}="part" className={className} />;
    return <section ${OID}="section" className={className}><Part /></section>;
}`;

    it('allows an element owned by an exported definition', () => {
        const mapping = mappingOf(CARD_SOURCE);
        assert.deepEqual(checkOwnership(mapping.section, astOf(CARD_SOURCE)), {
            ok: true,
            owner: 'Card',
            part: null,
        });
    });

    it('allows an element inside a recorded part', () => {
        const mapping = mappingOf(CARD_SOURCE);
        assert.deepEqual(checkOwnership(mapping.part, astOf(CARD_SOURCE)), {
            ok: true,
            owner: 'Card',
            part: 'Part',
        });
    });

    it('refuses a mapping that predates identity recording', () => {
        const mapping = mappingOf(CARD_SOURCE);
        const legacy: TemplateNode = { ...mapping.section, definition: null, part: null };
        const verdict = checkOwnership(legacy, astOf(CARD_SOURCE));
        assert.equal(verdict.ok, false);
        assert.equal(verdict.ok === false && verdict.reason, 'unverified-component-ownership');
    });

    it('refuses an element that now starts inside a sibling component', () => {
        const source = `export function Card() {
    return <div ${OID}="card" />;
}
export function Panel() {
    return <aside ${OID}="panel" />;
}`;
        const mapping = mappingOf(source);
        const stale: TemplateNode = { ...mapping.card, startTag: mapping.panel.startTag };
        const verdict = checkOwnership(stale, astOf(source));
        assert.equal(verdict.ok, false);
        assert.equal(verdict.ok === false && verdict.reason, 'ambiguous-component-ownership');
        assert.match(
            verdict.ok === false ? verdict.message : '',
            /belongs to Card, but it starts inside Panel/,
        );
    });

    it('resolves a nested local component to its exported ancestor', () => {
        const source = `export function Card() {
    function Inner() {
        return <div ${OID}="inner" />;
    }
    return <section ${OID}="root"><Inner /></section>;
}`;
        const mapping = mappingOf(source);
        assert.deepEqual(checkOwnership(mapping.inner, astOf(source)), {
            ok: true,
            owner: 'Card',
            part: 'Inner',
        });
    });

    it('allows a local component when the file exports nothing', () => {
        const source = `function Internal() {
    return <div ${OID}="internal" />;
}`;
        const mapping = mappingOf(source);
        assert.deepEqual(checkOwnership(mapping.internal, astOf(source)), {
            ok: true,
            owner: null,
            part: 'Internal',
        });
    });

    it('refuses a recorded owner that is no longer exported', () => {
        const exported = `export function Card() {
    return <div ${OID}="root" />;
}`;
        const local = `function Card() {
    return <div ${OID}="root" />;
}`;
        const mapping = mappingOf(exported);
        const verdict = checkOwnership(mapping.root, astOf(local));
        assert.equal(verdict.ok, false);
        assert.equal(verdict.ok === false && verdict.reason, 'ambiguous-component-ownership');
    });

    it('refuses a recorded part that the definition no longer declares', () => {
        const before = `export function Card() {
    const Part = () => <div ${OID}="part" />;
    return <section ${OID}="root"><Part /></section>;
}`;
        const after = `export function Card() {
    return <section ${OID}="root"><span /></section>;
}`;
        const mapping = mappingOf(before);
        const verdict = checkOwnership(mapping.part, astOf(after));
        assert.equal(verdict.ok, false);
        assert.equal(verdict.ok === false && verdict.reason, 'ambiguous-component-ownership');
    });

    it('keeps a class edit on a sibling node independent of its neighbour', () => {
        const source = `export function Card() {
    return (
        <section ${OID}="root">
            <div ${OID}="left" />
            <div ${OID}="right" />
        </section>
    );
}`;
        const mapping = mappingOf(source);
        const left = checkOwnership(mapping.left, astOf(source));
        const right = checkOwnership(mapping.right, astOf(source));
        assert.deepEqual(left, { ok: true, owner: 'Card', part: null });
        assert.deepEqual(right, { ok: true, owner: 'Card', part: null });
        assert.notEqual(mapping.left.startTag.start.line, mapping.right.startTag.start.line);
    });
});
