import { useEditorEngine } from '@/components/Context';
import { HotKeyLabel } from '@/components/ui/hotkeys-label';
import { SettingsTabValue } from '@/lib/models';
import { Button } from '@kumite/ui/button';
import { Icons } from '@kumite/ui/icons';
import { Tooltip, TooltipContent, TooltipTrigger } from '@kumite/ui/tooltip';
import { motion } from 'framer-motion';
import { observer } from 'mobx-react-lite';
import { useTranslation } from 'react-i18next';
import ModeToggle from './ModeToggle';
import ProjectBreadcrumb from './ProjectSelect';
import Publish from './Publish';
import { Hotkey } from '/common/hotkeys';

export const EditorTopBar = observer(() => {
    const editorEngine = useEditorEngine();
    const { t } = useTranslation();

    const UNDO_REDO_BUTTONS = [
        {
            click: () => editorEngine.action.undo(),
            hotkey: Hotkey.UNDO,
            icon: <Icons.Reset className="h-4 w-4 mr-1" />,
            isDisabled: !editorEngine.history.canUndo,
        },
        {
            click: () => editorEngine.action.redo(),
            hotkey: Hotkey.REDO,
            icon: <Icons.Reset className="h-4 w-4 mr-1 scale-x-[-1]" />,
            isDisabled: !editorEngine.history.canRedo,
        },
    ];

    return (
        <div className="flex h-12 shrink-0 items-center gap-2 border-b border-border bg-background px-3">
            <div className="flex min-w-0 flex-1 items-center">
                <ProjectBreadcrumb />
            </div>
            <ModeToggle />
            <div className="flex flex-1 items-center justify-end gap-2">
                <div className="flex items-center gap-0.5 rounded-lg border border-border bg-surface/70 p-0.5">
                    <motion.div
                        className="hidden space-x-0 lg:block"
                        layout
                        transition={{
                            type: 'spring',
                            stiffness: 300,
                            damping: 30,
                            delay: 0,
                        }}
                    >
                        {UNDO_REDO_BUTTONS.map(({ click, hotkey, icon, isDisabled }) => (
                            <Tooltip key={hotkey.description}>
                                <TooltipTrigger asChild>
                                    <span>
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            className="h-7 w-7 rounded-md"
                                            onClick={click}
                                            disabled={isDisabled}
                                        >
                                            {icon}
                                        </Button>
                                    </span>
                                </TooltipTrigger>
                                <TooltipContent side="bottom">
                                    <HotKeyLabel hotkey={hotkey} />
                                </TooltipContent>
                            </Tooltip>
                        ))}
                    </motion.div>
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7 rounded-md"
                                onClick={() => {
                                    editorEngine.settingsTab = SettingsTabValue.VERSIONS;
                                    editorEngine.isSettingsOpen = true;
                                }}
                            >
                                <Icons.CounterClockwiseClock className="h-4 w-4" />
                            </Button>
                        </TooltipTrigger>
                        <TooltipContent side="bottom">
                            {t('editor.toolbar.versionHistory')}
                        </TooltipContent>
                    </Tooltip>
                </div>
                <Publish />
            </div>
        </div>
    );
});
