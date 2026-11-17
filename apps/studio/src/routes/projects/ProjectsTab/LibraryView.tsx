import {
    CardPreview,
    ComponentThumbnail,
    getCategory,
    PreviewFrame,
    PreviewShimmer,
} from '@/components/ComponentPreview';
import { useEditorEngine } from '@/components/Context';
import {
    SHADCN_BLOCKS,
    SHADCN_COMPONENTS,
    type ShadcnBlockDefinition,
    type ShadcnComponentDefinition,
} from '@kumite/models';
import { Button } from '@kumite/ui/button';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from '@kumite/ui/dialog';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@kumite/ui/dropdown-menu';
import { cn } from '@kumite/ui/utils';
import {
    ArrowUpRight,
    Blocks,
    Check,
    ChevronDown,
    Component,
    Copy,
    Package,
    RefreshCw,
    Search,
    Sparkles,
} from 'lucide-react';
import { observer } from 'mobx-react-lite';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type React from 'react';
import type { LucideIcon } from 'lucide-react';
import type { ComponentsManager } from '@/lib/components';
import { PageHeader } from './Home';

type CatalogKind = 'component' | 'block';
type CatalogSpan = 'full' | 'half' | 'third';

interface CatalogItem {
    kind: CatalogKind;
    name: string;
    title: string;
    description: string;
    categories: string[];
    dependencies: string[];
    parts: string[];
    installCommand: string;
    agentPrompt: string;
    previewable: boolean;
    insertable: boolean;
    limitation?: string;
}

const COMPONENT_ITEMS: CatalogItem[] = SHADCN_COMPONENTS.map((item: ShadcnComponentDefinition) => ({
    kind: 'component',
    name: item.name,
    title: item.title,
    description: item.description,
    categories: [getCategory(item.name)],
    dependencies: item.dependencies,
    parts: item.parts,
    installCommand: `npx shadcn@3.7.0 add ${item.name}`,
    agentPrompt: `Use the shadcn/ui ${item.title} (${item.name}) component. ${item.description} Insert this JSX with the project's existing tokens:\n\n${item.insertCode}`,
    previewable: item.previewable !== false,
    insertable: item.insertable !== false,
    limitation: item.limitation,
}));

const BLOCK_ITEMS: CatalogItem[] = SHADCN_BLOCKS.map((item: ShadcnBlockDefinition) => ({
    kind: 'block',
    name: item.name,
    title: item.title,
    description: item.description,
    categories: item.categories,
    dependencies: item.dependencies,
    parts: item.files,
    installCommand: `npx shadcn@3.7.0 add ${item.registryUrl}`,
    agentPrompt: `Use the shadcn/ui ${item.title} block (${item.name}). ${item.description} Install it with \`npx shadcn@3.7.0 add ${item.registryUrl}\` and adapt the copy and colors to the project.`,
    previewable: item.previewable !== false,
    insertable: item.insertable !== false,
    limitation: item.limitation,
}));

const ITEMS = [...COMPONENT_ITEMS, ...BLOCK_ITEMS];

type Filter = 'all' | CatalogKind;

/**
 * Wide surfaces get the whole row; auth and calendar blocks sit two-up;
 * primitives share a row three ways.
 */
function getCatalogSpan(item: CatalogItem): CatalogSpan {
    if (item.kind === 'component') {
        if (item.name === 'chart') {
            return 'full';
        }
        if (['table', 'calendar', 'command'].includes(item.name)) {
            return 'half';
        }
        return 'third';
    }
    return item.name.startsWith('dashboard-') ? 'full' : 'half';
}

const SPAN_CLASS: Record<CatalogSpan, string> = {
    full: 'md:col-span-2 xl:col-span-6',
    half: 'md:col-span-1 xl:col-span-3',
    third: 'md:col-span-1 xl:col-span-2',
};

const PREVIEW_HEIGHT: Record<CatalogSpan, string> = {
    full: 'h-[300px] xl:h-[380px]',
    half: 'h-[260px] xl:h-[320px]',
    third: 'h-[230px] xl:h-[260px]',
};

interface LibraryViewProps {
    popup?: boolean;
    initialSelectedName?: string | null;
    onUse?: (name: string) => void;
}

export const LibraryView = observer((props: LibraryViewProps) => {
    const { popup = false, initialSelectedName = null, onUse } = props;
    const editorEngine = useEditorEngine();
    const manager = editorEngine.components;
    const [filter, setFilter] = useState<Filter>('all');
    const [query, setQuery] = useState('');
    const [sort, setSort] = useState<'featured' | 'az'>('featured');
    const [selected, setSelected] = useState<CatalogItem | null>(
        () => ITEMS.find((item) => item.name === initialSelectedName) ?? null,
    );

    const items = useMemo(() => {
        const term = query.trim().toLowerCase();
        const filtered = ITEMS.filter((item) => filter === 'all' || item.kind === filter).filter(
            (item) =>
                !term ||
                item.title.toLowerCase().includes(term) ||
                item.description.toLowerCase().includes(term) ||
                item.name.toLowerCase().includes(term),
        );
        if (sort === 'az') {
            return [...filtered].sort((a, b) => a.title.localeCompare(b.title));
        }
        return filtered;
    }, [filter, query, sort]);

    const requestPreview = useCallback(
        (name: string) => {
            void manager.ensureCatalogPreviews([name]);
        },
        [manager],
    );

    return (
        <div
            className={cn(
                'flex min-h-full flex-col',
                popup ? 'px-6 pb-8 pr-14 pt-6' : 'px-12 pb-16 pt-14 xl:px-16',
            )}
        >
            <PageHeader
                title="Library"
                subtitle="Components and blocks your agent can search and use."
                actions={
                    <div className="flex items-center gap-2.5">
                        <div className="relative">
                            <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-foreground-tertiary" />
                            <input
                                value={query}
                                onChange={(event) => setQuery(event.target.value)}
                                placeholder={`Search ${filter === 'block' ? 'blocks' : filter === 'component' ? 'components' : 'library'}`}
                                className="h-9 w-[240px] rounded-full border border-border bg-background-secondary pl-9 pr-3.5 text-[12.5px] text-foreground outline-none placeholder:text-foreground-quadranary focus:border-border-active"
                            />
                        </div>
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button variant="secondary" className="h-9">
                                    {sort === 'az' ? 'A–Z' : 'All'}
                                    <ChevronDown className="h-3.5 w-3.5" />
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                                <DropdownMenuItem onSelect={() => setSort('featured')}>
                                    All
                                </DropdownMenuItem>
                                <DropdownMenuItem onSelect={() => setSort('az')}>
                                    A–Z
                                </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </div>
                }
            />

            <div className="mt-9 flex flex-wrap items-center gap-2">
                {(
                    [
                        { id: 'all', label: 'All' },
                        { id: 'component', label: 'Components' },
                        { id: 'block', label: 'Blocks' },
                    ] as { id: Filter; label: string }[]
                ).map((option) => (
                    <button
                        key={option.id}
                        onClick={() => setFilter(option.id)}
                        className={cn(
                            'h-8 rounded-full px-4 text-[12px] font-medium transition-colors',
                            filter === option.id
                                ? 'bg-foreground text-background'
                                : 'bg-background-secondary text-foreground-secondary hover:bg-background-hover hover:text-foreground',
                        )}
                    >
                        {option.label}
                    </button>
                ))}
                <span className="ml-1 text-[11.5px] text-foreground-quadranary">
                    {items.length} items
                </span>
            </div>

            <div className="mt-8 grid grid-flow-row-dense grid-cols-1 gap-x-6 gap-y-6 md:grid-cols-2 xl:grid-cols-6">
                {items.map((item) => (
                    <LibraryCard
                        key={`${item.kind}-${item.name}`}
                        item={item}
                        manager={manager}
                        onVisible={requestPreview}
                        onOpen={() => setSelected(item)}
                    />
                ))}
            </div>

            {items.length === 0 && (
                <p className="py-24 text-center text-[12.5px] text-foreground-quadranary">
                    Nothing in the library matches “{query}”.
                </p>
            )}

            <LibraryDetail
                item={selected}
                manager={manager}
                canUse={Boolean(
                    manager.projectPath &&
                    manager.status?.supported &&
                    editorEngine.elements.selected.length,
                )}
                onUse={onUse}
                onOpenChange={(open) => !open && setSelected(null)}
            />
        </div>
    );
});

/**
 * Reads the manager's preview maps, so it needs its own observer: a child of an
 * observer does not track observables read during the parent's render pass.
 */
const LibraryCard = observer(function LibraryCard({
    item,
    manager,
    onVisible,
    onOpen,
}: {
    item: CatalogItem;
    manager: ComponentsManager;
    onVisible: (name: string) => void;
    onOpen: () => void;
}) {
    const previewRef = useRef<HTMLDivElement | null>(null);
    const [hasEnteredViewport, setHasEnteredViewport] = useState(false);
    const span = getCatalogSpan(item);
    const snapshot = manager.catalogSnapshots[item.name];
    const previewUrl = manager.catalogPreviews[item.name];
    const previewSessionId = manager.catalogSessions[item.name];
    const previewLoading = Boolean(manager.catalogItemLoading[item.name]);
    const previewError = manager.catalogItemErrors[item.name];

    useEffect(() => {
        const node = previewRef.current;
        if (!node || !item.previewable || hasEnteredViewport) {
            return;
        }
        const observer = new IntersectionObserver(
            ([entry]) => {
                if (!entry?.isIntersecting) {
                    return;
                }
                setHasEnteredViewport(true);
                observer.disconnect();
                void manager.loadCatalogSnapshot(item.name).then((snapshot) => {
                    // A saved snapshot is enough for the library grid. Only
                    // start the preview runtime when this item has never been
                    // captured on this device.
                    if (!snapshot) onVisible(item.name);
                });
            },
            { rootMargin: '100px' },
        );
        observer.observe(node);
        return () => observer.disconnect();
    }, [hasEnteredViewport, item.name, item.previewable, onVisible]);

    return (
        <button
            onClick={onOpen}
            className={cn(
                'group flex flex-col overflow-hidden rounded-2xl border border-border bg-surface text-left transition-colors hover:border-border-hover',
                SPAN_CLASS[span],
            )}
        >
            <div
                ref={previewRef}
                className={cn(
                    'relative w-full overflow-hidden bg-background-secondary/40',
                    PREVIEW_HEIGHT[span],
                )}
            >
                {snapshot ? (
                    <img
                        src={snapshot}
                        alt={`${item.title} preview snapshot`}
                        className="h-full w-full object-contain"
                        draggable={false}
                    />
                ) : previewUrl && hasEnteredViewport ? (
                    <CardPreview
                        src={previewUrl}
                        title={`${item.title} live preview`}
                        name={item.name}
                        sessionId={previewSessionId}
                    />
                ) : previewLoading || (item.previewable && !previewError && !previewUrl) ? (
                    <PreviewShimmer name={item.name} />
                ) : (
                    <div className="flex h-full items-center justify-center p-6">
                        <ComponentThumbnail name={item.name} />
                    </div>
                )}
                {previewError && item.previewable && (
                    <span
                        className="absolute bottom-3 left-3 flex items-center gap-1 rounded-full bg-background/85 px-2 py-0.5 text-[10px] text-foreground-quadranary backdrop-blur"
                        title={previewError}
                    >
                        Preview unavailable
                    </span>
                )}
                <span className="absolute right-3 top-3 flex h-7 w-7 items-center justify-center rounded-full bg-background/80 text-foreground-tertiary opacity-0 backdrop-blur transition-opacity group-hover:opacity-100">
                    <ArrowUpRight className="h-3.5 w-3.5" />
                </span>
                <span className="absolute left-3 top-3 rounded-full bg-background/80 px-2 py-0.5 text-[10px] text-foreground-tertiary backdrop-blur">
                    {item.kind === 'block' ? 'Block' : getCategory(item.name)}
                </span>
            </div>
            <div className="flex items-start justify-between gap-3 border-t border-border px-4 py-3">
                <div className="min-w-0">
                    <p className="truncate text-[13px] font-medium text-foreground">{item.title}</p>
                    <p className="mt-0.5 line-clamp-1 text-[11.5px] text-foreground-quadranary">
                        {item.description}
                    </p>
                </div>
                <span className="mt-0.5 shrink-0 rounded-full border border-border px-2 py-0.5 text-[10px] text-foreground-tertiary">
                    {item.previewable ? 'Live' : 'Static'}
                </span>
            </div>
        </button>
    );
});

const LibraryDetail = observer(function LibraryDetail({
    item,
    manager,
    canUse,
    onUse,
    onOpenChange,
}: {
    item: CatalogItem | null;
    manager: ComponentsManager;
    canUse: boolean;
    onUse?: (name: string) => void;
    onOpenChange: (open: boolean) => void;
}) {
    const [copied, setCopied] = useState<'install' | 'agent' | null>(null);

    useEffect(() => {
        if (!item?.previewable) {
            return;
        }
        void manager.ensureCatalogPreviews([item.name]);
    }, [item, manager]);

    const copy = async (value: string, kind: 'install' | 'agent') => {
        await navigator.clipboard.writeText(value);
        setCopied(kind);
        window.setTimeout(() => setCopied(null), 1600);
    };

    const previewUrl = item ? manager.catalogPreviews[item.name] : undefined;
    const previewSessionId = item ? manager.catalogSessions[item.name] : undefined;
    const previewLoading = item ? Boolean(manager.catalogItemLoading[item.name]) : false;
    const previewError = item ? manager.catalogItemErrors[item.name] : undefined;

    return (
        <Dialog open={!!item} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-[860px] overflow-hidden rounded-2xl p-0">
                {item && (
                    <>
                        <div
                            className={cn(
                                'relative overflow-hidden border-b border-border bg-surface',
                                item.kind === 'block' ? 'h-[420px]' : 'h-[320px]',
                            )}
                        >
                            {previewUrl ? (
                                <PreviewFrame
                                    src={previewUrl}
                                    title={`${item.title} preview`}
                                    name={item.name}
                                    sessionId={previewSessionId}
                                    onRetry={() => manager.retryPreview(item.name)}
                                />
                            ) : previewError ? (
                                <div className="flex h-full flex-col items-center justify-center gap-3 p-8 text-center">
                                    <p className="max-w-md text-[12px] leading-5 text-foreground-tertiary">
                                        {previewError}
                                    </p>
                                    <Button
                                        size="sm"
                                        variant="outline"
                                        onClick={() => void manager.retryCatalogPreview(item.name)}
                                    >
                                        <RefreshCw className="h-3.5 w-3.5" />
                                        Retry preview
                                    </Button>
                                </div>
                            ) : previewLoading || item.previewable ? (
                                <PreviewShimmer name={item.name} />
                            ) : (
                                <div className="flex h-full flex-col items-center justify-center gap-3 p-8 text-center">
                                    <ComponentThumbnail name={item.name} />
                                    <p className="max-w-sm text-[11.5px] leading-5 text-foreground-quadranary">
                                        {item.limitation ?? 'This item cannot be previewed.'}
                                    </p>
                                </div>
                            )}
                        </div>
                        <div className="p-6">
                            <DialogHeader>
                                <DialogTitle>{item.title}</DialogTitle>
                                <DialogDescription>{item.description}</DialogDescription>
                            </DialogHeader>

                            <div className="mt-5 flex flex-wrap gap-2">
                                <Tag icon={item.kind === 'block' ? Blocks : Component}>
                                    {item.kind === 'block'
                                        ? (item.categories[0] ?? 'Block')
                                        : getCategory(item.name)}
                                </Tag>
                                {item.dependencies.slice(0, 4).map((dependency) => (
                                    <Tag key={dependency} icon={Package}>
                                        {dependency}
                                    </Tag>
                                ))}
                            </div>

                            {item.parts.length > 0 && (
                                <p className="mt-4 text-[11.5px] leading-5 text-foreground-quadranary">
                                    <span className="text-foreground-tertiary">Exports: </span>
                                    {item.parts.join(', ')}
                                </p>
                            )}

                            <div className="mt-5 flex flex-col gap-2">
                                <div className="flex items-center gap-2 rounded-lg border border-border bg-background-secondary px-3 py-2">
                                    <code className="min-w-0 flex-1 truncate text-[11.5px] text-foreground-secondary">
                                        {item.installCommand}
                                    </code>
                                    <Button
                                        size="sm"
                                        variant="ghost"
                                        className="h-7 px-2"
                                        onClick={() => copy(item.installCommand, 'install')}
                                    >
                                        {copied === 'install' ? (
                                            <Check className="h-3.5 w-3.5" />
                                        ) : (
                                            <Copy className="h-3.5 w-3.5" />
                                        )}
                                    </Button>
                                </div>
                            </div>

                            <div className="mt-5 flex items-center justify-between gap-3">
                                <p className="text-[11px] text-foreground-quadranary">
                                    Copies a prompt with the install command and JSX.
                                </p>
                                <div className="flex shrink-0 items-center gap-2">
                                    <Button
                                        variant={onUse ? 'secondary' : 'default'}
                                        onClick={() => copy(item.agentPrompt, 'agent')}
                                    >
                                        <Sparkles className="h-4 w-4" />
                                        {copied === 'agent' ? 'Copied' : 'Copy for agent'}
                                    </Button>
                                    {onUse && item.insertable && (
                                        <Button
                                            disabled={
                                                !canUse ||
                                                manager.using === item.name ||
                                                manager.installing === item.name
                                            }
                                            title={
                                                canUse
                                                    ? undefined
                                                    : 'Open a supported project and select an element in a frame first'
                                            }
                                            onClick={() => onUse(item.name)}
                                        >
                                            {manager.using === item.name && (
                                                <RefreshCw className="h-4 w-4 animate-spin" />
                                            )}
                                            {manager.using === item.name
                                                ? 'Adding…'
                                                : 'Use artifact in Kumite'}
                                        </Button>
                                    )}
                                </div>
                            </div>
                            {onUse &&
                                manager.using === item.name &&
                                manager.activeInsertionPlanId && (
                                    <div className="mt-2 flex justify-end">
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => void manager.cancelInsertion(item.name)}
                                        >
                                            Cancel insertion
                                        </Button>
                                    </div>
                                )}
                        </div>
                    </>
                )}
            </DialogContent>
        </Dialog>
    );
});

function Tag({ icon: Icon, children }: { icon: LucideIcon; children: React.ReactNode }) {
    return (
        <span className="flex items-center gap-1.5 rounded-full border border-border px-2.5 py-1 text-[10.5px] text-foreground-tertiary">
            <Icon className="h-3 w-3" />
            {children}
        </span>
    );
}
