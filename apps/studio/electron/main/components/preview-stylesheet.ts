import fs from 'node:fs';
import path from 'node:path';

export const ARTIFACT_PREVIEW_STYLESHEET_MARKER = '/* kumite-artifact-preview-base:v3 */';

export function buildArtifactPreviewStylesheet(): string {
    return "/* kumite-artifact-preview-base:v3 */\n@import \"tailwindcss\";\n@source \"./**/*.{js,jsx,ts,tsx}\";\n@source \"./.kumite-preview-registry/**/*.{js,jsx,ts,tsx}\";\n\n:root {\n  --background: oklch(1 0 0);\n  --foreground: oklch(0.145 0 0);\n  --card: oklch(1 0 0);\n  --card-foreground: oklch(0.145 0 0);\n  --popover: oklch(1 0 0);\n  --popover-foreground: oklch(0.145 0 0);\n  --primary: oklch(0.205 0 0);\n  --primary-foreground: oklch(0.985 0 0);\n  --secondary: oklch(0.97 0 0);\n  --secondary-foreground: oklch(0.205 0 0);\n  --muted: oklch(0.97 0 0);\n  --muted-foreground: oklch(0.556 0 0);\n  --accent: oklch(0.97 0 0);\n  --accent-foreground: oklch(0.205 0 0);\n  --destructive: oklch(0.577 0.245 27.325);\n  --destructive-foreground: oklch(0.985 0 0);\n  --border: oklch(0.922 0 0);\n  --input: oklch(0.922 0 0);\n  --ring: oklch(0.708 0 0);\n  --radius: 0.625rem;\n}\n.dark {\n  --background: oklch(0.145 0 0);\n  --foreground: oklch(0.985 0 0);\n  --card: oklch(0.205 0 0);\n  --card-foreground: oklch(0.985 0 0);\n  --popover: oklch(0.205 0 0);\n  --popover-foreground: oklch(0.985 0 0);\n  --primary: oklch(0.922 0 0);\n  --primary-foreground: oklch(0.205 0 0);\n  --secondary: oklch(0.269 0 0);\n  --secondary-foreground: oklch(0.985 0 0);\n  --muted: oklch(0.269 0 0);\n  --muted-foreground: oklch(0.708 0 0);\n  --accent: oklch(0.269 0 0);\n  --accent-foreground: oklch(0.985 0 0);\n  --destructive: oklch(0.704 0.191 22.216);\n  --destructive-foreground: oklch(0.985 0 0);\n  --border: oklch(1 0 0 / 10%);\n  --input: oklch(1 0 0 / 15%);\n  --ring: oklch(0.556 0 0);\n}\n@theme inline {\n  --color-background: var(--background);\n  --color-foreground: var(--foreground);\n  --color-card: var(--card);\n  --color-card-foreground: var(--card-foreground);\n  --color-popover: var(--popover);\n  --color-popover-foreground: var(--popover-foreground);\n  --color-primary: var(--primary);\n  --color-primary-foreground: var(--primary-foreground);\n  --color-secondary: var(--secondary);\n  --color-secondary-foreground: var(--secondary-foreground);\n  --color-muted: var(--muted);\n  --color-muted-foreground: var(--muted-foreground);\n  --color-accent: var(--accent);\n  --color-accent-foreground: var(--accent-foreground);\n  --color-destructive: var(--destructive);\n  --color-destructive-foreground: var(--destructive-foreground);\n  --color-border: var(--border);\n  --color-input: var(--input);\n  --color-ring: var(--ring);\n  --radius-lg: var(--radius);\n  --radius-md: calc(var(--radius) - 2px);\n  --radius-sm: calc(var(--radius) - 4px);\n}\n* { border-color: var(--border); }\nhtml, body, #root { width: 100%; height: 100%; min-height: 0; margin: 0; overflow: hidden; }\nbody { background: var(--background); color: var(--foreground); font-family: Inter, ui-sans-serif, system-ui, sans-serif; }\n#root { display: flex; min-width: 0; min-height: 0; }\n";
}

/** Add the shared Tailwind v4 theme to the private catalog workspace. */
export function ensureArtifactPreviewStylesheet(workspaceRoot: string): string {
    const sourceRoot = path.join(workspaceRoot, 'src');
    const stylesheet = path.join(sourceRoot, 'index.css');
    fs.mkdirSync(sourceRoot, { recursive: true });
    const existing = fs.existsSync(stylesheet) ? fs.readFileSync(stylesheet, 'utf8') : '';
    if (!existing.includes(ARTIFACT_PREVIEW_STYLESHEET_MARKER)) {
        const legacyGenerated = existing.includes('/* kumite-artifact-preview-base */');
        const preserved = legacyGenerated ? '' : existing.replace('@import "tailwindcss";', '').trim();
        const next = [buildArtifactPreviewStylesheet(), preserved].filter(Boolean).join('\n');
        fs.writeFileSync(stylesheet, next, 'utf8');
    }
    return stylesheet;
}
