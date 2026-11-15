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
        if (block && isShadcnBlock(block) && block.previewUrl) {
            this.previewComponent = componentName;
            this.previewUrl = navigator.onLine ? block.previewUrl : null;
            this.previewSessionId = null;
            this.previewError = navigator.onLine
                ? null
                : 'You’re offline. The official shadcn block preview needs an internet connection.';
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
                for (const name of batch) {
                    this.catalogItemLoading[name] = false;
                    if (this.catalogPreviews[name]) {
                        delete this.catalogItemErrors[name];
                        continue;
                    }
                    this.catalogItemErrors[name] =
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
        if (projectId) {
            try {
                await invokeMainChannel(MainChannels.COMPONENTS_PREVIEW_RELEASE, { projectId });
            } catch (error) {
                console.error('Failed to release catalog preview sessions', error);
            }
        }
    }

    async insert(componentName: string): Promise<ComponentInsertResult> {
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

        this.insertError = null;
        this.using = componentName;
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

        try {
            const codeInsert = getInsertedElement(
                actionElement,
                location,
                null,
                definition.insertCode,
            );
            const requests = new Map();
            const request = await getOrCreateCodeDiffRequest(target.oid, requests);
            request.structureChanges.push(codeInsert);
            request.imports = definition.imports.map((moduleImport) => {
                if (isShadcnBlock(definition)) {
                    return {
                        ...moduleImport,
                        source: `${this.status?.componentsAlias ?? '@/components'}/${definition.componentFile}`,
                    };
                }
                if (moduleImport.source.startsWith('@/components/ui/')) {
                    return {
                        ...moduleImport,
                        source: moduleImport.source.replace(
                            '@/components/ui',
                            this.status?.uiAlias ?? '@/components/ui',
                        ),
                    };
                }
                return moduleImport;
            });

            const written = await this.editorEngine.code.getAndWriteCodeDiff([request]);
            if (!written) {
                const message = `Could not write ${definition.title} into the selected element.`;
                runInAction(() => {
                    this.insertError = message;
                });
                return { success: false, message };
            }
            const webview = this.editorEngine.webviews.getWebview(selected.webviewId);
            webview?.reload();
            return {
                success: true,
                message: `Inserted ${definition.title}. Reloading the preview to render it.`,
            };
        } catch (error: any) {
            const message = error?.message ?? `Failed to insert ${definition.title}.`;
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
