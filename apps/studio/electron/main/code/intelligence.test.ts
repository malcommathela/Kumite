import { parse } from '@babel/parser';
import * as t from '@babel/types';
import { SHADCN_COMPONENTS } from '@kumite/models/components';
import type { TemplateNode } from '@kumite/models/element';
import assert from 'node:assert/strict';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';
import { describe, it } from 'node:test';
import { ComponentIntelligence, jsxElementName, verifyContainment } from './intelligence';
import { buildDefinitionRegistry, discoverDefinitions } from './intelligence/definitions';
import {
    FingerprintStore,
    fingerprintKey,
    hashContent,
    hashNodeSpan,
    readNodeSource,
} from './intelligence/fingerprints';

/**
 * Stage 2 unit tests.
 *
 * The corpus is the UI package's own components, read from disk, plus synthetic
 * fixtures for the refusals. Run from anywhere inside the repository: the root
 * is found by its package name, so the test does not depend on the working
 * directory.
 */

const PARSE_OPTIONS = {
    plugins: ['typescript', 'jsx'] as const,
    sourceType: 'module' as const,
    allowImportExportEverywhere: true,
};

function parseFile(code: string): t.File {
    return parse(code, PARSE_OPTIONS as never) as t.File;
}

function findRepoRoot(start: string): string {
    let current = path.resolve(start);
    for (let depth = 0; depth < 15; depth += 1) {
        const manifest = path.join(current, 'package.json');
        if (existsSync(manifest)) {
            const parsed = JSON.parse(readFileSync(manifest, 'utf8')) as { name?: string };
            if (parsed.name === '@kumite/repo') {
                return current;
            }
        }
        const parent = path.dirname(current);
        if (parent === current) {
            break;
        }
        current = parent;
    }
    throw new Error(`Could not find the @kumite/repo root from ${start}`);
}

const ROOT = findRepoRoot(process.cwd());
const COMPONENTS = path.join(ROOT, 'packages', 'ui', 'src', 'components');

function componentPath(name: string): string {
    return path.join(COMPONENTS, `${name}.tsx`);
}

function readComponent(name: string): string {
    return readFileSync(componentPath(name), 'utf8');
}

function isNode(value: unknown): value is t.Node {
    return typeof value === 'object' && value !== null && 'type' in value;
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
    const element = collectJsxElements(ast).find((item) => jsxElementName(item) === name);
    assert.ok(element, `fixture has no <${name}> element`);
    return element;
}

type Tag = { start: { line: number; column: number }; end: { line: number; column: number } };

function tagOf(element: t.JSXOpeningElement | t.JSXClosingElement): Tag {
    assert.ok(element.loc, 'fixture element has no location');
    return {
        start: { line: element.loc.start.line, column: element.loc.start.column + 1 },
        end: { line: element.loc.end.line, column: element.loc.end.column },
    };
}

function nodeFor(
    element: t.JSXElement,
    filePath: string,
    extra: Partial<TemplateNode> = {},
): TemplateNode {
    return {
        path: filePath,
        startTag: tagOf(element.openingElement),
        endTag: element.closingElement ? tagOf(element.closingElement) : null,
        component: null,
        ...extra,
    };
}

/** Indexes every .tsx file in the UI component corpus. */
function corpusFiles(): Array<{ path: string; ast: t.File }> {
    return readdirSync(COMPONENTS)
        .filter((file) => file.endsWith('.tsx'))
        .map((file) => ({
            path: componentPath(file.replace(/\.tsx$/, '')),
            ast: parseFile(readFileSync(path.join(COMPONENTS, file), 'utf8')),
        }));
}

const engine = new ComponentIntelligence(corpusFiles());

describe('definition discovery', () => {
    it('finds named exports and external imports in button.tsx', () => {
        const filePath = componentPath('button');
        const index = discoverDefinitions(parseFile(readComponent('button')), filePath);

        const button = index.definitions.find((definition) => definition.name === 'Button');
        assert.equal(button?.exportKind, 'named');
        assert.equal(button?.declarationKind, 'variable');
        assert.equal(
            index.definitions.find((definition) => definition.name === 'buttonVariants')
                ?.exportKind,
            'named',
        );

        const registry = buildDefinitionRegistry([
            { path: filePath, ast: parseFile(readComponent('button')) },
        ]);
        const slot = registry.resolveImport(filePath, 'Slot');
        assert.equal(slot?.imported, 'Slot');
        assert.equal(slot?.specifier, '@radix-ui/react-slot');
        assert.equal(slot?.resolution, 'external');
        assert.equal(registry.resolveImport(filePath, 'React')?.imported, '*');
    });

    it('discovers compound parts and alias definitions in dialog.tsx', () => {
        const filePath = componentPath('dialog');
        const index = discoverDefinitions(parseFile(readComponent('dialog')), filePath);
        const names = index.definitions.map((definition) => definition.name);

        for (const name of [
            'Dialog',
            'DialogTrigger',
            'DialogOverlay',
            'DialogContent',
            'DialogHeader',
            'DialogTitle',
        ]) {
            assert.ok(names.includes(name), `dialog.tsx should define ${name}`);
        }
        assert.equal(
            index.definitions.find((definition) => definition.name === 'Dialog')?.declarationKind,
            'variable',
        );
    });

    it('finds definitions across the whole component corpus without guessing', () => {
        const definitions = corpusFiles().flatMap(
            (file) => discoverDefinitions(file.ast, file.path).definitions,
        );
        assert.ok(definitions.length >= 60, `expected a broad corpus, found ${definitions.length}`);
        assert.ok(
            definitions.every((definition) =>
                ['named', 'default', 'none'].includes(definition.exportKind),
            ),
        );
        for (const name of ['Button', 'Card', 'Input', 'Dialog', 'DialogContent']) {
            assert.ok(
                definitions.some((definition) => definition.name === name),
                `the corpus should define ${name}`,
            );
        }
    });
});

describe('import resolution', () => {
    const APP_PATH = '/repo/src/app.tsx';
    const BUTTON_PATH = '/repo/src/components/ui/button.tsx';
    const CARD_PATH = '/repo/src/components/ui/card.tsx';
    const APP_SOURCE = `
import { Button } from './components/ui/button';
import { Card } from '@/components/ui/card';
export function App() {
    return (
        <div>
            <Button>Go</Button>
            <Card />
        </div>
    );
}`;

    const registry = buildDefinitionRegistry([
        { path: BUTTON_PATH, ast: parseFile(readComponent('button')) },
        { path: CARD_PATH, ast: parseFile(readComponent('card')) },
        { path: APP_PATH, ast: parseFile(APP_SOURCE) },
    ]);

    it('resolves a relative import to the indexed file', () => {
        const binding = registry.resolveImport(APP_PATH, 'Button');
        assert.equal(binding?.resolution, 'relative');
        assert.equal(binding?.resolvedPath, BUTTON_PATH);
    });

    it('resolves an alias only when exactly one file matches', () => {
        const binding = registry.resolveImport(APP_PATH, 'Card');
        assert.equal(binding?.resolution, 'alias-inferred');
        assert.equal(binding?.resolvedPath, CARD_PATH);
    });

    it('leaves an unknown alias unresolved instead of calling it external', () => {
        const ast = parseFile(`import { Nope } from '@/missing/nope';\nexport const x = 1;`);
        const local = buildDefinitionRegistry([{ path: '/repo/src/missing.ts', ast }]);
        const binding = local.resolveImport('/repo/src/missing.ts', 'Nope');
        assert.equal(binding?.resolution, 'unresolved');
        assert.equal(binding?.resolvedPath, null);
    });

    it('ignores type-only imports', () => {
        const ast = parseFile(`import type { Button } from './button';\nexport const x = 1;`);
        const local = buildDefinitionRegistry([{ path: '/repo/src/types.ts', ast }]);
        assert.equal(local.resolveImport('/repo/src/types.ts', 'Button'), undefined);
    });
});

describe('composition', () => {
    const APP_PATH = '/repo/src/app.tsx';
    const BUTTON_PATH = '/repo/src/components/ui/button.tsx';
    const CARD_PATH = '/repo/src/components/ui/card.tsx';
    const APP_SOURCE = `
import { Button } from './components/ui/button';
import { Card } from '@/components/ui/card';
export function App() {
    return (
        <div>
            <Button>Go</Button>
            <Card />
        </div>
    );
}`;

    const appAst = parseFile(APP_SOURCE);
    const local = new ComponentIntelligence([
        { path: BUTTON_PATH, ast: parseFile(readComponent('button')) },
        { path: CARD_PATH, ast: parseFile(readComponent('card')) },
        { path: APP_PATH, ast: appAst },
        { path: componentPath('dialog'), ast: parseFile(readComponent('dialog')) },
    ]);

    it('proves an imported definition through a relative import', () => {
        const composition = local.callSite(APP_PATH, elementNamed(appAst, 'Button'));
        assert.equal(composition.relation, 'imported-definition');
        assert.equal(composition.target?.name, 'Button');
        assert.equal(composition.confidence, 'proven');
    });

    it('marks an alias-resolved definition as inferred', () => {
        const composition = local.callSite(APP_PATH, elementNamed(appAst, 'Card'));
        assert.equal(composition.relation, 'imported-definition');
        assert.equal(composition.target?.name, 'Card');
        assert.equal(composition.confidence, 'inferred');
    });

    it('keeps intrinsic elements intrinsic', () => {
        const composition = local.callSite(APP_PATH, elementNamed(appAst, 'div'));
        assert.equal(composition.relation, 'dom-element');
        assert.equal(composition.target, null);
        assert.equal(composition.confidence, 'proven');
    });

    it('does not name an unimported local alias', () => {
        const buttonAst = parseFile(readComponent('button'));
        const composition = local.callSite(BUTTON_PATH, elementNamed(buttonAst, 'Comp'));
        assert.equal(composition.relation, 'unknown-component');
        assert.equal(composition.target, null);
        assert.equal(composition.confidence, 'ambiguous');
    });

    it('keeps an external primitive external', () => {
        const dialogAst = parseFile(readComponent('dialog'));
        const composition = local.callSite(
            componentPath('dialog'),
            elementNamed(dialogAst, 'DialogPrimitive.Overlay'),
        );
        assert.equal(composition.relation, 'external-component');
        assert.equal(composition.specifier, '@radix-ui/react-dialog');
        assert.equal(composition.confidence, 'proven');
    });

    it('resolves a default import to the file default export', () => {
        const panelPath = '/repo/src/panel.tsx';
        const consumerPath = '/repo/src/consumer.tsx';
        const panelAst = parseFile(`export default function Panel() { return <div />; }`);
        const consumerAst = parseFile(`
import Panel from './panel';
export const view = <Panel />;`);
        const consumer = new ComponentIntelligence([
            { path: panelPath, ast: panelAst },
            { path: consumerPath, ast: consumerAst },
        ]);

        const composition = consumer.callSite(consumerPath, elementNamed(consumerAst, 'Panel'));
        assert.equal(composition.relation, 'imported-definition');
        assert.equal(composition.target?.name, 'Panel');
        assert.equal(composition.confidence, 'proven');
    });
});

describe('ownership', () => {
    const OWNER_PATH = '/repo/src/card.tsx';
    const OWNER_SOURCE = `
export function Card({ className }: { className?: string }) {
    const Part = () => <div className={className} />;
    return (
        <section className={className}>
            <Part />
        </section>
    );
}`;
    const ownerAst = parseFile(OWNER_SOURCE);
    const partElement = elementNamed(ownerAst, 'div');
    const local = new ComponentIntelligence([{ path: OWNER_PATH, ast: ownerAst }]);

    function ownedNode(overrides: Partial<TemplateNode> = {}): TemplateNode {
        return nodeFor(partElement, OWNER_PATH, {
            component: 'Part',
            definition: { name: 'Card', path: OWNER_PATH, exportKind: 'named' },
            part: { owner: 'Card', name: 'Part' },
            ...overrides,
        });
    }

    it('re-verifies a recorded definition and part', () => {
        const result = local.ownership(ownedNode());
        assert.equal(result.ok, true);
        assert.equal(result.ok && result.confidence, 'proven');
        assert.equal(result.ok && result.definition.name, 'Card');
        assert.equal(result.ok && result.part?.name, 'Part');
    });

    it('refuses a part the definition no longer declares', () => {
        const result = local.ownership(
            ownedNode({
                component: 'Missing',
                part: { owner: 'Card', name: 'Missing' },
            }),
        );
        assert.equal(result.ok, false);
        assert.equal(result.ok === false && result.reason, 'part-not-found');
    });

    it('refuses a recorded definition that is no longer exported', () => {
        const internalPath = '/repo/src/internal.tsx';
        const internalAst = parseFile(`
function Internal() {
    return <div />;
}
export function Public() {
    return <Internal />;
}`);
        const internal = new ComponentIntelligence([{ path: internalPath, ast: internalAst }]);
        const result = internal.ownership(
            nodeFor(elementNamed(internalAst, 'div'), internalPath, {
                component: 'Internal',
                definition: { name: 'Internal', path: internalPath, exportKind: 'named' },
            }),
        );
        assert.equal(result.ok, false);
        assert.equal(result.ok === false && result.reason, 'definition-not-exported');
    });

    it('downgrades a mapping without identity to an inference', () => {
        const result = local.ownership(nodeFor(partElement, OWNER_PATH, { component: 'Card' }));
        assert.equal(result.ok, true);
        assert.equal(result.ok && result.confidence, 'inferred');
    });

    it('refuses a node whose file is not indexed', () => {
        const result = local.ownership(ownedNode({ path: '/repo/src/unknown.tsx' }));
        assert.equal(result.ok, false);
        assert.equal(result.ok === false && result.reason, 'file-not-indexed');
    });
});

describe('containment', () => {
    const SOURCE = `
export function Card() {
    function Inner() {
        return <div />;
    }
    return (
        <section>
            <Inner />
        </section>
    );
}
export function Panel() {
    return <aside />;
}`;
    const ast = parseFile(SOURCE);
    const PATH = '/repo/src/card.tsx';

    it('names the innermost declaration first', () => {
        const proof = verifyContainment(
            ast,
            nodeFor(elementNamed(ast, 'div'), PATH, { component: 'Inner' }),
        );
        assert.equal(proof.ok, true);
        assert.deepEqual(proof.ok && proof.enclosing, ['Inner', 'Card']);
    });

    it('refuses a mapping whose element starts in a sibling', () => {
        const proof = verifyContainment(
            ast,
            nodeFor(elementNamed(ast, 'aside'), PATH, { component: 'Card' }),
        );
        assert.equal(proof.ok, false);
        assert.equal(proof.ok === false && proof.reason, 'component-mismatch');
    });
});

describe('capabilities over the corpus', () => {
    const dialogPath = componentPath('dialog');

    const cases: Array<{
        name: string;
        file: string;
        status: string;
        element: string | null;
        editable: boolean;
        spread: string;
        expression: string;
        children: 'element-children' | 'spread' | null;
    }> = [
        {
            name: 'Button',
            file: componentPath('button'),
            status: 'proven-root',
            element: 'Comp',
            editable: true,
            spread: 'safe-rest',
            expression: 'utility-call',
            children: 'spread',
        },
        {
            name: 'Card',
            file: componentPath('card'),
            status: 'proven-root',
            element: 'div',
            editable: true,
            spread: 'safe-rest',
            expression: 'utility-call',
            children: 'element-children',
        },
        {
            name: 'Input',
            file: componentPath('input'),
            status: 'proven-root',
            element: 'input',
            editable: true,
            spread: 'safe-rest',
            expression: 'utility-call',
            children: 'spread',
        },
        {
            name: 'DialogContent',
            file: dialogPath,
            status: 'proven-nested',
            element: 'DialogPrimitive.Content',
            editable: false,
            spread: 'safe-rest',
            expression: 'utility-call',
            children: 'element-children',
        },
        {
            name: 'DialogHeader',
            file: componentPath('dialog'),
            status: 'proven-root',
            element: 'div',
            editable: true,
            spread: 'safe-rest',
            expression: 'utility-call',
            children: 'spread',
        },
        {
            name: 'DialogTitle',
            file: dialogPath,
            status: 'proven-root',
            element: 'DialogPrimitive.Title',
            editable: true,
            spread: 'safe-rest',
            expression: 'utility-call',
            children: 'spread',
        },
    ];

    for (const testCase of cases) {
        it(`measures ${testCase.name}`, () => {
            const result = engine.capabilities(testCase.file, testCase.name);
            assert.equal(result.ok, true);
            if (!result.ok) {
                return;
            }
            const capabilities = result.value;
            assert.equal(capabilities.body, 'available');
            assert.equal(capabilities.className.status, testCase.status);
            assert.equal(capabilities.className.element, testCase.element);
            assert.equal(capabilities.className.spread, testCase.spread);
            assert.equal(capabilities.className.expression.kind, testCase.expression);
            assert.equal(capabilities.classNameEditable, testCase.editable);
            assert.equal(capabilities.children.via, testCase.children);
        });
    }

    it('reports an alias definition as having no inspectable body', () => {
        const result = engine.capabilities(dialogPath, 'Dialog');
        assert.equal(result.ok, true);
        if (!result.ok) {
            return;
        }
        assert.equal(result.value.body, 'alias');
        assert.equal(result.value.className.status, 'ambiguous');
        assert.equal(result.value.classNameEditable, false);
        assert.equal(result.value.children.forwarded, false);
    });

    it('refuses a name that is not a top-level definition', () => {
        const result = engine.capabilities(dialogPath, 'DialogPrimitive');
        assert.equal(result.ok, false);
        assert.equal(result.ok === false && result.reason, 'component-not-found');
    });
});

describe('the pinned catalog', () => {
    // The audited manifest: the 54 items of `shadcn@3.7.0`, `new-york-v4`, at
    // commit 1e9e337923aaede7db55b6091cb56a72a661b959. A name appearing or
    // disappearing here is a deliberate catalog change, not a refactor.
    const AUDITED = [
        'accordion',
        'alert',
        'alert-dialog',
        'aspect-ratio',
        'avatar',
        'badge',
        'breadcrumb',
        'button',
        'button-group',
        'calendar',
        'card',
        'carousel',
        'chart',
        'checkbox',
        'collapsible',
        'command',
        'context-menu',
        'dialog',
        'drawer',
        'dropdown-menu',
        'empty',
        'field',
        'form',
        'hover-card',
        'input',
        'input-group',
        'input-otp',
        'item',
        'kbd',
        'label',
        'menubar',
        'navigation-menu',
        'pagination',
        'popover',
        'progress',
        'radio-group',
        'resizable',
        'scroll-area',
        'select',
        'separator',
        'sheet',
        'sidebar',
        'skeleton',
        'slider',
        'sonner',
        'spinner',
        'switch',
        'table',
        'tabs',
        'textarea',
        'toast',
        'toggle',
        'toggle-group',
        'tooltip',
    ];

    it('lists the audited 54 names once each', () => {
        assert.equal(SHADCN_COMPONENTS.length, 54);
        assert.deepEqual(SHADCN_COMPONENTS.map((component) => component.name).sort(), AUDITED);
    });

    it('marks the items the pinned snapshot cannot install or render', () => {
        const blocked = SHADCN_COMPONENTS.filter(
            (component) =>
                component.installable === false ||
                component.insertable === false ||
                component.previewable === false,
        );
        assert.deepEqual(
            blocked.map((component) => component.name),
            ['form', 'sonner', 'toast'],
        );
        for (const component of blocked) {
            assert.ok(component.limitation, `${component.name} is blocked without a reason`);
        }

        // toast is in the manifest but the pinned snapshot has no item for it, so
        // it keeps its measured title and an empty part list instead of an
        // invented one.
        const toast = SHADCN_COMPONENTS.find((component) => component.name === 'toast');
        assert.equal(toast?.installable, false);
        assert.equal(toast?.title, 'Toast');
        assert.deepEqual(toast?.parts, []);
        assert.deepEqual(toast?.imports, []);
    });

    it('measures the parts of every catalog item whose source is in the corpus', () => {
        const measured: string[] = [];
        for (const component of SHADCN_COMPONENTS) {
            if (component.parts.length === 0) {
                // No pinned file, so there is nothing to measure. The entry is
                // marked not installable instead of guessing its parts.
                assert.equal(component.installable, false);
                continue;
            }
            const sourcePath = componentPath(component.name);
            if (!existsSync(sourcePath)) {
                continue;
            }
            const parts = component.parts.filter(
                (part) => engine.capabilities(sourcePath, part).ok,
            );
            assert.ok(
                parts.length > 0,
                `${component.name} is in the corpus but none of its parts measured`,
            );
            measured.push(component.name);
        }

        // The UI package in this repository ships a subset of the catalog. The
        // rest are validated structurally by `component-matrix.test.ts`;
        // capabilities are not invented for a file that is not here.
        assert.deepEqual(measured, [
            'accordion',
            'alert-dialog',
            'button',
            'card',
            'checkbox',
            'collapsible',
            'command',
            'context-menu',
            'dialog',
            'dropdown-menu',
            'input',
            'input-group',
            'kbd',
            'label',
            'popover',
            'progress',
            'resizable',
            'scroll-area',
            'select',
            'separator',
            'skeleton',
            'tabs',
            'textarea',
            'toggle',
            'toggle-group',
            'tooltip',
        ]);
    });
});

describe('fingerprints', () => {
    const PANEL_PATH = '/repo/src/panel.tsx';
    const SOURCE = [
        'export function Panel() {',
        '    return (',
        '        <section className="p-4">',
        '            <span>Hello</span>',
        '        </section>',
        '    );',
        '}',
        '',
    ].join('\n');
    const panelAst = parseFile(SOURCE);
    const section = nodeFor(elementNamed(panelAst, 'section'), PANEL_PATH, { component: 'Panel' });
    const span = elementNamed(panelAst, 'section');

    it('hashes the span, not the whole file', () => {
        const appended = `${SOURCE}// trailing comment\n`;
        assert.equal(hashContent(SOURCE) === hashContent(appended), false);
        assert.equal(hashNodeSpan(SOURCE, section), hashNodeSpan(appended, section));
        assert.equal(
            hashNodeSpan(SOURCE, section) === hashNodeSpan(SOURCE.replace('Hello', 'Bye'), section),
            false,
        );
    });

    it('extracts the same source the code reader uses', () => {
        assert.equal(
            readNodeSource(SOURCE, section),
            [
                '<section className="p-4">',
                '            <span>Hello</span>',
                '        </section>',
            ].join('\n'),
        );
        const inputAst = parseFile(readComponent('input'));
        const input = nodeFor(elementNamed(inputAst, 'input'), componentPath('input'), {
            component: 'Input',
        });
        const extracted = readNodeSource(readComponent('input'), input);
        assert.ok(extracted?.startsWith('<input'));
        assert.ok(extracted?.endsWith('/>'));
    });

    it('verifies a node against its recording', () => {
        const store = new FingerprintStore();
        const recorded = store.recordNode(section, SOURCE);
        assert.ok(recorded);
        assert.equal(recorded.key, fingerprintKey(section));
        assert.equal(store.verifyNode(section, SOURCE).status, 'unchanged');
        assert.equal(
            store.verifyNode(section, `${SOURCE}// trailing comment\n`).status,
            'file-changed-span-intact',
        );
        assert.equal(
            store.verifyNode(section, SOURCE.replace('Hello', 'Bye')).status,
            'span-changed',
        );
    });

    it('invalidates every node fingerprint for a file on a watcher event', () => {
        const store = new FingerprintStore();
        store.recordNode(section, SOURCE);
        assert.equal(store.verifyNode(section, SOURCE).ok, true);

        store.handleFileEvent({ path: PANEL_PATH, type: 'update', content: SOURCE });
        assert.equal(store.verifyNode(section, SOURCE).status, 'unknown-node');
        assert.equal(store.file(PANEL_PATH)?.contentHash, hashContent(SOURCE));

        store.recordNode(section, SOURCE);
        store.handleFileEvent({ path: PANEL_PATH, type: 'delete' });
        assert.equal(store.file(PANEL_PATH), undefined);
        assert.equal(store.verifyNode(section, SOURCE).status, 'unknown-node');
    });
});
