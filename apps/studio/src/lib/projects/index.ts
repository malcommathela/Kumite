import type { PageMetadata } from '@kumite/models';
import { MainChannels } from '@kumite/models/constants';
import type { Project } from '@kumite/models/projects';
import type { AppState, ProjectsCache } from '@kumite/models/settings';
import { makeAutoObservable } from 'mobx';
import { nanoid } from 'nanoid/non-secure';
import type { EditorEngine } from '../editor/engine';
import { invokeMainChannel, sendAnalytics } from '../utils';
import { CreateManager } from './create';
import { DomainsManager } from './domains';
import { RunManager } from './run';
import { VersionsManager } from './versions';

export enum ProjectTabs {
    PROJECTS = 'projects',
    SETTINGS = 'settings',
    PROMPT_CREATE = 'prompt-create',
    IMPORT_PROJECT = 'import-project',
}

export class ProjectsManager {
    projectsTab: ProjectTabs = ProjectTabs.PROJECTS;
    editorEngine: EditorEngine | null = null;

    private createManager: CreateManager;
    private _project: Project | null = null;
    private _projects: Project[] = [];
    private _run: RunManager | null = null;
    private _domains: DomainsManager | null = null;
    private _versions: VersionsManager | null = null;
    private closeTask: Promise<{ success: boolean; errors: string[] }> | null = null;

    constructor() {
        makeAutoObservable(this);
        this.createManager = new CreateManager(this);
        this.restoreProjects();
    }

    get create() {
        return this.createManager;
    }

    async restoreProjects() {
        const cachedProjects: ProjectsCache | null = await invokeMainChannel(
            MainChannels.GET_PROJECTS,
        );
        if (!cachedProjects || !cachedProjects.projects) {
            console.error('Failed to restore projects');
            return;
        }
        this._projects = cachedProjects.projects;

        const appState: AppState | null = await invokeMainChannel(MainChannels.GET_APP_STATE);
        if (!appState) {
            console.error('Failed to restore app state');
            return;
        }
        if (appState.activeProjectId) {
            this.project = this._projects.find((p) => p.id === appState.activeProjectId) || null;
        }
    }

    createProject(
        name: string,
        url: string,
        folderPath: string,
        commands: {
            install: string;
            run: string;
            build: string;
        },
    ): Project {
        const newProject: Project = {
            id: nanoid(),
            name,
            url,
            folderPath,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            commands,
            previewImg: null,
            settings: null,
            domains: {
                base: null,
                custom: null,
            },
            metadata: null,
            env: {},
        };

        const updatedProjects = [...this._projects, newProject];
        this.projects = updatedProjects;
        return newProject;
    }

    updateProject(newProject: Project) {
        const updatedProjects = this._projects.map((p) =>
            p.id === newProject.id ? newProject : p,
        );
        this.project = newProject;
        this.projects = updatedProjects;
    }

    updatePartialProject(newProject: Partial<Project>) {
        if (!this.project) {
            console.error('Project not found');
            return;
        }
        this.updateProject({ ...this.project, ...newProject });
    }

    /** Moves a project in or out of the archive without changing the active file. */
    setProjectArchived(project: Project, archived: boolean) {
        const updatedProject: Project = {
            ...project,
            archivedAt: archived ? new Date().toISOString() : null,
        };
        this.projects = this._projects.map((p) => (p.id === project.id ? updatedProject : p));
        if (this._project?.id === project.id) {
            this._project = updatedProject;
        }
        sendAnalytics(archived ? 'archive project' : 'restore project', { id: project.id });
    }

    updateAppState(appState: AppState) {
        invokeMainChannel(MainChannels.REPLACE_APP_STATE, appState);
    }

    saveProjects() {
        invokeMainChannel(MainChannels.UPDATE_PROJECTS, { projects: this._projects });
    }

    async deleteProject(project: Project, deleteProjectFolder: boolean = false): Promise<void> {
        if (this.project?.id === project.id) {
            await this.closeProject();
        }
        this.projects = this._projects.filter((p) => p.id !== project.id);

        if (deleteProjectFolder) {
            await invokeMainChannel(MainChannels.DELETE_FOLDER, project.folderPath);
        }
        sendAnalytics('delete project', { url: project.url, id: project.id, deleteProjectFolder });
    }

    /**
     * Closes the active project through the main-process lifecycle, awaits every
     * project-owned process, then disposes the renderer managers.
     */
    async closeProject(): Promise<{ success: boolean; errors: string[] }> {
        if (this.closeTask) {
            return this.closeTask;
        }
        this.closeTask = this.closeProjectInternal().finally(() => {
            this.closeTask = null;
        });
        return this.closeTask;
    }

    private async closeProjectInternal(): Promise<{ success: boolean; errors: string[] }> {
        const project = this._project;
        let result = { success: true, errors: [] as string[] };
        if (project) {
            try {
                result = (await invokeMainChannel(MainChannels.PROJECT_CLOSE, {
                    id: project.id,
                    folderPath: project.folderPath,
                })) as { success: boolean; errors: string[] };
            } catch (error: any) {
                result = { success: false, errors: [error?.message ?? 'Project close failed.'] };
                console.error('Failed to close project resources', error);
            }
        }
        await this.disposeManagers();
        this._project = null;
        this.updateAppState({ activeProjectId: null });
        return result;
    }

    /** Closes the current project before switching to another one. */
    async openProject(project: Project): Promise<void> {
        if (this._project && this._project.id !== project.id) {
            await this.closeProject();
        }
        this.project = project;
        await this.runner?.startIfPortAvailable();
    }

    async scanProjectMetadata(project: Project) {
        try {
            const metadata: PageMetadata | null = await invokeMainChannel(
                MainChannels.SCAN_PROJECT_METADATA,
                {
                    projectRoot: project.folderPath,
                },
            );
            this.updatePartialProject({ metadata });
        } catch (error) {
            console.error(error);
        }
    }

    get project() {
        return this._project;
    }

    get runner(): RunManager | null {
        return this._run;
    }

    get domains(): DomainsManager | null {
        return this._domains;
    }

    get versions(): VersionsManager | null {
        return this._versions;
    }

    set project(newProject: Project | null) {
        if (!newProject) {
            void this.disposeManagers();
        } else {
            this.setOrUpdateManagers(newProject);
        }
        this._project = newProject;
        this.updateAppState({
            activeProjectId: this.project?.id ?? null,
        });
    }

    setOrUpdateManagers(project: Project) {
        if (!this.editorEngine) {
            console.error('Editor engine not found');
            return;
        }
        if (!this._run) {
            this._run = new RunManager(this.editorEngine, project);
        } else {
            this._run.updateProject(project);
        }

        if (!this._domains) {
            this._domains = new DomainsManager(this, project);
        } else {
            this._domains.updateProject(project);
        }

        if (!this._versions) {
            this._versions = new VersionsManager(project, this.editorEngine);
        } else {
            this._versions.updateProject(project);
        }
    }

    async disposeManagers(): Promise<void> {
        const run = this._run;
        const domains = this._domains;
        const versions = this._versions;
        this._run = null;
        this._domains = null;
        this._versions = null;
        await run?.dispose();
        await this.editorEngine?.components?.reset();
        domains?.dispose();
        versions?.dispose();
    }

    get projects() {
        return this._projects;
    }

    set projects(newProjects: Project[]) {
        this._projects = newProjects;
        this.saveProjects();
    }
}
