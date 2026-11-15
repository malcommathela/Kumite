import { MainChannels } from '@kumite/models/constants';
import { makeAutoObservable } from 'mobx';

export type WorkspaceView = 'files' | 'folders' | 'archive' | 'library';
export type FilesFilter = 'all' | 'yours' | 'shared';

export class AppStateManager {
    cleaningUp = false;
    view: WorkspaceView = 'files';
    filesFilter: FilesFilter = 'all';
    selectedFolder: string | null = null;
    searchOpen = false;
    sidebarCollapsed = false;
    /** True when the dashboard is on screen while a project stays open in the background. */
    showHome = false;

    constructor() {
        makeAutoObservable(this);
        this.listenForAppStateChanges();
    }

    setView(view: WorkspaceView) {
        this.view = view;
        this.selectedFolder = null;
        this.filesFilter = 'all';
    }

    setFilesFilter(filter: FilesFilter) {
        this.filesFilter = filter;
        this.selectedFolder = null;
    }

    openFolder(folderPath: string) {
        this.selectedFolder = folderPath;
        this.view = 'files';
        this.filesFilter = 'all';
    }

    toggleSidebar() {
        this.sidebarCollapsed = !this.sidebarCollapsed;
    }

    private listenForAppStateChanges() {
        window.api.on(MainChannels.CLEAN_UP_BEFORE_QUIT, async (e, args) => {
            this.cleaningUp = true;
        });
    }
}
