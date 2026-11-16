import { useAppStateManager, useEditorEngine, useProjectsManager } from '@/components/Context';
import { SettingsTabValue } from '@/lib/models';
import { ProjectTabs } from '@/lib/projects';
import type { WorkspaceView } from '@/lib/state';
import { Dialog, DialogContent, DialogTitle } from '@kumite/ui/dialog';
import { cn } from '@kumite/ui/utils';
import {
    Archive,
    ArrowRight,
    FilePlus2,
    Folder,
    LayoutGrid,
    LibraryBig,
    Search,
    Settings,
} from 'lucide-react';
import { observer } from 'mobx-react-lite';
import { useMemo, useState } from 'react';

const VIEWS: { id: WorkspaceView; label: string; icon: typeof Folder }[] = [
    { id: 'files', label: 'Files', icon: LayoutGrid },
    { id: 'folders', label: 'Folders', icon: Folder },
    { id: 'archive', label: 'Archive', icon: Archive },
    { id: 'library', label: 'Library', icon: LibraryBig },
];

export const SearchDialog = observer(() => {
    const appState = useAppStateManager();
    const projectsManager = useProjectsManager();
    const editorEngine = useEditorEngine();
    const [query, setQuery] = useState('');

    const projects = useMemo(() => {
        const term = query.trim().toLowerCase();
        return projectsManager.projects
            .filter((project) => !project.archivedAt)
            .filter(
                (project) =>
                    !term ||
                    project.name.toLowerCase().includes(term) ||
                    project.url.toLowerCase().includes(term),
            )
            .slice(0, 6);
    }, [projectsManager.projects, query]);

    const views = useMemo(() => {
        const term = query.trim().toLowerCase();
        return VIEWS.filter((view) => !term || view.label.toLowerCase().includes(term));
    }, [query]);

    const close = () => {
        appState.searchOpen = false;
        setQuery('');
    };

    const openProject = async (id: string) => {
        const project = projectsManager.projects.find((p) => p.id === id);
        if (!project) {
            return;
        }
        close();
        await projectsManager.openProject(project);
        appState.showHome = false;
    };

    const hasResults = projects.length > 0 || views.length > 0;

    return (
        <Dialog
            open={appState.searchOpen}
            onOpenChange={(open) => {
                appState.searchOpen = open;
                if (!open) {
                    setQuery('');
                }
            }}
        >
            <DialogContent className="max-w-[560px] gap-0 overflow-hidden rounded-2xl p-0">
                <DialogTitle className="sr-only">Search</DialogTitle>
                <div className="flex items-center gap-3 border-b border-border px-4 py-3.5">
                    <Search className="h-4 w-4 text-foreground-tertiary" />
                    <input
                        autoFocus
                        value={query}
                        onChange={(event) => setQuery(event.target.value)}
                        placeholder="Search files, folders and actions"
                        className="w-full bg-transparent text-[14px] text-foreground outline-none placeholder:text-foreground-quadranary"
                    />
                    <kbd className="rounded-md border border-border px-1.5 py-0.5 text-[10px] text-foreground-quadranary">
                        Esc
                    </kbd>
                </div>

                <div className="max-h-[420px] overflow-y-auto p-2">
                    {views.length > 0 && (
                        <div className="pb-1">
                            <p className="px-2.5 py-1.5 text-[10.5px] uppercase tracking-[0.08em] text-foreground-quadranary">
                                Go to
                            </p>
                            {views.map((view) => {
                                const Icon = view.icon;
                                return (
                                    <button
                                        key={view.id}
                                        onClick={() => {
                                            appState.setView(view.id);
                                            appState.showHome = true;
                                            close();
                                        }}
                                        className="flex w-full items-center gap-3 rounded-lg px-2.5 py-2 text-left text-[13px] text-foreground-secondary transition-colors hover:bg-background-hover hover:text-foreground"
                                    >
                                        <Icon className="h-4 w-4" strokeWidth={1.7} />
                                        {view.label}
                                    </button>
                                );
                            })}
                        </div>
                    )}

                    {projects.length > 0 && (
                        <div className="pb-1">
                            <p className="px-2.5 py-1.5 text-[10.5px] uppercase tracking-[0.08em] text-foreground-quadranary">
                                Files
                            </p>
                            {projects.map((project) => (
                                <button
                                    key={project.id}
                                    onClick={() => openProject(project.id)}
                                    className="flex w-full items-center gap-3 rounded-lg px-2.5 py-2 text-left transition-colors hover:bg-background-hover"
                                >
                                    <FilePlus2
                                        className="h-4 w-4 text-foreground-tertiary"
                                        strokeWidth={1.7}
                                    />
                                    <span className="min-w-0 flex-1">
                                        <span className="block truncate text-[13px] text-foreground">
                                            {project.name}
                                        </span>
                                        <span className="block truncate text-[11px] text-foreground-quadranary">
                                            {project.url}
                                        </span>
                                    </span>
                                    <ArrowRight className="h-3.5 w-3.5 text-foreground-quadranary" />
                                </button>
                            ))}
                        </div>
                    )}

                    {!hasResults && (
                        <p className="px-3 py-8 text-center text-[12.5px] text-foreground-quadranary">
                            Nothing matches “{query}”.
                        </p>
                    )}
                </div>

                <div className="flex items-center gap-4 border-t border-border px-4 py-2.5 text-[11px] text-foreground-quadranary">
                    <button
                        className={cn(
                            'flex items-center gap-1.5 transition-colors hover:text-foreground',
                        )}
                        onClick={() => {
                            close();
                            projectsManager.projectsTab = ProjectTabs.PROMPT_CREATE;
                        }}
                    >
                        <FilePlus2 className="h-3.5 w-3.5" />
                        New file
                    </button>
                    <button
                        className="flex items-center gap-1.5 transition-colors hover:text-foreground"
                        onClick={() => {
                            close();
                            editorEngine.isSettingsOpen = true;
                            editorEngine.settingsTab = SettingsTabValue.PREFERENCES;
                        }}
                    >
                        <Settings className="h-3.5 w-3.5" />
                        Settings
                    </button>
                </div>
            </DialogContent>
        </Dialog>
    );
});
