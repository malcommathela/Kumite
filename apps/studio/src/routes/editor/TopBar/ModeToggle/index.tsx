import { useEditorEngine } from '@/components/Context';
import { HotKeyLabel } from '@/components/ui/hotkeys-label';
import { EditorMode } from '@/lib/models';
import { Tooltip, TooltipContent, TooltipTrigger } from '@kumite/ui/tooltip';
import { cn } from '@kumite/ui/utils';
import { observer } from 'mobx-react-lite';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Hotkey } from '/common/hotkeys';

const ModeToggle = observer(() => {
    const { t } = useTranslation();
    const MODE_TOGGLE_ITEMS: {
        mode: EditorMode;
        hotkey: Hotkey;
    }[] = [
        {
            mode: EditorMode.DESIGN,
            hotkey: Hotkey.SELECT,
        },
        {
            mode: EditorMode.PREVIEW,
            hotkey: Hotkey.PREVIEW,
        },
    ];

    const editorEngine = useEditorEngine();
    const [mode, setMode] = useState<EditorMode>(makeDesignMode(editorEngine.mode));

    useEffect(() => {
        setMode(makeDesignMode(editorEngine.mode));
    }, [editorEngine.mode]);

    function makeDesignMode(mode: EditorMode) {
        return mode === EditorMode.PREVIEW ? EditorMode.PREVIEW : EditorMode.DESIGN;
    }

    return (
        <div className="flex items-center gap-0.5 rounded-lg border border-border bg-surface/70 p-0.5">
            {MODE_TOGGLE_ITEMS.map((item) => (
                <Tooltip key={item.mode}>
                    <TooltipTrigger asChild>
                        <button
                            onClick={() => {
                                editorEngine.mode = item.mode;
                                setMode(item.mode);
                            }}
                            className={cn(
                                'h-7 whitespace-nowrap rounded-md px-3.5 text-[12px] transition-colors',
                                mode === item.mode
                                    ? 'bg-background-active text-foreground'
                                    : 'text-foreground-tertiary hover:text-foreground',
                            )}
                        >
                            {t(`editor.modes.${item.mode.toLowerCase()}.name`)}
                        </button>
                    </TooltipTrigger>
                    <TooltipContent side="bottom">
                        <HotKeyLabel hotkey={item.hotkey} />
                    </TooltipContent>
                </Tooltip>
            ))}
        </div>
    );
});

export default ModeToggle;
