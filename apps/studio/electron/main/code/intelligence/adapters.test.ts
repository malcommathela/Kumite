import { parse } from '@babel/parser';
import * as t from '@babel/types';
import type { TemplateNode } from '@kumite/models/element';
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { ComponentIntelligence } from './index';

/**
 * Stage 5 chart adapter. The adapter is the only per-component code in the
 * engine, and these tests pin why: chart data and series labels live in props,
 * and both are read only when they resolve to a literal in this file.
 */

const PARSE_OPTIONS = {
    plugins: ['typescript', 'jsx'] as const,
    sourceType: 'module' as const,
    allowImportExportEverywhere: true,
};

const PATH = 'C:/repo/src/chart-demo.tsx';

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

function nodeFor(element: t.JSXElement): TemplateNode {
    assert.ok(element.openingElement.loc, 'fixture element has no location');
    return {
        path: PATH,
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

function contentOf(ast: t.File, element: t.JSXElement) {
    const engine = new ComponentIntelligence([{ path: PATH, ast }]);
    const content = engine.content(nodeFor(element));
    if (!content.ok) {
        throw new Error(content.message);
    }
    return content.value;
}

describe('chart adapter', () => {
    const CONFIG_SOURCE = `import { ChartContainer, ChartLegend, ChartLegendContent, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { BarChart } from 'recharts';

const chartConfig = {
    desktop: { label: 'Desktop', color: 'var(--chart-1)' },
    mobile: { label: 'Mobile', color: 'var(--chart-2)' },
} satisfies ChartConfig;

export function Demo() {
    return (
        <ChartContainer config={chartConfig}>
            <BarChart data={[]} />
            <ChartTooltip content={<ChartTooltipContent />} />
            <ChartLegend content={<ChartLegendContent />} />
        </ChartContainer>
    );
}`;

    it('reads series labels from a local config object', () => {
        const ast = parseFile(CONFIG_SOURCE);
        const content = contentOf(ast, elementNamed(ast, 'ChartContainer'));
        assert.equal(content.adapter?.registryName, 'chart');
        assert.deepEqual(
            content.adapter?.fields.map((field) => [field.label, field.value]),
            [
                ['config.desktop.label', 'Desktop'],
                ['config.mobile.label', 'Mobile'],
            ],
        );
        assert.equal(content.adapter?.reason, null);
    });

    it('names the chart regions it can prove', () => {
        const ast = parseFile(CONFIG_SOURCE);
        const content = contentOf(ast, elementNamed(ast, 'ChartContainer'));
        assert.deepEqual(
            content.adapter?.regions.map((region) => [region.name, region.element]),
            [
                ['series', 'BarChart'],
                ['tooltip', 'ChartTooltip'],
                ['legend', 'ChartLegend'],
            ],
        );
    });

    it('reads data rows from a local array prop', () => {
        const ast = parseFile(`import { BarChart } from 'recharts';

const chartData = [
    { month: 'January', desktop: 186 },
    { month: 'February', desktop: 305 },
];

export function Demo() {
    return <BarChart data={chartData} />;
}`);
        const content = contentOf(ast, elementNamed(ast, 'BarChart'));
        assert.equal(content.data?.source, 'chartData');
        assert.equal(content.data?.rows.length, 2);
        assert.deepEqual(
            content.data?.rows[0].fields.map((field) => [field.label, field.value]),
            [
                ['chartData[0].month', 'January'],
                ['chartData[0].desktop', '186'],
            ],
        );
    });

    it('refuses a config that comes from an import', () => {
        const ast = parseFile(`import { chartConfig } from './config';
import { ChartContainer } from '@/components/ui/chart';

export function Demo() {
    return <ChartContainer config={chartConfig} />;
}`);
        const content = contentOf(ast, elementNamed(ast, 'ChartContainer'));
        assert.equal(content.adapter?.fields.length, 0);
        assert.match(content.adapter?.reason ?? '', /not a local object literal/);
    });

    it('refuses data produced by a call', () => {
        const ast = parseFile(`import { BarChart } from 'recharts';

export function Demo() {
    return <BarChart data={getData()} />;
}`);
        const content = contentOf(ast, elementNamed(ast, 'BarChart'));
        assert.equal(content.data, null);
        assert.match(content.adapter?.reason ?? '', /not a local array literal/);
    });

    it('refuses a series whose label is not a string', () => {
        const ast = parseFile(`import { ChartContainer } from '@/components/ui/chart';

const chartConfig = { desktop: { label: labelFor('desktop') } };

export function Demo() {
    return <ChartContainer config={chartConfig} />;
}`);
        const content = contentOf(ast, elementNamed(ast, 'ChartContainer'));
        assert.equal(content.adapter?.fields.length, 0);
        assert.match(content.adapter?.reason ?? '', /label is not a string literal/);
    });

    it('does not claim elements outside the chart registry item', () => {
        const ast = parseFile(`export function Demo() {
    return <section>Hello</section>;
}`);
        const content = contentOf(ast, elementNamed(ast, 'section'));
        assert.equal(content.adapter, null);
        assert.equal(content.text.value, 'Hello');
    });
});
