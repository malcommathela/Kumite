import {
    useAppStateManager,
    useAuthManager,
    useEditorEngine,
    useProjectsManager,
    useUserManager,
} from '@/components/Context';
import { useTheme } from '@/components/ThemeProvider';
import { SettingsTabValue } from '@/lib/models';
import { ProjectTabs } from '@/lib/projects';
import type { WorkspaceView } from '@/lib/state';
import { UsagePlanType } from '@kumite/models/usage';
import { Button } from '@kumite/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@kumite/ui/popover';
import { cn } from '@kumite/ui/utils';
import {
    Archive,
    Bell,
    ChevronDown,
    CreditCard,
    Folder,
    LibraryBig,
    LogOut,
    Monitor,
    Moon,
    Orbit,
    Plus,
    Search,
    Settings,
    Sparkles,
    Sun,
    LayoutGrid,
} from 'lucide-react';
import { observer } from 'mobx-react-lite';
import { useState } from 'react';

const NAV_ITEMS: { id: WorkspaceView; label: string; icon: typeof Folder }[] = [
    { id: 'files', label: 'Files', icon: LayoutGrid },
    { id: 'folders', label: 'Folders', icon: Folder },
    { id: 'archive', label: 'Archive', icon: Archive },
    { id: 'library', label: 'Library', icon: LibraryBig },
];

const APPEARANCES = [
    { value: 'system' as const, label: 'System', icon: Monitor },
    { value: 'light' as const, label: 'Light', icon: Sun },
    { value: 'dark' as const, label: 'Dark', icon: Moon },
];

export const Sidebar = observer(() => {
    const appState = useAppStateManager();
    const authManager = useAuthManager();
    const userManager = useUserManager();
    const editorEngine = useEditorEngine();
    const projectsManager = useProjectsManager();
    const { theme, setTheme } = useTheme();
    const [profileOpen, setProfileOpen] = useState(false);

    const plan = userManager.subscription?.plan;
    const isPro = plan === UsagePlanType.PRO;
    const name = authManager.userMetadata?.name || authManager.userMetadata?.email || 'Local user';
    const initial = name.trim().charAt(0).toUpperCase() || 'K';

    const openSettings = () => {
        setProfileOpen(false);
        editorEngine.isSettingsOpen = true;
        editorEngine.settingsTab = SettingsTabValue.PREFERENCES;
    };

    return (
        <aside className="flex w-[276px] shrink-0 flex-col border-r border-border bg-sidebar">
            <div className="flex h-[52px] items-center gap-2.5 px-4">
                <Orbit className="h-[18px] w-[18px] text-foreground" strokeWidth={1.6} />
                <span className="text-[15px] font-medium tracking-tight text-foreground">
                    Kumite
                </span>
                <Button
                    variant="ghost"
                    size="icon-sm"
                    className="ml-auto text-foreground-tertiary"
                    aria-label="Notifications"
                    onClick={() => {
                        editorEngine.isSettingsOpen = true;
                        editorEngine.settingsTab = SettingsTabValue.PREFERENCES;
                    }}
                >
                    <Bell className="h-4 w-4" strokeWidth={1.7} />
                </Button>
            </div>

            <div className="px-3 pb-1">
                <button
                    className="flex h-9 w-full items-center gap-2.5 rounded-lg px-2.5 text-[13px] text-foreground-secondary transition-colors hover:bg-background-hover hover:text-foreground"
                    onClick={() => (appState.searchOpen = true)}
                >
                    <Search className="h-4 w-4" strokeWidth={1.7} />
                    <span>Search</span>
                    <kbd className="ml-auto text-[11px] text-foreground-quadranary">{'Ctrl K'}</kbd>
                </button>
            </div>

            <nav className="flex flex-col gap-0.5 px-3 pt-1">
                {NAV_ITEMS.map((item) => {
                    const Icon = item.icon;
                    const active = appState.view === item.id;
                    return (
                        <button
                            key={item.id}
                            onClick={() => appState.setView(item.id)}
                            className={cn(
                                'flex h-9 items-center gap-2.5 rounded-lg px-2.5 text-[13px] transition-colors',
                                active
                                    ? 'bg-background-active text-foreground'
                                    : 'text-foreground-secondary hover:bg-background-hover hover:text-foreground',
                            )}
                        >
                            <Icon className="h-4 w-4" strokeWidth={1.7} />
                            <span>{item.label}</span>
                        </button>
                    );
                })}
            </nav>

            <div className="mt-auto border-t border-border p-3">
                <Popover open={profileOpen} onOpenChange={setProfileOpen}>
                    <PopoverTrigger asChild>
                        <button className="flex w-full items-center gap-2.5 rounded-xl p-1.5 text-left transition-colors hover:bg-background-hover">
                            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#1f6f45] text-[13px] font-medium text-white">
                                {initial}
                            </span>
                            <span className="min-w-0 flex-1">
                                <span className="block truncate text-[13px] font-medium text-foreground">
                                    {name}
                                </span>
                                <span className="block truncate text-[11.5px] text-foreground-tertiary">
                                    {isPro ? 'Pro' : 'Free'} plan
                                </span>
                            </span>
                            <ChevronDown className="h-3.5 w-3.5 text-foreground-quadranary" />
                        </button>
                    </PopoverTrigger>
                    <PopoverContent
                        side="top"
                        align="start"
                        sideOffset={8}
                        className="w-[264px] rounded-2xl border-border bg-popover p-2.5 shadow-2xl"
                    >
                        <div className="flex items-center justify-between px-1 pb-2 pt-0.5">
                            <span className="text-[11px] uppercase tracking-[0.08em] text-foreground-quadranary">
                                Plan
                            </span>
                        </div>
                        <div className="px-1">
                            <p className="text-[18px] font-medium text-foreground">
                                {isPro ? 'Pro' : 'Free'}
                            </p>
                            <p className="mt-0.5 text-[11.5px] leading-4 text-foreground-tertiary">
                                {isPro
                                    ? 'Your plan is active.'
                                    : 'Included with Kumite. Upgrade for higher agent limits.'}
                            </p>
                        </div>
                        {!isPro && (
                            <Button
                                className="mt-3 h-9 w-full"
                                onClick={() => {
                                    setProfileOpen(false);
                                    editorEngine.isPlansOpen = true;
                                }}
                            >
                                <Sparkles className="h-4 w-4" />
                                Upgrade
                            </Button>
                        )}

                        <div className="mt-2 flex flex-col gap-0.5">
                            <MenuRow
                                icon={Settings}
                                label="Settings"
                                shortcut="Ctrl ,"
                                onClick={openSettings}
                            />
                            <MenuRow
                                icon={CreditCard}
                                label="Plan & billing"
                                onClick={() => {
                                    setProfileOpen(false);
                                    editorEngine.isPlansOpen = true;
                                }}
                            />
                            <MenuRow
                                icon={Plus}
                                label="Set up a first build"
                                onClick={() => {
                                    setProfileOpen(false);
                                    projectsManager.projectsTab = ProjectTabs.PROMPT_CREATE;
                                }}
                            />
                            <div className="flex items-center gap-2.5 rounded-lg px-2.5 py-1.5 text-[13px] text-foreground-secondary">
                                <Sparkles className="h-4 w-4" strokeWidth={1.7} />
                                <span>Appearance</span>
                                <div className="ml-auto flex items-center gap-0.5 rounded-lg bg-background-secondary p-0.5">
                                    {APPEARANCES.map((option) => {
                                        const Icon = option.icon;
                                        return (
                                            <button
                                                key={option.value}
                                                title={option.label}
                                                aria-label={option.label}
                                                onClick={() => setTheme(option.value)}
                                                className={cn(
                                                    'flex h-6 w-6 items-center justify-center rounded-md transition-colors',
                                                    theme === option.value
                                                        ? 'bg-background-active text-foreground'
                                                        : 'text-foreground-quadranary hover:text-foreground',
                                                )}
                                            >
                                                <Icon className="h-3.5 w-3.5" />
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>
                            {authManager.isAuthEnabled && (
                                <MenuRow
                                    icon={LogOut}
                                    label="Sign out"
                                    muted
                                    onClick={() => {
                                        setProfileOpen(false);
                                        authManager.signOut();
                                    }}
                                />
                            )}
                        </div>
                    </PopoverContent>
                </Popover>
            </div>
        </aside>
    );
});

function MenuRow({
    icon: Icon,
    label,
    shortcut,
    muted,
    onClick,
}: {
    icon: typeof Settings;
    label: string;
    shortcut?: string;
    muted?: boolean;
    onClick: () => void;
}) {
    return (
        <button
            onClick={onClick}
            className={cn(
                'flex w-full items-center gap-2.5 rounded-lg px-2.5 py-1.5 text-left text-[13px] transition-colors hover:bg-background-hover',
                muted ? 'text-foreground-tertiary' : 'text-foreground-secondary',
            )}
        >
            <Icon className="h-4 w-4" strokeWidth={1.7} />
            <span>{label}</span>
            {shortcut && (
                <span className="ml-auto text-[11px] text-foreground-quadranary">{shortcut}</span>
            )}
        </button>
    );
}
