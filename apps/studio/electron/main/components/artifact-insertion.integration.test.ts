import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { after, describe, it } from 'node:test';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import react from '@vitejs/plugin-react';
import { createServer } from 'vite';
import type { ImplementationArtifact } from '@kumite/models';
import { CodeActionType } from '@kumite/models/actions';
import { EditorAttributes } from '@kumite/models/constants';
import type { CodeDiffRequest } from '@kumite/models/code';
import generate from '@babel/generator';
import * as t from '@babel/types';
import { createInsertedElement } from '../code/diff/insert';
import { addImportsToFile } from '../code/diff/imports';
import { parseJsxFile } from '../code/helpers';
import { createMappingFromContent } from '../run/setup';
import {
    applyArtifactInsertion,
    cancelArtifactInsertion,
    finishArtifactInsertion,
    getArtifactInsertionApprovalDetails,
    prepareArtifactValueInsertion,
} from './artifact-insertion';
import { hashImplementationArtifact, hashImplementationSource } from './source-resolver';

const roots: string[] = [];

after(async () => {
    for (const root of roots) {
        try {
            await fs.promises.rm(root, {
                recursive: true,
                force: true,
                maxRetries: 10,
                retryDelay: 250,
            });
        } catch (error) {
            if (process.platform !== 'win32') {throw error;}
            const cleanup = spawnSync('cmd.exe', ['/d', '/c', 'rmdir', '/s', '/q', root], {
                encoding: 'utf8',
                windowsHide: true,
            });
            if (cleanup.status !== 0) {throw error;}
        }
    }
});

function sha256(value: string): string {
    return createHash('sha256').update(value).digest('hex');
}

function fixtureArtifact(): ImplementationArtifact {
    const content = [
        'export function FixtureButton(props: { "data-oid"?: string }) {',
        '  return <button data-oid={props["data-oid"]}>Canonical artifact mounted</button>;',
        '}',
    ].join('\n');
    const artifact = {
        schemaVersion: 1,
        id: 'shadcn:fixture:runtime',
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
            {
                name: 'react',
                version: '18.3.1',
                origins: ['registry'],
                versionSource: 'registry',
            },
        ],
        assets: [],
        graph: { edges: [], cycles: [] },
        requirements: { providers: [], configuration: [] },
        demo: { available: false, preserved: false, files: [], editable: false },
        integrity: { sourceHash: '', artifactHash: '' },
    } as ImplementationArtifact;
    artifact.integrity.sourceHash = hashImplementationSource(artifact);
    artifact.integrity.artifactHash = hashImplementationArtifact(artifact);
    return artifact;
}

async function createProject(): Promise<string> {
    const root = await fs.promises.mkdtemp(path.join(os.tmpdir(), 'kumite-artifact-runtime-'));
    roots.push(root);
    await fs.promises.mkdir(path.join(root, 'src'), { recursive: true });
    await fs.promises.writeFile(
        path.join(root, 'package.json'),
        JSON.stringify({
            name: 'kumite-artifact-runtime-fixture',
            type: 'module',
            dependencies: { react: '18.3.1', 'react-dom': '18.3.1', vite: '6.0.11' },
        }),
    );
    await fs.promises.writeFile(path.join(root, 'package-lock.json'), '{}');
    await fs.promises.writeFile(
        path.join(root, 'components.json'),
        JSON.stringify({
            aliases: { components: '@/components', ui: '@/components/ui' },
        }),
    );
    await fs.promises.writeFile(
        path.join(root, 'tsconfig.json'),
        JSON.stringify({
            compilerOptions: { paths: { '@/*': ['./src/*'] } },
        }),
    );
    await fs.promises.writeFile(path.join(root, 'index.html'), '<div id="root"></div>');
    await fs.promises.symlink(
        path.resolve(process.cwd(), '../../node_modules'),
        path.join(root, 'node_modules'),
        'junction',
    );
    return root;
}

async function createInstallProject(installScript: string, scriptedDependency = false): Promise<{
    root: string;
    marker: string;
    originalPackage: string;
    originalLock: string;
}> {
    const root = await fs.promises.mkdtemp(path.join(os.tmpdir(), 'kumite-dependency-approval-'));
    roots.push(root);
    await fs.promises.mkdir(path.join(root, 'src'), { recursive: true });
    const originalPackage = JSON.stringify({
        name: 'kumite-dependency-approval-fixture',
        dependencies: { react: '18.3.1', vite: '6.4.6' },
    }, null, 2) + '\n';
    const originalLock = JSON.stringify({
        name: 'kumite-dependency-approval-fixture',
        lockfileVersion: 3,
        packages: {
            '': { dependencies: { react: '18.3.1', vite: '6.4.6' } },
        },
    }, null, 2) + '\n';
    await fs.promises.writeFile(path.join(root, 'package.json'), originalPackage);
    await fs.promises.writeFile(path.join(root, 'package-lock.json'), originalLock);
    await fs.promises.writeFile(
        path.join(root, 'components.json'),
        JSON.stringify({ aliases: { components: '@/components', ui: '@/components/ui' } }),
    );
    await fs.promises.writeFile(
        path.join(root, 'tsconfig.json'),
        JSON.stringify({ compilerOptions: { paths: { '@/*': ['./src/*'] } } }),
    );
    for (const [name, version] of [['react', '18.3.1'], ['vite', '6.4.6'], ['fixture-dep', '1.2.3']]) {
        const directory = path.join(root, 'node_modules', name);
        await fs.promises.mkdir(directory, { recursive: true });
        await fs.promises.writeFile(
            path.join(directory, 'package.json'),
            JSON.stringify({
                name,
                version,
                ...(name === 'fixture-dep' && scriptedDependency
                    ? { scripts: { preinstall: 'node -e "process.exit(1)"' } }
                    : {}),
            }),
        );
    }
    const bin = path.join(root, 'test-bin');
    await fs.promises.mkdir(bin, { recursive: true });
    const marker = path.join(root, 'install-started.txt');
    if (process.platform === 'win32') {
        await fs.promises.writeFile(
            path.join(bin, 'npm.cmd'),
            `@echo off\r\necho %*>"%KUMITE_TEST_INSTALL_ARGS%"\r\necho %* | findstr /c:"fixture-dep@" > nul\r\nif errorlevel 1 exit /b 0\r\necho started>"%KUMITE_TEST_INSTALL_MARKER%"\r\n${installScript}\r\n`,
        );
    } else {
        const npm = path.join(bin, 'npm');
        await fs.promises.writeFile(
            npm,
            `#!/bin/sh\necho "$*" > "$KUMITE_TEST_INSTALL_ARGS"\ncase "$*" in *fixture-dep@*) echo started > "$KUMITE_TEST_INSTALL_MARKER"; ${installScript};; *) exit 0;; esac\n`,
        );
        await fs.promises.chmod(npm, 0o755);
    }
    return { root, marker, originalPackage, originalLock };
}

function artifactWithFixtureDependency(): ImplementationArtifact {
    const artifact = fixtureArtifact();
    artifact.dependencies.push({
        name: 'fixture-dep',
        version: '1.2.3',
        origins: ['registry'],
        versionSource: 'registry',
    });
    artifact.integrity.artifactHash = hashImplementationArtifact(artifact);
    return artifact;
}

describe('artifact insertion runtime integration', () => {
    it(
        'publishes the approved artifact and renders that source in the target Vite runtime',
        { timeout: 60_000 },
        async () => {
        const root = await createProject();
        const artifact = fixtureArtifact();
        const editorTarget = {
            oid: 'target-oid',
            domId: 'target-dom-id',
            webviewId: 'fixture-webview',
        };
        const review = await prepareArtifactValueInsertion(artifact, root, editorTarget);

        assert.deepEqual(review.conflicts, []);
        assert.deepEqual(
            review.dependencies.map(({ name, version, action }) => ({ name, version, action })),
            [{ name: 'react', version: '18.3.1', action: 'install' }],
        );
        assert.deepEqual(review.editorTarget, editorTarget);
        assert.equal(fs.existsSync(review.filesToCreate[0].path), false);
        const applied = await applyArtifactInsertion(review.planId, review.planHash);
        assert.equal(applied.artifact.artifactHash, artifact.integrity.artifactHash);

        const vite = await createServer({
            root,
            configFile: false,
            plugins: [react()],
            server: { host: '127.0.0.1', port: 0 },
            resolve: { alias: { '@': path.join(root, 'src') } },
            optimizeDeps: { noDiscovery: true, include: [] },
            logLevel: 'error',
        });
        try {
            await vite.listen();
            const localUrl = vite.resolvedUrls?.local[0];
            assert.ok(localUrl);
            const response = await fetch(localUrl);
            assert.equal(response.status, 200);

            const published = path.join(
                root,
                'src',
                'components',
                'kumite',
                artifact.integrity.artifactHash,
                ...artifact.entryPoint.split('/'),
            );
            const loaded = await vite.ssrLoadModule(published);
            const markup = renderToStaticMarkup(
                React.createElement(loaded.FixtureButton, { 'data-oid': 'integration-oid' }),
            );
            assert.match(markup, /Canonical artifact mounted/);
            assert.match(markup, /data-oid="integration-oid"/);

            const inserted = createInsertedElement({
                type: CodeActionType.INSERT,
                oid: 'editor-selection-oid',
                tagName: 'div',
                attributes: {},
                children: [],
                textContent: null,
                pasteParams: null,
                location: { type: 'append', targetDomId: 'target-dom', targetOid: 'target-oid' },
                codeBlock: '<FixtureButton />',
            });
            assert.ok(
                inserted.openingElement.attributes.some(
                    (attribute) =>
                        attribute.type === 'JSXAttribute' &&
                        attribute.name.type === 'JSXIdentifier' &&
                        attribute.name.name === EditorAttributes.DATA_KUMITE_ID &&
                        attribute.value?.type === 'StringLiteral' &&
                        attribute.value.value === 'editor-selection-oid',
                ),
            );

            const ast = parseJsxFile(
                'export function Page() { return <main data-oid="target-oid" />; }',
            );
            assert.ok(ast);
            const namespacedInsert = createInsertedElement({
                type: CodeActionType.INSERT,
                oid: 'editor-selection-oid',
                tagName: 'div',
                attributes: {},
                children: [],
                textContent: null,
                pasteParams: null,
                location: { type: 'append', targetDomId: 'target-dom', targetOid: 'target-oid' },
                codeBlock: '<KumiteArtifact.FixtureButton />',
            });
            const request: CodeDiffRequest = {
                oid: 'target-oid',
                attributes: {},
                textContent: null,
                overrideClasses: null,
                structureChanges: [],
                imports: [
                    {
                        source: review.entryImport.source,
                        namespaceImport: 'KumiteArtifact',
                    },
                ],
            };
            addImportsToFile(ast, new Map([[request.oid, request]]));
            const generated = generate(ast).code;
            assert.match(generated, /import \* as KumiteArtifact from/);
            const insertedSource = generate(
                t.file(t.program([t.expressionStatement(namespacedInsert)])),
            ).code;
            assert.match(insertedSource, /<KumiteArtifact\.FixtureButton/);
            assert.match(insertedSource, /data-oid="editor-selection-oid"/);
            const mapping = createMappingFromContent(
                `export function Page() { return (${insertedSource.replace(/;$/, '')}); }`,
                'src/page.tsx',
            );
            assert.ok(mapping?.['editor-selection-oid']);
            assert.equal(mapping['editor-selection-oid'].path, 'src/page.tsx');
        } finally {
            await vite.close();
        }
        await finishArtifactInsertion(root, applied.operationId, true);
        },
    );

    it(
        'rolls back published source when editor insertion fails',
        { timeout: 60_000 },
        async () => {
        const root = await createProject();
        const review = await prepareArtifactValueInsertion(fixtureArtifact(), root);
        const applied = await applyArtifactInsertion(review.planId, review.planHash);
        const publishedPath = review.filesToCreate[0].path;

        await finishArtifactInsertion(root, applied.operationId, false);

        assert.equal(fs.existsSync(publishedPath), false);
        },
    );

    it(
        'does not mutate the project when the reviewed plan is rejected',
        { timeout: 60_000 },
        async () => {
        const root = await createProject();
        const review = await prepareArtifactValueInsertion(fixtureArtifact(), root);
        const packageBefore = await fs.promises.readFile(path.join(root, 'package.json'), 'utf8');

        assert.equal(fs.existsSync(review.filesToCreate[0].path), false);
        assert.equal(fs.existsSync(path.join(root, '.kumite', 'operations')), false);
        assert.equal(
            await fs.promises.readFile(path.join(root, 'package.json'), 'utf8'),
            packageBefore,
        );
        },
    );

    it(
        'invalidates approval if a destination changes after review and preserves the user file',
        { timeout: 60_000 },
        async () => {
        const root = await createProject();
        const review = await prepareArtifactValueInsertion(fixtureArtifact(), root);
        const destination = review.filesToCreate[0].path;
        await fs.promises.mkdir(path.dirname(destination), { recursive: true });
        await fs.promises.writeFile(destination, 'user-owned change');

        await assert.rejects(
            applyArtifactInsertion(review.planId, review.planHash),
            /plan changed after approval/,
        );
        assert.equal(await fs.promises.readFile(destination, 'utf8'), 'user-owned change');
        assert.equal(fs.existsSync(path.join(root, '.kumite', 'operations')), false);
        },
    );

    it(
        'cancels an unstarted operation plan without mutating the project',
        { timeout: 60_000 },
        async () => {
        const root = await createProject();
        const review = await prepareArtifactValueInsertion(fixtureArtifact(), root);

        assert.equal(cancelArtifactInsertion(review.planId), true);
        await assert.rejects(
            applyArtifactInsertion(review.planId, review.planHash),
            /plan expired/,
        );
        assert.equal(fs.existsSync(review.filesToCreate[0].path), false);
        assert.equal(fs.existsSync(path.join(root, '.kumite', 'operations')), false);
        },
    );

    it(
        'cancels an active preparation before publication and leaves no operation files',
        { timeout: 60_000 },
        async () => {
        const root = await createProject();
        const review = await prepareArtifactValueInsertion(fixtureArtifact(), root);
        const applying = applyArtifactInsertion(review.planId, review.planHash);

        assert.equal(cancelArtifactInsertion(review.planId), true);
        await assert.rejects(applying, /cancelled/i);
        assert.equal(fs.existsSync(review.filesToCreate[0].path), false);
        assert.equal(fs.existsSync(path.join(root, '.kumite', 'operations')), false);
        },
    );

    it(
        'blocks an unapproved package with lifecycle scripts and displays the exact script plan',
        { timeout: 60_000 },
        async () => {
            const fixture = await createInstallProject('', true);
            const review = await prepareArtifactValueInsertion(
                artifactWithFixtureDependency(),
                fixture.root,
            );
            assert.ok(
                review.unsupportedRequirements.some((reason) =>
                    reason.includes('fixture-dep@1.2.3 declares lifecycle scripts (preinstall)'),
                ),
            );
            const approval = getArtifactInsertionApprovalDetails(review.planId, review.planHash);
            assert.deepEqual(
                approval.dependencies.find((dependency) => dependency.name === 'fixture-dep')
                    ?.lifecycleScripts,
                ['preinstall'],
            );
            assert.equal(fs.existsSync(path.join(fixture.root, '.kumite', 'operations')), false);
            assert.equal(
                await fs.promises.readFile(path.join(fixture.root, 'package.json'), 'utf8'),
                fixture.originalPackage,
            );
        },
    );

    it(
        'aborts an active package manager and rolls back the unmodified project transaction',
        { timeout: 30_000 },
        async () => {
            const fixture = await createInstallProject(
                process.platform === 'win32'
                    ? 'ping -n 60 127.0.0.1 > nul\r\nexit /b 0'
                    : 'sleep 30',
            );
            const review = await prepareArtifactValueInsertion(
                artifactWithFixtureDependency(),
                fixture.root,
            );
            const dependency = review.dependencies.find((item) => item.name === 'fixture-dep');
            assert.equal(dependency?.action, 'install');
            assert.deepEqual(dependency?.lifecycleScripts, []);
            const approval = getArtifactInsertionApprovalDetails(review.planId, review.planHash);
            assert.equal(approval.dependencies.find((item) => item.name === 'fixture-dep')?.version, '1.2.3');

            const previousPath = process.env.PATH;
            process.env.PATH = `${path.join(fixture.root, 'test-bin')}${path.delimiter}${previousPath ?? ''}`;
            process.env.KUMITE_TEST_INSTALL_MARKER = fixture.marker;
            process.env.KUMITE_TEST_INSTALL_ARGS = path.join(fixture.root, 'install-args.txt');
            try {
                const applying = applyArtifactInsertion(review.planId, review.planHash);
                const deadline = Date.now() + 10_000;
                while (!fs.existsSync(fixture.marker) && Date.now() < deadline) {
                    await new Promise((resolve) => setTimeout(resolve, 50));
                }
                assert.equal(fs.existsSync(fixture.marker), true);
                const commandArgs = await fs.promises.readFile(
                    process.env.KUMITE_TEST_INSTALL_ARGS!,
                    'utf8',
                );
                assert.match(commandArgs, /--ignore-scripts/);
                assert.match(commandArgs, /--save-exact/);
                assert.equal(cancelArtifactInsertion(review.planId), true);
                await assert.rejects(applying, /installation failed/i);
            } finally {
                process.env.PATH = previousPath;
                delete process.env.KUMITE_TEST_INSTALL_MARKER;
                delete process.env.KUMITE_TEST_INSTALL_ARGS;
            }

            assert.equal(await fs.promises.readFile(path.join(fixture.root, 'package.json'), 'utf8'), fixture.originalPackage);
            assert.equal(await fs.promises.readFile(path.join(fixture.root, 'package-lock.json'), 'utf8'), fixture.originalLock);
            assert.equal(fs.existsSync(review.filesToCreate[0].path), false);
            const journals = fs.readdirSync(path.join(fixture.root, '.kumite', 'operations'));
            assert.equal(journals.length, 1);
            const journal = JSON.parse(
                await fs.promises.readFile(path.join(fixture.root, '.kumite', 'operations', journals[0]), 'utf8'),
            ) as { state: string };
            assert.equal(journal.state, 'rolled-back');
        },
    );

    it(
        'rolls back a failed package-manager command when it made no project mutations',
        { timeout: 30_000 },
        async () => {
            const fixture = await createInstallProject(
                process.platform === 'win32'
                    ? 'echo partial-progress\r\nping -n 3 127.0.0.1 > nul\r\nexit /b 1'
                    : 'echo partial-progress\nsleep 1\nexit 1',
            );
            const review = await prepareArtifactValueInsertion(
                artifactWithFixtureDependency(),
                fixture.root,
            );
            const previousPath = process.env.PATH;
            process.env.PATH = `${path.join(fixture.root, 'test-bin')}${path.delimiter}${previousPath ?? ''}`;
            process.env.KUMITE_TEST_INSTALL_MARKER = fixture.marker;
            process.env.KUMITE_TEST_INSTALL_ARGS = path.join(fixture.root, 'install-args.txt');
            try {
                await assert.rejects(
                    applyArtifactInsertion(review.planId, review.planHash),
                    /installation failed/i,
                );
            } finally {
                process.env.PATH = previousPath;
                delete process.env.KUMITE_TEST_INSTALL_MARKER;
                delete process.env.KUMITE_TEST_INSTALL_ARGS;
            }
            assert.equal(await fs.promises.readFile(path.join(fixture.root, 'package.json'), 'utf8'), fixture.originalPackage);
            assert.equal(await fs.promises.readFile(path.join(fixture.root, 'package-lock.json'), 'utf8'), fixture.originalLock);
            assert.equal(fs.existsSync(review.filesToCreate[0].path), false);
            const journals = fs.readdirSync(path.join(fixture.root, '.kumite', 'operations'));
            const journal = JSON.parse(
                await fs.promises.readFile(path.join(fixture.root, '.kumite', 'operations', journals[0]), 'utf8'),
            ) as { state: string };
            assert.equal(journal.state, 'rolled-back');
        },
    );
});
