import fs from 'fs';
import path from 'path';

const CHART_ANCHOR = 'const uniqueId = React.useId();';
const CHART_MARKER = '/* kumite: empty chart */';

/**
 * recharts' ResponsiveContainer reads `children.type`, so a ChartContainer whose
 * inner chart was deleted throws and takes the whole page down. An empty chart
 * should render nothing instead. Idempotent, and does nothing when the registry
 * file changed shape.
 */
export function guardEmptyChartContainer(uiDir: string | null): boolean {
    if (!uiDir) {
        return false;
    }
    const file = ['chart.tsx', 'chart.jsx', 'chart.ts', 'chart.js']
        .map((name) => path.join(uiDir, name))
        .find((candidate) => fs.existsSync(candidate));
    if (!file) {
        return false;
    }
    try {
        const source = fs.readFileSync(file, 'utf8');
        if (source.includes(CHART_MARKER) || !source.includes(CHART_ANCHOR)) {
            return false;
        }
        fs.writeFileSync(
            file,
            source.replace(
                CHART_ANCHOR,
                `${CHART_MARKER}\n    if (!children) return null;\n    ${CHART_ANCHOR}`,
            ),
            'utf8',
        );
        return true;
    } catch {
        return false;
    }
}
