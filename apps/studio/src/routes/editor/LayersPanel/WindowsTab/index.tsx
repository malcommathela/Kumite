import { useEditorEngine } from '@/components/Context';
import { SIZE_PRESETS } from '@/lib/sizePresets';
import { Button } from '@kumite/ui/button';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@kumite/ui/dropdown-menu';
import { Icons } from '@kumite/ui/icons';
import { Input } from '@kumite/ui/input';
import { Separator } from '@kumite/ui/separator';
import { cn } from '@kumite/ui/utils';
import { observer } from 'mobx-react-lite';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import DeviceSettings from './DeviceSettings';
import FrameDimensions from './FrameDimensions';

function getRoute(url: string) {
    try {
        return new URL(url).pathname;
    } catch (error) {
        return url;
    }
}

const WindowsTab = observer(() => {
    const editorEngine = useEditorEngine();
    const { t } = useTranslation();
    const frames = editorEngine.canvas.frames;
    const activeFrameId = editorEngine.canvas.activeFrameId;
    const settings = activeFrameId ? editorEngine.canvas.getFrame(activeFrameId) : null;
    const [route, setRoute] = useState(settings ? getRoute(settings.url) : '/');

    useEffect(() => {
        setRoute(settings ? getRoute(settings.url) : '/');
    }, [settings?.id, settings?.url]);

    const WIDTH = 'w-[275px]';

    function changeRoute() {
        if (!settings) {
            return;
        }
        try {
            const origin = new URL(settings.url).origin;
            const path = route.startsWith('/') ? route : `/${route}`;
            editorEngine.canvas.saveFrame(settings.id, { url: `${origin}${path}` });
        } catch (error) {
            console.error('Invalid frame URL', error);
        }
    }

    return (
        <div className={`${WIDTH} flex flex-col gap-3 p-4`}>
            <div className="flex flex-col gap-2">
                <div className="flex flex-row items-center justify-between">
                    <p className="text-smallPlus text-foreground-primary">Frames</p>
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button
                                variant={'outline'}
                                className="h-fit py-1 px-2 text-foreground-tertiary"
                            >
                                <Icons.Plus className="mr-1 h-3 w-3" />
                                <span className="text-xs">New</span>
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent className="rounded-md bg-background">
                            {SIZE_PRESETS.map((preset) => (
                                <DropdownMenuItem
                                    key={preset.name}
                                    className="text-xs cursor-pointer"
                                    onClick={() => editorEngine.createWindow(preset)}
                                >
                                    {preset.name} ({preset.width}×{preset.height})
                                </DropdownMenuItem>
                            ))}
                        </DropdownMenuContent>
                    </DropdownMenu>
                </div>
                <div className="flex flex-col gap-1">
                    {frames.map((frame) => (
                        <button
                            key={frame.id}
                            className={cn(
                                'flex flex-row items-center justify-between gap-2 rounded px-2 py-1.5 text-left',
                                frame.id === activeFrameId
                                    ? 'bg-background-tertiary'
                                    : 'hover:bg-background-secondary',
                            )}
                            onClick={() => editorEngine.selectFrame(frame.id)}
                        >
                            <span className="text-xs truncate">{getRoute(frame.url)}</span>
                            <span className="text-[10px] text-foreground-secondary whitespace-nowrap">
                                {frame.dimension.width}×{frame.dimension.height}
                            </span>
                        </button>
                    ))}
                </div>
            </div>

            {settings ? (
                <>
                    <Separator />
                    <div className="flex flex-col gap-1">
                        <p className="text-smallPlus text-foreground-primary">Route</p>
                        <Input
                            className="h-8 text-xs rounded border-none bg-background-secondary focus:ring-0"
                            value={route}
                            onChange={(e) => setRoute(e.target.value)}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                    e.currentTarget.blur();
                                    changeRoute();
                                }
                            }}
                            onBlur={changeRoute}
                        />
                    </div>
                    <div className="flex flex-row gap-1">
                        <Button
                            variant={'outline'}
                            className="h-fit py-1.5 px-2.5 text-foreground-tertiary w-full items-center"
                            onClick={() => editorEngine.duplicateWindow(settings.id)}
                        >
                            <Icons.Copy className="mr-2" />
                            <span className="text-xs">Duplicate</span>
                        </Button>
                        <Button
                            variant={'outline'}
                            className="h-fit py-1.5 px-2.5 text-foreground-tertiary w-full items-center"
                            disabled={!editorEngine.canDeleteWindow()}
                            onClick={() => editorEngine.deleteWindow(settings.id)}
                        >
                            <Icons.Trash className="mr-2" />
                            <span className="text-xs">Delete</span>
                        </Button>
                    </div>
                    <FrameDimensions settings={settings} />
                    <Separator />
                    <DeviceSettings settings={settings} />
                </>
            ) : (
                <p className="text-center text-sm text-foreground-secondary">
                    {t('editor.panels.layers.tabs.windows.emptyState')}
                </p>
            )}
        </div>
    );
});

export default WindowsTab;
