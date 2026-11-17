import fs from 'node:fs';
import path from 'node:path';

export const ARTIFACT_PREVIEW_STYLESHEET_MARKER = '/* kumite-artifact-preview-base */';

export function buildArtifactPreviewStylesheet(): string {
    return "/* kumite-artifact-preview-base */\n@tailwind base;\n@tailwind components;\n@tailwind utilities;\n\n:root {\n  --background: 0 0% 100%;\n  --foreground: 222.2 84% 4.9%;\n  --card: 0 0% 100%;\n  --card-foreground: 222.2 84% 4.9%;\n  --popover: 0 0% 100%;\n  --popover-foreground: 222.2 84% 4.9%;\n  --primary: 222.2 47.4% 11.2%;\n  --primary-foreground: 210 40% 98%;\n  --secondary: 210 40% 96.1%;\n  --secondary-foreground: 222.2 47.4% 11.2%;\n  --muted: 210 40% 96.1%;\n  --muted-foreground: 215.4 16.3% 46.9%;\n  --accent: 210 40% 96.1%;\n  --accent-foreground: 222.2 47.4% 11.2%;\n  --destructive: 0 84.2% 60.2%;\n  --destructive-foreground: 210 40% 98%;\n  --border: 214.3 31.8% 91.4%;\n  --input: 214.3 31.8% 91.4%;\n  --ring: 222.2 84% 4.9%;\n  --radius: 0.5rem;\n}\n.dark {\n  --background: 222.2 84% 4.9%;\n  --foreground: 210 40% 98%;\n  --card: 222.2 84% 4.9%;\n  --card-foreground: 210 40% 98%;\n  --popover: 222.2 84% 4.9%;\n  --popover-foreground: 210 40% 98%;\n  --primary: 210 40% 98%;\n  --primary-foreground: 222.2 47.4% 11.2%;\n  --secondary: 217.2 32.6% 17.5%;\n  --secondary-foreground: 210 40% 98%;\n  --muted: 217.2 32.6% 17.5%;\n  --muted-foreground: 215 20.2% 65.1%;\n  --accent: 217.2 32.6% 17.5%;\n  --accent-foreground: 210 40% 98%;\n  --destructive: 0 62.8% 30.6%;\n  --destructive-foreground: 210 40% 98%;\n  --border: 217.2 32.6% 17.5%;\n  --input: 217.2 32.6% 17.5%;\n  --ring: 212.7 26.8% 83.9%;\n}\n@layer base {\n  * { @apply border-border; }\n  html, body, #root { min-height: 100%; margin: 0; }\n  body { @apply bg-background text-foreground; font-family: Inter, ui-sans-serif, system-ui, sans-serif; }\n}\n";
}

/** Create a self-contained shadcn/Tailwind v3 theme entry only when one is absent. */
export function ensureArtifactPreviewStylesheet(workspaceRoot: string): string {
    const sourceRoot = path.join(workspaceRoot, 'src');
    const stylesheet = path.join(sourceRoot, 'index.css');
    fs.mkdirSync(sourceRoot, { recursive: true });
    if (!fs.existsSync(stylesheet)) {
        fs.writeFileSync(stylesheet, buildArtifactPreviewStylesheet(), { encoding: 'utf8', flag: 'wx' });
    }
    const tailwindConfig = path.join(workspaceRoot, 'tailwind.config.cjs');
    if (!fs.existsSync(tailwindConfig)) {
        fs.writeFileSync(tailwindConfig, `module.exports = {
    content: ['./src/**/*.{js,ts,jsx,tsx}'],
    darkMode: 'class',
    theme: {
        extend: {
            colors: {
                border: 'hsl(var(--border))',
                input: 'hsl(var(--input))',
                ring: 'hsl(var(--ring))',
                background: 'hsl(var(--background))',
                foreground: 'hsl(var(--foreground))',
                primary: { DEFAULT: 'hsl(var(--primary))', foreground: 'hsl(var(--primary-foreground))' },
                secondary: { DEFAULT: 'hsl(var(--secondary))', foreground: 'hsl(var(--secondary-foreground))' },
                destructive: { DEFAULT: 'hsl(var(--destructive))', foreground: 'hsl(var(--destructive-foreground))' },
                muted: { DEFAULT: 'hsl(var(--muted))', foreground: 'hsl(var(--muted-foreground))' },
                accent: { DEFAULT: 'hsl(var(--accent))', foreground: 'hsl(var(--accent-foreground))' },
                popover: { DEFAULT: 'hsl(var(--popover))', foreground: 'hsl(var(--popover-foreground))' },
                card: { DEFAULT: 'hsl(var(--card))', foreground: 'hsl(var(--card-foreground))' },
            },
            borderRadius: { lg: 'var(--radius)', md: 'calc(var(--radius) - 2px)', sm: 'calc(var(--radius) - 4px)' },
        },
    },
    plugins: [],
};
`, { encoding: 'utf8', flag: 'wx' });
    }
    const postcssConfig = path.join(workspaceRoot, 'postcss.config.cjs');
    if (!fs.existsSync(postcssConfig)) {
        fs.writeFileSync(postcssConfig, `module.exports = { plugins: { tailwindcss: {}, autoprefixer: {} } };\n`, { encoding: 'utf8', flag: 'wx' });
    }
    return stylesheet;
}
