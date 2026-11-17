import fs from 'node:fs';
import path from 'node:path';

export const ARTIFACT_PREVIEW_STYLESHEET_MARKER = '/* kumite-artifact-preview-base */';

export function buildArtifactPreviewStylesheet(): string {
    return "/* kumite-artifact-preview-base */\n@import \"tailwindcss\";\n@source \"./registry/new-york-v4/**/*.{js,jsx,ts,tsx}\";\n@source \"./.kumite-preview-registry/**/*.{js,jsx,ts,tsx}\";\n\n:root {\n  --background: 0 0% 100%;\n  --foreground: 222.2 84% 4.9%;\n  --card: 0 0% 100%;\n  --card-foreground: 222.2 84% 4.9%;\n  --popover: 0 0% 100%;\n  --popover-foreground: 222.2 84% 4.9%;\n  --primary: 222.2 47.4% 11.2%;\n  --primary-foreground: 210 40% 98%;\n  --secondary: 210 40% 96.1%;\n  --secondary-foreground: 222.2 47.4% 11.2%;\n  --muted: 210 40% 96.1%;\n  --muted-foreground: 215.4 16.3% 46.9%;\n  --accent: 210 40% 96.1%;\n  --accent-foreground: 222.2 47.4% 11.2%;\n  --destructive: 0 84.2% 60.2%;\n  --destructive-foreground: 210 40% 98%;\n  --border: 214.3 31.8% 91.4%;\n  --input: 214.3 31.8% 91.4%;\n  --ring: 222.2 84% 4.9%;\n  --radius: 0.5rem;\n}\n.dark {\n  --background: 222.2 84% 4.9%;\n  --foreground: 210 40% 98%;\n  --card: 222.2 84% 4.9%;\n  --card-foreground: 210 40% 98%;\n  --popover: 222.2 84% 4.9%;\n  --popover-foreground: 210 40% 98%;\n  --primary: 210 40% 98%;\n  --primary-foreground: 222.2 47.4% 11.2%;\n  --secondary: 217.2 32.6% 17.5%;\n  --secondary-foreground: 210 40% 98%;\n  --muted: 217.2 32.6% 17.5%;\n  --muted-foreground: 215 20.2% 65.1%;\n  --accent: 217.2 32.6% 17.5%;\n  --accent-foreground: 210 40% 98%;\n  --destructive: 0 62.8% 30.6%;\n  --destructive-foreground: 210 40% 98%;\n  --border: 217.2 32.6% 17.5%;\n  --input: 217.2 32.6% 17.5%;\n  --ring: 212.7 26.8% 83.9%;\n}\n@theme inline {\n  --color-background: hsl(var(--background));\n  --color-foreground: hsl(var(--foreground));\n  --color-card: hsl(var(--card));\n  --color-card-foreground: hsl(var(--card-foreground));\n  --color-popover: hsl(var(--popover));\n  --color-popover-foreground: hsl(var(--popover-foreground));\n  --color-primary: hsl(var(--primary));\n  --color-primary-foreground: hsl(var(--primary-foreground));\n  --color-secondary: hsl(var(--secondary));\n  --color-secondary-foreground: hsl(var(--secondary-foreground));\n  --color-muted: hsl(var(--muted));\n  --color-muted-foreground: hsl(var(--muted-foreground));\n  --color-accent: hsl(var(--accent));\n  --color-accent-foreground: hsl(var(--accent-foreground));\n  --color-destructive: hsl(var(--destructive));\n  --color-destructive-foreground: hsl(var(--destructive-foreground));\n  --color-border: hsl(var(--border));\n  --color-input: hsl(var(--input));\n  --color-ring: hsl(var(--ring));\n  --radius-lg: var(--radius);\n  --radius-md: calc(var(--radius) - 2px);\n  --radius-sm: calc(var(--radius) - 4px);\n}\n* { border-color: hsl(var(--border)); }\nhtml, body, #root { min-height: 100%; margin: 0; }\nbody { background: hsl(var(--background)); color: hsl(var(--foreground)); font-family: Inter, ui-sans-serif, system-ui, sans-serif; }\n";
}

/** Create a self-contained shadcn/Tailwind v4 theme entry only when one is absent. */
export function ensureArtifactPreviewStylesheet(workspaceRoot: string): string {
    const sourceRoot = path.join(workspaceRoot, 'src');
    const stylesheet = path.join(sourceRoot, 'index.css');
    fs.mkdirSync(sourceRoot, { recursive: true });
    if (fs.existsSync(stylesheet)) return stylesheet;
    fs.writeFileSync(stylesheet, buildArtifactPreviewStylesheet(), { encoding: 'utf8', flag: 'wx' });
    return stylesheet;
}
