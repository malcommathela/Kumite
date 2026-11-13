import fs from 'fs';
import path from 'path';
import { readComponentsJson } from './inspect';

interface ThemeNormalizationResult {
    file: string | null;
    replacements: number;
    skipped: string | null;
}

interface OklchColor {
    l: number;
    c: number;
    h: number;
    alpha: number;
}

const OKLCH_PATTERN = /^oklch\(\s*([^)]+)\)$/i;
const DECLARATION_PATTERN = /^(\s*)(--[\w-]+)\s*:\s*(.+?);(\s*)$/;

function parseOklch(raw: string): OklchColor | null {
    const match = OKLCH_PATTERN.exec(raw.trim());
    if (!match) {
        return null;
    }
    const [colorPart, alphaPart] = match[1].split('/');
    const channels = colorPart.trim().split(/\s+/);
    if (channels.length < 3) {
        return null;
    }
    const l = parseChannel(channels[0], true);
    const c = parseChannel(channels[1], true);
    const h = parseAngle(channels[2]);
    if (l === null || c === null || h === null) {
        return null;
    }
    let alpha = 1;
    if (alphaPart !== undefined) {
        const parsed = parseAlpha(alphaPart.trim());
        if (parsed === null) {
            return null;
        }
        alpha = parsed;
    }
    return { l, c, h, alpha };
}

function parseChannel(value: string, scale: boolean): number | null {
    const trimmed = value.trim();
    if (trimmed.endsWith('%')) {
        const numeric = Number.parseFloat(trimmed.slice(0, -1));
        return Number.isFinite(numeric) ? numeric / 100 : null;
    }
    const numeric = Number.parseFloat(trimmed);
    if (!Number.isFinite(numeric)) {
        return null;
    }
    return scale && numeric > 1 ? numeric / 100 : numeric;
}

function parseAngle(value: string): number | null {
    const trimmed = value.trim().toLowerCase();
    if (trimmed.endsWith('deg')) {
        const numeric = Number.parseFloat(trimmed.slice(0, -3));
        return Number.isFinite(numeric) ? numeric : null;
    }
    const numeric = Number.parseFloat(trimmed);
    return Number.isFinite(numeric) ? numeric : null;
}

function parseAlpha(value: string): number | null {
    if (value.endsWith('%')) {
        const numeric = Number.parseFloat(value.slice(0, -1));
        return Number.isFinite(numeric) ? numeric / 100 : null;
    }
    const numeric = Number.parseFloat(value);
    return Number.isFinite(numeric) ? numeric : null;
}

function gammaEncode(value: number): number {
    const clamped = Math.min(1, Math.max(0, value));
    return clamped <= 0.0031308 ? 12.92 * clamped : 1.055 * clamped ** (1 / 2.4) - 0.055;
}

function oklchToRgb(color: OklchColor): [number, number, number] {
    const hRadians = (color.h * Math.PI) / 180;
    const a = color.c * Math.cos(hRadians);
    const b = color.c * Math.sin(hRadians);

    const lPrime = color.l + 0.3963377774 * a + 0.2158037573 * b;
    const mPrime = color.l - 0.1055613458 * a - 0.0638541728 * b;
    const sPrime = color.l - 0.0894841775 * a - 1.291485548 * b;

    const l = lPrime ** 3;
    const m = mPrime ** 3;
    const s = sPrime ** 3;

    const r = 4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s;
    const g = -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s;
    const blue = -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s;

    return [gammaEncode(r), gammaEncode(g), gammaEncode(blue)];
}

function rgbToHsl(rgb: [number, number, number]): [number, number, number] {
    const [r, g, b] = rgb;
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    const lightness = (max + min) / 2;
    const delta = max - min;

    if (delta === 0) {
        return [0, 0, lightness];
    }

    const saturation =
        lightness > 0.5 ? delta / (2 - max - min) : delta / (max + min);

    if (saturation < 0.0005) {
        return [0, 0, lightness];
    }

    let hue: number;
    if (max === r) {
        hue = (g - b) / delta + (g < b ? 6 : 0);
    } else if (max === g) {
        hue = (b - r) / delta + 2;
    } else {
        hue = (r - g) / delta + 4;
    }
    hue *= 60;

    return [hue, saturation, lightness];
}

function formatNumber(value: number, digits = 1): string {
    const rounded = Number.parseFloat(value.toFixed(digits));
    return String(rounded);
}

function toHslTriplet(color: OklchColor, background: [number, number, number] | null): string {
    let rgb = oklchToRgb(color);
    if (color.alpha < 1) {
        const base = background ?? (color.l > 0.5 ? [0, 0, 0] : [1, 1, 1]);
        rgb = [
            rgb[0] * color.alpha + base[0] * (1 - color.alpha),
            rgb[1] * color.alpha + base[1] * (1 - color.alpha),
            rgb[2] * color.alpha + base[2] * (1 - color.alpha),
        ];
    }
    const [h, s, l] = rgbToHsl(rgb);
    return `${formatNumber(h, 1)} ${formatNumber(s * 100, 1)}% ${formatNumber(l * 100, 1)}%`;
}

function resolveTailwindConfig(projectPath: string): string | null {
    const componentsJson = readComponentsJson(projectPath);
    const configured = componentsJson?.tailwind?.config;
    if (configured) {
        const candidate = path.resolve(projectPath, configured);
        if (fs.existsSync(candidate)) {
            return candidate;
        }
    }
    for (const name of ['tailwind.config.js', 'tailwind.config.cjs', 'tailwind.config.ts', 'tailwind.config.mjs']) {
        const candidate = path.join(projectPath, name);
        if (fs.existsSync(candidate)) {
            return candidate;
        }
    }
    return null;
}

/**
 * Tailwind v3 projects map design tokens through `hsl(var(--token))`. The shadcn
 * CLI writes OKLCH values into the CSS file regardless of the Tailwind version,
 * which produces invalid `hsl(oklch(...))` values and transparent components.
 * Rewriting those tokens to HSL triplets keeps the project's own Tailwind setup
 * authoritative.
 */
export function normalizeOklchTheme(projectPath: string): ThemeNormalizationResult {
    const configPath = resolveTailwindConfig(projectPath);
    if (!configPath) {
        return { file: null, replacements: 0, skipped: 'No Tailwind config file was found.' };
    }
    const configSource = fs.readFileSync(configPath, 'utf8');
    if (!configSource.includes('hsl(var(')) {
        return {
            file: null,
            replacements: 0,
            skipped: 'The Tailwind config does not map colors through hsl(var(--...)).',
        };
    }

    const componentsJson = readComponentsJson(projectPath);
    const cssRelative = componentsJson?.tailwind?.css;
    if (!cssRelative) {
        return { file: null, replacements: 0, skipped: 'components.json does not declare a CSS file.' };
    }
    const cssPath = path.resolve(projectPath, cssRelative);
    if (!fs.existsSync(cssPath)) {
        return { file: null, replacements: 0, skipped: 'The declared CSS file does not exist.' };
    }

    const source = fs.readFileSync(cssPath, 'utf8');
    if (!/oklch\(/i.test(source)) {
        return { file: cssPath, replacements: 0, skipped: 'No OKLCH values were found.' };
    }

    const lines = source.split(/\r?\n/);
    const blocks = new Map<number, Array<{ index: number; name: string; value: string; prefix: string; suffix: string }>>();
    let depth = 0;
    lines.forEach((line, index) => {
        if (line.includes('}')) {
            depth = Math.max(0, depth - 1);
        }
        const match = DECLARATION_PATTERN.exec(line);
        if (match) {
            const block = blocks.get(depth) ?? [];
            block.push({
                index,
                name: match[2],
                value: match[3].trim(),
                prefix: match[1],
                suffix: match[4],
            });
            blocks.set(depth, block);
        }
        if (line.includes('{')) {
            depth += 1;
        }
    });

    let replacements = 0;
    for (const declarations of blocks.values()) {
        const backgroundDeclaration = declarations.find(
            (declaration) => declaration.name === '--background',
        );
        const backgroundColor = backgroundDeclaration
            ? parseOklch(backgroundDeclaration.value)
            : null;
        const backgroundRgb = backgroundColor ? oklchToRgb(backgroundColor) : null;

        for (const declaration of declarations) {
            const color = parseOklch(declaration.value);
            if (!color) {
                continue;
            }
            const triplet = toHslTriplet(color, backgroundRgb);
            lines[declaration.index] = `${declaration.prefix}${declaration.name}: ${triplet};${declaration.suffix}`;
            replacements += 1;
        }
    }

    if (replacements === 0) {
        return { file: cssPath, replacements: 0, skipped: 'No convertible OKLCH declarations were found.' };
    }

    fs.writeFileSync(cssPath, lines.join('\n'), 'utf8');
    return { file: cssPath, replacements, skipped: null };
}
