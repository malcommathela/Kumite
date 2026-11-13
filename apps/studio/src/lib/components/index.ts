import type { ActionElement } from '@kumite/models/actions';
import type {
    ShadcnInitResult,
    ShadcnInstallResult,
    ShadcnLibraryItem,
    ShadcnProjectStatus,
} from '@kumite/models';
import {
    getShadcnLibraryItem,
    isShadcnBlock,
    SHADCN_BLOCKS,
    SHADCN_COMPONENTS,
} from '@kumite/models';
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
    using: string | null = null;
    lastLog: string | null = null;
    insertError: string | null = null;
    previewComponent: string | null = null;
    previewUrl: string | null = null;
    previewLoading = false;
    previewError: string | null = null;

    constructor(
        private editorEngine: EditorEngine,
        private projectsManager: ProjectsManager,
    ) {
        makeAutoObservable(this);
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
        const wasInstalled = Boolean(this.status?.installed[componentName]);
        this.installing = componentName;
        try {
            const result = (await invokeMainChannel(MainChannels.COMPONENTS_INSTALL, {
                projectPath,
                component: componentName,
            })) as ShadcnInstallResult;
            runInAction(() => {
                this.status = result.status ?? this.status;
                this.lastLog = result.log || null;
            });
            if (result.success && !wasInstalled) {
                this.reloadPreviews();
            }
            return result;
        } finally {
            runInAction(() => {
                this.installing = null;
            });
        }
    }

    async openPreview(componentName: string): Promise<void> {
        const block = getShadcnLibraryItem(componentName);
        if (block && isShadcnBlock(block) && block.previewUrl) {
            this.previewComponent = componentName;
            this.previewUrl = navigator.onLine ? block.previewUrl : null;
            this.previewError = navigator.onLine
                ? null
                : 'You’re offline. The official shadcn block preview needs an internet connection.';
            this.previewLoading = false;
            return;
        }
        const projectPath = this.projectPath;
        if (!projectPath) {
            this.previewError = 'Open a project before previewing components.';
            return;
        }
        this.previewLoading = true;
        this.previewComponent = componentName;
        this.previewError = null;
        this.previewUrl = null;
        try {
            const result = (await invokeMainChannel(MainChannels.COMPONENTS_PREVIEW_START, {
                projectPath,
                component: componentName,
            })) as { url: string | null; error: string | null; log: string | null };
            runInAction(() => {
                this.previewUrl = result.url;
                this.previewError = result.error;
                if (result.log) {
                    this.lastLog = result.log;
                }
            });
        } catch (error: any) {
            runInAction(() => {
                this.previewError = error?.message ?? 'Failed to start the component preview.';
            });
        } finally {
            runInAction(() => {
                this.previewLoading = false;
            });
        }
    }

    async closePreview(): Promise<void> {
        this.previewComponent = null;
        this.previewUrl = null;
        this.previewError = null;
        try {
            await invokeMainChannel(MainChannels.COMPONENTS_PREVIEW_STOP);
        } catch (error) {
            console.error('Failed to stop the component preview', error);
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
        if (!selected || !selected.oid) {
            return { success: false, message: 'Select an element in a frame first.' };
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
            targetDomId: selected.domId,
            targetOid: selected.oid,
        };

        try {
            const codeInsert = getInsertedElement(
                actionElement,
                location,
                null,
                definition.insertCode,
            );
            const requests = new Map();
            const request = await getOrCreateCodeDiffRequest(selected.oid, requests);
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

    private reloadPreviews(): void {
        this.editorEngine.webviews.getAll().forEach((webview) => {
            webview.reload();
        });
    }

    dispose(): void {
        void this.closePreview();
    }
}
