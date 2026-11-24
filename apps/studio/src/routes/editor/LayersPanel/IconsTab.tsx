import { useEditorEngine } from '@/components/Context';
import { toast } from '@kumite/ui/use-toast';
import { DynamicIcon, dynamicIconImports, iconNames, type IconName } from 'lucide-react/dynamic';
import { Search } from 'lucide-react';
import { observer } from 'mobx-react-lite';
import { useMemo, useState } from 'react';

// Each rendered icon is its own dynamic import; cap the grid so opening the
// panel does not fire a request per icon in the library.
const RESULT_LIMIT = 120;

const IconsTab = observer(() => {
    const editorEngine = useEditorEngine();
    const [query, setQuery] = useState('');
    const [inserting, setInserting] = useState<IconName | null>(null);
    const hasSelection = editorEngine.elements.selected.length > 0;

    const results = useMemo(() => {
        const normalized = query.trim().toLowerCase();
        const matches = normalized
            ? iconNames.filter((name) => name.includes(normalized))
            : iconNames;
        return matches.slice(0, RESULT_LIMIT);
    }, [query]);

    const insertIcon = async (name: IconName) => {
        const selected = editorEngine.elements.selected[0];
        if (!selected) {
            toast({
                title: 'Select an element first',
                description: 'Choose where the icon should go in your design, then pick an icon.',
                variant: 'destructive',
            });
            return;
        }
        const webview = editorEngine.webviews.getWebview(selected.webviewId);
        if (!webview) {
            toast({
                title: 'Could not add icon',
                description: 'The selected window is not available.',
                variant: 'destructive',
            });
            return;
        }
        setInserting(name);
        try {
            const module = await dynamicIconImports[name]();
            if (!module.__iconData) {
                throw new Error('Icon data is unavailable.');
            }
            editorEngine.insert.insertSvgIcon(
                webview,
                { domId: selected.domId, oid: selected.oid },
                module.__iconData,
            );
            toast({
                title: 'Icon added',
                description: `“${name}” was inserted inside the selected element.`,
            });
        } catch (error) {
            toast({
                title: 'Could not add icon',
                description: error instanceof Error ? error.message : 'Unknown error.',
                variant: 'destructive',
            });
        } finally {
            setInserting(null);
        }
    };

    return (
        <div className="flex h-full w-full flex-col">
            <div className="border-b px-3 py-3">
                <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Icons
                </div>
                <div className="mt-0.5 text-[11px] text-muted-foreground">
                    Click an icon to add it inside the selected element
                </div>
            </div>

            <div className="border-b p-3">
                <div className="relative">
                    <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                    <input
                        value={query}
                        onChange={(event) => setQuery(event.target.value)}
                        placeholder="Search icons…"
                        className="h-8 w-full rounded-md border border-border bg-background pl-8 pr-2 text-xs text-foreground outline-none placeholder:text-muted-foreground focus:border-foreground-tertiary"
                    />
                </div>
                {!hasSelection && (
                    <p className="mt-2 text-[11px] leading-4 text-muted-foreground">
                        Select an element in a frame first. Icons are inserted inside the selection.
                    </p>
                )}
            </div>

            <div className="min-h-0 flex-1 overflow-auto p-2">
                <div className="grid grid-cols-5 gap-1">
                    {results.map((name) => (
                        <button
                            key={name}
                            type="button"
                            title={name}
                            disabled={inserting === name}
                            onClick={() => void insertIcon(name)}
                            className="flex h-11 items-center justify-center rounded-lg text-foreground transition-colors hover:bg-background-hover disabled:opacity-50"
                        >
                            <DynamicIcon name={name} size={18} strokeWidth={1.8} />
                        </button>
                    ))}
                </div>
                {results.length === 0 && (
                    <div className="px-1 py-6 text-center text-xs text-muted-foreground">
                        No icons match “{query}”.
                    </div>
                )}
            </div>

            <div className="border-t px-3 py-2 text-[10px] text-muted-foreground">
                {query.trim()
                    ? `${results.length} match${results.length === 1 ? '' : 'es'}`
                    : `${results.length} of ${iconNames.length} icons`}
                {results.length === RESULT_LIMIT && ' · refine your search to see more'}
            </div>
        </div>
    );
});

export default IconsTab;
