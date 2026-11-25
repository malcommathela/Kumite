import { useEditorEngine, useUserManager } from '@/components/Context';
import { EditorTabValue, SettingsTabValue } from '@/lib/models';
import { MainChannels } from '@kumite/models/constants';
import { IdeType } from '@kumite/models/ide';
import ResizablePanel from '@kumite/ui/resizable';
import { Button } from '@kumite/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@kumite/ui/tabs';
import { Tooltip, TooltipContent, TooltipTrigger } from '@kumite/ui/tooltip';
import { cn } from '@kumite/ui/utils';
import { Clock01Icon } from '@hugeicons/core-free-icons';
import { HugeiconsIcon } from '@hugeicons/react';
import { observer } from 'mobx-react-lite';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { DevTab } from './DevTab';
import { PropsTab } from './PropsTab';
import { StylesTab } from './StylesTab';
import ModeToggle from '../TopBar/ModeToggle';
import ProjectBreadcrumb from '../TopBar/ProjectSelect';
import Publish from '../TopBar/Publish';

const EDITOR_WIDTHS = {
    [EditorTabValue.CHAT]: 320,
    [EditorTabValue.PROPS]: 320,
    [EditorTabValue.STYLES]: 320,
    [EditorTabValue.DEV]: 700,
};
const DEV_PANEL_MIN_WIDTH = 300;
const DEV_PANEL_MAX_WIDTH = 1000;

export const EditPanel = observer(() => {
    const editorEngine = useEditorEngine();
    const userManager = useUserManager();
    const { t } = useTranslation();
    const isKumiteIde = userManager.settings.settings?.editor?.ideType === IdeType.KUMITE;
    const [selectedTab, setSelectedTab] = useState<EditorTabValue>(
        editorEngine.editPanelTab === EditorTabValue.CHAT
            ? EditorTabValue.STYLES
            : editorEngine.editPanelTab,
    );

    useEffect(() => {
        if (editorEngine.editPanelTab !== EditorTabValue.CHAT) {
            setSelectedTab(editorEngine.editPanelTab);
        }
    }, [editorEngine.editPanelTab]);

    useEffect(() => {
        const handleShowEditorTab = (...args: unknown[]) => {
            const tabValue = args[1] as string | undefined;
            if (tabValue === EditorTabValue.DEV) {
                changeTab(EditorTabValue.DEV);
            }
        };

        window.api.on(MainChannels.SHOW_EDITOR_TAB, handleShowEditorTab);
        return () => window.api.removeListener(MainChannels.SHOW_EDITOR_TAB, handleShowEditorTab);
    }, []);

    function changeTab(value: EditorTabValue) {
        editorEngine.editPanelTab = value;
        setSelectedTab(value);
    }

    return (
        <div className="flex h-full shrink-0 flex-row">
            <ResizablePanel
                side="right"
                defaultWidth={EDITOR_WIDTHS[selectedTab]}
                forceWidth={EDITOR_WIDTHS[selectedTab]}
                minWidth={selectedTab === EditorTabValue.DEV ? DEV_PANEL_MIN_WIDTH : 280}
                maxWidth={selectedTab === EditorTabValue.DEV ? DEV_PANEL_MAX_WIDTH : 520}
            >
                <div
                    id="editor-panel"
                    className="group/panel flex h-full w-full flex-col overflow-hidden border-l border-border/80 bg-surface"
                >
                    <div className="flex h-12 shrink-0 items-center justify-between border-b border-border/80 px-2.5">
                        <div className="flex items-center gap-1">
                            <span className="px-1.5 text-xs font-semibold tracking-tight text-foreground">
                                Inspector
                            </span>
                            <ProjectBreadcrumb />
                        </div>
                        <div className="flex items-center gap-1">
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <Button
                                        variant="ghost"
                                        size="icon-sm"
                                        aria-label={t('editor.toolbar.versionHistory')}
                                        className="text-foreground-tertiary"
                                        onClick={() => {
                                            editorEngine.settingsTab = SettingsTabValue.VERSIONS;
                                            editorEngine.isSettingsOpen = true;
                                        }}
                                    >
                                        <HugeiconsIcon
                                            icon={Clock01Icon}
                                            size={15}
                                            strokeWidth={1.7}
                                        />
                                    </Button>
                                </TooltipTrigger>
                                <TooltipContent side="bottom">
                                    {t('editor.toolbar.versionHistory')}
                                </TooltipContent>
                            </Tooltip>
                            <ModeToggle />
                        </div>
                    </div>
                    <Tabs
                        className="flex min-h-0 flex-1 flex-col"
                        onValueChange={(value) => changeTab(value as EditorTabValue)}
                        value={selectedTab}
                    >
                        <div className="flex h-11 shrink-0 items-center gap-2 border-b border-border/80 px-3">
                            <TabsList className="h-11 min-w-0 flex-1 justify-start gap-1 rounded-none bg-transparent p-0">
                                <TabsTrigger
                                    className="h-8 rounded-lg bg-transparent px-3 text-[11px] text-foreground-secondary hover:bg-background-hover data-[state=active]:bg-background-active data-[state=active]:text-foreground"
                                    value={EditorTabValue.STYLES}
                                >
                                    {t('editor.panels.edit.tabs.styles.name')}
                                </TabsTrigger>
                                <TabsTrigger
                                    className="h-8 rounded-lg bg-transparent px-3 text-[11px] text-foreground-secondary hover:bg-background-hover data-[state=active]:bg-background-active data-[state=active]:text-foreground"
                                    value={EditorTabValue.PROPS}
                                >
                                    Props
                                </TabsTrigger>
                                {isKumiteIde && (
                                    <TabsTrigger
                                        className="h-8 rounded-lg bg-transparent px-3 text-[11px] text-foreground-secondary hover:bg-background-hover data-[state=active]:bg-background-active data-[state=active]:text-foreground"
                                        value={EditorTabValue.DEV}
                                    >
                                        {t('editor.panels.edit.tabs.dev.name', 'Code')}
                                    </TabsTrigger>
                                )}
                            </TabsList>
                            <Publish />
                        </div>
                        <div
                            className={cn(
                                'min-h-0 flex-1',
                                selectedTab === EditorTabValue.DEV
                                    ? 'overflow-hidden'
                                    : 'overflow-auto',
                            )}
                        >
                            <TabsContent value={EditorTabValue.PROPS} className="mt-0">
                                <PropsTab />
                            </TabsContent>
                            <TabsContent value={EditorTabValue.STYLES} className="mt-0">
                                {editorEngine.elements.selected.length > 0 ? (
                                    <StylesTab />
                                ) : (
                                    <div className="flex min-h-48 items-center justify-center px-6 text-center text-[12px] text-foreground-tertiary">
                                        {t('editor.panels.edit.tabs.styles.emptyState')}
                                    </div>
                                )}
                            </TabsContent>
                            {isKumiteIde && <TabsContent value={EditorTabValue.DEV} />}
                            {isKumiteIde && (
                                <div
                                    className={
                                        selectedTab === EditorTabValue.DEV
                                            ? 'block h-full'
                                            : 'hidden'
                                    }
                                >
                                    <DevTab />
                                </div>
                            )}
                        </div>
                    </Tabs>
                </div>
            </ResizablePanel>
        </div>
    );
});
