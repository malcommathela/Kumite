import { useEditorEngine, useRouteManager, useUserManager } from '@/components/Context';
import { useTheme } from '@/components/ThemeProvider';
import { SettingsTabValue } from '@/lib/models';
import { Route } from '@/lib/routes';
import { invokeMainChannel } from '@/lib/utils';
import {
    Language,
    LANGUAGE_DISPLAY_NAMES,
    Links,
    MainChannels,
    Theme,
} from '@kumite/models/constants';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuSub,
    DropdownMenuSubContent,
    DropdownMenuSubTrigger,
    DropdownMenuTrigger,
} from '@kumite/ui/dropdown-menu';
import {
    CircleHelp,
    Code2,
    Globe,
    Laptop,
    Mail,
    MessageCircle,
    Moon,
    RefreshCw,
    Settings,
    Sun,
    TriangleAlert,
} from 'lucide-react';
import { observer } from 'mobx-react-lite';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

export const HelpButton = observer(() => {
    const userManager = useUserManager();
    const routeManager = useRouteManager();
    const editorEngine = useEditorEngine();

    const { theme, setTheme } = useTheme();
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);
    const { t } = useTranslation();

    if (routeManager.route === Route.EDITOR) {
        return null;
    }

    return (
        <DropdownMenu open={isDropdownOpen} onOpenChange={setIsDropdownOpen}>
            <DropdownMenuTrigger asChild>
                <button className="no-drag flex h-full w-9 items-center justify-center text-foreground-tertiary transition-colors hover:text-foreground">
                    <CircleHelp className="h-4 w-4" strokeWidth={1.7} />
                </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-52" align="end" sideOffset={6}>
                <DropdownMenuItem onClick={() => invokeMainChannel(MainChannels.RELOAD_APP)}>
                    <RefreshCw />
                    {t('help.menu.reloadKumite')}
                </DropdownMenuItem>
                <DropdownMenuSub>
                    <DropdownMenuSubTrigger>
                        {theme === Theme.Dark && <Moon />}
                        {theme === Theme.Light && <Sun />}
                        {theme === Theme.System && <Laptop />}
                        {t('help.menu.theme.title')}
                    </DropdownMenuSubTrigger>
                    <DropdownMenuSubContent className="w-36">
                        <DropdownMenuItem onClick={() => setTheme(Theme.Light)}>
                            <Sun />
                            {t('help.menu.theme.light')}
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => setTheme(Theme.Dark)}>
                            <Moon />
                            {t('help.menu.theme.dark')}
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => setTheme(Theme.System)}>
                            <Laptop />
                            {t('help.menu.theme.system')}
                        </DropdownMenuItem>
                    </DropdownMenuSubContent>
                </DropdownMenuSub>
                <DropdownMenuSub>
                    <DropdownMenuSubTrigger>
                        <Globe />
                        {t('help.menu.language')}
                    </DropdownMenuSubTrigger>
                    <DropdownMenuSubContent className="w-36">
                        <DropdownMenuItem
                            onClick={() => userManager.language.update(Language.English)}
                        >
                            {LANGUAGE_DISPLAY_NAMES[Language.English]}
                        </DropdownMenuItem>
                        <DropdownMenuItem
                            onClick={() => userManager.language.update(Language.Japanese)}
                        >
                            {LANGUAGE_DISPLAY_NAMES[Language.Japanese]}
                        </DropdownMenuItem>
                        <DropdownMenuItem
                            onClick={() => userManager.language.update(Language.Chinese)}
                        >
                            {LANGUAGE_DISPLAY_NAMES[Language.Chinese]}
                        </DropdownMenuItem>
                    </DropdownMenuSubContent>
                </DropdownMenuSub>
                <DropdownMenuItem
                    onClick={() => {
                        editorEngine.isSettingsOpen = true;
                        editorEngine.settingsTab = SettingsTabValue.PREFERENCES;
                    }}
                >
                    <Settings />
                    {t('help.menu.openSettings')}
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuSub>
                    <DropdownMenuSubTrigger>
                        <Mail />
                        {t('help.menu.contactUs.title')}
                    </DropdownMenuSubTrigger>
                    <DropdownMenuSubContent>
                        <DropdownMenuItem onClick={() => window.open(Links.GITHUB, '_blank')}>
                            <Globe />
                            {t('help.menu.contactUs.website')}
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => window.open(Links.DISCORD, '_blank')}>
                            <MessageCircle />
                            {t('help.menu.contactUs.discord')}
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => window.open(Links.GITHUB, '_blank')}>
                            <Code2 />
                            {t('help.menu.contactUs.github')}
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => window.open(Links.OPEN_ISSUE, '_blank')}>
                            <Mail />
                            {t('help.menu.contactUs.email')}
                        </DropdownMenuItem>
                    </DropdownMenuSubContent>
                </DropdownMenuSub>
                <DropdownMenuItem onClick={() => window.open(Links.OPEN_ISSUE, '_blank')}>
                    <TriangleAlert />
                    {t('help.menu.reportIssue')}
                </DropdownMenuItem>
            </DropdownMenuContent>
        </DropdownMenu>
    );
});
