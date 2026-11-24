import { useEditorEngine } from '@/components/Context';
import { LibraryView } from '@/routes/projects/ProjectsTab/LibraryView';
import type { ShadcnLibraryItem } from '@kumite/models';
import { Button } from '@kumite/ui/button';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from '@kumite/ui/dialog';
import { Icons } from '@kumite/ui/icons';
import { toast } from '@kumite/ui/use-toast';
import { observer } from 'mobx-react-lite';
import { useEffect, useState } from 'react';

const ComponentsTab = observer(() => {
    const editorEngine = useEditorEngine();
    const manager = editorEngine.components;
    const [libraryOpen, setLibraryOpen] = useState(false);
    const [selectedName, setSelectedName] = useState<string | null>(null);
    const projectPath = manager.projectPath;
    const hasSelection = editorEngine.elements.selected.length > 0;

    useEffect(() => {
        void manager.refresh();
    }, [manager, projectPath]);

    const closeLibrary = (open: boolean) => {
        setLibraryOpen(open);
        if (!open) {
            setSelectedName(null);
            void manager.closePreview();
        }
    };

    const selectDefinition = (name: string) => {
        setLibraryOpen(true);
        setSelectedName(name);
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
                                onClick={() => selectDefinition(definition.name)}
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
                                        onClick={() => selectDefinition(definition.name)}
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
                                {manager.using === definition.name &&
                                    manager.activeInsertionPlanId && (
                                        <Button
                                            size="sm"
                                            variant="ghost"
                                            className="h-7 px-2 text-[11px]"
                                            onClick={() =>
                                                void manager.cancelInsertion(definition.name)
                                            }
                                        >
                                            Cancel
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
                <DialogContent className="block h-[86vh] w-[1200px] max-w-[96vw] overflow-y-auto p-0">
                    <DialogHeader className="sr-only">
                        <DialogTitle>Library</DialogTitle>
                        <DialogDescription>
                            Browse components and blocks, preview them, and add them to your design.
                        </DialogDescription>
                    </DialogHeader>
                    <LibraryView
                        popup
                        initialSelectedName={selectedName}
                        onUse={(name) => {
                            const definition = manager.catalog.find((item) => item.name === name);
                            if (definition) {
                                void useComponent(definition);
                            }
                        }}
                    />
                </DialogContent>
            </Dialog>
        </div>
    );
});

export default ComponentsTab;
