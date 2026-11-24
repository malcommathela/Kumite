import { SearchDialog } from './SearchDialog';
import { Sidebar } from './Sidebar';
import { observer } from 'mobx-react-lite';
import type React from 'react';
import { useEffect } from 'react';
import { useAppStateManager } from '@/components/Context';

type WorkspaceShellProps = {
    children: React.ReactNode;
    sidebar?: boolean;
};

export const WorkspaceShell = observer(({ children, sidebar = true }: WorkspaceShellProps) => {
    const appState = useAppStateManager();

    useEffect(() => {
        const onKeyDown = (event: KeyboardEvent) => {
            const meta = event.metaKey || event.ctrlKey;
            if (meta && event.key.toLowerCase() === 'k') {
                event.preventDefault();
                appState.searchOpen = true;
            }
        };
        window.addEventListener('keydown', onKeyDown);
        return () => window.removeEventListener('keydown', onKeyDown);
    }, [appState]);

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
