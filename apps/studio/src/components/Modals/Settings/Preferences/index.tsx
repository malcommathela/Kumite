import { useUserManager } from '@/components/Context';
import { useTheme } from '@/components/ThemeProvider';
import { invokeMainChannel } from '@/lib/utils';
import { Language, LANGUAGE_DISPLAY_NAMES, MainChannels, Theme } from '@kumite/models/constants';
import { DEFAULT_IDE } from '@kumite/models/ide';
import { Button } from '@kumite/ui/button';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@kumite/ui/dropdown-menu';
import { Icons } from '@kumite/ui/icons';
import { Switch } from '@kumite/ui/switch';
import { Check, ChevronDown, Laptop, Moon, Sun } from 'lucide-react';
import { observer } from 'mobx-react-lite';
import type React from 'react';
import { useTranslation } from 'react-i18next';
import { IDE } from '/common/ide';

const PreferencesTab = observer(() => {
    const userManager = useUserManager();
    const { theme, setTheme } = useTheme();
    const { i18n } = useTranslation();

    const ide = IDE.fromType(userManager.settings.settings?.editor?.ideType || DEFAULT_IDE);
    const isAnalyticsEnabled = userManager.settings.settings?.enableAnalytics || false;
    const shouldWarnDelete = userManager.settings.settings?.editor?.shouldWarnDelete ?? true;
    const IDEIcon = Icons[ide.icon];

    function updateIde(next: IDE) {
        userManager.settings.updateEditor({ ideType: next.type });
    }

    function updateAnalytics(enabled: boolean) {
        userManager.settings.update({ enableAnalytics: enabled });
        invokeMainChannel(MainChannels.UPDATE_ANALYTICS_PREFERENCE, enabled);
    }

    function updateDeleteWarning(enabled: boolean) {
        userManager.settings.updateEditor({ shouldWarnDelete: enabled });
    }

    return (
        <div className="flex flex-col gap-9">
            <Section title="General" description="How Kumite looks and speaks to you.">
                <Row
                    title="Language"
                    description="Choose your preferred language."
                    control={
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button
                                    variant="secondary"
                                    className="h-8 min-w-[150px] justify-between"
                                >
                                    {LANGUAGE_DISPLAY_NAMES[
                                        i18n.language as keyof typeof LANGUAGE_DISPLAY_NAMES
                                    ] || 'English'}
                                    <ChevronDown className="h-3.5 w-3.5 text-foreground-tertiary" />
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="min-w-[160px]">
                                {Object.entries(LANGUAGE_DISPLAY_NAMES).map(([code, name]) => (
                                    <DropdownMenuItem
                                        key={code}
                                        onClick={() =>
                                            userManager.language.update(code as Language)
                                        }
                                    >
                                        <span>{name}</span>
                                        {i18n.language === code && (
                                            <Check className="ml-auto h-3.5 w-3.5" />
                                        )}
                                    </DropdownMenuItem>
                                ))}
                            </DropdownMenuContent>
                        </DropdownMenu>
                    }
                />
                <Row
                    title="Theme"
                    description="Choose your preferred appearance."
                    control={
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button
                                    variant="secondary"
                                    className="h-8 min-w-[150px] justify-between"
                                >
                                    <span className="flex items-center gap-2">
                                        {theme === Theme.Dark && <Moon className="h-3.5 w-3.5" />}
                                        {theme === Theme.Light && <Sun className="h-3.5 w-3.5" />}
                                        {theme === Theme.System && (
                                            <Laptop className="h-3.5 w-3.5" />
                                        )}
                                        <span className="capitalize">{theme}</span>
                                    </span>
                                    <ChevronDown className="h-3.5 w-3.5 text-foreground-tertiary" />
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="min-w-[150px]">
                                <DropdownMenuItem onClick={() => setTheme(Theme.Light)}>
                                    <Sun />
                                    <span>Light</span>
                                    {theme === Theme.Light && (
                                        <Check className="ml-auto h-3.5 w-3.5" />
                                    )}
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => setTheme(Theme.Dark)}>
                                    <Moon />
                                    <span>Dark</span>
                                    {theme === Theme.Dark && (
                                        <Check className="ml-auto h-3.5 w-3.5" />
                                    )}
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => setTheme(Theme.System)}>
                                    <Laptop />
                                    <span>System</span>
                                    {theme === Theme.System && (
                                        <Check className="ml-auto h-3.5 w-3.5" />
                                    )}
                                </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                    }
                />
            </Section>

            <Section title="Editor" description="Where your code lives and how it behaves.">
                <Row
                    title="Code editor"
                    description="The editor Kumite opens your project in."
                    control={
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button
                                    variant="secondary"
                                    className="h-8 min-w-[150px] justify-between"
                                >
                                    <span className="flex items-center gap-2">
                                        <IDEIcon className="h-3 w-3" />
                                        <span>{ide.displayName}</span>
                                    </span>
                                    <ChevronDown className="h-3.5 w-3.5 text-foreground-tertiary" />
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="min-w-[150px]">
                                {IDE.getAll().map((item) => {
                                    const ItemIcon = Icons[item.icon];
                                    return (
                                        <DropdownMenuItem
                                            key={item.displayName}
                                            onSelect={() => {
                                                updateIde(item);
                                            }}
                                        >
                                            <ItemIcon className="h-3 w-3" />
                                            <span>{item.displayName}</span>
                                            {ide === item && (
                                                <Check className="ml-auto h-3.5 w-3.5" />
                                            )}
                                        </DropdownMenuItem>
                                    );
                                })}
                            </DropdownMenuContent>
                        </DropdownMenu>
                    }
                />
                <Row
                    title="Warn before delete"
                    description="Ask before removing elements in the editor."
                    control={
                        <Switch checked={shouldWarnDelete} onCheckedChange={updateDeleteWarning} />
                    }
                />
            </Section>

            <Section title="Privacy" description="What we're allowed to learn from your usage.">
                <Row
                    title="Analytics"
                    description="Helps our small team know what to improve. No project content is collected."
                    control={
                        <Switch checked={isAnalyticsEnabled} onCheckedChange={updateAnalytics} />
                    }
                />
            </Section>
        </div>
    );
});

function Section({
    title,
    description,
    children,
}: {
    title: string;
    description?: string;
    children: React.ReactNode;
}) {
    return (
        <section className="flex flex-col gap-3">
            <div>
                <h2 className="text-[13px] font-medium text-foreground">{title}</h2>
                {description && (
                    <p className="mt-0.5 text-[11.5px] text-foreground-tertiary">{description}</p>
                )}
            </div>
            <div className="divide-y divide-border overflow-hidden rounded-xl border border-border bg-surface">
                {children}
            </div>
        </section>
    );
}

function Row({
    title,
    description,
    control,
}: {
    title: string;
    description: string;
    control: React.ReactNode;
}) {
    return (
        <div className="flex items-center justify-between gap-6 px-4 py-3.5">
            <div className="min-w-0">
                <p className="text-[12.5px] text-foreground">{title}</p>
                <p className="mt-0.5 text-[11.5px] leading-4 text-foreground-tertiary">
                    {description}
                </p>
            </div>
            <div className="shrink-0">{control}</div>
        </div>
    );
}

export default PreferencesTab;
