import { useEditorEngine } from '@/components/Context';
import { EditorMode, LayersPanelTabValue } from '@/lib/models';
import { Tooltip, TooltipContent, TooltipTrigger } from '@kumite/ui/tooltip';
import { cn } from '@kumite/ui/utils';
import {
    FileText,
    Image,
    Layers,
    LayoutGrid,
    Monitor,
    Palette,
    PanelLeftClose,
    Pin,
    PinOff,
    Shapes,
    type LucideIcon,
} from 'lucide-react';
import { observer } from 'mobx-react-lite';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import AppsTab from './AppsTab';
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
    icon: LucideIcon;
    label: string;
}

const PANEL_TABS: PanelTab[] = [
    { value: LayersPanelTabValue.LAYERS, icon: Layers, label: 'editor.panels.layers.tabs.layers' },
    { value: LayersPanelTabValue.PAGES, icon: FileText, label: 'editor.panels.layers.tabs.pages' },
    { value: LayersPanelTabValue.IMAGES, icon: Image, label: 'editor.panels.layers.tabs.images' },
    {
        value: LayersPanelTabValue.WINDOWS,
        icon: Monitor,
        label: 'editor.panels.layers.tabs.windows.name',
    },
    { value: LayersPanelTabValue.BRAND, icon: Palette, label: 'editor.panels.layers.tabs.brand' },
    {
        value: LayersPanelTabValue.COMPONENTS,
        icon: LayoutGrid,
        label: 'editor.panels.layers.tabs.components',
    },
    { value: LayersPanelTabValue.ICONS, icon: Shapes, label: 'editor.panels.layers.tabs.icons' },
];

export const LayersPanel = observer(() => {
    const editorEngine = useEditorEngine();
    const { t } = useTranslation();
    const [collapsed, setCollapsed] = useState(false);
    const isLocked = editorEngine.isLayersPanelLocked;
    const selectedTab = editorEngine.layersPanelTab;
    const activeTab = selectedTab ?? LayersPanelTabValue.LAYERS;
    const activeTabMeta = PANEL_TABS.find((tab) => tab.value === activeTab) ?? PANEL_TABS[0];

    const handleMouseEnter = (tab: LayersPanelTabValue) => {
        if (isLocked || collapsed) {
            return;
        }
        editorEngine.layersPanelTab = tab;
    };

    const handleClick = (tab: LayersPanelTabValue) => {
        setCollapsed(false);
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
                <div className="flex w-full flex-col items-center gap-0.5">
                    {PANEL_TABS.map(({ value, icon: Icon, label }) => {
                        const active = activeTab === value;
                        return (
                            <button
                                key={value}
                                aria-label={t(label)}
                                className={cn(
                                    'flex h-[52px] w-[52px] flex-col items-center justify-center gap-1 rounded-lg text-[10px] leading-tight transition-colors',
                                    active
                                        ? 'bg-background-active text-foreground'
                                        : 'text-foreground-tertiary hover:bg-background-hover hover:text-foreground',
                                )}
                                onClick={() => handleClick(value)}
                                onMouseEnter={() => handleMouseEnter(value)}
                            >
                                <Icon className="h-[17px] w-[17px]" strokeWidth={1.7} />
                                <span className="max-w-full truncate px-1">{t(label)}</span>
                            </button>
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
                <div className="flex h-full w-[288px] shrink-0 flex-col border-r border-border bg-surface">
                    <div className="flex h-12 shrink-0 items-center justify-between gap-2 border-b border-border px-3">
                        <span className="truncate text-[12px] font-medium text-foreground">
                            {t(activeTabMeta.label)}
                        </span>
                        <div className="flex items-center gap-0.5">
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <button
                                        aria-label={isLocked ? 'Unpin panel' : 'Pin panel'}
                                        className={cn(
                                            'flex h-6 w-6 items-center justify-center rounded-md transition-colors',
                                            isLocked
                                                ? 'text-foreground-secondary hover:bg-background-hover hover:text-foreground'
                                                : 'text-foreground-quadranary hover:bg-background-hover hover:text-foreground',
                                        )}
                                        onClick={toggleLock}
                                    >
                                        {isLocked ? (
                                            <Pin className="h-3.5 w-3.5" />
                                        ) : (
                                            <PinOff className="h-3.5 w-3.5" />
                                        )}
                                    </button>
                                </TooltipTrigger>
                                <TooltipContent side="bottom">
                                    {isLocked ? 'Unpin panel' : 'Pin panel'}
                                </TooltipContent>
                            </Tooltip>
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <button
                                        aria-label="Collapse panel"
                                        className="flex h-6 w-6 items-center justify-center rounded-md text-foreground-quadranary transition-colors hover:bg-background-hover hover:text-foreground"
                                        onClick={collapsePanel}
                                    >
                                        <PanelLeftClose className="h-3.5 w-3.5" />
                                    </button>
                                </TooltipTrigger>
                                <TooltipContent side="bottom">Collapse panel</TooltipContent>
                            </Tooltip>
                        </div>
                    </div>

                    <div className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden">
                        {activeTab === LayersPanelTabValue.LAYERS && <LayersTab />}
                        {activeTab === LayersPanelTabValue.COMPONENTS && <ComponentsTab />}
                        {activeTab === LayersPanelTabValue.ICONS && <IconsTab />}
                        {activeTab === LayersPanelTabValue.PAGES && <PagesTab />}
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
