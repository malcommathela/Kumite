import { COMPONENT_CLI_VERSION, getShadcnComponent } from '@kumite/models';
import fs from 'fs';
import path from 'path';
import { findComponentFile } from './inspect';

interface ProvenanceRecord {
    name: string;
    files: string[];
    registry: string;
    cliVersion: string;
    updatedAt: string;
}

interface ProvenanceManifest {
    generator: string;
    registry: string;
    cliVersion: string;
    components: ProvenanceRecord[];
}

const MANIFEST_DIR = '.kumite';
const MANIFEST_FILE = 'components.json';
const NOTICES_FILE = 'THIRD-PARTY-NOTICES.md';

const NOTICES = `# Third-party notices

Components in this project were added with the [shadcn/ui](https://ui.shadcn.com) registry.

- shadcn/ui is distributed under the MIT License.
- The generated component source files depend on open-source packages declared in package.json
  (for example Radix UI, class-variance-authority, clsx, tailwind-merge and lucide-react).
  Their licenses remain with their respective authors.

This file is maintained by Kumite. It records provenance only and grants no additional rights.
`;

export function recordComponentInstallation(
    projectPath: string,
    componentName: string,
    uiDir: string | null,
): void {
    const directory = path.join(projectPath, MANIFEST_DIR);
    fs.mkdirSync(directory, { recursive: true });

    const manifestPath = path.join(directory, MANIFEST_FILE);
    const manifest = readManifest(manifestPath);
    const definition = getShadcnComponent(componentName);
    const componentFile = findComponentFile(uiDir, componentName);

    const files = componentFile
        ? [path.relative(projectPath, componentFile).split(path.sep).join('/')]
        : [];

    const record: ProvenanceRecord = {
        name: componentName,
        files,
        registry: definition?.name ?? componentName,
        cliVersion: COMPONENT_CLI_VERSION,
        updatedAt: new Date().toISOString(),
    };

    manifest.generator = 'Kumite';
    manifest.registry = 'shadcn/ui';
    manifest.cliVersion = COMPONENT_CLI_VERSION;
    manifest.components = [
        ...manifest.components.filter((entry) => entry.name !== componentName),
        record,
    ];
    fs.writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, 'utf8');

    const noticesPath = path.join(directory, NOTICES_FILE);
    if (!fs.existsSync(noticesPath)) {
        fs.writeFileSync(noticesPath, NOTICES, 'utf8');
    }
}

function readManifest(manifestPath: string): ProvenanceManifest {
    try {
        const parsed = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
        if (Array.isArray(parsed?.components)) {
            return parsed as ProvenanceManifest;
        }
    } catch {
        // Missing or invalid manifest; start a new one.
    }
    return { generator: 'Kumite', registry: 'shadcn/ui', cliVersion: COMPONENT_CLI_VERSION, components: [] };
}
