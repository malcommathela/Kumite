import { parse } from '@babel/parser';
import * as t from '@babel/types';
import {
    getBlockInsertWrapperClass,
    isBlockInsertContainer,
    SHADCN_BLOCKS,
    SHADCN_COMPONENTS,
    type ShadcnComponentDefinition,
} from '@kumite/models/components';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, it } from 'node:test';
import { ComponentIntelligence } from './intelligence';

/**
 * Stage 6 matrix over the whole pinned catalog.
 *
 * One shared engine, 54 authored templates. This file proves the templates are
 * consistent with each other and with the pinned registry's export lists; it does
 * not add behaviour per component. Every row is derived from the catalog and the
 * source in this repository, so the printed table is the evidence the completion
 * report quotes.
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
const UI_SOURCE_PREFIX = '@/components/ui/';

interface TemplateReading {
    elements: string[];
}

/**
 * Parses one template and proves it is a single JSX root.
 *
 * `const template = (a, b);` parses as a sequence expression, and `(a)(b)` as a
 * call, so requiring the initializer to be a JSX element or fragment is the
 * single-root proof — not a count of top-level statements.
 */
function readTemplate(code: string, label: string): TemplateReading {
    const ast = parseFile(`const template = (${code});`);
    const statement = ast.program.body[0];
    assert.ok(t.isVariableDeclaration(statement), `${label} is not a declaration`);
    const init = statement.declarations[0].init;
    assert.ok(t.isJSXElement(init) || t.isJSXFragment(init), `${label} is not a single JSX root`);

    const elements: string[] = [];
    walk(ast);
    return { elements };

    function walk(node: t.Node): void {
        if (t.isJSXOpeningElement(node)) {
            const name = t.isJSXIdentifier(node.name)
                ? node.name.name
                : t.isJSXMemberExpression(node.name) && t.isJSXIdentifier(node.name.object)
                  ? node.name.object.name
                  : null;
            if (name) {
                elements.push(name);
            }
        }
        for (const key of Object.keys(node)) {
            if (key === 'loc' || key === 'leadingComments' || key === 'trailingComments') {
                continue;
            }
            const value = (node as unknown as Record<string, unknown>)[key];
            if (Array.isArray(value)) {
                for (const child of value) {
                    if (child && typeof child === 'object' && 'type' in child) {
                        walk(child as t.Node);
                    }
                }
            } else if (value && typeof value === 'object' && 'type' in value) {
                walk(value as t.Node);
            }
        }
    }
}

function isDomTag(name: string): boolean {
    return name[0] === name[0].toLowerCase();
}

function importedNames(definition: ShadcnComponentDefinition): Set<string> {
    const names = new Set<string>();
    for (const moduleImport of definition.imports) {
        for (const name of moduleImport.namedImports ?? []) {
            names.add(name);
        }
        if (moduleImport.defaultImport) {
            names.add(moduleImport.defaultImport);
        }
    }
    return names;
}

function uiSourceItem(source: string): string | null {
    return source.startsWith(UI_SOURCE_PREFIX) ? source.slice(UI_SOURCE_PREFIX.length) : null;
}

const engine = new ComponentIntelligence(
    SHADCN_COMPONENTS.filter((component) =>
        existsSync(path.join(COMPONENTS, `${component.name}.tsx`)),
    ).map((component) => ({
        path: path.join(COMPONENTS, `${component.name}.tsx`),
        ast: parseFile(readFileSync(path.join(COMPONENTS, `${component.name}.tsx`), 'utf8')),
    })),
);

interface Row {
    name: string;
    parts: number;
    imports: string;
    insert: 'ok' | 'blocked';
    preview: 'ok' | 'blocked';
    className: string;
    note: string;
}

const rows: Row[] = [];

describe('component matrix', () => {
    it('keeps the curated block catalog bound to the pinned shadcn preview routes', () => {
        assert.equal(SHADCN_BLOCKS.length, 64);
        assert.equal(new Set(SHADCN_BLOCKS.map((block) => block.name)).size, 64);
        const componentNames = new Set(SHADCN_COMPONENTS.map((component) => component.name));
        for (const block of SHADCN_BLOCKS) {
            assert.match(block.name, /^(dashboard|sidebar|login|calendar|signup|otp)-\d{2}$/);
            assert.ok(block.componentFile.length > 0);
            if (block.previewUrl) {
                assert.equal(
                    block.previewUrl,
                    `https://ui.shadcn.com/view/new-york-v4/${block.name}`,
                );
            } else {
                assert.match(block.name, /^(calendar|otp)-/);
            }
            assert.match(
                block.registryUrl,
                new RegExp(
                    `1e9e337923aaede7db55b6091cb56a72a661b959/apps/v4/public/r/styles/new-york-v4/${block.name}\\.json$`,
                ),
            );
            assert.equal(block.imports.length, 1);
            assert.equal(
                block.defaultImport
                    ? block.imports[0].defaultImport
                    : block.imports[0].namedImports?.[0],
                block.exportName,
            );
            assert.equal(
                block.insertCode,
                `<div className="${getBlockInsertWrapperClass(block.categories)}">\n    <${block.exportName} />\n</div>`,
            );
            assert.ok(block.categories.length > 0);
            assert.ok(block.registryDependencies.every((name) => componentNames.has(name)));
            for (const dependency of block.dependencies) {
                assert.match(dependency, /^(?:@[^/@]+\/)?[^@/]+$/);
            }
        }
    });

    it('constrains card-shaped blocks to the card width the upstream page uses', () => {
        const cardCategories = new Set(['authentication', 'login', 'signup', 'otp']);
        for (const block of SHADCN_BLOCKS) {
            const isCard = block.categories.some((category) => cardCategories.has(category));
            assert.equal(
                getBlockInsertWrapperClass(block.categories),
                isCard ? 'mx-auto w-full max-w-sm' : 'w-full',
                `${block.name} wrapper`,
            );
        }
        assert.equal(getBlockInsertWrapperClass([]), 'w-full');
    });

    it('refuses to nest a block inside a text element', () => {
        for (const tag of ['h1', 'h2', 'p', 'span', 'a', 'button', 'label', 'input', 'img']) {
            assert.equal(isBlockInsertContainer(tag), false, `${tag} must not receive a block`);
            assert.equal(
                isBlockInsertContainer(tag.toUpperCase(), 'block'),
                false,
                `${tag} must not receive a block even when it lays out as a block`,
            );
        }
        for (const tag of ['div', 'main', 'section', 'article', 'form', 'body', 'li']) {
            assert.equal(isBlockInsertContainer(tag), true, `${tag} must accept a block`);
        }
        assert.equal(isBlockInsertContainer('my-widget', 'flex'), true);
        assert.equal(isBlockInsertContainer('my-widget', 'inline'), false);
        assert.equal(isBlockInsertContainer('my-widget'), false);
    });

    it('builds one row per pinned item', () => {
        for (const definition of SHADCN_COMPONENTS) {
            const insertBlocked = definition.insertable === false;
            const previewBlocked = definition.previewable === false;

            if (!insertBlocked) {
                const reading = readTemplate(definition.insertCode, `${definition.name} insert`);
                assert.ok(reading.elements.length > 0, `${definition.name} insert renders nothing`);
            } else {
                assert.equal(
                    definition.insertCode,
                    '',
                    `${definition.name} is blocked but has insert code`,
                );
            }

            if (!previewBlocked) {
                const reading = readTemplate(definition.previewCode, `${definition.name} preview`);
                assert.ok(
                    reading.elements.length > 0,
                    `${definition.name} preview renders nothing`,
                );
            } else {
                assert.equal(
                    definition.previewCode,
                    '',
                    `${definition.name} is blocked but has preview code`,
                );
            }

            const used = new Set<string>();
            for (const [code, label] of [
                [definition.insertCode, `${definition.name} insert`],
                [definition.previewCode, `${definition.name} preview`],
            ] as const) {
                if (code === '') {
                    continue;
                }
                for (const name of readTemplate(code, label).elements) {
                    if (!isDomTag(name)) {
                        used.add(name);
                    }
                }
            }
            const imported = importedNames(definition);
            for (const name of used) {
                assert.ok(
                    imported.has(name),
                    `${definition.name} renders <${name}> without importing it`,
                );
            }

            const localPath = path.join(COMPONENTS, `${definition.name}.tsx`);
            let className = '—';
            if (existsSync(localPath)) {
                className = 'not-exported';
                for (const part of definition.parts) {
                    const result = engine.capabilities(localPath, part);
                    if (result.ok) {
                        className = result.value.className.status;
                        break;
                    }
                }
            }

            rows.push({
                name: definition.name,
                parts: definition.parts.length,
                imports: definition.imports
                    .map(
                        (moduleImport) =>
                            `${moduleImport.source.replace(UI_SOURCE_PREFIX, '')}:${(moduleImport.namedImports ?? []).length}`,
                    )
                    .join(' '),
                insert: insertBlocked ? 'blocked' : 'ok',
                preview: previewBlocked ? 'blocked' : 'ok',
                className,
                note: definition.limitation ? definition.limitation.split('.')[0] : '',
            });
        }

        assert.equal(rows.length, 54);
        assert.equal(new Set(rows.map((row) => row.name)).size, 54);
        console.log(
            [
                '| Item | Parts | Imports | Insert | Preview | className (local) | Note |',
                '|---|---:|---|---|---|---|---|',
                ...rows.map(
                    (row) =>
                        `| ${row.name} | ${row.parts} | ${row.imports} | ${row.insert} | ${row.preview} | ${row.className} | ${row.note} |`,
                ),
            ].join('\n'),
        );
        console.log(
            [
                `insertable ${rows.filter((row) => row.insert === 'ok').length}`,
                `previewable ${rows.filter((row) => row.preview === 'ok').length}`,
                `local source ${rows.filter((row) => row.className !== '—').length}`,
                `measurable ${rows.filter((row) => !['—', 'not-exported'].includes(row.className)).length}`,
            ].join(', '),
        );
    });

    it('keeps every import inside the pinned export lists', () => {
        const byName = new Map(SHADCN_COMPONENTS.map((component) => [component.name, component]));
        for (const definition of SHADCN_COMPONENTS) {
            for (const moduleImport of definition.imports) {
                const item = uiSourceItem(moduleImport.source);
                if (item === null) {
                    // Only a package that is not a registry item may be imported
                    // verbatim (chart needs the recharts primitives).
                    assert.ok(
                        definition.dependencies.includes(moduleImport.source),
                        `${definition.name} imports ${moduleImport.source}, which is not a recorded dependency`,
                    );
                    continue;
                }
                const target = byName.get(item);
                assert.ok(
                    target,
                    `${definition.name} imports ${moduleImport.source}, which is not in the catalog`,
                );
                for (const name of moduleImport.namedImports ?? []) {
                    assert.ok(
                        target.parts.includes(name),
                        `${definition.name} imports ${name} from ${item}, but the pinned file does not export it`,
                    );
                }
            }
        }
    });

    it('records dependencies as bare package names', () => {
        for (const definition of SHADCN_COMPONENTS) {
            for (const dependency of definition.dependencies) {
                assert.ok(dependency.length > 0, `${definition.name} has an empty dependency`);
                assert.match(
                    dependency,
                    /^(@[^/@]+\/)?[^@/]+$/,
                    `${definition.name} dependency ${dependency} is not a bare package name`,
                );
            }
        }
    });

    it('keeps blocked items empty and explained', () => {
        const blocked = SHADCN_COMPONENTS.filter(
            (definition) =>
                definition.installable === false ||
                definition.insertable === false ||
                definition.previewable === false,
        );
        assert.deepEqual(
            blocked.map((definition) => definition.name),
            ['form', 'sonner', 'toast'],
        );
        for (const definition of blocked) {
            assert.ok(definition.limitation, `${definition.name} is blocked without a reason`);
        }
    });
});
