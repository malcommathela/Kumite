import {
    useAppStateManager,
    useAuthManager,
    useEditorEngine,
    useProjectsManager,
    useUpdateManager,
} from '@/components/Context';
import { SettingsTabValue } from '@/lib/models';
import { ProjectTabs } from '@/lib/projects';
import { invokeMainChannel } from '@/lib/utils';
import { MainChannels } from '@kumite/models/constants';
import { WindowCommand } from '@kumite/models/projects';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuShortcut,
    DropdownMenuTrigger,
} from '@kumite/ui/dropdown-menu';
import { cn } from '@kumite/ui/utils';
import {
    Archive,
    Folder,
    LayoutGrid,
    LibraryBig,
    LogOut,
    Plus,
    Search,
    Settings,
    Upload,
} from 'lucide-react';
import { observer } from 'mobx-react-lite';
import type React from 'react';
import { useEffect } from 'react';
import { HelpButton } from './HelpButton';
import { TabBar } from './TabBar';
import UpdateButton from './UpdateButton';
import { WindowsControls } from './WindowsControls';

export const AppBar = observer(() => {
    const appState = useAppStateManager();
    const editorEngine = useEditorEngine();
    const projectsManager = useProjectsManager();
    const authManager = useAuthManager();
    const updateManager = useUpdateManager();

    const openSettings = () => {
        editorEngine.isSettingsOpen = true;
        editorEngine.settingsTab = SettingsTabValue.PREFERENCES;
    };

    const newFile = () => {
        appState.showHome = true;
        projectsManager.projectsTab = ProjectTabs.PROMPT_CREATE;
    };

    const importProject = () => {
        appState.showHome = true;
        projectsManager.projectsTab = ProjectTabs.IMPORT_PROJECT;
    };

    useEffect(() => {
        const onKeyDown = (event: KeyboardEvent) => {
            const meta = event.metaKey || event.ctrlKey;
            if (!meta) {
                return;
            }
            const key = event.key.toLowerCase();
            if (key === ',') {
                event.preventDefault();
                openSettings();
            }
            if (key === 'n') {
                const target = event.target as HTMLElement | null;
                const typing =
                    target?.tagName === 'INPUT' ||
                    target?.tagName === 'TEXTAREA' ||
                    target?.isContentEditable;
                if (!typing) {
                    event.preventDefault();
                    newFile();
                }
            }
        };
        window.addEventListener('keydown', onKeyDown);
        return () => window.removeEventListener('keydown', onKeyDown);
    }, []);

    const goto = (view: 'files' | 'folders' | 'archive' | 'library') => {
        appState.setView(view);
        appState.showHome = true;
        projectsManager.projectsTab = ProjectTabs.PROJECTS;
    };

    const windowCommand = (command: WindowCommand) => {
        invokeMainChannel(MainChannels.SEND_WINDOW_COMMAND, command);
    };

    return (
        <div className="shrink-0 bg-background">
            <div className="relative flex h-9 items-center border-b border-border/60 pl-1 pr-0">
                <div className="appbar absolute inset-0" />

                <div className="no-drag relative z-10 flex items-center">
                    <Menu label="File">
                        <DropdownMenuItem onSelect={newFile}>
                            <Plus />
                            New file
                            <DropdownMenuShortcut>Ctrl N</DropdownMenuShortcut>
                        </DropdownMenuItem>
                        <DropdownMenuItem onSelect={importProject}>
                            <Upload />
                            Import existing project
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onSelect={openSettings}>
                            <Settings />
                            Settings
                            <DropdownMenuShortcut>Ctrl ,</DropdownMenuShortcut>
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onSelect={() => authManager.signOut()}>
                            <LogOut />
                            Sign out
                        </DropdownMenuItem>
                    </Menu>

                    <Menu label="Edit">
                        <DropdownMenuItem onSelect={() => (appState.searchOpen = true)}>
                            <Search />
                            Search files
                            <DropdownMenuShortcut>Ctrl K</DropdownMenuShortcut>
                        </DropdownMenuItem>
                        <DropdownMenuItem onSelect={openSettings}>
                            <Settings />
                            Preferences
                        </DropdownMenuItem>
                    </Menu>

                    <Menu label="View">
                        <DropdownMenuItem onSelect={() => goto('files')}>
                            <LayoutGrid />
                            Files
                        </DropdownMenuItem>
                        <DropdownMenuItem onSelect={() => goto('folders')}>
                            <Folder />
                            Folders
                        </DropdownMenuItem>
                        <DropdownMenuItem onSelect={() => goto('archive')}>
                            <Archive />
                            Archive
                        </DropdownMenuItem>
                        <DropdownMenuItem onSelect={() => goto('library')}>
                            <LibraryBig />
                            Library
                        </DropdownMenuItem>
                    </Menu>

                    <Menu label="Window">
                        <DropdownMenuItem onSelect={() => windowCommand(WindowCommand.MINIMIZE)}>
                            Minimize
                        </DropdownMenuItem>
                        <DropdownMenuItem onSelect={() => windowCommand(WindowCommand.MAXIMIZE)}>
                            Maximize
                        </DropdownMenuItem>
                        <DropdownMenuItem onSelect={() => windowCommand(WindowCommand.UNMAXIMIZE)}>
                            Restore
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onSelect={() => windowCommand(WindowCommand.CLOSE)}>
                            Close
                        </DropdownMenuItem>
                    </Menu>
                </div>

                <div className="no-drag relative z-10 ml-auto flex h-full items-center">
                    {updateManager.updateAvailable && (
                        <div className="mr-2">
                            <UpdateButton />
                        </div>
                    )}
                    <HelpButton />
                    <WindowsControls />
                </div>
            </div>
            <TabBar />
        </div>
    );
});

function Menu({ label, children }: { label: string; children: React.ReactNode }) {
    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <button
                    className={cn(
                        'rounded-md px-2 py-1 text-[12px] text-foreground-secondary transition-colors',
                        'hover:bg-background-hover hover:text-foreground data-[state=open]:bg-background-hover data-[state=open]:text-foreground',
                    )}
                >
                    {label}
                </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="min-w-[220px]">
                {children}
            </DropdownMenuContent>
        </DropdownMenu>
    );
}
