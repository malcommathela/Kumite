import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { after, describe, it } from 'node:test';
import type { ImplementationArtifact } from '@kumite/models';
import { prepareImplementationInsertion } from './insertion-preparation';
import { hashImplementationArtifact, hashImplementationSource } from './source-resolver';

const roots: string[] = [];

after(() => {
    for (const root of roots) {
        fs.rmSync(root, { recursive: true, force: true });
    }
});

function sha256(value: string): string {
    return createHash('sha256').update(value).digest('hex');
}

function artifact(): ImplementationArtifact {
    const content = 'export function FixtureButton() { return null; }';
    const value = {
        schemaVersion: 1,
        id: 'shadcn:new-york-v4:component:fixture@commit',
        provider: 'shadcn',
        source: {
            name: 'fixture',
            version: '3.7.0',
            commit: '1e9e337923aaede7db55b6091cb56a72a661b959',
            registryUrl: 'https://example.test/registry.json',
            sourceUrl: 'https://example.test/source',
            retrievedAt: '2026-11-16T12:00:00.000Z',
            provenance: 'official',
            registryItems: [],
        },
        metadata: { name: 'fixture', type: 'component', tags: [] },
        entryPoint: 'registry/new-york-v4/ui/fixture.tsx',
        files: [
            {
                path: 'registry/new-york-v4/ui/fixture.tsx',
                content,
                role: 'entry',
                sourceUrl: 'https://example.test/fixture.tsx',
                sha256: sha256(content),
            },
        ],
        dependencies: [
            { name: 'lucide-react', origins: ['source-import'], versionSource: 'unspecified' },
            { name: 'clsx', origins: ['registry'], version: '2.1.1', versionSource: 'registry' },
        ],
        assets: [],
        graph: { edges: [], cycles: [] },
        requirements: { providers: [], configuration: [] },
        demo: { available: false, preserved: false, files: [], editable: false },
        integrity: { sourceHash: '', artifactHash: '' },
    } as ImplementationArtifact;
    value.integrity.sourceHash = hashImplementationSource(value);
    value.integrity.artifactHash = hashImplementationArtifact(value);
    return value;
}

function createProject(): string {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'kumite-insertion-prep-'));
    roots.push(root);
    fs.mkdirSync(path.join(root, 'src'), { recursive: true });
    fs.writeFileSync(
        path.join(root, 'package.json'),
        JSON.stringify({ dependencies: { react: '^19.0.0' }, devDependencies: { vite: '^6.0.0' } }),
    );
    fs.writeFileSync(path.join(root, 'package-lock.json'), '{}');
    fs.writeFileSync(
        path.join(root, 'components.json'),
        JSON.stringify({
            aliases: { components: '@/components', ui: '@/components/ui' },
            tailwind: { css: 'src/index.css' },
        }),
    );
    fs.writeFileSync(
        path.join(root, 'tsconfig.json'),
        JSON.stringify({ compilerOptions: { paths: { '@/*': ['./src/*'] } } }),
    );
    fs.mkdirSync(path.join(root, 'node_modules', 'lucide-react'), { recursive: true });
    fs.writeFileSync(
        path.join(root, 'node_modules', 'lucide-react', 'package.json'),
        JSON.stringify({ version: '0.500.0' }),
    );
    return root;
}

describe('implementation insertion preparation', () => {
    it('plans a complete source tree and missing dependencies without writing to the project', () => {
        const root = createProject();
        const before = fs.readdirSync(root).sort();
        const plan = prepareImplementationInsertion(artifact(), root);

        assert.equal(plan.project.framework, 'vite');
        assert.equal(plan.project.packageManager, 'npm');
        assert.equal(plan.project.compatible, true);
        assert.deepEqual(plan.filesToAdd, [
            path.join(
                root,
                'src',
                'components',
                'kumite',
                artifact().integrity.artifactHash,
                ...artifact().files[0].path.split('/'),
            ),
        ]);
        assert.deepEqual(plan.dependenciesToInstall, ['lucide-react', 'clsx']);
        assert.equal(plan.dependencies[0].action, 'install');
        assert.equal(plan.dependencies[0].compatible, 'unknown');
        assert.equal(plan.entryImport.export?.kind, 'named');
        assert.deepEqual(fs.readdirSync(root).sort(), before);
    });

    it('resolves conflicting lockfiles instead of blocking insertion', () => {
        const root = createProject();
        fs.writeFileSync(path.join(root, 'bun.lockb'), '');
        fs.writeFileSync(path.join(root, 'yarn.lock'), '');

        const plan = prepareImplementationInsertion(artifact(), root);

        assert.equal(plan.project.packageManager, 'bun');
        assert.equal(plan.project.compatible, true);
        assert.ok(
            plan.warnings.some((warning) =>
                warning.includes('Multiple package-manager lockfiles were found'),
            ),
        );
    });

    it('reuses byte-identical files and reports differing files as conflicts', () => {
        const root = createProject();
        const destination = path.join(
            root,
            'src',
            'components',
            'kumite',
            artifact().integrity.artifactHash,
            ...artifact().files[0].path.split('/'),
        );
        fs.mkdirSync(path.dirname(destination), { recursive: true });
        fs.writeFileSync(destination, 'different existing file');

        const plan = prepareImplementationInsertion(artifact(), root);

        assert.deepEqual(plan.conflicts, [destination]);
        assert.deepEqual(plan.existingFiles, []);
        assert.equal(fs.readFileSync(destination, 'utf8'), 'different existing file');

        const identicalPlan = prepareImplementationInsertion(artifact(), root);
        fs.writeFileSync(destination, identicalPlan.files[0].content);
        const identical = prepareImplementationInsertion(artifact(), root);
        assert.deepEqual(identical.conflicts, []);
        assert.deepEqual(identical.existingFiles, [destination]);
    });

    it('rejects unsafe artifact paths before producing a project plan', () => {
        const root = createProject();
        const unsafe = artifact();
        unsafe.files[0].path = '../outside.tsx';
        unsafe.entryPoint = '../outside.tsx';
        unsafe.integrity.sourceHash = hashImplementationSource(unsafe);
        unsafe.integrity.artifactHash = hashImplementationArtifact(unsafe);

        assert.throws(() => prepareImplementationInsertion(unsafe, root), /unsafe/i);
    });

    it('rewrites upstream aliases in an AST and records original/transformed hashes', () => {
        const root = createProject();
        const upstream = artifact();
        upstream.files[0].content =
            'import { cn } from "@/lib/utils"; export function FixtureButton() { return <button className={cn("x")} />; }';
        upstream.files[0].sha256 = sha256(upstream.files[0].content);
        upstream.integrity.sourceHash = hashImplementationSource(upstream);
        upstream.integrity.artifactHash = hashImplementationArtifact(upstream);

        const plan = prepareImplementationInsertion(upstream, root);
        const file = plan.files[0];

        assert.equal(file.sha256, upstream.files[0].sha256);
        assert.notEqual(file.transformedSha256, file.sha256);
        assert.match(file.content, /from "\.\.\/lib\/utils"/);
        assert.deepEqual(file.transformations, [
            {
                kind: 'alias-import',
                from: '@/lib/utils',
                to: '../lib/utils',
            },
        ]);
        assert.equal(plan.transformations[0].sourceHash, file.sha256);
        assert.equal(plan.transformations[0].transformedHash, file.transformedSha256);
        assert.match(plan.entryImport.source, /kumite\/[a-f0-9]{64}\/registry/);
    });
});
