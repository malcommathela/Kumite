import { SearchDialog } from './SearchDialog';
import { Sidebar } from './Sidebar';
import { observer } from 'mobx-react-lite';
import type React from 'react';
import { useEffect } from 'react';
import { useAppStateManager, useProjectsManager } from '@/components/Context';
import { ProjectTabs } from '@/lib/projects';

type WorkspaceShellProps = {
    children: React.ReactNode;
    sidebar?: boolean;
};

export const WorkspaceShell = observer(({ children, sidebar = true }: WorkspaceShellProps) => {
    const appState = useAppStateManager();
    const projectsManager = useProjectsManager();

    useEffect(() => {
        const onKeyDown = (event: KeyboardEvent) => {
            const meta = event.metaKey || event.ctrlKey;
            if (meta && event.key.toLowerCase() === 'k') {
                event.preventDefault();
                appState.searchOpen = true;
            }
            if (meta && event.key.toLowerCase() === 'n') {
                const target = event.target as HTMLElement | null;
                const typing =
                    target?.tagName === 'INPUT' ||
                    target?.tagName === 'TEXTAREA' ||
                    target?.isContentEditable;
                if (!typing) {
                    event.preventDefault();
                    appState.showHome = true;
                    projectsManager.projectsTab = ProjectTabs.PROMPT_CREATE;
                }
            }
        };
        window.addEventListener('keydown', onKeyDown);
        return () => window.removeEventListener('keydown', onKeyDown);
    }, [appState, projectsManager]);

    return (
        <div className="flex min-h-0 flex-1 overflow-hidden">
            {sidebar && <Sidebar />}
            <main className="relative flex min-w-0 flex-1 flex-col overflow-y-auto">
                {children}
            </main>
            {sidebar && <SearchDialog />}
        </div>
    );
});
