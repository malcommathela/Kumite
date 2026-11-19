import type { ImplementationArtifact } from '@kumite/models';
import {
    describeMissingEntryExport,
    findMissingArtifactProviders,
    readEntrySourceFile,
    resolveRuntimeEntryExport,
} from './entry-export';

function exportedEntry(
    artifact: ImplementationArtifact,
    preferredExport?: string,
): { kind: 'default' } | { kind: 'named'; name: string } {
    const entry = artifact.files.find((file) => file.path === artifact.entryPoint);
    if (!entry) {
        throw new Error(`Artifact entry point "${artifact.entryPoint}" is missing.`);
    }
    const missingProviders = findMissingArtifactProviders(artifact);
    if (missingProviders.length) {
        throw new Error(
            `Preview cannot safely construct required provider${missingProviders.length > 1 ? 's' : ''}: ${missingProviders.join(', ')}.`,
        );
    }
    const resolved = resolveRuntimeEntryExport(
        readEntrySourceFile(entry.content),
        artifact,
        preferredExport,
    );
    if (!resolved) {
        throw new Error(describeMissingEntryExport(artifact.entryPoint, artifact.metadata.type));
    }
    return resolved;
}

function extensionless(value: string): string {
    return value.replace(/\.(tsx|jsx|ts|js)$/, '');
}

export function buildArtifactPreviewModule(
    artifact: ImplementationArtifact,
    sessionId: string,
    preferredExport?: string,
): string {
    const entry = exportedEntry(artifact, preferredExport);
    const source = `@/${extensionless(artifact.entryPoint)}`;
    const importLine =
        entry.kind === 'default'
            ? `import Implementation from ${JSON.stringify(source)};`
            : `import { ${entry.name} as Implementation } from ${JSON.stringify(source)};`;
    const previewLayout = artifact.metadata.type === 'block'
        ? 'flex h-full w-full items-center justify-center overflow-hidden p-4 [&>*]:max-h-full [&>*]:max-w-full'
        : 'mx-auto flex h-full w-full max-w-2xl items-center justify-center overflow-hidden p-4 [&>*]:max-h-full [&>*]:max-w-full';
    return `/* kumite artifact preview */
import React from 'react';
import { createRoot } from 'react-dom/client';
import '@/index.css';
${importLine}
function Handshake() {
    React.useEffect(() => window.__kumitePreview?.post('mounted'), []);
    return null;
}
class Boundary extends React.Component {
    state = { error: null };
    static getDerivedStateFromError(error) { return { error: error?.message || 'Preview crashed.' }; }
    componentDidCatch(error) { window.__kumitePreview?.post('error', error?.message || 'Preview crashed.'); }
    render() {
        return this.state.error
            ? <pre className="whitespace-pre-wrap p-5 text-sm text-red-600">{this.state.error}</pre>
            : this.props.children;
    }
}
function Preview() {
    return <React.StrictMode><Boundary><Handshake /><main className="flex h-full min-h-0 w-full items-center justify-center overflow-hidden"><div className={${JSON.stringify(previewLayout)}}><Implementation /></div></main></Boundary></React.StrictMode>;
}
createRoot(document.getElementById('root')!).render(<Preview />);
void ${JSON.stringify(sessionId)};
`;
}
