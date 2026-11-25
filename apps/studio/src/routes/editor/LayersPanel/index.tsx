import { useEditorEngine } from '@/components/Context';
import { EditorMode, EditorTabValue, LayersPanelTabValue } from '@/lib/models';
import { Tooltip, TooltipContent, TooltipTrigger } from '@kumite/ui/tooltip';
import { Button } from '@kumite/ui/button';
import { cn } from '@kumite/ui/utils';
import {
    File01Icon,
    Image01Icon,
    Layers01Icon,
    LayoutGridIcon,
    ComputerIcon,
    PaintBoardIcon,
    PanelLeftIcon,
    PinIcon,
    PinOffIcon,
    SparklesIcon,
    ShapesIcon,
} from '@hugeicons/core-free-icons';
import { HugeiconsIcon } from '@hugeicons/react';
import { observer } from 'mobx-react-lite';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import AppsTab from './AppsTab';
import { AgentsTab } from './AgentsTab';
import BrandTab from './BrandTab';
import ComponentsTab from './ComponentsTab';
import { HelpDropdown } from './HelpDropdown';
import IconsTab from './IconsTab';
import ImagesTab from './ImageTab';
import LayersTab from './LayersTab';
import OpenCodeMini from './OpenCodeMini';
import PagesTab from './PageTab';
import WindowsTab from './WindowsTab';
import ZoomControls from './ZoomControls';

interface PanelTab {
    value: LayersPanelTabValue;
    icon: typeof File01Icon;
    label: string;
}

const PANEL_TABS: PanelTab[] = [
    {
        value: LayersPanelTabValue.PAGES,
        icon: File01Icon,
        label: 'editor.panels.layers.tabs.pages',
    },
    {
        value: LayersPanelTabValue.LAYERS,
        icon: Layers01Icon,
        label: 'editor.panels.layers.tabs.layers',
    },
    { value: LayersPanelTabValue.AGENTS, icon: SparklesIcon, label: 'Agents' },
    {
        value: LayersPanelTabValue.IMAGES,
        icon: Image01Icon,
        label: 'editor.panels.layers.tabs.images',
    },
    {
        value: LayersPanelTabValue.WINDOWS,
        icon: ComputerIcon,
        label: 'editor.panels.layers.tabs.windows.name',
    },
    {
        value: LayersPanelTabValue.BRAND,
        icon: PaintBoardIcon,
        label: 'editor.panels.layers.tabs.brand',
    },
    {
        value: LayersPanelTabValue.COMPONENTS,
        icon: LayoutGridIcon,
        label: 'editor.panels.layers.tabs.components',
    },
    {
        value: LayersPanelTabValue.ICONS,
        icon: ShapesIcon,
        label: 'editor.panels.layers.tabs.icons',
    },
];

export const LayersPanel = observer(() => {
    const editorEngine = useEditorEngine();
    const { t } = useTranslation();
    const [collapsed, setCollapsed] = useState(false);
    const isLocked = editorEngine.isLayersPanelLocked;
    const selectedTab = editorEngine.layersPanelTab;
    const activeTab = selectedTab ?? LayersPanelTabValue.PAGES;
    const activeTabMeta = PANEL_TABS.find((tab) => tab.value === activeTab) ?? PANEL_TABS[0];

    useEffect(() => {
        if (editorEngine.editPanelTab === EditorTabValue.CHAT) {
            editorEngine.layersPanelTab = LayersPanelTabValue.AGENTS;
            editorEngine.isLayersPanelLocked = true;
        }
    }, [editorEngine.editPanelTab]);

    const handleMouseEnter = (tab: LayersPanelTabValue) => {
        if (isLocked || collapsed) {
            return;
        }
        editorEngine.layersPanelTab = tab;
    };

    const handleClick = (tab: LayersPanelTabValue) => {
        setCollapsed(false);
        if (tab === LayersPanelTabValue.AGENTS) {
            editorEngine.editPanelTab = EditorTabValue.CHAT;
        }
        if (selectedTab === tab && isLocked) {
            editorEngine.isLayersPanelLocked = false;
        } else {
            editorEngine.layersPanelTab = tab;
            editorEngine.isLayersPanelLocked = true;
        }
    };

    const collapsePanel = () => {
        setCollapsed(true);
    };

    const toggleLock = () => {
        editorEngine.isLayersPanelLocked = !isLocked;
    };

    return (
        <div
            className={cn(
                'flex h-full shrink-0',
                editorEngine.mode === EditorMode.PREVIEW ? 'hidden' : '',
            )}
        >
            <aside className="flex w-16 shrink-0 flex-col items-center border-r border-border bg-background py-2">
                <div className="flex w-full flex-col items-center gap-1 px-1">
                    {PANEL_TABS.map(({ value, icon: Icon, label }) => {
                        const active = activeTab === value;
                        return (
                            <Button
                                variant="ghost"
                                size="icon"
                                key={value}
                                aria-label={t(label)}
                                aria-pressed={active}
                                className={cn(
                                    'relative flex h-[52px] w-[52px] flex-col items-center justify-center gap-1 rounded-xl px-0 text-[10px] leading-tight transition-colors active:scale-100',
                                    active
                                        ? 'bg-background-active text-foreground'
                                        : 'text-foreground-tertiary hover:bg-background-hover hover:text-foreground',
                                )}
                                onClick={() => handleClick(value)}
                                onMouseEnter={() => handleMouseEnter(value)}
                            >
                                <HugeiconsIcon icon={Icon} size={17} strokeWidth={1.7} />
                                <span className="max-w-full truncate px-1">{t(label)}</span>
                            </Button>
                        );
                    })}
                </div>

                <div className="mt-auto flex flex-col items-center gap-1 border-t border-border/70 pt-2">
                    <OpenCodeMini />
                    <ZoomControls />
                    <HelpDropdown />
                </div>
            </aside>

            {!collapsed && (
                <div
                    className={cn(
                        'flex h-full shrink-0 flex-col border-r border-border/80 bg-surface',
                        activeTab === LayersPanelTabValue.AGENTS ? 'w-[344px]' : 'w-[288px]',
                    )}
                >
                    {activeTab !== LayersPanelTabValue.AGENTS && (
                        <div className="flex h-12 shrink-0 items-center justify-between gap-2 border-b border-border/80 px-3.5">
                            <span className="flex min-w-0 items-center gap-2 truncate text-[12px] font-semibold tracking-tight text-foreground">
                                <HugeiconsIcon
                                    icon={activeTabMeta.icon}
                                    size={16}
                                    className="shrink-0 text-foreground-tertiary"
                                    strokeWidth={1.7}
                                />
                                {t(activeTabMeta.label)}
                            </span>
                            <div className="flex items-center gap-0.5">
                                <Tooltip>
                                    <TooltipTrigger asChild>
                                        <Button
                                            variant="ghost"
                                            size="icon-sm"
                                            aria-label={isLocked ? 'Unpin panel' : 'Pin panel'}
                                            className={cn(
                                                'h-6 w-6 rounded-md p-0 transition-colors',
                                                isLocked
                                                    ? 'text-foreground-secondary hover:bg-background-hover hover:text-foreground'
                                                    : 'text-foreground-quadranary hover:bg-background-hover hover:text-foreground',
                                            )}
                                            onClick={toggleLock}
                                        >
                                            {isLocked ? (
                                                <HugeiconsIcon icon={PinIcon} size={14} />
                                            ) : (
                                                <HugeiconsIcon icon={PinOffIcon} size={14} />
                                            )}
                                        </Button>
                                    </TooltipTrigger>
                                    <TooltipContent side="bottom">
                                        {isLocked ? 'Unpin panel' : 'Pin panel'}
                                    </TooltipContent>
                                </Tooltip>
                                <Tooltip>
                                    <TooltipTrigger asChild>
                                        <Button
                                            variant="ghost"
                                            size="icon-sm"
                                            aria-label="Collapse panel"
                                            className="h-6 w-6 rounded-md p-0 text-foreground-quadranary transition-colors hover:bg-background-hover hover:text-foreground"
                                            onClick={collapsePanel}
                                        >
                                            <HugeiconsIcon icon={PanelLeftIcon} size={14} />
                                        </Button>
                                    </TooltipTrigger>
                                    <TooltipContent side="bottom">Collapse panel</TooltipContent>
                                </Tooltip>
                            </div>
                        </div>
                    )}

                    <div
                        className={cn(
                            'min-h-0 flex-1',
                            activeTab === LayersPanelTabValue.AGENTS
                                ? 'overflow-hidden'
                                : 'overflow-y-auto overflow-x-hidden',
                        )}
                    >
                        {activeTab === LayersPanelTabValue.AGENTS && <AgentsTab />}
                        {activeTab === LayersPanelTabValue.LAYERS && <LayersTab />}
                        {activeTab === LayersPanelTabValue.COMPONENTS && <ComponentsTab />}
                        {activeTab === LayersPanelTabValue.ICONS && <IconsTab />}
                        {activeTab === LayersPanelTabValue.PAGES && (
                            <div className="flex h-full min-h-0 flex-col">
                                <div className="h-[38%] min-h-[220px] border-b border-border/80">
                                    <PagesTab />
                                </div>
                                <div className="flex min-h-0 flex-1 flex-col">
                                    <div className="flex h-10 shrink-0 items-center justify-between px-3.5">
                                        <span className="text-[11px] font-semibold text-foreground-secondary">
                                            Layers
                                        </span>
                                    </div>
                                    <div className="min-h-0 flex-1">
                                        <LayersTab />
                                    </div>
                                </div>
                            </div>
                        )}
                        {activeTab === LayersPanelTabValue.IMAGES && <ImagesTab />}
                        {activeTab === LayersPanelTabValue.WINDOWS && <WindowsTab />}
                        {activeTab === LayersPanelTabValue.BRAND && <BrandTab />}
                        {activeTab === LayersPanelTabValue.APPS && <AppsTab />}
                    </div>
                </div>
            )}
        </div>
    );
});
