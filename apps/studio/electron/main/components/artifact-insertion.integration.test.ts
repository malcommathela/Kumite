import assert from 'node:assert/strict';
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
import {
    applyArtifactInsertion,
    finishArtifactInsertion,
    prepareArtifactValueInsertion,
} from './artifact-insertion';
import { hashImplementationArtifact, hashImplementationSource } from './source-resolver';

const roots: string[] = [];

after(async () => {
    await Promise.all(roots.map((root) => fs.promises.rm(root, { recursive: true, force: true })));
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

describe('artifact insertion runtime integration', () => {
    it('publishes the approved artifact and renders that source in the target Vite runtime', async () => {
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
            [{ name: 'react', version: '18.3.1', action: 'present' }],
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
        } finally {
            await vite.close();
        }
        await finishArtifactInsertion(root, applied.operationId, true);
    });

    it('rolls back published source when editor insertion fails', async () => {
        const root = await createProject();
        const review = await prepareArtifactValueInsertion(fixtureArtifact(), root);
        const applied = await applyArtifactInsertion(review.planId, review.planHash);
        const publishedPath = review.filesToCreate[0].path;

        await finishArtifactInsertion(root, applied.operationId, false);

        assert.equal(fs.existsSync(publishedPath), false);
    });

    it('does not mutate the project when the reviewed plan is rejected', async () => {
        const root = await createProject();
        const review = await prepareArtifactValueInsertion(fixtureArtifact(), root);
        const packageBefore = await fs.promises.readFile(path.join(root, 'package.json'), 'utf8');

        assert.equal(fs.existsSync(review.filesToCreate[0].path), false);
        assert.equal(fs.existsSync(path.join(root, '.kumite', 'operations')), false);
        assert.equal(
            await fs.promises.readFile(path.join(root, 'package.json'), 'utf8'),
            packageBefore,
        );
    });

    it('invalidates approval if a destination changes after review and preserves the user file', async () => {
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
    });
});
