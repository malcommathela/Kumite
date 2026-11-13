import * as t from '@babel/types';
import type { ContentSpan } from '@kumite/models/code';
import {
    dataTableFromArray,
    elementName,
    findLocalConst,
    type ContentField,
    type DataTable,
} from './content';
import type { Evidence } from './types';

/**
 * Adapters for the few components whose editing semantics differ from the
 * generic model.
 *
 * The generic model reads text children, string attributes and a `.map()`
 * array. A chart keeps its data and its series labels in *props*, and the
 * components that hold them are re-exports of the charting library, not shadcn
 * parts. That is a real semantic difference, so it gets an adapter. Everything
 * else stays on the one generic engine — no per-component tables.
 *
 * Adapters are read-only, like the engine. They return fields addressed by the
 * exact literal span, and they refuse rather than guess.
 */

export interface AdapterRegion {
    /** What the region is for: `series`, `tooltip`, `legend`, `config`. */
    name: string;
    element: string;
    span: ContentSpan | null;
    evidence: Evidence[];
}

export interface AdapterExtraction {
    /** Registry item that owns this element, e.g. `chart`. */
    registryName: string;
    fields: ContentField[];
    data: DataTable | null;
    regions: AdapterRegion[];
    evidence: Evidence[];
    /** Set when the element is recognised but its content cannot be proven. */
    reason: string | null;
}

export interface ComponentAdapter {
    /** Registry item this adapter claims. */
    registryName: string;
    /** Element names the adapter handles. */
    elements: readonly string[];
    extract(ast: t.File, element: t.JSXElement, filePath: string): AdapterExtraction;
}

const CHART_WRAPPER_ELEMENTS = [
    'ChartContainer',
    'ChartStyle',
    'ChartTooltip',
    'ChartTooltipContent',
    'ChartLegend',
    'ChartLegendContent',
] as const;

const CHART_PRIMITIVE_ELEMENTS = [
    'AreaChart',
    'BarChart',
    'ComposedChart',
    'FunnelChart',
    'LineChart',
    'PieChart',
    'RadialBarChart',
    'RadarChart',
    'ScatterChart',
] as const;

/**
 * shadcn `chart`. The wrapper carries `config`, the primitive carries `data`;
 * both are read only when they point at a local literal in this file.
 */
const chartAdapter: ComponentAdapter = {
    registryName: 'chart',
    elements: [...CHART_WRAPPER_ELEMENTS, ...CHART_PRIMITIVE_ELEMENTS],
    extract(ast, element, filePath) {
        const name = elementName(element);
        const evidence: Evidence[] = [
            {
                kind: 'jsx-invocation',
                detail: `<${name}> belongs to the chart registry item.`,
                path: filePath,
            },
        ];
        const regions = childRegions(element, filePath);
        const fields: ContentField[] = [];
        const reasons: string[] = [];
        let data: DataTable | null = null;

        const config = propExpression(element, 'config');
        if (config) {
            const resolved = resolveLiteral(ast, config);
            if (!resolved || !t.isObjectExpression(resolved)) {
                reasons.push('config is not a local object literal in this file.');
            } else {
                const series = seriesFields(resolved);
                if (series.ok) {
                    fields.push(...series.fields);
                    evidence.push({
                        kind: 'alias',
                        detail: `config resolves to a local object with ${series.fields.length} series label${series.fields.length === 1 ? '' : 's'}.`,
                        path: filePath,
                    });
                } else {
                    reasons.push(series.message);
                }
            }
        }

        const dataProp = propExpression(element, 'data');
        if (dataProp) {
            const resolved = resolveLiteral(ast, dataProp);
            const source = t.isIdentifier(dataProp) ? dataProp.name : 'data';
            if (!resolved || !t.isArrayExpression(resolved)) {
                reasons.push('data is not a local array literal in this file.');
            } else {
                const table = dataTableFromArray(source, resolved);
                if (table.ok) {
                    data = table.value;
                    evidence.push({
                        kind: 'alias',
                        detail: `data resolves to ${source}, a local array with ${table.value.rows.length} row${table.value.rows.length === 1 ? '' : 's'}.`,
                        path: filePath,
                    });
                } else {
                    reasons.push(table.message);
                }
            }
        }

        return {
            registryName: 'chart',
            fields,
            data,
            regions,
            evidence,
            reason: reasons.length > 0 ? reasons.join(' ') : null,
        };
    },
};

export const COMPONENT_ADAPTERS: readonly ComponentAdapter[] = [chartAdapter];

export function adapterForElement(name: string): ComponentAdapter | undefined {
    return COMPONENT_ADAPTERS.find((adapter) => adapter.elements.includes(name));
}

function seriesFields(config: t.ObjectExpression): { ok: true; fields: ContentField[] } | { ok: false; message: string } {
    const fields: ContentField[] = [];
    for (const property of config.properties) {
        if (!t.isObjectProperty(property) || property.computed) {
            return { ok: false, message: 'config has a spread or computed key.' };
        }
        if (!t.isIdentifier(property.key) && !t.isStringLiteral(property.key)) {
            return { ok: false, message: 'config has a non-identifier key.' };
        }
        const key = t.isIdentifier(property.key) ? property.key.name : property.key.value;
        if (!t.isObjectExpression(property.value)) {
            return { ok: false, message: `config.${key} is not an object literal.` };
        }
        const label = property.value.properties.find(
            (item): item is t.ObjectProperty =>
                t.isObjectProperty(item) &&
                !item.computed &&
                t.isIdentifier(item.key) &&
                item.key.name === 'label',
        );
        if (!label || !t.isStringLiteral(label.value)) {
            return { ok: false, message: `config.${key}.label is not a string literal.` };
        }
        fields.push({
            kind: 'data',
            label: `config.${key}.label`,
            value: label.value.value,
            raw: label.value.value,
            span: spanOf(label.value),
            editable: true,
            reason: null,
        });
    }
    return { ok: true, fields };
}

function childRegions(element: t.JSXElement, filePath: string): AdapterRegion[] {
    const regions: AdapterRegion[] = [];
    for (const child of element.children) {
        if (!t.isJSXElement(child)) {
            continue;
        }
        const name = elementName(child);
        regions.push({
            name: regionName(name),
            element: name,
            span: spanOf(child),
            evidence: [
                {
                    kind: 'declaration',
                    detail: `<${name}> is a direct child of <${elementName(element)}>.`,
                    path: filePath,
                },
            ],
        });
    }
    return regions;
}

function regionName(element: string): string {
    if (CHART_PRIMITIVE_ELEMENTS.includes(element as (typeof CHART_PRIMITIVE_ELEMENTS)[number])) {
        return 'series';
    }
    if (element.startsWith('ChartTooltip')) {
        return 'tooltip';
    }
    if (element.startsWith('ChartLegend')) {
        return 'legend';
    }
    if (element === 'ChartStyle') {
        return 'config';
    }
    return 'child';
}

function propExpression(element: t.JSXElement, name: string): t.Expression | null {
    for (const attribute of element.openingElement.attributes) {
        if (!t.isJSXAttribute(attribute) || !t.isJSXIdentifier(attribute.name)) {
            continue;
        }
        if (attribute.name.name !== name) {
            continue;
        }
        if (!t.isJSXExpressionContainer(attribute.value)) {
            return null;
        }
        return t.isExpression(attribute.value.expression)
            ? attribute.value.expression
            : null;
    }
    return null;
}

function resolveLiteral(ast: t.File, expression: t.Expression): t.Expression | null {
    if (t.isIdentifier(expression)) {
        return findLocalConst(ast, expression.name);
    }
    return expression;
}

function spanOf(node: t.Node): ContentSpan | null {
    const loc = node.loc;
    if (!loc) {
        return null;
    }
    return {
        start: { line: loc.start.line, column: loc.start.column },
        end: { line: loc.end.line, column: loc.end.column },
    };
}
