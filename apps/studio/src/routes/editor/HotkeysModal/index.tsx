import { useEditorEngine } from '@/components/Context';
import { Button } from '@kumite/ui/button';
import { Icons } from '@kumite/ui/icons';
import { Kbd } from '@kumite/ui/kbd';
import { Separator } from '@kumite/ui/separator';
import { AnimatePresence, motion } from 'framer-motion';
import { observer } from 'mobx-react-lite';
import { Hotkey } from '/common/hotkeys';

enum HotkeyCategory {
    Tools = 'Tools',
    AI = 'AI',
    View = 'View',
    Edit = 'Edit',
    Layers = 'Layers',
    System = 'System',
}

const categories: Record<HotkeyCategory, Hotkey[]> = {
    [HotkeyCategory.Tools]: [
        Hotkey.SELECT,
        Hotkey.PAN,
        Hotkey.PREVIEW,
        Hotkey.INSERT_DIV,
        Hotkey.INSERT_TEXT,
    ],
    [HotkeyCategory.AI]: [Hotkey.ADD_AI_CHAT, Hotkey.NEW_AI_CHAT],
    [HotkeyCategory.View]: [Hotkey.ZOOM_FIT, Hotkey.ZOOM_IN, Hotkey.ZOOM_OUT],
    [HotkeyCategory.Edit]: [
        Hotkey.UNDO,
        Hotkey.REDO,
        Hotkey.ENTER,
        Hotkey.COPY,
        Hotkey.PASTE,
        Hotkey.CUT,
        Hotkey.DUPLICATE,
        Hotkey.BACKSPACE,
    ],
    [HotkeyCategory.Layers]: [
        Hotkey.GROUP,
        Hotkey.UNGROUP,
        Hotkey.MOVE_LAYER_UP,
        Hotkey.MOVE_LAYER_DOWN,
    ],
    [HotkeyCategory.System]: [Hotkey.RELOAD_APP, Hotkey.OPEN_DEV_TOOL, Hotkey.SHOW_HOTKEYS],
};

const columns: HotkeyCategory[][] = [
    [HotkeyCategory.AI, HotkeyCategory.Edit],
    [HotkeyCategory.Layers, HotkeyCategory.View],
    [HotkeyCategory.Tools, HotkeyCategory.System],
];

const HotkeyRow = ({ hotkey }: { hotkey: Hotkey }) => (
    <div className="flex justify-between items-center">
        <span className="text-sm text-popover-foreground">{hotkey.description}</span>
        <div className="flex items-center gap-1">
            {hotkey.readableCommand.split(' ').map((key: string) => (
                <Kbd
                    key={`${hotkey.command}-${key}`}
                    className="h-6 px-2 text-[12px] bg-muted/50 text-popover-foreground border-border"
                >
                    {key}
                </Kbd>
            ))}
        </div>
    </div>
);

const HotkeyGroup = ({ category }: { category: HotkeyCategory }) => (
    <div>
        <h3 className="text-base font-medium text-muted-foreground mb-4">{category}</h3>
        <div className="space-y-3">
            {categories[category].map((hotkey) => (
                <HotkeyRow key={hotkey.command} hotkey={hotkey} />
            ))}
        </div>
    </div>
);

export const HotkeysModal = observer(() => {
    const editorEngine = useEditorEngine();

    return (
        <AnimatePresence>
            {editorEngine.isHotkeysOpen && (
                <>
                    {/* Backdrop */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50"
                        onClick={() => (editorEngine.isHotkeysOpen = false)}
                    />

                    {/* Modal */}
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        transition={{ duration: 0.15 }}
                        className="fixed inset-0 z-50 flex items-center justify-center pointer-events-none"
                    >
                        <div className="bg-background border rounded-lg shadow-lg w-[900px] p-0 pointer-events-auto">
                            <div className="flex flex-col">
                                {/* Header */}
                                <div className="flex items-center p-6 pb-2">
                                    <h1 className="text-title3">Keyboard shortcuts</h1>
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className="ml-auto"
                                        onClick={() => (editorEngine.isHotkeysOpen = false)}
                                    >
                                        <Icons.CrossS className="h-4 w-4" />
                                    </Button>
                                </div>
                                <Separator />

                                {/* Content */}
                                <div className="p-6 pt-2">
                                    <div className="grid grid-cols-3 gap-12">
                                        {columns.map((column, index) => (
                                            <div key={index} className="space-y-8">
                                                {column.map((category) => (
                                                    <HotkeyGroup
                                                        key={category}
                                                        category={category}
                                                    />
                                                ))}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
});
