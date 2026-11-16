import {
    CardPreview,
    CATEGORIES,
    ComponentThumbnail,
    getCategory,
    PreviewFrame,
    PreviewShimmer,
} from '@/components/ComponentPreview';
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
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

type ProviderId = 'shadcn' | '21st-dev' | 'magic-ui';
type CatalogKind = 'all' | 'components' | 'blocks';

const PROVIDERS: Array<{ id: ProviderId; label: string; available: boolean }> = [
    { id: 'shadcn', label: 'shadcn/ui', available: true },
    { id: '21st-dev', label: '21st.dev', available: false },
    { id: 'magic-ui', label: 'Magic UI', available: false },
];

const BLOCK_CATEGORIES = [...new Set(SHADCN_BLOCKS.flatMap((block) => block.categories))].map(
    (category) => category.replace(/^./, (letter) => letter.toUpperCase()),
);

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

    const preview = async (definition: ShadcnLibraryItem) => {
        if (manager.catalogItemErrors[definition.name]) {
            await manager.retryCatalogPreview(definition.name);
        }
        await manager.openPreview(definition.name);
    };

    const useComponent = async (definition: ShadcnLibraryItem) => {
        if (definition.insertable === false) {
            toast({
                title: 'This component needs an upstream composition',
                description: definition.limitation ?? 'No safe artifact insertion is available.',
                variant: 'destructive',
            });
            return;
        }
        let review;
        try {
            review = await manager.prepareInsertion(definition.name);
        } catch (error: any) {
            toast({
                title: 'Could not prepare artifact insertion',
                description: error?.message ?? 'The upstream implementation could not be resolved.',
                variant: 'destructive',
            });
            return;
        }
        if (review.conflicts.length || review.unsupportedRequirements.length) {
            toast({
                title: 'Insertion needs changes first',
                description: [
                    ...review.conflicts.map((file) => `Existing file conflict: ${file}`),
                    ...review.unsupportedRequirements,
                ].join('\n'),
                variant: 'destructive',
            });
            return;
        }
        const files =
            review.filesToCreate
                .map(
                    (file) =>
                        `  • ${file.path}\n    ${file.sourceHash} → ${file.publishedHash}${file.transformations.length ? `\n    AST: ${file.transformations.map((item) => `${item.from} → ${item.to}`).join(', ')}` : ''}`,
                )
                .join('\n') || '  • No new source files';
        const dependencies =
            review.dependencies
                .map(
                    (dependency) =>
                        `  • ${dependency.action === 'install' ? 'Install' : 'Reuse'} ${dependency.name}@${dependency.version}`,
                )
                .join('\n') || '  • None';
        const assets =
            review.assets
                .filter((asset) => !asset.external)
                .map(
                    (asset) =>
                        `  • ${asset.action} ${asset.sourcePath} → ${asset.destinationPath} [${asset.sha256 ?? 'hash unavailable'}]`,
                )
                .join('\n') || '  • None';
        const approval = [
            `Artifact: ${review.artifact.id}`,
            `SHA-256: ${review.artifact.artifactHash}`,
            `Project runtime: ${review.project.framework}; package manager: ${review.project.packageManager ?? 'unknown'}`,
            `Aliases: components=${review.project.componentsAlias ?? 'default'}, ui=${review.project.uiAlias ?? 'default'}`,
            `Editor target: ${review.editorTarget.oid} (${review.editorTarget.domId})`,
            '',
            'Files to create:',
            files,
            '',
            'Dependencies (exact versions; lifecycle scripts disabled):',
            dependencies,
            '',
            'Local assets:',
            assets,
            '',
            `Providers: ${review.providers.join(', ') || 'none'}`,
            `Configuration changes: ${review.configurationChanges.join(', ') || 'none'}`,
            `Warnings: ${review.warnings.join('; ') || 'none'}`,
            '',
            'Approve publishing these files and installing only the listed dependencies?',
        ].join('\n');
        if (!window.confirm(approval)) {
            toast({
                title: 'Insertion cancelled',
                description: 'No project files or dependencies were changed.',
            });
            return;
        }
        const result = await manager.insert(definition.name, {
            planId: review.planId,
            planHash: review.planHash,
            editorTarget: review.editorTarget,
        });
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
        return 'Use artifact in Kumite';
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
                                            'Local preview of the resolved implementation artifact'
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
                                {selectedCatalogUrl && (
                                    <span className="absolute left-3 top-3 z-10 rounded bg-background/90 px-2 py-1 text-[10px] font-medium text-muted-foreground shadow-sm">
                                        Local artifact preview
                                    </span>
                                )}
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
                                                  : 'Local artifact preview is unavailable for this item.'}
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
                                    {manager.catalogPreviewSources[selectedDefinition.name] && (
                                        <div>
                                            <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                                                Preview source
                                            </div>
                                            <div className="mt-1 text-xs text-muted-foreground">
                                                Resolved upstream artifact · local runtime
                                            </div>
                                        </div>
                                    )}
                                    {isShadcnBlock(selectedDefinition) &&
                                        selectedDefinition.previewUrl && (
                                            <a
                                                className="text-xs text-muted-foreground underline underline-offset-2 hover:text-foreground"
                                                href={selectedDefinition.previewUrl}
                                                target="_blank"
                                                rel="noreferrer"
                                            >
                                                Open official preview reference
                                            </a>
                                        )}
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
                                            title={'Preview the resolved source artifact locally'}
                                            onClick={() => void preview(selectedDefinition)}
                                        >
                                            {manager.previewLoading ||
                                            selectedItemLoading ||
                                            manager.catalogBaseLoading
                                                ? 'Preparing preview…'
                                                : 'Local artifact preview'}
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
