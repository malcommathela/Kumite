export const GENERATED_CONFIG_MARKER = '// Kumite preview workspace config (generated).\n';

export function buildArtifactPreviewViteConfig(): string {
    return `${GENERATED_CONFIG_MARKER}import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';

const source = (path: string) => fileURLToPath(new URL(path, import.meta.url));

export default defineConfig({
    plugins: [react(), tailwindcss()],
    // Prevent a stale optimized chunk from pairing with fresh React modules.
    server: {
        headers: { 'Cache-Control': 'no-store' },
    },
    resolve: {
        alias: [
            { find: /^@\\/registry\\/new-york-v4\\//, replacement: source('./src/registry/new-york-v4/') },
            { find: /^@\\/components\\/ui\\//, replacement: source('./src/registry/new-york-v4/ui/') },
            { find: /^@\\/components\\//, replacement: source('./src/registry/new-york-v4/components/') },
            { find: /^@\\/assets\\//, replacement: source('./src/registry/new-york-v4/assets/') },
            { find: /^@\\/hooks\\//, replacement: source('./src/registry/new-york-v4/hooks/') },
            { find: /^@\\/lib\\//, replacement: source('./src/registry/new-york-v4/lib/') },
            { find: /^~\\/registry\\/new-york-v4\\//, replacement: source('./src/registry/new-york-v4/') },
            { find: /^~\\/components\\/ui\\//, replacement: source('./src/registry/new-york-v4/ui/') },
            { find: /^~\\/components\\//, replacement: source('./src/registry/new-york-v4/components/') },
            { find: /^~\\/assets\\//, replacement: source('./src/registry/new-york-v4/assets/') },
            { find: /^~\\/hooks\\//, replacement: source('./src/registry/new-york-v4/hooks/') },
            { find: /^~\\/lib\\//, replacement: source('./src/registry/new-york-v4/lib/') },
            { find: '@', replacement: source('./src/') },
            { find: '~', replacement: source('./src/') },
        ],
    },
});
`;
}
