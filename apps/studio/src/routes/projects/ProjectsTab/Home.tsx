import { useAppStateManager, useProjectsManager } from '@/components/Context';
import type { FilesFilter } from '@/lib/state';
import { ProjectTabs } from '@/lib/projects';
import type { Project } from '@kumite/models/projects';
import { Button } from '@kumite/ui/button';
import { cn } from '@kumite/ui/utils';
import {
    Archive,
    ArrowUpRight,
    FilePlus2,
    Folder,
    FolderOpen,
    LayoutGrid,
    List,
    Search,
    Upload,
} from 'lucide-react';
import { observer } from 'mobx-react-lite';
import { useMemo, useState } from 'react';
import type React from 'react';
import type { LucideIcon } from 'lucide-react';
import { ProjectCard } from './ProjectCard';
import { LibraryView } from './LibraryView';
import ProjectSettingsButton from './Select/ProjectSettingsButton';

export const Home = observer(() => {
    const appState = useAppStateManager();

    switch (appState.view) {
        case 'folders':
            return <FoldersView />;
        case 'archive':
            return <ArchiveView />;
        case 'library':
            return <LibraryView />;
        case 'files':
        default:
            return <FilesView />;
    }
});

export function PageHeader({
    title,
    subtitle,
    actions,
}: {
    title: string;
    subtitle: React.ReactNode;
    actions?: React.ReactNode;
}) {
    return (
        <div className="flex flex-wrap items-start justify-between gap-6">
            <div>
                <h1 className="font-display text-[3.4rem] leading-[1.02] tracking-[-0.02em] text-foreground">
                    {title}
                </h1>
                <p className="mt-2 text-[13px] text-foreground-tertiary">{subtitle}</p>
            </div>
            {actions && <div className="flex items-center gap-2 pt-2">{actions}</div>}
        </div>
    );
}

export function EmptyState({
    icon: Icon,
    title,
    description,
    action,
}: {
    icon: LucideIcon;
    title: string;
    description: React.ReactNode;
    action?: React.ReactNode;
}) {
    return (
        <div className="flex flex-1 flex-col items-center justify-center px-6 py-24 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-background-secondary text-foreground-tertiary">
                <Icon className="h-6 w-6" strokeWidth={1.6} />
            </div>
            <h2 className="mt-6 font-display text-[2rem] leading-tight text-foreground">{title}</h2>
            <p className="mt-2 max-w-[260px] text-[13px] leading-5 text-foreground-tertiary">
                {description}
            </p>
            {action && <div className="mt-6">{action}</div>}
        </div>
    );
}

function SearchField({
    value,
    onChange,
    placeholder,
}: {
    value: string;
    onChange: (value: string) => void;
    placeholder: string;
}) {
    return (
        <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-foreground-tertiary" />
            <input
                value={value}
                onChange={(event) => onChange(event.target.value)}
                placeholder={placeholder}
                className="h-9 w-[220px] rounded-full border border-border bg-background-secondary pl-9 pr-3.5 text-[12.5px] text-foreground outline-none transition-colors placeholder:text-foreground-quadranary focus:border-border-active"
            />
        </div>
    );
}

const FILTERS: { id: FilesFilter; label: string }[] = [
    { id: 'all', label: 'All' },
    { id: 'yours', label: 'Yours' },
    { id: 'shared', label: 'Shared' },
];

const FilesView = observer(() => {
    const appState = useAppStateManager();
    const projectsManager = useProjectsManager();
    const [query, setQuery] = useState('');
    const [layout, setLayout] = useState<'grid' | 'list'>('grid');

    const activeProjects = useMemo(
        () => projectsManager.projects.filter((project) => !project.archivedAt),
        [projectsManager.projects],
    );

    const projects = useMemo(() => {
        const term = query.trim().toLowerCase();
        return activeProjects
            .filter((project) =>
                appState.selectedFolder
                    ? parentPath(project.folderPath) === appState.selectedFolder
                    : true,
            )
            .filter(
                (project) =>
                    !term ||
                    project.name.toLowerCase().includes(term) ||
                    project.url.toLowerCase().includes(term),
            )
            .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
    }, [activeProjects, appState.selectedFolder, query]);

    const openProject = async (project: Project) => {
        await projectsManager.openProject(project);
        appState.showHome = false;
    };

    const newFile = () => {
        projectsManager.projectsTab = ProjectTabs.PROMPT_CREATE;
    };

    return (
        <div className="flex min-h-full flex-col px-12 pb-16 pt-14 xl:px-16">
            <PageHeader
                title="Files"
                subtitle={
                    appState.selectedFolder
                        ? `${projects.length} ${projects.length === 1 ? 'file' : 'files'} in ${baseName(appState.selectedFolder)}`
                        : `${activeProjects.length} ${activeProjects.length === 1 ? 'file' : 'files'}`
                }
                actions={
                    <>
                        <Button
                            variant="secondary"
                            className="h-9"
                            onClick={() => {
                                projectsManager.projectsTab = ProjectTabs.IMPORT_PROJECT;
                            }}
                        >
                            <Upload className="h-4 w-4" strokeWidth={1.7} />
                            Import
                        </Button>
                        <Button className="h-9" onClick={newFile}>
                            <FilePlus2 className="h-4 w-4" strokeWidth={1.7} />
                            New file
                        </Button>
                    </>
                }
            />

            <div className="mt-9 flex flex-wrap items-center gap-2">
                <div className="flex items-center gap-1.5">
                    {FILTERS.map((filter) => (
                        <button
                            key={filter.id}
                            onClick={() => appState.setFilesFilter(filter.id)}
                            className={cn(
                                'h-8 rounded-full px-4 text-[12px] font-medium transition-colors',
                                appState.filesFilter === filter.id
                                    ? 'bg-foreground text-background'
                                    : 'bg-background-secondary text-foreground-secondary hover:bg-background-hover hover:text-foreground',
                            )}
                        >
                            {filter.label}
                        </button>
                    ))}
                </div>

                {appState.selectedFolder && (
                    <button
                        onClick={() => (appState.selectedFolder = null)}
                        className="flex h-8 items-center gap-1.5 rounded-full border border-border px-3 text-[11.5px] text-foreground-secondary transition-colors hover:bg-background-hover hover:text-foreground"
                    >
                        <FolderOpen className="h-3.5 w-3.5" />
                        {baseName(appState.selectedFolder)}
                        <span className="text-foreground-quadranary">×</span>
                    </button>
                )}

                <div className="ml-auto flex items-center gap-2.5">
                    <SearchField value={query} onChange={setQuery} placeholder="Search files" />
                    <div className="flex items-center gap-0.5 rounded-lg border border-border bg-background-secondary p-0.5">
                        <LayoutToggle
                            active={layout === 'grid'}
                            onClick={() => setLayout('grid')}
                            icon={LayoutGrid}
                        />
                        <LayoutToggle
                            active={layout === 'list'}
                            onClick={() => setLayout('list')}
                            icon={List}
                        />
                    </div>
                </div>
            </div>

            <div className="mt-8 flex flex-1 flex-col">
                {appState.filesFilter === 'shared' ? (
                    <EmptyState
                        icon={ArrowUpRight}
                        title="Nothing shared yet"
                        description="Files you share, and files sent to you, will show up here."
                    />
                ) : activeProjects.length === 0 ? (
                    <EmptyState
                        icon={FilePlus2}
                        title="No files yet"
                        description="Start from a prompt, import an existing project, or open a folder from your computer."
                        action={
                            <Button onClick={newFile}>
                                <FilePlus2 className="h-4 w-4" />
                                New file
                            </Button>
                        }
                    />
                ) : projects.length === 0 ? (
                    <EmptyState
                        icon={Search}
                        title="No matches"
                        description={
                            query
                                ? `Nothing here matches “${query}”.`
                                : 'This folder is empty. Move a project here from Files.'
                        }
                    />
                ) : layout === 'grid' ? (
                    <div className="grid grid-cols-1 gap-x-7 gap-y-9 sm:grid-cols-2 xl:grid-cols-3">
                        {projects.map((project) => (
                            <ProjectCard key={project.id} project={project} onOpen={openProject} />
                        ))}
                    </div>
                ) : (
                    <div className="flex flex-col divide-y divide-border">
                        {projects.map((project) => (
                            <div
                                key={project.id}
                                className="group flex items-center gap-4 py-3 transition-colors hover:bg-background-hover/50"
                            >
                                <button
                                    className="flex min-w-0 flex-1 items-center gap-4 text-left"
                                    onClick={() => openProject(project)}
                                >
                                    <div className="flex h-10 w-14 shrink-0 items-center justify-center overflow-hidden rounded-md border border-border bg-surface">
                                        <span className="font-display text-[15px] text-foreground-quadranary">
                                            {project.name.charAt(0).toUpperCase()}
                                        </span>
                                    </div>
                                    <div className="min-w-0 flex-1">
                                        <p className="truncate text-[13px] text-foreground">
                                            {project.name}
                                        </p>
                                        <p className="truncate text-[11px] text-foreground-quadranary">
                                            {project.url}
                                        </p>
                                    </div>
                                </button>
                                <ProjectSettingsButton project={project} iconOnly />
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
});

function LayoutToggle({
    active,
    onClick,
    icon: Icon,
}: {
    active: boolean;
    onClick: () => void;
    icon: LucideIcon;
}) {
    return (
        <button
            onClick={onClick}
            className={cn(
                'flex h-7 w-7 items-center justify-center rounded-md transition-colors',
                active
                    ? 'bg-background-active text-foreground'
                    : 'text-foreground-quadranary hover:text-foreground',
            )}
        >
            <Icon className="h-3.5 w-3.5" strokeWidth={1.7} />
        </button>
    );
}

const FoldersView = observer(() => {
    const appState = useAppStateManager();
    const projectsManager = useProjectsManager();

    const folders = useMemo(() => {
        const counts = new Map<string, number>();
        for (const project of projectsManager.projects) {
            if (project.archivedAt) {
                continue;
            }
            const parent = parentPath(project.folderPath);
            if (!parent) {
                continue;
            }
            counts.set(parent, (counts.get(parent) || 0) + 1);
        }
        return Array.from(counts.entries())
            .map(([path, count]) => ({ path, count }))
            .sort((a, b) => a.path.localeCompare(b.path));
    }, [projectsManager.projects]);

    return (
        <div className="flex min-h-full flex-col px-12 pb-16 pt-14 xl:px-16">
            <PageHeader
                title="Folders"
                subtitle={`${folders.length} ${folders.length === 1 ? 'folder' : 'folders'}`}
                actions={
                    <Button
                        variant="secondary"
                        className="h-9"
                        onClick={() => appState.setView('files')}
                    >
                        <LayoutGrid className="h-4 w-4" strokeWidth={1.7} />
                        All files
                    </Button>
                }
            />

            <div className="mt-10 flex flex-1 flex-col">
                {folders.length === 0 ? (
                    <EmptyState
                        icon={Folder}
                        title="No folders yet"
                        description="Folders come from where your projects live on disk. Import a project from a folder to see it here."
                        action={
                            <Button
                                variant="secondary"
                                onClick={() => {
                                    projectsManager.projectsTab = ProjectTabs.IMPORT_PROJECT;
                                }}
                            >
                                <Upload className="h-4 w-4" />
                                Import a project
                            </Button>
                        }
                    />
                ) : (
                    <div className="grid grid-cols-1 gap-x-7 gap-y-9 sm:grid-cols-2 xl:grid-cols-3">
                        {folders.map((folder) => (
                            <button
                                key={folder.path}
                                onClick={() => appState.openFolder(folder.path)}
                                className="flex aspect-[4/3] flex-col justify-between rounded-2xl border border-border bg-surface p-5 text-left transition-colors hover:border-border-hover hover:bg-surface-hover"
                            >
                                <Folder
                                    className="h-5 w-5 text-foreground-tertiary"
                                    strokeWidth={1.6}
                                />
                                <div>
                                    <p className="truncate text-[13.5px] font-medium text-foreground">
                                        {baseName(folder.path)}
                                    </p>
                                    <p className="mt-0.5 text-[11.5px] text-foreground-quadranary">
                                        {folder.count} {folder.count === 1 ? 'file' : 'files'}
                                    </p>
                                </div>
                            </button>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
});

const ArchiveView = observer(() => {
    const appState = useAppStateManager();
    const projectsManager = useProjectsManager();
    const archived = useMemo(
        () => projectsManager.projects.filter((project) => !!project.archivedAt),
        [projectsManager.projects],
    );

    const openProject = async (project: Project) => {
        await projectsManager.openProject(project);
        appState.showHome = false;
    };

    return (
        <div className="flex min-h-full flex-col px-12 pb-16 pt-14 xl:px-16">
            <PageHeader
                title="Archive"
                subtitle={`${archived.length} ${archived.length === 1 ? 'file' : 'files'}`}
            />
            <div className="mt-10 flex flex-1 flex-col">
                {archived.length === 0 ? (
                    <EmptyState
                        icon={Archive}
                        title="Nothing archived"
                        description="Archived files wait here until you bring them back."
                    />
                ) : (
                    <div className="grid grid-cols-1 gap-x-7 gap-y-9 sm:grid-cols-2 xl:grid-cols-3">
                        {archived.map((project) => (
                            <ProjectCard
                                key={project.id}
                                project={project}
                                archived
                                onOpen={openProject}
                            />
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
});

function parentPath(folderPath: string): string {
    if (!folderPath) {
        return '';
    }
    const parts = folderPath.split(/[/\\]/);
    parts.pop();
    return parts.join(folderPath.includes('\\') ? '\\' : '/');
}

function baseName(path: string): string {
    if (!path) {
        return '';
    }
    const parts = path.split(/[/\\]/);
    return parts.filter(Boolean).pop() || path;
}
