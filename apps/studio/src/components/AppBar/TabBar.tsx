import { useAppStateManager, useProjectsManager, useRouteManager } from '@/components/Context';
import { ProjectTabs } from '@/lib/projects';
import { Route } from '@/lib/routes';
import { cn } from '@kumite/ui/utils';
import { Cancel01Icon, GridViewIcon, PlusSignIcon } from '@hugeicons/core-free-icons';
import { HugeiconsIcon } from '@hugeicons/react';
import { observer } from 'mobx-react-lite';
import type React from 'react';

export const TabBar = observer(() => {
    const appState = useAppStateManager();
    const projectsManager = useProjectsManager();
    const routeManager = useRouteManager();

    if (routeManager.route === Route.SIGN_IN) {
        return null;
    }

    const project = projectsManager.project;
    const homeActive = !project || appState.showHome;

    const openHome = async () => {
        if (projectsManager.project && !appState.showHome) {
            await projectsManager.capturePreview();
        }
        appState.showHome = true;
        projectsManager.projectsTab = ProjectTabs.PROJECTS;
    };

    const closeProject = async () => {
        // closeProject captures the live editor before disposing its webviews.
        await projectsManager.closeProject();
        appState.showHome = true;
        projectsManager.projectsTab = ProjectTabs.PROJECTS;
    };

    const newTab = async () => {
        if (projectsManager.project && !appState.showHome) {
            await projectsManager.capturePreview();
        }
        appState.showHome = true;
        projectsManager.projectsTab = ProjectTabs.PROMPT_CREATE;
    };

    return (
        <div className="flex h-11 shrink-0 items-stretch border-b border-border bg-background px-2">
            <div className="flex min-w-0 flex-1 items-center gap-1 overflow-x-auto">
                <TabButton active={homeActive} onClick={openHome}>
                    <HugeiconsIcon icon={GridViewIcon} size={14} strokeWidth={1.7} />
                    <span>Dashboard</span>
                </TabButton>

                {project && (
                    <div
                        className={cn(
                            'group flex h-8 min-w-0 max-w-[240px] items-center gap-2 rounded-lg pl-2.5 pr-1.5 text-xs transition-colors',
                            !homeActive
                                ? 'bg-background-active text-foreground'
                                : 'text-foreground-tertiary hover:bg-background-hover hover:text-foreground-secondary',
                        )}
                    >
                        <button
                            className="flex min-w-0 items-center gap-2"
                            onClick={() => {
                                appState.showHome = false;
                            }}
                        >
                            <span className="flex h-4 w-3.5 shrink-0 items-center justify-center rounded-[2px] border border-foreground-quadranary/50 text-[8px] leading-none">
                                K
                            </span>
                            <span className="truncate">{project.name}</span>
                        </button>
                        <button
                            aria-label={`Close ${project.name}`}
                            className="flex h-5 w-5 shrink-0 items-center justify-center rounded-md text-foreground-quadranary opacity-0 transition-opacity hover:bg-background-hover hover:text-foreground group-hover:opacity-100"
                            onClick={(event) => {
                                event.stopPropagation();
                                void closeProject();
                            }}
                        >
                            <HugeiconsIcon icon={Cancel01Icon} size={12} strokeWidth={1.7} />
                        </button>
                    </div>
                )}

                <button
                    aria-label="New tab"
                    onClick={newTab}
                    className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-foreground-quadranary transition-colors hover:bg-background-hover hover:text-foreground"
                >
                    <HugeiconsIcon icon={PlusSignIcon} size={16} strokeWidth={1.7} />
                </button>
            </div>
        </div>
    );
});

function TabButton({
    active,
    onClick,
    children,
}: {
    active: boolean;
    onClick: () => void;
    children: React.ReactNode;
}) {
    return (
        <button
            onClick={onClick}
            className={cn(
                'flex h-8 shrink-0 items-center gap-2 rounded-lg px-2.5 text-[12.5px] transition-colors',
                active
                    ? 'bg-background-active text-foreground'
                    : 'text-foreground-tertiary hover:bg-background-hover hover:text-foreground-secondary',
            )}
        >
            {children}
        </button>
    );
}
