import { useEditorEngine } from '@/components/Context';
import { EditorMode, LayersPanelTabValue } from '@/lib/models';
import { cn } from '@kumite/ui/utils';
import {
    FileText,
    Image,
    Layers,
    LayoutGrid,
    Monitor,
    Palette,
    Shapes,
    type LucideIcon,
} from 'lucide-react';
import { observer } from 'mobx-react-lite';
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
    const isLocked = editorEngine.isLayersPanelLocked;
    const selectedTab = editorEngine.layersPanelTab;

    const handleMouseEnter = (tab: LayersPanelTabValue) => {
        if (isLocked) {
            return;
        }
        editorEngine.layersPanelTab = tab;
    };

    const isMouseInContentPanel = (e: React.MouseEvent<HTMLDivElement>): boolean => {
        const mouseX = e.clientX;
        const mouseY = e.clientY;
        const contentPanel = e.currentTarget;
        if (contentPanel) {
            const { left, right, top, bottom } = contentPanel.getBoundingClientRect();
            if (mouseX < left || mouseX > right || mouseY < top || mouseY > bottom) {
                return false;
            }
        }
        return true;
    };

    const handleMouseLeave = (e: React.MouseEvent<HTMLDivElement>) => {
        if (!isLocked) {
            // This is to handle things like dropdown where the mouse is still in the content panel
            if (!isMouseInContentPanel(e)) {
                editorEngine.layersPanelTab = null;
            }
        } else {
            // If we're locked, return to the locked tab when mouse leaves
            editorEngine.layersPanelTab = selectedTab;
        }
    };

    const handleClick = (tab: LayersPanelTabValue) => {
        if (selectedTab === tab && isLocked) {
            editorEngine.isLayersPanelLocked = false;
        } else {
            editorEngine.layersPanelTab = tab;
            editorEngine.isLayersPanelLocked = true;
        }
    };

    return (
        <div
            className={cn(
                'flex h-full gap-2 p-2',
                editorEngine.mode === EditorMode.PREVIEW ? 'hidden' : 'visible',
            )}
            onMouseLeave={handleMouseLeave}
        >
            {/* Left rail with tabs */}
            <div className="flex w-16 flex-col items-center gap-1 rounded-2xl border border-border bg-surface/90 py-2 backdrop-blur-xl">
                {PANEL_TABS.map(({ value, icon: Icon, label }) => {
                    const active = selectedTab === value && isLocked;
                    return (
                        <button
                            key={value}
                            className={cn(
                                'flex h-14 w-14 flex-col items-center justify-center gap-1 rounded-xl text-[10px] leading-tight transition-colors',
                                active
                                    ? 'bg-background-active text-foreground'
                                    : 'text-foreground-tertiary hover:bg-background-hover hover:text-foreground',
                            )}
                            onClick={() => handleClick(value)}
                            onMouseEnter={() => handleMouseEnter(value)}
                        >
                            <Icon className="h-[18px] w-[18px]" strokeWidth={1.6} />
                            <span className="max-w-full truncate px-1">{t(label)}</span>
                        </button>
                    );
                })}

                <div className="mt-auto flex flex-col items-center gap-1">
                    <OpenCodeMini />
                    <ZoomControls />
                    <HelpDropdown />
                </div>
            </div>

            {/* Content panel */}
            {editorEngine.layersPanelTab && (
                <>
                    <div className="w-[300px] overflow-hidden rounded-2xl border border-border bg-surface shadow-xl">
                        <div className="h-full overflow-auto">
                            {selectedTab === LayersPanelTabValue.LAYERS && <LayersTab />}
                            {selectedTab === LayersPanelTabValue.COMPONENTS && <ComponentsTab />}
                            {selectedTab === LayersPanelTabValue.ICONS && <IconsTab />}
                            {selectedTab === LayersPanelTabValue.PAGES && <PagesTab />}
                            {selectedTab === LayersPanelTabValue.IMAGES && <ImagesTab />}
                            {selectedTab === LayersPanelTabValue.WINDOWS && <WindowsTab />}
                            {selectedTab === LayersPanelTabValue.BRAND && <BrandTab />}
                            {selectedTab === LayersPanelTabValue.APPS && <AppsTab />}
                        </div>
                    </div>

                    {/* Invisible padding area that maintains hover state */}
                    {!isLocked && <div className="h-full w-16" />}
                </>
            )}
        </div>
    );
});
