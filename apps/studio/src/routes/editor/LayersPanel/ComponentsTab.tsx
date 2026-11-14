import { useEditorEngine } from '@/components/Context';
import type { ShadcnLibraryItem } from '@kumite/models';
import { isShadcnBlock, SHADCN_BLOCKS } from '@kumite/models';
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
import { toast } from '@kumite/ui/use-toast';
import { cn } from '@kumite/ui/utils';
import { observer } from 'mobx-react-lite';
import { useEffect, useMemo, useState } from 'react';

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

function DefinitionCard({
    definition,
    installed,
    onSelect,
}: {
    definition: ShadcnLibraryItem;
    installed: boolean;
    onSelect: () => void;
}) {
    return (
        <article className="group overflow-hidden rounded-xl border border-border/70 bg-background transition-colors hover:border-border-hover">
            <button
                type="button"
                className="block w-full text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                onClick={onSelect}
                aria-label={`View ${definition.title} details`}
            >
                <div className="flex h-36 items-center justify-center overflow-hidden bg-muted/35 px-4">
                    <ComponentThumbnail name={definition.name} />
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
        if (manager.previewComponent) {
            void manager.closePreview();
        }
        setSelectedName(name);
        const definition = manager.catalog.find((item) => item.name === name);
        if (definition && isShadcnBlock(definition) && definition.previewUrl) {
            void manager.openPreview(name);
        }
    };

    const install = async (definition: ShadcnLibraryItem) => {
        const wasInstalled = Boolean(manager.status?.installed[definition.name]);
        try {
            const result = await manager.install(definition.name);
            if (!wasInstalled || !result.success) {
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
        if (isShadcnBlock(definition) && definition.previewUrl) {
            await manager.openPreview(definition.name);
            return;
        }
        if (!(await install(definition))) {
            return;
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
            return 'Installing…';
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
                        Component library
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
                                        disabled={
                                            !(isShadcnBlock(definition) && definition.previewUrl) &&
                                            !manager.status?.previewSupported
                                        }
                                        title={
                                            isShadcnBlock(definition) && definition.previewUrl
                                                ? 'Preview from the official shadcn registry'
                                                : (manager.status?.previewReason ?? undefined)
                                        }
                                        onClick={() => {
                                            setLibraryOpen(true);
                                            selectDefinition(definition.name);
                                            void preview(definition);
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
                                    manager.previewLoading && (
                                        <div className="text-sm text-muted-foreground">
                                            Starting live preview…
                                        </div>
                                    )}
                                {manager.previewComponent === selectedDefinition.name &&
                                    manager.previewError && (
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
                                    )}
                                {manager.previewComponent === selectedDefinition.name &&
                                    manager.previewUrl && (
                                        <iframe
                                            key={manager.previewUrl}
                                            title={`${selectedDefinition.title} live preview`}
                                            src={manager.previewUrl}
                                            className="h-full min-h-[300px] w-full bg-background"
                                            sandbox="allow-scripts allow-same-origin allow-forms"
                                        />
                                    )}
                                {manager.previewComponent !== selectedDefinition.name && (
                                    <div className="w-full p-5">
                                        <div className="mx-auto flex min-h-[250px] max-w-xl items-center justify-center rounded-lg border border-border/70 bg-background p-8">
                                            <div className="w-full">
                                                <ComponentThumbnail
                                                    name={selectedDefinition.name}
                                                />
                                            </div>
                                        </div>
                                        <p className="mt-3 text-center text-[11px] text-muted-foreground">
                                            {isShadcnBlock(selectedDefinition) &&
                                            selectedDefinition.previewUrl
                                                ? 'Previewed from the pinned official shadcn blocks registry.'
                                                : manager.status?.installed[selectedDefinition.name]
                                                  ? 'Open a live preview of the installed component.'
                                                  : 'Install to render this component with your project’s actual source and theme.'}
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
                                    {(!isShadcnBlock(selectedDefinition) ||
                                        !selectedDefinition.previewUrl) &&
                                        manager.status?.supported &&
                                        !manager.status.previewSupported && (
                                            <p className="text-xs leading-5 text-muted-foreground">
                                                {manager.status.previewReason}
                                            </p>
                                        )}
                                </div>
                                <div className="mt-auto flex flex-col gap-2 pt-6">
                                    {selectedDefinition.previewable !== false && (
                                        <Button
                                            variant="outline"
                                            disabled={
                                                (!(
                                                    isShadcnBlock(selectedDefinition) &&
                                                    selectedDefinition.previewUrl
                                                ) &&
                                                    (!projectPath ||
                                                        !manager.status?.supported ||
                                                        !manager.status.previewSupported)) ||
                                                manager.installing === selectedDefinition.name ||
                                                manager.previewLoading
                                            }
                                            title={
                                                isShadcnBlock(selectedDefinition) &&
                                                selectedDefinition.previewUrl
                                                    ? 'Preview from the official shadcn registry'
                                                    : (manager.status?.previewReason ?? undefined)
                                            }
                                            onClick={() => void preview(selectedDefinition)}
                                        >
                                            {manager.previewLoading
                                                ? 'Preparing preview…'
                                                : isShadcnBlock(selectedDefinition) &&
                                                    selectedDefinition.previewUrl
                                                  ? 'Preview block'
                                                  : !manager.status?.previewSupported
                                                    ? 'Live preview unavailable'
                                                    : manager.status?.installed[
                                                            selectedDefinition.name
                                                        ]
                                                      ? 'Live preview'
                                                      : 'Install & preview'}
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
