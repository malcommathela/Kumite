import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { getShadcnLibraryItem } from '@kumite/models';

describe('block insertion markup', () => {
    it('wraps sidebar blocks in the provider their page renders them inside', () => {
        const block = getShadcnLibraryItem('sidebar-01');
        assert.ok(block);

        assert.match(block.insertCode, /<SidebarProvider><AppSidebar \/><\/SidebarProvider>/);
        assert.match(block.previewCode, /<SidebarProvider>/);
        assert.deepEqual(
            block.imports.find((entry) => entry.source === '@/components/ui/sidebar'),
            { source: '@/components/ui/sidebar', namedImports: ['SidebarProvider'] },
        );
    });

    it('wraps the dashboard block too', () => {
        const block = getShadcnLibraryItem('dashboard-01');
        assert.ok(block);

        assert.match(block.insertCode, /<SidebarProvider><AppSidebar \/><\/SidebarProvider>/);
    });

    it('leaves a block that renders its own provider alone', () => {
        const block = getShadcnLibraryItem('sidebar-15');
        assert.ok(block);

        assert.doesNotMatch(block.insertCode, /SidebarProvider/);
        assert.equal(
            block.imports.some((entry) => entry.source === '@/components/ui/sidebar'),
            false,
        );
    });

    it('inserts self-contained blocks bare', () => {
        const block = getShadcnLibraryItem('login-01');
        assert.ok(block);

        assert.doesNotMatch(block.insertCode, /SidebarProvider/);
        assert.equal(block.imports.length, 1);
    });
});
