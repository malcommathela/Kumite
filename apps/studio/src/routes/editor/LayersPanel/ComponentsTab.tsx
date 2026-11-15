import { useEditorEngine } from '@/components/Context';
import type { PreviewLifecycleState, ShadcnLibraryItem } from '@kumite/models';
import {
    advancePreviewState,
    isShadcnBlock,
    parsePreviewMessage,
    SHADCN_BLOCKS,
} from '@kumite/models';
import { Button } from '@kumite/ui/button';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from '@kumite/ui/dialog';
import { Icons } from '@kumite/ui/icons';
import { Input } from '@kumite/ui/input';
import { Skeleton } from '@kumite/ui/skeleton';
import { toast } from '@kumite/ui/use-toast';
import { cn } from '@kumite/ui/utils';
import { observer } from 'mobx-react-lite';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

type ProviderId = 'shadcn' | '21st-dev' | 'magic-ui';
type CatalogKind = 'all' | 'components' | 'blocks';

const PROVIDERS: Array<{ id: ProviderId; label: string; available: boolean }> = [
    { id: 'shadcn', label: 'shadcn/ui', available: true },
    { id: '21st-dev', label: '21st.dev', available: false },
    { id: 'magic-ui', label: 'Magic UI', available: false },
];

const CATEGORIES: Record<string, string[]> = {
    Forms: [
        'button',
        'button-group',
        'checkbox',
        'field',
        'form',
        'input',
        'input-group',
        'input-otp',
        'label',
        'radio-group',
        'select',
        'slider',
        'switch',
        'textarea',
        'toggle',
        'toggle-group',
    ],
    Layout: ['aspect-ratio', 'card', 'empty', 'resizable', 'scroll-area', 'separator', 'skeleton'],
    Navigation: ['breadcrumb', 'menubar', 'navigation-menu', 'pagination', 'sidebar', 'tabs'],
    Overlays: [
        'alert-dialog',
        'context-menu',
        'dialog',
        'drawer',
        'dropdown-menu',
        'hover-card',
        'popover',
        'sheet',
        'tooltip',
    ],
    Feedback: ['alert', 'progress', 'sonner', 'spinner', 'toast'],
    Data: ['calendar', 'chart', 'command', 'table'],
};

const CATEGORY_FOR_COMPONENT = new Map(
    Object.entries(CATEGORIES).flatMap(([category, names]) =>
        names.map((name) => [name, category]),
    ),
);
const BLOCK_CATEGORIES = [...new Set(SHADCN_BLOCKS.flatMap((block) => block.categories))].map(
    (category) => category.replace(/^./, (letter) => letter.toUpperCase()),
);

function getCategory(name: string): string {
    return CATEGORY_FOR_COMPONENT.get(name) ?? 'Other';
}

function getItemCategory(item: ShadcnLibraryItem): string {
    return isShadcnBlock(item)
        ? (item.categories[0]?.replace(/^./, (letter) => letter.toUpperCase()) ?? 'Blocks')
        : getCategory(item.name);
}

function getImportCode(item: ShadcnLibraryItem): string {
    return item.imports
        .map((moduleImport) => {
            const named = moduleImport.namedImports?.length
                ? `{ ${moduleImport.namedImports.join(', ')} }`
                : '';
            const clause = [moduleImport.defaultImport, named].filter(Boolean).join(', ');
            return `import ${clause} from "${moduleImport.source}";`;
        })
        .join('\n');
}

type ShimmerShape = 'avatar' | 'pills' | 'field' | 'panel' | 'rows' | 'bars' | 'grid' | 'lines';

const FIELD_COMPONENTS = [
    'input',
    'input-group',
    'input-otp',
    'textarea',
    'field',
    'form',
    'label',
    'select',
    'checkbox',
    'radio-group',
    'combobox',
];

/**
 * Each kind of component gets a skeleton with the same silhouette, so a loading
 * card hints at what is coming instead of showing the same three bars 54 times.
 */
function shimmerShape(name: string): ShimmerShape {
    if (name === 'avatar') {
        return 'avatar';
    }
    if (name === 'chart') {
        return 'bars';
    }
    if (['calendar', 'table', 'data-table', 'date-picker', 'input-otp'].includes(name)) {
        return 'grid';
    }
    if (['badge', 'button', 'button-group', 'toggle', 'toggle-group'].includes(name)) {
        return 'pills';
    }
    if (FIELD_COMPONENTS.includes(name)) {
        return 'field';
    }
    switch (getCategory(name)) {
        case 'Forms':
            return 'pills';
        case 'Feedback':
            return 'pills';
        case 'Navigation':
            return 'rows';
        case 'Layout':
        case 'Overlays':
            return 'panel';
        default:
            return 'lines';
    }
}

function PreviewShimmer({ name }: { name?: string }) {
    const shape: ShimmerShape = name ? shimmerShape(name) : 'lines';
    return (
        <div
            className="flex h-full w-full items-center justify-center p-4"
            role="status"
            aria-label="Loading preview"
        >
            {shape === 'avatar' && (
                <div className="flex w-full flex-col items-center gap-3">
                    <Skeleton className="h-12 w-12 rounded-full" />
                    <Skeleton className="h-2.5 w-24" />
                    <Skeleton className="h-7 w-32 rounded-md" />
                </div>
            )}
            {shape === 'pills' && (
                <div className="flex w-full flex-wrap items-center justify-center gap-2">
                    <Skeleton className="h-8 w-24 rounded-md" />
                    <Skeleton className="h-8 w-20 rounded-md" />
                    <Skeleton className="h-8 w-16 rounded-md" />
                </div>
            )}
            {shape === 'field' && (
                <div className="w-3/4 space-y-2">
                    <Skeleton className="h-2.5 w-20" />
                    <Skeleton className="h-8 w-full rounded-md" />
                    <Skeleton className="h-2 w-24" />
                </div>
            )}
            {shape === 'panel' && (
                <div className="w-4/5 space-y-3 rounded-lg border border-border/70 p-3">
                    <div className="flex items-center justify-between">
                        <Skeleton className="h-2.5 w-24" />
                        <Skeleton className="h-5 w-5 rounded-full" />
                    </div>
                    <Skeleton className="h-2 w-full" />
                    <Skeleton className="h-2 w-4/5" />
                    <Skeleton className="h-8 w-24 rounded-md" />
                </div>
            )}
            {shape === 'rows' && (
                <div className="w-4/5 space-y-2">
                    <div className="flex gap-3">
                        <Skeleton className="h-2.5 w-16" />
                        <Skeleton className="h-2.5 w-14" />
                        <Skeleton className="h-2.5 w-12" />
                    </div>
                    <Skeleton className="h-7 w-full rounded-md" />
                    <Skeleton className="h-7 w-full rounded-md" />
                </div>
            )}
            {shape === 'bars' && (
                <div className="flex h-20 w-4/5 items-end gap-1.5 border-b border-border/70 px-2">
                    {[40, 65, 48, 82, 56, 92, 70].map((height, index) => (
                        <Skeleton
                            key={index}
                            className="flex-1 rounded-t-sm"
                            style={{ height: `${height}%` }}
                        />
                    ))}
                </div>
            )}
            {shape === 'grid' && (
                <div className="w-4/5 space-y-2">
                    <Skeleton className="h-2 w-24" />
                    <div className="grid grid-cols-7 gap-1.5">
                        {Array.from({ length: 21 }, (_, cell) => (
                            <Skeleton key={cell} className="h-5 rounded-sm" />
                        ))}
                    </div>
                </div>
            )}
            {shape === 'lines' && (
                <div className="w-3/4 space-y-2">
                    <Skeleton className="h-2.5 w-2/5" />
                    <Skeleton className="h-2 w-full" />
                    <Skeleton className="h-2 w-4/5" />
                    <Skeleton className="h-8 w-28 rounded-md" />
                </div>
            )}
            <span className="sr-only">Loading preview</span>
        </div>
    );
}

const PREVIEW_HANDSHAKE_TIMEOUT_MS = 15_000;

/**
 * Waits for the preview page's handshake instead of trusting `load`: a Vite
 * iframe fires `load` on the empty shell before React commits, which left the
 * shimmer covering a blank frame. Messages are accepted only from this iframe
 * and only for this session id.
 */
function usePreviewHandshake(sessionId: string | null) {
    const frameRef = useRef<HTMLIFrameElement | null>(null);
    const [state, setState] = useState<PreviewLifecycleState | 'idle'>('idle');
    const [detail, setDetail] = useState<string | null>(null);
    const [attempt, setAttempt] = useState(0);

    useEffect(() => {
        setState('idle');
        setDetail(null);
        if (!sessionId) {
            return;
        }
        // The timer is cleared when the page reports mounted or error, so firing
        // here always means the handshake never arrived.
        let timer: ReturnType<typeof setTimeout> | null = setTimeout(() => {
            setDetail('The preview did not finish loading. Vite may still be compiling it.');
            setState('error');
        }, PREVIEW_HANDSHAKE_TIMEOUT_MS);

        const stopTimer = () => {
            if (timer) {
                clearTimeout(timer);
                timer = null;
            }
        };
        const listener = (event: MessageEvent) => {
            if (event.source !== frameRef.current?.contentWindow) {
                return;
            }
            const message = parsePreviewMessage(event.data);
            if (!message || message.sessionId !== sessionId) {
                return;
            }
            if (message.state === 'error') {
                stopTimer();
                setState('error');
                setDetail(message.detail ?? 'The preview crashed while rendering.');
                return;
            }
            if (message.state === 'mounted') {
                stopTimer();
                setState('mounted');
                setDetail(null);
                return;
            }
            setState((current) => advancePreviewState(current, message) ?? current);
        };
        window.addEventListener('message', listener);
        return () => {
            stopTimer();
            window.removeEventListener('message', listener);
        };
    }, [sessionId, attempt]);

    return {
        frameRef,
        state,
        detail,
        frameKey: `${attempt}`,
        retry: () => setAttempt((value) => value + 1),
    };
}

function PreviewFrame({
    src,
    title,
    name,
    sessionId,
    onRetry,
}: {
    src: string;
    title: string;
    name?: string;
    sessionId?: string | null;
    onRetry?: () => Promise<void> | void;
}) {
    const { frameRef, state, detail, frameKey, retry } = usePreviewHandshake(sessionId ?? null);
    const [loaded, setLoaded] = useState(false);

    useEffect(() => {
        setLoaded(false);
    }, [src]);

    // Without a handshake id (an official block preview) fall back to `load`.
    const ready = sessionId ? state === 'mounted' : loaded;
    const failed = Boolean(sessionId) && state === 'error';

    return (
        <div className="relative h-full min-h-[300px] w-full">
            {!ready && !failed && (
                <div className="absolute inset-0 z-10 bg-background">
                    <PreviewShimmer name={name} />
                </div>
            )}
            {failed && (
                <div className="absolute inset-0 z-20 flex flex-col items-center justify-center gap-3 bg-background p-6 text-center text-sm text-muted-foreground">
                    <p>{detail ?? 'The preview failed to render.'}</p>
                    <Button
                        size="sm"
                        variant="outline"
                        onClick={async () => {
                            // Rebuild the preview first: the cached address can
                            // point at a server that has since been stopped.
                            await onRetry?.();
                            retry();
                        }}
                    >
                        Retry preview
                    </Button>
                </div>
            )}
            <iframe
                ref={frameRef}
                key={`${src}#${frameKey}`}
                title={title}
                src={src}
                onLoad={() => setLoaded(true)}
                className={cn(
                    'h-full min-h-[300px] w-full bg-background transition-opacity',
                    ready ? 'opacity-100' : 'opacity-0',
                )}
                sandbox="allow-scripts allow-same-origin allow-forms"
            />
        </div>
    );
}

function ComponentThumbnail({ name }: { name: string }) {
    const category = getCategory(name);

    if (/^(login|signup|otp)-/.test(name)) {
        return (
            <div className="mx-auto w-3/5 space-y-2 rounded-lg border border-border bg-background p-3">
                <div className="mx-auto h-2 w-2/5 rounded-full bg-foreground/80" />
                <div className="h-1.5 w-3/4 rounded-full bg-muted" />
                <div className="h-5 rounded border border-border bg-background" />
                <div className="h-5 rounded border border-border bg-background" />
                <div className="h-5 rounded bg-primary" />
            </div>
        );
    }
    if (/^(dashboard|sidebar)-/.test(name)) {
        return (
            <div className="mx-auto flex h-20 w-4/5 overflow-hidden rounded-lg border border-border bg-background">
                <div className="w-1/4 border-r border-border bg-muted/60 p-2">
                    <div className="mb-2 h-2 w-full rounded-full bg-foreground/50" />
                    <div className="mb-1 h-1.5 w-4/5 rounded-full bg-muted-foreground/40" />
                    <div className="h-1.5 w-3/5 rounded-full bg-muted-foreground/40" />
                </div>
                <div className="flex-1 p-2">
                    <div className="mb-2 h-2 w-2/5 rounded-full bg-foreground/70" />
                    <div className="grid grid-cols-3 gap-1">
                        <span className="h-5 rounded bg-primary/15" />
                        <span className="h-5 rounded bg-muted" />
                        <span className="h-5 rounded bg-muted" />
                    </div>
                    <div className="mt-2 h-4 rounded border border-border" />
                </div>
            </div>
        );
    }
    if (/^calendar-/.test(name) || name === 'calendar') {
        return (
            <div className="mx-auto w-3/5 rounded-lg border border-border bg-background p-3">
                <div className="mb-2 flex items-center justify-between">
                    <span className="h-2 w-1/3 rounded-full bg-foreground/70" />
                    <span className="h-2 w-2 rounded-full bg-muted" />
                </div>
                <div className="mb-1 grid grid-cols-7 gap-1">
                    {Array.from({ length: 7 }, (_, day) => (
                        <span key={`weekday-${day}`} className="h-1.5 rounded-full bg-muted" />
                    ))}
                </div>
                <div className="grid grid-cols-7 gap-1">
                    {Array.from({ length: 28 }, (_, day) => (
                        <span
                            key={day}
                            className={cn(
                                'h-3 rounded-sm',
                                day === 17 ? 'bg-primary' : 'bg-muted/70',
                            )}
                        />
                    ))}
                </div>
            </div>
        );
    }

    if (['button', 'button-group', 'toggle', 'toggle-group'].includes(name)) {
        return (
            <div className="flex items-center justify-center gap-2">
                <span className="rounded-md bg-primary px-3 py-1.5 text-[10px] font-medium text-primary-foreground">
                    Continue
                </span>
                <span className="rounded-md border border-border bg-background px-3 py-1.5 text-[10px]">
                    Cancel
                </span>
            </div>
        );
    }
    if (['input', 'input-group', 'input-otp', 'textarea', 'field', 'form'].includes(name)) {
        return (
            <div className="mx-auto w-3/4 space-y-2 text-left">
                <div className="text-[9px] font-medium text-foreground">Email address</div>
                <div className="h-7 rounded-md border border-border bg-background px-2 py-1.5 text-[9px] text-muted-foreground">
                    name@example.com
                </div>
                <div className="h-1.5 w-2/5 rounded-full bg-muted" />
            </div>
        );
    }
    if (['card', 'empty'].includes(name)) {
        return (
            <div className="mx-auto w-3/4 rounded-lg border border-border bg-background p-3 text-left">
                <div className="mb-2 h-2 w-2/5 rounded-full bg-foreground/80" />
                <div className="mb-1 h-1.5 w-full rounded-full bg-muted" />
                <div className="h-1.5 w-4/5 rounded-full bg-muted" />
                <div className="mt-3 h-6 rounded-md bg-primary" />
            </div>
        );
    }
    if (['table', 'chart'].includes(name)) {
        return (
            <div className="mx-auto w-4/5 rounded-lg border border-border bg-background p-3">
                <div className="mb-3 flex justify-between">
                    <span className="h-2 w-1/4 rounded-full bg-muted" />
                    <span className="h-2 w-1/5 rounded-full bg-muted" />
                </div>
                <div className="flex h-12 items-end gap-1 border-b border-border px-2">
                    {[35, 62, 45, 80, 54, 92, 68].map((height, index) => (
                        <span
                            key={index}
                            className="flex-1 rounded-t-sm bg-primary/70"
                            style={{ height: `${height}%` }}
                        />
                    ))}
                </div>
            </div>
        );
    }
    if (['tabs', 'accordion', 'breadcrumb', 'navigation-menu', 'pagination'].includes(name)) {
        return (
            <div className="mx-auto w-4/5 rounded-lg border border-border bg-background p-3 text-left">
                <div className="mb-3 flex gap-3 border-b border-border pb-2">
                    <span className="h-2 w-1/4 rounded-full bg-primary" />
                    <span className="h-2 w-1/4 rounded-full bg-muted" />
                    <span className="h-2 w-1/5 rounded-full bg-muted" />
                </div>
                <div className="mb-2 h-2 w-3/5 rounded-full bg-foreground/70" />
                <div className="h-1.5 w-full rounded-full bg-muted" />
            </div>
        );
    }
    if (['alert', 'progress', 'spinner', 'sonner', 'toast'].includes(name)) {
        return (
            <div className="mx-auto flex w-4/5 items-center gap-2 rounded-md border border-border bg-background p-3">
                <span className="h-3 w-3 rounded-full bg-primary/70" />
                <span className="flex-1 space-y-1.5">
                    <span className="block h-2 w-2/5 rounded-full bg-foreground/70" />
                    <span className="block h-1.5 w-4/5 rounded-full bg-muted" />
                </span>
            </div>
        );
    }

    return (
        <div className="mx-auto grid w-4/5 grid-cols-3 gap-2">
            {[0, 1, 2, 3, 4, 5].map((cell) => (
                <span
                    key={cell}
                    className={cn(
                        'h-7 rounded-md border border-border bg-background',
                        cell === 1 && 'bg-primary/10',
                    )}
                />
            ))}
            <span className="col-span-3 mx-auto mt-1 rounded-full border border-border px-2 py-0.5 text-[9px] text-muted-foreground">
                {category}
            </span>
        </div>
    );
}

function CardPreview({
    src,
    title,
    name,
    sessionId,
}: {
    src: string;
    title: string;
    name?: string;
    sessionId?: string | null;
}) {
    const { frameRef, state, frameKey } = usePreviewHandshake(sessionId ?? null);
    const [loaded, setLoaded] = useState(false);

    useEffect(() => {
        setLoaded(false);
    }, [src]);

    const ready = sessionId ? state === 'mounted' : loaded;
    const failed = Boolean(sessionId) && state === 'error';

    if (failed) {
        return (
            <div className="flex h-full items-center justify-center px-4">
                <ComponentThumbnail name={name ?? ''} />
            </div>
        );
    }

    return (
        <div className="relative h-full w-full overflow-hidden">
            {!ready && (
                <div className="absolute inset-0 z-10 bg-muted/35">
                    <PreviewShimmer name={name} />
                </div>
            )}
            <iframe
                ref={frameRef}
                key={`${src}#${frameKey}`}
                title={title}
                src={src}
                loading="lazy"
                tabIndex={-1}
                onLoad={() => setLoaded(true)}
                className={cn(
                    'pointer-events-none h-full w-full border-0 bg-background transition-opacity',
                    ready ? 'opacity-100' : 'opacity-0',
                )}
                sandbox="allow-scripts allow-same-origin"
            />
        </div>
    );
}

function DefinitionCard({
    definition,
    installed,
    previewUrl,
    previewSessionId,
    previewLoading,
    previewError,
    onVisible,
    onSelect,
}: {
    definition: ShadcnLibraryItem;
    installed: boolean;
    previewUrl?: string;
    previewSessionId?: string;
    previewLoading: boolean;
    previewError?: string;
    onVisible: (name: string) => void;
    onSelect: () => void;
}) {
    const previewRef = useRef<HTMLDivElement | null>(null);

    useEffect(() => {
        const node = previewRef.current;
        // Blocks have their own thumbnails and never need the catalog workspace.
        if (
            !node ||
            previewUrl ||
            previewLoading ||
            previewError ||
            definition.previewable === false ||
            isShadcnBlock(definition)
        ) {
            return;
        }
        const observer = new IntersectionObserver(
            (entries) => {
                if (!entries.some((entry) => entry.isIntersecting)) {
                    return;
                }
                observer.disconnect();
                onVisible(definition.name);
            },
            { rootMargin: '160px' },
        );
        observer.observe(node);
        return () => observer.disconnect();
    }, [definition, previewUrl, previewLoading, previewError, onVisible]);

    return (
        <article className="group overflow-hidden rounded-xl border border-border/70 bg-background transition-colors hover:border-border-hover">
            <button
                type="button"
                className="block w-full text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                onClick={onSelect}
                aria-label={`View ${definition.title} details`}
            >
                <div ref={previewRef} className="h-36 overflow-hidden bg-muted/35">
                    {previewUrl ? (
                        <CardPreview
                            src={previewUrl}
                            title={`${definition.title} preview`}
                            name={definition.name}
                            sessionId={previewSessionId}
                        />
                    ) : (
                        <div className="flex h-full items-center justify-center px-4">
                            {previewLoading ? (
                                <PreviewShimmer name={definition.name} />
                            ) : (
                                <ComponentThumbnail name={definition.name} />
                            )}
                        </div>
                    )}
                </div>
                <div className="px-3 pb-3 pt-3">
                    <div className="flex items-center justify-between gap-2">
                        <h3 className="truncate text-sm font-medium text-foreground">
                            {definition.title}
                        </h3>
                        <span className="shrink-0 rounded-full border border-border/80 px-2 py-0.5 text-[9px] text-muted-foreground">
                            {installed
                                ? 'Installed'
                                : isShadcnBlock(definition)
                                  ? 'Block'
                                  : 'Component'}
                        </span>
                    </div>
                    <p className="mt-1 line-clamp-2 min-h-8 text-xs leading-4 text-muted-foreground">
                        {definition.description}
                    </p>
                </div>
            </button>
            <div className="flex items-center justify-between border-t border-border/60 px-3 py-2">
                <span className="text-[10px] text-muted-foreground">
                    {getItemCategory(definition)}
                </span>
                <Button variant="ghost" size="sm" className="h-7 px-2 text-xs" onClick={onSelect}>
                    View details
                </Button>
            </div>
        </article>
    );
}

const ComponentsTab = observer(() => {
    const editorEngine = useEditorEngine();
    const manager = editorEngine.components;
    const [libraryOpen, setLibraryOpen] = useState(false);
    const [selectedName, setSelectedName] = useState<string | null>(null);
    const [provider, setProvider] = useState<ProviderId>('shadcn');
    const [kind, setKind] = useState<CatalogKind>('all');
    const [category, setCategory] = useState('All');
    const [query, setQuery] = useState('');
    const projectPath = manager.projectPath;
    const hasSelection = editorEngine.elements.selected.length > 0;

    useEffect(() => {
        void manager.refresh();
    }, [manager, projectPath]);

    const selectedDefinition = manager.catalog.find((item) => item.name === selectedName);
    const selectedCatalogUrl = selectedDefinition
        ? manager.catalogPreviews[selectedDefinition.name]
        : undefined;
    const selectedItemLoading = selectedDefinition
        ? Boolean(manager.catalogItemLoading[selectedDefinition.name])
        : false;
    const selectedItemError = selectedDefinition
        ? manager.catalogItemErrors[selectedDefinition.name]
        : undefined;

    // The detail pane needs one item; the grid asks for its own as it scrolls.
    useEffect(() => {
        if (!libraryOpen || !selectedDefinition || isShadcnBlock(selectedDefinition)) {
            return;
        }
        if (selectedDefinition.previewable === false) {
            return;
        }
        void manager.ensureCatalogPreviews([selectedDefinition.name]);
    }, [libraryOpen, manager, selectedDefinition]);

    const requestPreview = useCallback(
        (name: string) => {
            void manager.ensureCatalogPreviews([name]);
        },
        [manager],
    );
    const filteredCatalog = useMemo(() => {
        const needle = query.trim().toLowerCase();
        if (provider !== 'shadcn') {
            return [];
        }
        return manager.catalog.filter((definition) => {
            const matchesKind =
                kind === 'all' ||
                (kind === 'blocks' ? isShadcnBlock(definition) : !isShadcnBlock(definition));
            const matchesCategory =
                category === 'All' ||
                (isShadcnBlock(definition)
                    ? definition.categories.includes(category.toLowerCase())
                    : getCategory(definition.name) === category);
            const matchesQuery =
                !needle ||
                definition.name.includes(needle) ||
                definition.title.toLowerCase().includes(needle) ||
                definition.description.toLowerCase().includes(needle);
            return matchesKind && matchesCategory && matchesQuery;
        });
    }, [category, kind, manager.catalog, provider, query]);

    const closeLibrary = (open: boolean) => {
        setLibraryOpen(open);
        if (!open) {
            setSelectedName(null);
            void manager.closePreview();
        }
    };

    const selectDefinition = (name: string) => {
        setSelectedName(name);
        void manager.openPreview(name);
    };

    const install = async (definition: ShadcnLibraryItem) => {
        const wasInstalled = Boolean(manager.status?.installed[definition.name]);
        try {
            const result = await manager.install(definition.name);
            if (!wasInstalled || !result.success || result.addedDependencies?.length) {
                toast({
                    title: result.success
                        ? `${definition.title} ready`
                        : `Could not install ${definition.title}`,
                    description: result.message,
                    variant: result.success ? 'default' : 'destructive',
                });
            }
            return result.success;
        } catch (error: any) {
            toast({
                title: `Could not install ${definition.title}`,
                description: error?.message ?? 'The component installer failed unexpectedly.',
                variant: 'destructive',
            });
            return false;
        }
    };

    const preview = async (definition: ShadcnLibraryItem) => {
        if (manager.catalogItemErrors[definition.name]) {
            await manager.retryCatalogPreview(definition.name);
        }
        await manager.openPreview(definition.name);
    };

    const useComponent = async (definition: ShadcnLibraryItem) => {
        if (!(await install(definition))) {
            return;
        }
        const result = await manager.insert(definition.name);
        toast({
            title: result.success
                ? `Added ${definition.title} to your design`
                : 'Could not add component',
            description: result.message,
            variant: result.success ? 'default' : 'destructive',
        });
    };

    const isBusy = (definition: ShadcnLibraryItem) =>
        manager.installing === definition.name || manager.using === definition.name;

    const insertLabel = (definition: ShadcnLibraryItem) => {
        if (manager.using === definition.name) {
            return 'Adding…';
        }
        if (manager.installing === definition.name) {
            return manager.installProgress?.phase === 'queued' ? 'Queued…' : 'Installing…';
        }
        return manager.status?.installed[definition.name]
            ? 'Use in Kumite'
            : 'Install & use in Kumite';
    };

    const copyForAgent = async (definition: ShadcnLibraryItem) => {
        try {
            await navigator.clipboard.writeText(
                `Use the shadcn/ui ${definition.title} ${isShadcnBlock(definition) ? 'block' : 'component'}.\n\n${getImportCode(definition)}\n\n${definition.insertCode}`,
            );
            toast({
                title: 'Copied component snippet',
                description: 'Paste it into your agent conversation.',
            });
        } catch {
            toast({
                title: 'Could not copy snippet',
                description: 'Clipboard access is unavailable.',
                variant: 'destructive',
            });
        }
    };

    const installedDefinitions = manager.catalog.filter(
        (definition) => manager.status?.installed[definition.name],
    );

    return (
        <div className="flex h-full w-full flex-col">
            <div className="flex items-center justify-between border-b px-3 py-3">
                <div className="min-w-0">
                    <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                        Library
                    </div>
                    <div className="mt-0.5 text-[11px] text-muted-foreground">
                        {projectPath
                            ? 'Browse, preview, and add to your design'
                            : 'Browse components before opening a project'}
                    </div>
                </div>
                <Button
                    size="sm"
                    variant="ghost"
                    className="h-7 px-2 text-xs"
                    disabled={manager.isLoadingStatus}
                    onClick={() => void manager.refresh()}
                >
                    {manager.isLoadingStatus ? '…' : 'Refresh'}
                </Button>
            </div>

            <div className="border-b p-3">
                <Button className="w-full" onClick={() => setLibraryOpen(true)}>
                    Browse components
                    <span className="ml-2 text-xs opacity-70">{manager.catalog.length}</span>
                </Button>
            </div>

            {!projectPath && (
                <div className="border-b p-3 text-xs leading-5 text-muted-foreground">
                    Open a React + Tailwind project to install, preview, and use components. The
                    catalog is available now.
                </div>
            )}

            {projectPath && manager.status && !manager.status.supported && (
                <div className="space-y-1 border-b p-3 text-xs leading-5 text-muted-foreground">
                    <p className="font-medium text-foreground">
                        Use is unavailable for this project
                    </p>
                    <p>{manager.status.reason}</p>
                </div>
            )}

            {projectPath && manager.status?.supported && !manager.status.initialized && (
                <div className="space-y-2 border-b p-3">
                    <p className="text-xs leading-5 text-muted-foreground">
                        This project has Tailwind but no components.json. Initialize shadcn/ui when
                        you’re ready to install a component.
                    </p>
                    <Button
                        size="sm"
                        className="h-7 px-2 text-xs"
                        disabled={manager.initializing}
                        onClick={async () => {
                            const result = await manager.initialize();
                            toast({
                                title: result.success
                                    ? 'shadcn/ui initialized'
                                    : 'Initialization failed',
                                description: result.message,
                                variant: result.success ? 'default' : 'destructive',
                            });
                        }}
                    >
                        {manager.initializing ? 'Initializing…' : 'Initialize shadcn/ui'}
                    </Button>
                </div>
            )}

            <div className="min-h-0 flex-1 overflow-auto">
                <div className="flex items-center justify-between px-3 pb-2 pt-3">
                    <span className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                        Installed in this project
                    </span>
                    <span className="text-[10px] text-muted-foreground">
                        {installedDefinitions.length}
                    </span>
                </div>
                {installedDefinitions.length > 0 ? (
                    installedDefinitions.map((definition) => (
                        <div
                            key={definition.name}
                            className="flex items-center justify-between gap-2 border-b border-border/50 px-3 py-2 last:border-0"
                        >
                            <button
                                type="button"
                                className="min-w-0 truncate text-left text-xs font-medium text-foreground hover:underline"
                                onClick={() => {
                                    setLibraryOpen(true);
                                    selectDefinition(definition.name);
                                }}
                            >
                                {definition.title}
                            </button>
                            <div className="flex shrink-0 gap-1">
                                {definition.previewable !== false && (
                                    <Button
                                        size="sm"
                                        variant="ghost"
                                        className="h-7 px-2 text-[11px]"
                                        title={
                                            isShadcnBlock(definition) && definition.previewUrl
                                                ? 'Preview from the official shadcn registry'
                                                : 'Preview from Kumite’s catalog workspace'
                                        }
                                        onClick={() => {
                                            setLibraryOpen(true);
                                            selectDefinition(definition.name);
                                        }}
                                    >
                                        Preview
                                    </Button>
                                )}
                                {definition.insertable !== false && (
                                    <Button
                                        size="sm"
                                        variant="secondary"
                                        className="h-7 px-2 text-[11px]"
                                        disabled={!hasSelection || isBusy(definition)}
                                        title={
                                            hasSelection
                                                ? 'Add inside the selected element'
                                                : 'Select an element in a frame first'
                                        }
                                        onClick={() => void useComponent(definition)}
                                    >
                                        {isBusy(definition) && (
                                            <Icons.Shadow className="mr-1.5 h-3 w-3 animate-spin" />
                                        )}
                                        {isBusy(definition) ? 'Adding…' : 'Use'}
                                    </Button>
                                )}
                            </div>
                        </div>
                    ))
                ) : (
                    <div className="px-3 py-4 text-xs text-muted-foreground">
                        {projectPath
                            ? 'No components installed yet. Browse the library to get started.'
                            : 'Installed components appear here when a project is open.'}
                    </div>
                )}
            </div>

            {manager.installProgress && (
                <div className="flex items-center justify-between gap-2 border-t px-3 py-2 text-[11px] text-muted-foreground">
                    <span className="line-clamp-2">{manager.installProgress.message}</span>
                    {manager.installProgress.phase === 'queued' && manager.installing && (
                        <Button
                            size="sm"
                            variant="ghost"
                            className="h-6 shrink-0 px-2 text-[10px]"
                            onClick={() => {
                                const name = manager.installing;
                                if (name) {
                                    void manager.cancelInstall(name);
                                }
                            }}
                        >
                            Cancel
                        </Button>
                    )}
                </div>
            )}

            {manager.lastLog && (
                <details className="border-t px-3 py-2 text-[11px] text-muted-foreground">
                    <summary className="cursor-pointer select-none">Last CLI output</summary>
                    <pre className="mt-2 max-h-40 overflow-auto whitespace-pre-wrap break-words">
                        {manager.lastLog}
                    </pre>
                </details>
            )}

            <Dialog open={libraryOpen} onOpenChange={closeLibrary}>
                <DialogContent className="flex h-[84vh] w-[1120px] max-w-[94vw] flex-col gap-0 overflow-hidden p-0">
                    <div className="shrink-0 border-b px-6 pb-4 pt-5">
                        {selectedDefinition ? (
                            <>
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    className="mb-2 h-7 px-2 text-xs"
                                    onClick={() => {
                                        setSelectedName(null);
                                        void manager.closePreview();
                                    }}
                                >
                                    <span aria-hidden="true" className="mr-1">
                                        ←
                                    </span>{' '}
                                    All components
                                </Button>
                                <DialogHeader>
                                    <DialogTitle className="font-serif text-3xl">
                                        {selectedDefinition.title}
                                    </DialogTitle>
                                    <DialogDescription>
                                        {selectedDefinition.description}
                                    </DialogDescription>
                                </DialogHeader>
                            </>
                        ) : (
                            <>
                                <DialogHeader>
                                    <DialogTitle className="font-serif text-3xl">
                                        Library
                                    </DialogTitle>
                                    <DialogDescription>
                                        Browse components, preview them, and add them to your
                                        design.
                                    </DialogDescription>
                                </DialogHeader>
                                <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
                                    <div
                                        className="flex flex-wrap gap-1.5"
                                        aria-label="Component providers"
                                    >
                                        {PROVIDERS.map((item) => (
                                            <button
                                                key={item.id}
                                                type="button"
                                                aria-pressed={provider === item.id}
                                                title={
                                                    item.available
                                                        ? item.label
                                                        : `${item.label} provider is planned`
                                                }
                                                onClick={() => setProvider(item.id)}
                                                className={cn(
                                                    'rounded-full border px-3 py-1.5 text-xs transition-colors',
                                                    provider === item.id
                                                        ? 'border-foreground bg-foreground text-background'
                                                        : cn(
                                                              'border-border bg-muted/40 text-foreground hover:bg-muted',
                                                              !item.available && 'opacity-70',
                                                          ),
                                                )}
                                            >
                                                {item.label}
                                                {!item.available && (
                                                    <span className="ml-1.5 text-[9px] uppercase tracking-wide">
                                                        Soon
                                                    </span>
                                                )}
                                            </button>
                                        ))}
                                    </div>
                                    <div className="flex min-w-[260px] flex-1 justify-end gap-2 sm:max-w-[420px]">
                                        <div className="relative min-w-0 flex-1">
                                            <Icons.MagnifyingGlass className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                                            <Input
                                                value={query}
                                                onChange={(event) => setQuery(event.target.value)}
                                                placeholder={
                                                    kind === 'blocks'
                                                        ? 'Search blocks'
                                                        : 'Search components'
                                                }
                                                className="h-9 pl-9 text-xs"
                                                aria-label="Search components"
                                            />
                                        </div>
                                        <select
                                            aria-label="Component type"
                                            value={kind}
                                            onChange={(event) =>
                                                setKind(event.target.value as CatalogKind)
                                            }
                                            className="h-9 rounded-md border border-input bg-background px-3 text-xs text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                                        >
                                            <option value="all">All types</option>
                                            <option value="components">Components</option>
                                            <option value="blocks">Blocks</option>
                                        </select>
                                    </div>
                                </div>
                                <div
                                    className="mt-3 flex gap-1.5 overflow-x-auto pb-1"
                                    aria-label="Component categories"
                                >
                                    {[
                                        'All',
                                        ...Object.keys(CATEGORIES),
                                        ...BLOCK_CATEGORIES,
                                        'Other',
                                    ].map((item) => (
                                        <button
                                            key={item}
                                            type="button"
                                            onClick={() => setCategory(item)}
                                            aria-pressed={category === item}
                                            className={cn(
                                                'whitespace-nowrap rounded-full px-3 py-1 text-xs transition-colors',
                                                category === item
                                                    ? 'bg-muted text-foreground'
                                                    : 'text-muted-foreground hover:bg-muted/60 hover:text-foreground',
                                            )}
                                        >
                                            {item}
                                        </button>
                                    ))}
                                </div>
                            </>
                        )}
                    </div>

                    {selectedDefinition ? (
                        <div className="grid min-h-0 flex-1 grid-cols-1 overflow-auto lg:grid-cols-[minmax(0,1fr)_340px] lg:overflow-hidden">
                            <div className="relative m-4 flex min-h-[300px] items-center justify-center overflow-hidden rounded-xl border border-border bg-muted/20 lg:m-5">
                                {manager.previewComponent === selectedDefinition.name &&
                                manager.previewError ? (
                                    <div className="max-w-sm p-6 text-center text-sm text-muted-foreground">
                                        <p>{manager.previewError}</p>
                                        <Button
                                            className="mt-4"
                                            size="sm"
                                            onClick={() => void preview(selectedDefinition)}
                                        >
                                            Retry preview
                                        </Button>
                                    </div>
                                ) : manager.previewComponent === selectedDefinition.name &&
                                  manager.previewUrl ? (
                                    <PreviewFrame
                                        key={manager.previewUrl}
                                        src={manager.previewUrl}
                                        title={`${selectedDefinition.title} live preview`}
                                        name={selectedDefinition.name}
                                        sessionId={manager.previewSessionId}
                                        onRetry={() =>
                                            manager.retryPreview(selectedDefinition.name)
                                        }
                                    />
                                ) : selectedCatalogUrl ? (
                                    <PreviewFrame
                                        key={selectedCatalogUrl}
                                        src={selectedCatalogUrl}
                                        title={`${selectedDefinition.title} live preview`}
                                        name={selectedDefinition.name}
                                        sessionId={manager.catalogSessions[selectedDefinition.name]}
                                    />
                                ) : manager.previewLoading ||
                                  selectedItemLoading ||
                                  manager.catalogBaseLoading ? (
                                    <PreviewShimmer name={selectedDefinition.name} />
                                ) : (
                                    <div className="w-full p-5">
                                        <div className="mx-auto flex min-h-[250px] max-w-xl items-center justify-center rounded-lg border border-border/70 bg-background p-8">
                                            <div className="w-full">
                                                <ComponentThumbnail
                                                    name={selectedDefinition.name}
                                                />
                                            </div>
                                        </div>
                                        <p className="mt-3 text-center text-[11px] text-muted-foreground">
                                            {selectedItemError
                                                ? `Live preview is unavailable: ${selectedItemError}`
                                                : manager.catalogBaseError
                                                  ? `Live previews are unavailable: ${manager.catalogBaseError}`
                                                  : isShadcnBlock(selectedDefinition) &&
                                                      selectedDefinition.previewUrl
                                                    ? 'Previewed from the pinned official shadcn blocks registry.'
                                                    : 'Live preview is unavailable for this item.'}
                                        </p>
                                    </div>
                                )}
                            </div>
                            <aside className="flex min-h-0 flex-col border-t border-border p-5 lg:border-l lg:border-t-0">
                                <div className="space-y-4">
                                    <div>
                                        <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                                            Provider
                                        </div>
                                        <div className="mt-1 text-sm">
                                            shadcn/ui · {getItemCategory(selectedDefinition)}
                                        </div>
                                    </div>
                                    <div>
                                        <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                                            {isShadcnBlock(selectedDefinition)
                                                ? 'Includes shadcn components'
                                                : 'Required packages'}
                                        </div>
                                        <div className="mt-1 text-xs text-muted-foreground">
                                            {isShadcnBlock(selectedDefinition)
                                                ? selectedDefinition.registryDependencies.join(', ')
                                                : selectedDefinition.dependencies.length
                                                  ? selectedDefinition.dependencies.join(', ')
                                                  : 'No additional packages'}
                                        </div>
                                    </div>
                                    {selectedDefinition.limitation && (
                                        <p className="rounded-md border border-amber-500/30 bg-amber-500/5 p-2 text-xs text-muted-foreground">
                                            {selectedDefinition.limitation}
                                        </p>
                                    )}
                                    {!projectPath && (
                                        <p className="text-xs leading-5 text-muted-foreground">
                                            Open a supported React + Tailwind project to install or
                                            use this{' '}
                                            {isShadcnBlock(selectedDefinition)
                                                ? 'block'
                                                : 'component'}
                                            .
                                        </p>
                                    )}
                                    {projectPath && manager.status && !manager.status.supported && (
                                        <p className="text-xs leading-5 text-destructive">
                                            {manager.status.reason}
                                        </p>
                                    )}
                                </div>
                                <div className="mt-auto flex flex-col gap-2 pt-6">
                                    {selectedDefinition.previewable !== false && (
                                        <Button
                                            variant="outline"
                                            disabled={
                                                manager.installing === selectedDefinition.name ||
                                                manager.previewLoading ||
                                                selectedItemLoading ||
                                                manager.catalogBaseLoading
                                            }
                                            title={
                                                isShadcnBlock(selectedDefinition) &&
                                                selectedDefinition.previewUrl
                                                    ? 'Preview from the official shadcn registry'
                                                    : 'Preview from Kumite’s catalog workspace'
                                            }
                                            onClick={() => void preview(selectedDefinition)}
                                        >
                                            {manager.previewLoading ||
                                            selectedItemLoading ||
                                            manager.catalogBaseLoading
                                                ? 'Preparing preview…'
                                                : isShadcnBlock(selectedDefinition) &&
                                                    selectedDefinition.previewUrl
                                                  ? 'Preview block'
                                                  : 'Live preview'}
                                        </Button>
                                    )}
                                    {selectedDefinition.insertable !== false && (
                                        <Button
                                            disabled={
                                                !projectPath ||
                                                !manager.status?.supported ||
                                                !hasSelection ||
                                                isBusy(selectedDefinition)
                                            }
                                            title={
                                                !hasSelection
                                                    ? 'Select an element in a frame first'
                                                    : undefined
                                            }
                                            onClick={() => void useComponent(selectedDefinition)}
                                        >
                                            {isBusy(selectedDefinition) && (
                                                <Icons.Shadow className="mr-2 h-4 w-4 animate-spin" />
                                            )}
                                            {insertLabel(selectedDefinition)}
                                        </Button>
                                    )}
                                    <Button
                                        variant="ghost"
                                        onClick={() => void copyForAgent(selectedDefinition)}
                                    >
                                        Copy for agent
                                    </Button>
                                </div>
                            </aside>
                        </div>
                    ) : (
                        <div className="min-h-0 flex-1 overflow-auto p-5">
                            {manager.catalogBaseError && (
                                <div className="mb-3 flex items-center justify-between gap-3 rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-xs text-muted-foreground">
                                    <span className="line-clamp-2">
                                        Live previews are unavailable: {manager.catalogBaseError}
                                    </span>
                                    <Button
                                        size="sm"
                                        variant="ghost"
                                        className="h-7 shrink-0 px-2 text-[11px]"
                                        disabled={manager.catalogBaseLoading}
                                        onClick={() => {
                                            const target = filteredCatalog.find(
                                                (item) =>
                                                    !isShadcnBlock(item) &&
                                                    item.previewable !== false,
                                            );
                                            if (target) {
                                                void manager.retryCatalogPreview(target.name);
                                            }
                                        }}
                                    >
                                        Retry
                                    </Button>
                                </div>
                            )}
                            {provider !== 'shadcn' ? (
                                <div className="flex h-full min-h-48 flex-col items-center justify-center text-center">
                                    <p className="font-medium">
                                        {PROVIDERS.find((item) => item.id === provider)?.label} is
                                        coming soon
                                    </p>
                                    <p className="mt-1 max-w-sm text-sm text-muted-foreground">
                                        The provider will use this same browse, preview, and use
                                        flow once its catalog and licensing are verified.
                                    </p>
                                </div>
                            ) : filteredCatalog.length > 0 ? (
                                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
                                    {filteredCatalog.map((definition) => (
                                        <DefinitionCard
                                            key={definition.name}
                                            definition={definition}
                                            installed={Boolean(
                                                manager.status?.installed[definition.name],
                                            )}
                                            previewUrl={manager.catalogPreviews[definition.name]}
                                            previewSessionId={
                                                manager.catalogSessions[definition.name]
                                            }
                                            previewLoading={Boolean(
                                                manager.catalogItemLoading[definition.name],
                                            )}
                                            previewError={
                                                manager.catalogItemErrors[definition.name]
                                            }
                                            onVisible={requestPreview}
                                            onSelect={() => selectDefinition(definition.name)}
                                        />
                                    ))}
                                </div>
                            ) : (
                                <div className="flex h-full min-h-48 flex-col items-center justify-center text-center">
                                    <p className="font-medium">
                                        {kind === 'blocks'
                                            ? 'No blocks'
                                            : kind === 'components'
                                              ? 'No components'
                                              : 'No library items'}{' '}
                                        match “{query.trim()}”
                                    </p>
                                    <p className="mt-1 text-sm text-muted-foreground">
                                        Try another name or clear the category filter.
                                    </p>
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        className="mt-4"
                                        onClick={() => {
                                            setQuery('');
                                            setCategory('All');
                                        }}
                                    >
                                        Clear filters
                                    </Button>
                                </div>
                            )}
                        </div>
                    )}
                </DialogContent>
            </Dialog>
        </div>
    );
});

export default ComponentsTab;
