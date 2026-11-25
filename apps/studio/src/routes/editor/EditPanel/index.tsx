import { useEditorEngine, useUserManager } from '@/components/Context';
import { EditorMode, EditorTabValue } from '@/lib/models';
import { DefaultSettings, MainChannels } from '@kumite/models/constants';
import { IdeType } from '@kumite/models/ide';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@kumite/ui/dropdown-menu';
import { Icons } from '@kumite/ui/icons';
import ResizablePanel from '@kumite/ui/resizable';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@kumite/ui/tabs';
import { cn } from '@kumite/ui/utils';
import { observer } from 'mobx-react-lite';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ChatTab } from './ChatTab';
import { ChatControls } from './ChatTab/ChatControls';
import { ChatHistory } from './ChatTab/ChatControls/ChatHistory';
import { DevTab } from './DevTab';
import { PropsTab } from './PropsTab';
import { StylesTab } from './StylesTab';

const EDIT_PANEL_WIDTHS = {
    [EditorTabValue.CHAT]: 352,
    [EditorTabValue.PROPS]: 295,
    [EditorTabValue.STYLES]: 240,
    [EditorTabValue.DEV]: 700,
};
const DEV_PANEL_MIN_WIDTH = 300;
const DEV_PANEL_MAX_WIDTH = 1000;
export const EditPanel = observer(() => {
    const editorEngine = useEditorEngine();
    const userManager = useUserManager();
    const { t } = useTranslation();

    const currentIdeType = userManager.settings.settings?.editor?.ideType;
    const isKumiteIde = currentIdeType === IdeType.KUMITE;

    const chatSettings = userManager.settings.settings?.chat || DefaultSettings.CHAT_SETTINGS;
    const [isOpen, setIsOpen] = useState(true);
    const [selectedTab, setSelectedTab] = useState<EditorTabValue>(editorEngine.editPanelTab);
    const [isChatHistoryOpen, setIsChatHistoryOpen] = useState(false);
    const editPanelWidth = EDIT_PANEL_WIDTHS[selectedTab];

    useEffect(() => {
        tabChange(editorEngine.editPanelTab);
    }, [editorEngine.editPanelTab]);

    // Listens for SHOW_EDITOR_TAB event to switch to DevTab when files are opened via the Kumite IDE
    useEffect(() => {
        const handleShowEditorTab = (_event: any, tabValue: string) => {
            if (tabValue === EditorTabValue.DEV) {
                tabChange(EditorTabValue.DEV);
            }
        };

        window.api.on(MainChannels.SHOW_EDITOR_TAB, handleShowEditorTab);

        return () => {
            window.api.removeListener(MainChannels.SHOW_EDITOR_TAB, handleShowEditorTab);
        };
    }, []);

    function renderEmptyState() {
        return (
            <div className="text-sm pt-96 flex items-center justify-center text-center opacity-70 px-4">
                {t('editor.panels.edit.tabs.styles.emptyState')}
            </div>
        );
    }

    function tabChange(value: EditorTabValue) {
        editorEngine.editPanelTab = value;
        setSelectedTab(value);
        setIsOpen(true);
    }

    function renderTabs() {
        return (
            <Tabs
                className="flex h-full flex-col"
                onValueChange={(value) => tabChange(value as EditorTabValue)}
                value={selectedTab}
            >
                <TabsList
                    className={cn(
                        'bg-transparent w-full select-none justify-between items-center border-b border-border px-2',
                        isOpen ? 'h-12' : 'h-full',
                    )}
                >
                    <div className="flex flex-row items-center gap-2 ">
                        <button
                            className="text-default rounded-lg p-2 bg-transparent hover:text-foreground-hover hidden"
                            onClick={() => setIsOpen(false)}
                        >
                            <Icons.PinRight />
                        </button>
                        <DropdownMenu>
                            <DropdownMenuTrigger
                                asChild
                                disabled={selectedTab !== EditorTabValue.CHAT}
                            >
                                <div className="flex items-center">
                                    <TabsTrigger
                                        className="rounded-md bg-transparent px-2 py-1.5 text-small hover:bg-background-hover hover:text-foreground data-[state=active]:bg-background-active"
                                        value={EditorTabValue.CHAT}
                                    >
                                        <Icons.Sparkles className="mr-1.5 mb-0.5 h-4 w-4" />
                                        {t('editor.panels.edit.tabs.chat.name')}
                                        <Icons.ChevronDown className="ml-1 h-3 w-3 text-muted-foreground" />
                                    </TabsTrigger>
                                </div>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent className="min-w-[220px]">
                                <DropdownMenuItem
                                    className="flex items-center py-1.5"
                                    onClick={(e) => {
                                        e.preventDefault();
                                        userManager.settings.updateChat({
                                            showSuggestions: !chatSettings.showSuggestions,
                                        });
                                    }}
                                >
                                    <Icons.Check
                                        className={cn(
                                            'mr-2 h-4 w-4',
                                            chatSettings.showSuggestions
                                                ? 'opacity-100'
                                                : 'opacity-0',
                                        )}
                                    />
                                    Show suggestions
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                    className="flex items-center py-1.5"
                                    onClick={(e) => {
                                        e.preventDefault();
                                        userManager.settings.updateChat({
                                            autoApplyCode: !chatSettings.autoApplyCode,
                                        });
                                    }}
                                >
                                    <Icons.Check
                                        className={cn(
                                            'mr-2 h-4 w-4',
                                            chatSettings.autoApplyCode
                                                ? 'opacity-100'
                                                : 'opacity-0',
                                        )}
                                    />
                                    Auto-apply results
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                    className="flex items-center py-1.5"
                                    onClick={(e) => {
                                        e.preventDefault();
                                        userManager.settings.updateChat({
                                            expandCodeBlocks: !chatSettings.expandCodeBlocks,
                                        });
                                    }}
                                >
                                    <Icons.Check
                                        className={cn(
                                            'mr-2 h-4 w-4',
                                            chatSettings.expandCodeBlocks
                                                ? 'opacity-100'
                                                : 'opacity-0',
                                        )}
                                    />
                                    Show code while rendering
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                    className="flex items-center py-1.5"
                                    onClick={(e) => {
                                        e.preventDefault();
                                        userManager.settings.updateChat({
                                            showMiniChat: !chatSettings.showMiniChat,
                                        });
                                    }}
                                >
                                    <Icons.Check
                                        className={cn(
                                            'mr-2 h-4 w-4',
                                            chatSettings.showMiniChat ? 'opacity-100' : 'opacity-0',
                                        )}
                                    />
                                    Show mini chat
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem
                                    onClick={() => {
                                        setIsChatHistoryOpen(!isChatHistoryOpen);
                                    }}
                                >
                                    <Icons.CounterClockwiseClock className="mr-2 h-4 w-4" />
                                    Chat History
                                </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                        <TabsTrigger
                            className="rounded-md bg-transparent px-2 py-1.5 text-small hover:bg-background-hover hover:text-foreground data-[state=active]:bg-background-active"
                            value={EditorTabValue.STYLES}
                        >
                            <Icons.Styles className="mr-1.5 h-4 w-4" />
                            {t('editor.panels.edit.tabs.styles.name')}
                        </TabsTrigger>
                        <TabsTrigger
                            className="bg-transparent py-2 px-1 text-xs hover:text-foreground-hover hidden"
                            value={EditorTabValue.PROPS}
                        >
                            <Icons.MixerHorizontal className="mr-1.5 mb-0.5" />
                            Props
                        </TabsTrigger>
                        {isKumiteIde && (
                            <TabsTrigger
                                className="rounded-md bg-transparent px-2 py-1.5 text-small hover:bg-background-hover hover:text-foreground data-[state=active]:bg-background-active"
                                value={EditorTabValue.DEV}
                            >
                                <Icons.Code className="mr-1.5 h-4 w-4" />
                                Code
                            </TabsTrigger>
                        )}
                    </div>
                    {selectedTab === EditorTabValue.CHAT && <ChatControls />}
                </TabsList>
                <ChatHistory isOpen={isChatHistoryOpen} onOpenChange={setIsChatHistoryOpen} />
                <div
                    className={`min-h-0 flex-1 ${selectedTab === EditorTabValue.DEV ? 'overflow-hidden' : 'overflow-auto'}`}
                >
                    <TabsContent value={EditorTabValue.CHAT} className="mt-0 h-full">
                        <ChatTab />
                    </TabsContent>
                    <TabsContent value={EditorTabValue.PROPS}>
                        <PropsTab />
                    </TabsContent>
                    <TabsContent value={EditorTabValue.STYLES}>
                        {editorEngine.elements.selected.length > 0 ? (
                            <StylesTab />
                        ) : (
                            renderEmptyState()
                        )}
                    </TabsContent>
                    {/* Empty TabsContent to make the tabs system work, but actual content is rendered separately */}
                    {isKumiteIde && <TabsContent value={EditorTabValue.DEV}></TabsContent>}

                    {/* Keep DevTab mounted but control visibility based on selected tab so we dont lose the state when switching tabs */}
                    {isKumiteIde && (
                        <div
                            className={
                                selectedTab === EditorTabValue.DEV ? 'block h-full' : 'hidden'
                            }
                        >
                            <DevTab />
                        </div>
                    )}
                </div>
            </Tabs>
        );
    }

    return (
        <div
            className={cn(
                'flex h-full shrink-0 flex-row',
                editorEngine.mode === EditorMode.PREVIEW ? 'hidden' : '',
            )}
        >
            <ResizablePanel
                side="right"
                defaultWidth={editPanelWidth}
                forceWidth={editPanelWidth}
                minWidth={selectedTab === EditorTabValue.DEV ? DEV_PANEL_MIN_WIDTH : 240}
                maxWidth={selectedTab === EditorTabValue.DEV ? DEV_PANEL_MAX_WIDTH : 700}
            >
                <div
                    id="editor-panel"
                    className={cn(
                        'group/panel h-full w-full overflow-hidden border-l border-border bg-surface transition-width duration-300',
                        editorEngine.mode === EditorMode.PREVIEW ? 'hidden' : 'block',
                    )}
                >
                    <div
                        className={cn(
                            'relative h-full backdrop-blur-xl transition-opacity duration-300',
                            isOpen ? 'visible opacity-100' : 'invisible opacity-0',
                        )}
                    >
                        {renderTabs()}
                    </div>
                </div>
            </ResizablePanel>
        </div>
    );
});
