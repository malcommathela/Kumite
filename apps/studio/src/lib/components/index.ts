import type { ActionElement } from '@kumite/models/actions';
import type {
    ShadcnCatalogPreview,
    ShadcnInitResult,
    ShadcnInstallProgress,
    ShadcnInstallResult,
    ShadcnLibraryItem,
    ShadcnProjectStatus,
} from '@kumite/models';
import {
    getShadcnLibraryItem,
    getShadcnExampleName,
    isBlockInsertContainer,
    isShadcnBlock,
    SHADCN_BLOCKS,
    SHADCN_COMPONENTS,
} from '@kumite/models';
import type { DomElement } from '@kumite/models/element';
import { MainChannels } from '@kumite/models/constants';
import { makeAutoObservable, runInAction } from 'mobx';
import { getOrCreateCodeDiffRequest } from '../editor/engine/code/helpers';
import { getInsertedElement } from '../editor/engine/code/insert';
import type { EditorEngine } from '../editor/engine';
import type { ProjectsManager } from '../projects';
import { createDomId, createOid, invokeMainChannel } from '../utils';

export interface ComponentInsertResult {
    success: boolean;
    message: string;
}

export interface ArtifactInsertionReview {
    planId: string;
    planHash: string;
    artifact: {
        id: string;
        provider: string;
        sourceHash: string;
        artifactHash: string;
        entryPoint: string;
        demo: { available: boolean; preserved: boolean; files: string[] };
    };
    project: {
        framework: string;
        packageManager: string | null;
        componentsAlias: string | null;
        uiAlias: string | null;
    };
    editorTarget: { oid: string; domId: string; webviewId: string };
    filesToCreate: Array<{
        path: string;
        sourceHash: string;
        publishedHash: string;
        transformations: Array<{ kind: 'alias-import'; from: string; to: string }>;
    }>;
    reusedFiles: string[];
    conflicts: string[];
    dependencies: Array<{ name: string; version: string; action: string; provenance: string }>;
    assets: Array<{
        sourcePath: string;
        destinationPath: string | null;
        external: boolean;
        action: 'add' | 'reuse' | 'conflict' | 'external';
        sha256?: string;
    }>;
    providers: string[];
    configurationChanges: string[];
    warnings: string[];
    unsupportedRequirements: string[];
    entryImport: {
        source: string;
        export: { kind: 'default' } | { kind: 'named'; name: string } | null;
    };
}

export class ComponentsManager {
    status: ShadcnProjectStatus | null = null;
    isLoadingStatus = false;
    initializing = false;
    installing: string | null = null;
    installProgress: ShadcnInstallProgress | null = null;
    using: string | null = null;
    lastLog: string | null = null;
    insertError: string | null = null;
    previewComponent: string | null = null;
    previewUrl: string | null = null;
    previewSessionId: string | null = null;
    previewLoading = false;
    previewError: string | null = null;
    catalogPreviews: Record<string, string> = {};
    catalogSessions: Record<string, string> = {};
    catalogPreviewSources: Record<string, 'artifact'> = {};
    catalogBaseLoading = false;
    catalogBaseError: string | null = null;
    catalogItemLoading: Record<string, boolean> = {};
    catalogItemErrors: Record<string, string> = {};
    private catalogReady = false;
    private catalogPending = new Set<string>();
    private catalogTimer: ReturnType<typeof setTimeout> | null = null;
    private catalogChain: Promise<void> = Promise.resolve();
    private catalogWaiters: Array<() => void> = [];
    private unsubscribeProgress: (() => void) | null = null;

    constructor(
        private editorEngine: EditorEngine,
        private projectsManager: ProjectsManager,
    ) {
        makeAutoObservable(this);
        if (typeof window !== 'undefined' && window.api?.on) {
            this.unsubscribeProgress = window.api.on<ShadcnInstallProgress>(
                MainChannels.COMPONENTS_INSTALL_PROGRESS,
                (progress) => {
                    runInAction(() => {
                        this.installProgress = progress.phase === 'done' ? null : progress;
                    });
                },
            );
        }
    }

    get catalog(): ShadcnLibraryItem[] {
        return [...SHADCN_COMPONENTS, ...SHADCN_BLOCKS];
    }

    get projectPath(): string | null {
        return this.projectsManager.project?.folderPath ?? null;
    }

    get supported(): boolean {
        return Boolean(this.status?.supported);
    }

    async refresh(): Promise<void> {
        const projectPath = this.projectPath;
        if (!projectPath) {
            this.status = null;
            return;
        }
        this.isLoadingStatus = true;
        try {
            const status = (await invokeMainChannel(
                MainChannels.COMPONENTS_GET_STATUS,
                projectPath,
            )) as ShadcnProjectStatus;
            runInAction(() => {
                this.status = status;
                if (status.artifactInsertionRecovery?.length) {
                    this.lastLog = status.artifactInsertionRecovery.join('\n');
                }
            });
        } catch (error: any) {
            runInAction(() => {
                this.status = null;
                this.lastLog = error?.message ?? 'Failed to inspect the active project.';
            });
        } finally {
            runInAction(() => {
                this.isLoadingStatus = false;
            });
        }
    }

    async initialize(): Promise<ShadcnInitResult> {
        const projectPath = this.projectPath;
        if (!projectPath) {
            return {
                success: false,
                message: 'Open a project before initializing shadcn/ui.',
                log: '',
                status: null,
            };
        }
        this.initializing = true;
        try {
            const result = (await invokeMainChannel(
                MainChannels.COMPONENTS_INITIALIZE,
                projectPath,
            )) as ShadcnInitResult;
            runInAction(() => {
                this.status = result.status ?? this.status;
                this.lastLog = result.log || null;
            });
            return result;
        } finally {
            runInAction(() => {
                this.initializing = false;
            });
        }
    }

    async install(componentName: string): Promise<ShadcnInstallResult> {
        const projectPath = this.projectPath;
        if (!projectPath) {
            return {
                component: componentName,
                success: false,
                initialized: false,
                message: 'Open a project before installing components.',
                log: '',
                status: null,
            };
        }
        this.installing = componentName;
        this.installProgress = null;
        try {
            const result = (await invokeMainChannel(MainChannels.COMPONENTS_INSTALL, {
                projectPath,
                component: componentName,
            })) as ShadcnInstallResult;
            runInAction(() => {
                this.status = result.status ?? this.status;
                this.lastLog = result.log || null;
            });
            return result;
        } finally {
            runInAction(() => {
                this.installing = null;
                this.installProgress = null;
            });
        }
    }

    /**
     * Cancels a component install that is still waiting in the serial queue.
     * A running install cannot be cancelled: it is already writing files.
     */
    async cancelInstall(componentName: string): Promise<boolean> {
        const projectPath = this.projectPath;
        if (!projectPath) {
            return false;
        }
        try {
            return (await invokeMainChannel(MainChannels.COMPONENTS_INSTALL_CANCEL, {
                projectPath,
                component: componentName,
            })) as boolean;
        } catch {
            return false;
        }
    }

    async openPreview(componentName: string): Promise<void> {
        const block = getShadcnLibraryItem(componentName);
        if (block && block.previewable === false) {
            this.previewComponent = componentName;
            this.previewUrl = null;
            this.previewSessionId = null;
            this.previewError = block.limitation ?? `${block.title} cannot be previewed.`;
            this.previewLoading = false;
            return;
        }
        if (!this.catalogPreviews[componentName]) {
            await this.ensureCatalogPreviews([componentName]);
        }
        const catalogUrl = this.catalogPreviews[componentName];
        if (catalogUrl) {
            runInAction(() => {
                this.previewComponent = componentName;
                this.previewUrl = catalogUrl;
                this.previewSessionId = this.catalogSessions[componentName] ?? null;
                this.previewError = null;
                this.previewLoading = false;
            });
            return;
        }
        const itemError = this.catalogItemErrors[componentName];
        if (itemError) {
            runInAction(() => {
                this.previewComponent = componentName;
                this.previewUrl = null;
                this.previewSessionId = null;
                this.previewError = itemError;
                this.previewLoading = false;
            });
            return;
        }
        const projectPath = this.projectPath;
        if (!projectPath) {
            runInAction(() => {
                this.previewError = 'Open a project before previewing components.';
            });
            return;
        }
        runInAction(() => {
            this.previewLoading = true;
            this.previewComponent = componentName;
            this.previewError = null;
            this.previewUrl = null;
            this.previewSessionId = null;
        });
        try {
            const result = (await invokeMainChannel(MainChannels.COMPONENTS_PREVIEW_START, {
                projectPath,
                component: componentName,
                projectId: this.projectsManager.project?.id ?? null,
            })) as {
                url: string | null;
                sessionId?: string | null;
                error: string | null;
                log: string | null;
            };
            runInAction(() => {
                this.previewUrl = result.url;
                this.previewSessionId = result.sessionId ?? null;
                this.previewError = result.error;
                if (result.log) {
                    this.lastLog = result.log;
                }
            });
        } catch (error: any) {
            runInAction(() => {
                this.previewSessionId = null;
                this.previewError = error?.message ?? 'Failed to start the component preview.';
            });
        } finally {
            runInAction(() => {
                this.previewLoading = false;
            });
        }
    }

    /**
     * Requests live previews for the given catalog components. Requests are
     * batched so a screenful of cards costs one install, and a component is
     * never prepared twice. Resolves once the batch it joined has loaded.
     */
    ensureCatalogPreviews(names: string[]): Promise<void> {
        const wanted = names.filter(
            (name) =>
                name &&
                !this.catalogPreviews[name] &&
                !this.catalogItemLoading[name] &&
                !this.catalogItemErrors[name],
        );
        if (wanted.length === 0) {
            return names.some((name) => this.catalogItemLoading[name])
                ? new Promise<void>((resolve) => this.catalogWaiters.push(resolve))
                : this.catalogChain;
        }
        for (const name of wanted) {
            this.catalogPending.add(name);
            this.catalogItemLoading[name] = true;
        }
        if (!this.catalogReady) {
            this.catalogBaseLoading = true;
        }
        const promise = new Promise<void>((resolve) => this.catalogWaiters.push(resolve));
        if (this.catalogTimer) {
            clearTimeout(this.catalogTimer);
        }
        this.catalogTimer = setTimeout(() => this.flushCatalog(), 150);
        return promise;
    }

    retryCatalogPreview(name: string): Promise<void> {
        runInAction(() => {
            delete this.catalogItemErrors[name];
            // The URL may point at a preview server that has since stopped, so
            // ask for a fresh one instead of reusing the cached address.
            delete this.catalogPreviews[name];
            delete this.catalogSessions[name];
            delete this.catalogPreviewSources[name];
        });
        return this.ensureCatalogPreviews([name]);
    }

    /**
     * Rebuilds the preview of an item and its URL, then the host can remount the
     * iframe. Used when a cached preview address no longer answers.
     */
    async retryPreview(componentName: string): Promise<void> {
        await this.retryCatalogPreview(componentName);
        await this.openPreview(componentName);
    }

    private flushCatalog(): void {
        this.catalogTimer = null;
        const batch = [...this.catalogPending];
        this.catalogPending.clear();
        if (batch.length === 0) {
            this.resolveCatalogWaiters();
            return;
        }
        this.catalogChain = this.catalogChain
            .then(() => this.loadCatalogBatch(batch))
            .finally(() => {
                if (this.catalogPending.size === 0) {
                    this.resolveCatalogWaiters();
                }
            });
    }

    private resolveCatalogWaiters(): void {
        const waiters = this.catalogWaiters;
        this.catalogWaiters = [];
        waiters.forEach((resolve) => resolve());
    }

    private async loadCatalogBatch(batch: string[]): Promise<void> {
        try {
            const result = (await invokeMainChannel(MainChannels.COMPONENTS_PREVIEW_CATALOG, {
                components: batch,
                projectId: this.projectsManager.project?.id ?? null,
            })) as ShadcnCatalogPreview;
            runInAction(() => {
                this.catalogPreviews = { ...this.catalogPreviews, ...(result.urls ?? {}) };
                this.catalogSessions = { ...this.catalogSessions, ...(result.sessions ?? {}) };
                this.catalogPreviewSources = {
                    ...this.catalogPreviewSources,
                    ...(result.sources ?? {}),
                };
                for (const name of batch) {
                    this.catalogItemLoading[name] = false;
                    if (this.catalogPreviews[name]) {
                        delete this.catalogItemErrors[name];
                        continue;
                    }
                    delete this.catalogPreviewSources[name];
                    this.catalogItemErrors[name] =
                        result.errors?.[name] ??
                        result.error ??
                        `Kumite could not prepare ${name} for preview. Check the CLI output for details.`;
                }
                this.catalogReady = true;
                this.catalogBaseLoading = false;
                this.catalogBaseError = result.error;
                if (result.log) {
                    this.lastLog = result.log;
                }
            });
        } catch (error: any) {
            const message = error?.message ?? 'Could not prepare the component previews.';
            runInAction(() => {
                for (const name of batch) {
                    this.catalogItemLoading[name] = false;
                    this.catalogItemErrors[name] = message;
                }
                this.catalogBaseLoading = false;
                this.catalogBaseError = message;
            });
        }
    }

    async closePreview(): Promise<void> {
        this.previewComponent = null;
        this.previewUrl = null;
        this.previewSessionId = null;
        this.previewError = null;
        try {
            await invokeMainChannel(MainChannels.COMPONENTS_PREVIEW_STOP);
        } catch (error) {
            console.error('Failed to stop the component preview', error);
        }
    }

    /** Clears preview UI and releases this project's catalog sessions. */
    async reset(): Promise<void> {
        const projectId = this.projectsManager.project?.id ?? null;
        runInAction(() => {
            this.catalogPreviews = {};
            this.catalogSessions = {};
            this.catalogPreviewSources = {};
            this.catalogItemErrors = {};
            this.catalogItemLoading = {};
            this.catalogPending.clear();
            this.catalogReady = false;
            this.catalogBaseLoading = false;
            this.catalogBaseError = null;
            this.previewComponent = null;
            this.previewUrl = null;
            this.previewSessionId = null;
            this.previewError = null;
        });
        try {
            await invokeMainChannel(MainChannels.COMPONENTS_PREVIEW_RELEASE, {
                projectId: projectId ?? 'catalog-ui',
            });
        } catch (error) {
            console.error('Failed to release catalog preview sessions', error);
        }
    }

    async prepareInsertion(componentName: string): Promise<ArtifactInsertionReview> {
        const projectPath = this.projectPath;
        if (!projectPath) {
            throw new Error('Open a project before inserting an artifact.');
        }
        const definition = getShadcnLibraryItem(componentName);
        if (!definition) {
            throw new Error('Unknown component.');
        }
        const selected = this.editorEngine.elements.selected[0];
        if (!selected) {
            throw new Error('Select an element in a frame first.');
        }
        const target = isShadcnBlock(definition)
            ? await this.resolveBlockInsertTarget(selected)
            : selected;
        if (!target?.oid) {
            throw new Error(
                isShadcnBlock(definition)
                    ? 'Select a layout element (a section, div, or the page body) to add this block.'
                    : 'Select an element in a frame first.',
            );
        }
        const editorTarget = {
            oid: target.oid,
            domId: target.domId,
            webviewId: selected.webviewId,
        };
        return (await invokeMainChannel(MainChannels.COMPONENTS_ARTIFACT_PREPARE, {
            projectPath,
            editorTarget,
            request: {
                provider: 'shadcn',
                kind: isShadcnBlock(definition)
                    ? 'block'
                    : getShadcnExampleName(definition)
                      ? 'example'
                      : 'component',
                name: isShadcnBlock(definition)
                    ? definition.name
                    : (getShadcnExampleName(definition) ?? definition.name),
                ...(isShadcnBlock(definition) ? { registryUrl: definition.registryUrl } : {}),
            },
        })) as ArtifactInsertionReview;
    }

    async insert(
        componentName: string,
        approval: Pick<ArtifactInsertionReview, 'planId' | 'planHash' | 'editorTarget'>,
    ): Promise<ComponentInsertResult> {
        const definition = getShadcnLibraryItem(componentName);
        if (!definition) {
            return { success: false, message: 'Unknown component.' };
        }
        if (definition.insertable === false) {
            return {
                success: false,
                message: definition.limitation ?? `${definition.title} cannot be inserted.`,
            };
        }
        const selected = this.editorEngine.elements.selected[0];
        if (!selected) {
            return { success: false, message: 'Select an element in a frame first.' };
        }

        const target = isShadcnBlock(definition)
            ? await this.resolveBlockInsertTarget(selected)
            : selected;
        if (!target?.oid) {
            return isShadcnBlock(definition)
                ? {
                      success: false,
                      message:
                          'Select a layout element (a section, div, or the page body) to add this block.',
                  }
                : { success: false, message: 'Select an element in a frame first.' };
        }
        if (
            target.oid !== approval.editorTarget.oid ||
            target.domId !== approval.editorTarget.domId ||
            selected.webviewId !== approval.editorTarget.webviewId
        ) {
            return {
                success: false,
                message:
                    'The selected editor target changed after approval. Prepare and approve insertion again.',
            };
        }

        this.insertError = null;
        this.using = componentName;
        const projectPath = this.projectPath;
        let operationId: string | null = null;
        let editorWritten = false;
        try {
            if (!projectPath) {
                throw new Error('The active project closed before insertion.');
            }
            const applied = (await invokeMainChannel(MainChannels.COMPONENTS_ARTIFACT_APPLY, {
                planId: approval.planId,
                planHash: approval.planHash,
            })) as {
                operationId: string;
                artifact: { artifactHash: string };
                entryImport: ArtifactInsertionReview['entryImport'];
            };
            operationId = applied.operationId;
            const componentNameForImport =
                applied.entryImport.export?.kind === 'default'
                    ? `KumiteArtifact${applied.artifact.artifactHash}`
                    : `KumiteArtifact${applied.artifact.artifactHash}.${applied.entryImport.export?.name}`;
            if (!componentNameForImport || !applied.entryImport.export) {
                throw new Error('The artifact has no renderable runtime export.');
            }
            const moduleImport =
                applied.entryImport.export.kind === 'default'
                    ? {
                          source: applied.entryImport.source,
                          defaultImport: componentNameForImport,
                      }
                    : {
                          source: applied.entryImport.source,
                          namespaceImport: `KumiteArtifact${applied.artifact.artifactHash}`,
                      };
            const domId = createDomId();
            const oid = createOid();
            const actionElement: ActionElement = {
                domId,
                oid,
                tagName: 'div',
                attributes: {},
                children: [],
                textContent: null,
                styles: {},
            };
            const location = {
                type: 'append' as const,
                targetDomId: target.domId,
                targetOid: target.oid,
            };
            const codeInsert = getInsertedElement(
                actionElement,
                location,
                null,
                `<${componentNameForImport} />`,
            );
            const requests = new Map();
            const request = await getOrCreateCodeDiffRequest(target.oid, requests);
            request.structureChanges.push(codeInsert);
            request.imports = [moduleImport];

            const written = await this.editorEngine.code.getAndWriteCodeDiff([request]);
            if (!written) {
                const message = `Could not write ${definition.title} into the selected element.`;
                throw new Error(message);
            }
            editorWritten = true;
            const webview = this.editorEngine.webviews.getWebview(selected.webviewId);
            webview?.reload();
            try {
                await invokeMainChannel(MainChannels.COMPONENTS_ARTIFACT_COMMIT, {
                    projectPath,
                    operationId,
                });
            } catch (error) {
                console.error('Could not finalize artifact insertion journal', error);
            }
            operationId = null;
            return {
                success: true,
                message: `Published the verified artifact and inserted ${definition.title}. Reloading the preview.`,
            };
        } catch (error: any) {
            const message = error?.message ?? `Failed to insert ${definition.title}.`;
            if (operationId && projectPath && !editorWritten) {
                try {
                    await invokeMainChannel(MainChannels.COMPONENTS_ARTIFACT_ROLLBACK, {
                        projectPath,
                        operationId,
                    });
                } catch (rollbackError: any) {
                    console.error('Artifact insertion rollback failed', rollbackError);
                }
            }
            runInAction(() => {
                this.insertError = message;
            });
            return { success: false, message };
        } finally {
            runInAction(() => {
                this.using = null;
            });
        }
    }

    /**
     * A block is a page-level composition. Appending it to whatever is selected
     * produces invalid markup when that element only holds text (`h1`, `p`,
     * `span`), so walk up to the nearest layout container first.
     */
    private async resolveBlockInsertTarget(selected: DomElement): Promise<DomElement | null> {
        const webview = this.editorEngine.webviews.getWebview(selected.webviewId);
        if (!webview) {
            return selected.oid ? selected : null;
        }

        let current = selected;
        for (let depth = 0; depth < 16; depth += 1) {
            if (isBlockInsertContainer(current.tagName, current.styles?.computed.display)) {
                return current.oid ? current : null;
            }
            const parentDomId = current.parent?.domId;
            if (!parentDomId) {
                return null;
            }
            const parent = (await webview.executeJavaScript(
                `window.api?.getDomElementByDomId(${JSON.stringify(parentDomId)}, true)`,
            )) as DomElement | null;
            if (!parent) {
                return null;
            }
            current = parent;
        }
        return null;
    }

    dispose(): void {
        this.unsubscribeProgress?.();
        this.unsubscribeProgress = null;
        void this.closePreview();
    }
}
