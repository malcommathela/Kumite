import { EditorAttributes } from '@kumite/models/constants';
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { createMappingFromContent } from './setup';

/**
 * Proves the mapping fills `definition` / `part` identity on the TemplateNode
 * itself. The engine in `code/intelligence` re-verifies this identity; these
 * tests make sure the two halves agree on the same node.
 */

const OID = EditorAttributes.DATA_KUMITE_ID;
const PATH = 'C:/repo/src/card.tsx';

describe('mapping definition identity', () => {
    it('records the exported owner and the local part', () => {
        const mapping = createMappingFromContent(
            `
export function Card({ className }: { className?: string }) {
    const Part = () => <div ${OID}="part" className={className} />;
    return <section ${OID}="section" className={className}><Part /></section>;
}`,
            PATH,
        );

        assert.ok(mapping);
        assert.equal(mapping.part.component, 'Part');
        assert.deepEqual(mapping.part.definition, {
            name: 'Card',
            path: PATH,
            exportKind: 'named',
        });
        assert.deepEqual(mapping.part.part, { owner: 'Card', name: 'Part' });
        assert.equal(mapping.section.part, null);
        assert.equal(mapping.section.definition?.name, 'Card');
    });

    it('records a default export', () => {
        const mapping = createMappingFromContent(
            `export default function Panel() {
    return <div ${OID}="panel" />;
}`,
            'C:/repo/src/panel.tsx',
        );

        assert.ok(mapping);
        assert.equal(mapping.panel.definition?.exportKind, 'default');
    });

    it('leaves a component that is never exported unowned', () => {
        const mapping = createMappingFromContent(
            `
function Internal() {
    return <div ${OID}="internal" />;
}
export function Public() {
    return <Internal />;
}`,
            'C:/repo/src/internal.tsx',
        );

        assert.ok(mapping);
        assert.equal(mapping.internal.component, 'Internal');
        assert.equal(mapping.internal.definition, null);
        assert.equal(mapping.internal.part, null);
    });
});
