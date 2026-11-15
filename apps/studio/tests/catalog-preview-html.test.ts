import { describe, expect, it } from 'bun:test';
import { PREVIEW_MARKER } from '../electron/main/components/preview-runtime';
import { buildCatalogHtml } from '../electron/main/components/preview';

/**
 * Every catalog preview page starts with Kumite's ownership markers. They used
 * to be emitted as bare text, which the browser rendered inside the preview
 * frame as "kumite-preview-session" above the component.
 */
describe('buildCatalogHtml', () => {
    const html = buildCatalogHtml('Test component', 'ks_1234', '__kumite_entry_test');

    it('keeps the session marker inside an HTML comment', () => {
        expect(html).toContain(`<!-- ${PREVIEW_MARKER} -->`);
        expect(html.match(new RegExp(PREVIEW_MARKER, 'g')) ?? []).toHaveLength(1);
    });

    it('has no renderable text before the document', () => {
        const prefix = html.slice(0, html.indexOf('<!doctype'));
        const withoutComments = prefix.replace(/<!--[\s\S]*?-->/g, '').trim();
        expect(withoutComments).toBe('');
    });

    it('still starts with the marker other sessions look for', () => {
        expect(html.startsWith('<!-- kumite-preview -->')).toBe(true);
        expect(html).toContain(`<script type="module" src="./__kumite_entry_test.tsx"></script>`);
    });
});
