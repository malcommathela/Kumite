import { useEditorEngine } from '@/components/Context';
import { HotKeyLabel } from '@/components/ui/hotkeys-label';
import { EditorMode } from '@/lib/models';
import type { DropElementProperties } from '@kumite/models/element';
import { Button } from '@kumite/ui/button';
import { ToggleGroup, ToggleGroupItem } from '@kumite/ui/toggle-group';
import { Tooltip, TooltipContent, TooltipTrigger } from '@kumite/ui/tooltip';
import { cn } from '@kumite/ui/utils';
import {
    Cancel01Icon,
    Cursor01Icon,
    HandGrabIcon,
    SquareIcon,
    TerminalIcon,
    TextIcon,
} from '@hugeicons/core-free-icons';
import { HugeiconsIcon } from '@hugeicons/react';
import { observer } from 'mobx-react-lite';
import { AnimatePresence, motion } from 'motion/react';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import Terminal from './Terminal';
import RunButton from './Terminal/RunButton';
import { Hotkey } from '/common/hotkeys';

const TOOLBAR_ITEMS = ({ t }: { t: (key: string) => string }) => [
    {
        mode: EditorMode.DESIGN,
        icon: Cursor01Icon,
        hotkey: Hotkey.SELECT,
        draggable: false,
        label: t('editor.toolbar.tools.select.name'),
    },
    {
        mode: EditorMode.PAN,
        icon: HandGrabIcon,
        hotkey: Hotkey.PAN,
        draggable: false,
        label: t('editor.toolbar.tools.pan.name'),
    },
    {
        mode: EditorMode.INSERT_DIV,
        icon: SquareIcon,
        hotkey: Hotkey.INSERT_DIV,
        draggable: true,
        label: t('editor.toolbar.tools.insertDiv.name'),
    },
    {
        mode: EditorMode.INSERT_TEXT,
        icon: TextIcon,
        hotkey: Hotkey.INSERT_TEXT,
        draggable: true,
        label: t('editor.toolbar.tools.insertText.name'),
    },
];

export const Toolbar = observer(() => {
    const { t } = useTranslation();
    const editorEngine = useEditorEngine();
    const [mode, setMode] = useState<EditorMode>(editorEngine.mode);
    const [terminalOpen, setTerminalOpen] = useState(false);

    useEffect(() => {
        setMode(editorEngine.mode);
    }, [editorEngine.mode]);

    const createDragPreview = (properties: DropElementProperties): HTMLElement => {
        const preview = document.createElement('div');
        Object.assign(preview.style, {
            width: '100px',
            height: '100px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            ...properties.styles,
        });

        if (properties.textContent) {
            preview.textContent = properties.textContent;
        }

        return preview;
    };

    const handleDragStart = (e: React.DragEvent<HTMLDivElement>, itemMode: EditorMode) => {
        const properties = editorEngine.insert.getDefaultProperties(itemMode);

        e.dataTransfer.setData('text/plain', itemMode);
        e.dataTransfer.setData('application/json', JSON.stringify(properties));
        e.dataTransfer.effectAllowed = 'copy';
        editorEngine.mode = itemMode;

        for (const webview of editorEngine.webviews.webviews.values()) {
            webview.webview.style.pointerEvents = 'none';
        }

        const dragPreview = createDragPreview(properties);
        document.body.appendChild(dragPreview);
        e.dataTransfer.setDragImage(dragPreview, 50, 50);
        setTimeout(() => document.body.removeChild(dragPreview), 0);
    };

    const items = TOOLBAR_ITEMS({ t });

    return (
        <AnimatePresence mode="wait">
            {editorEngine.mode !== EditorMode.PREVIEW && (
                <motion.div
                    initial={{ opacity: 0, y: 12, scale: 0.98 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 12, scale: 0.98 }}
                    transition={{ type: 'spring', bounce: 0.12, duration: 0.3 }}
                    className="relative flex flex-col rounded-2xl border border-border/80 bg-surface/95 p-1.5 shadow-2xl shadow-black/25 backdrop-blur-2xl"
                >
                    <AnimatePresence>
                        {terminalOpen && (
                            <motion.div
                                initial={{ opacity: 0, y: 8, scale: 0.98 }}
                                animate={{ opacity: 1, y: 0, scale: 1 }}
                                exit={{ opacity: 0, y: 8, scale: 0.98 }}
                                transition={{ duration: 0.18 }}
                                className="absolute bottom-full left-1/2 z-30 mb-2 -translate-x-1/2 overflow-hidden rounded-2xl border border-border bg-surface shadow-2xl"
                            >
                                <div className="flex h-11 items-center justify-between border-b border-border px-3">
                                    <div className="flex items-center gap-2 text-[12px] font-medium text-foreground">
                                        <HugeiconsIcon
                                            icon={TerminalIcon}
                                            size={16}
                                            className="text-foreground-tertiary"
                                        />
                                        Terminal
                                    </div>
                                    <Button
                                        variant="ghost"
                                        size="icon-sm"
                                        aria-label="Close terminal"
                                        className="text-foreground-tertiary"
                                        onClick={() => setTerminalOpen(false)}
                                    >
                                        <HugeiconsIcon icon={Cancel01Icon} size={16} />
                                    </Button>
                                </div>
                                <Terminal />
                            </motion.div>
                        )}
                    </AnimatePresence>

                    <div className="flex h-11 items-center gap-1">
                        <ToggleGroup
                            type="single"
                            value={mode}
                            aria-label="Canvas tools"
                            onValueChange={(value) => {
                                if (value) {
                                    editorEngine.mode = value as EditorMode;
                                    setMode(value as EditorMode);
                                }
                            }}
                            className="gap-0.5"
                        >
                            {items.map((item, index) => (
                                <div
                                    key={item.mode}
                                    draggable={item.draggable}
                                    onDragStart={(event) => handleDragStart(event, item.mode)}
                                    className={cn(
                                        index === 2 && 'ml-1.5 border-l border-border pl-1.5',
                                    )}
                                >
                                    <Tooltip>
                                        <TooltipTrigger asChild>
                                            <ToggleGroupItem
                                                value={item.mode}
                                                aria-label={item.label}
                                                className="h-9 w-9 rounded-xl text-foreground-tertiary transition-colors hover:bg-background-hover hover:text-foreground data-[state=on]:bg-background-active data-[state=on]:text-foreground"
                                            >
                                                <HugeiconsIcon
                                                    icon={item.icon}
                                                    size={17}
                                                    strokeWidth={1.7}
                                                />
                                            </ToggleGroupItem>
                                        </TooltipTrigger>
                                        <TooltipContent side="top" className="space-y-1">
                                            <p>{item.label}</p>
                                            <HotKeyLabel
                                                hotkey={item.hotkey}
                                                showDescription={false}
                                            />
                                        </TooltipContent>
                                    </Tooltip>
                                </div>
                            ))}
                        </ToggleGroup>

                        <div className="mx-1.5 h-6 w-px bg-border/80" />

                        <div className="flex items-center rounded-xl border border-border/70 bg-background/50 px-1">
                            <RunButton />
                        </div>

                        <Tooltip>
                            <TooltipTrigger asChild>
                                <Button
                                    variant={terminalOpen ? 'secondary' : 'ghost'}
                                    size="icon"
                                    aria-label={terminalOpen ? 'Hide terminal' : 'Show terminal'}
                                    aria-pressed={terminalOpen}
                                    className="h-9 w-9 rounded-xl text-foreground-tertiary hover:text-foreground"
                                    onClick={() => setTerminalOpen((open) => !open)}
                                >
                                    <HugeiconsIcon
                                        icon={TerminalIcon}
                                        size={17}
                                        strokeWidth={1.7}
                                    />
                                </Button>
                            </TooltipTrigger>
                            <TooltipContent side="top">
                                {terminalOpen ? 'Hide terminal' : 'Show terminal'}
                            </TooltipContent>
                        </Tooltip>
                    </div>
                </motion.div>
            )}
        </AnimatePresence>
    );
});
