import { useEditorEngine } from '@/components/Context';
import type { ShadcnComponentDefinition } from '@kumite/models';
import { Button } from '@kumite/ui/button';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from '@kumite/ui/dialog';
import { Input } from '@kumite/ui/input';
import { toast } from '@kumite/ui/use-toast';
import { cn } from '@kumite/ui/utils';
import { observer } from 'mobx-react-lite';
import { useEffect, useState } from 'react';

function ComponentRow({ definition }: { definition: ShadcnComponentDefinition }) {
    const editorEngine = useEditorEngine();
    const manager = editorEngine.components;
    const installed = Boolean(manager.status?.installed[definition.name]);
    const installing = manager.installing === definition.name;
    const hasSelection = editorEngine.elements.selected.length > 0;
    // The catalog records what the pinned snapshot can actually do. A missing
    // capability is shown as a reason, never as a button that would fail.
    const installable = definition.installable !== false;
    const insertable = definition.insertable !== false;
    const previewable = definition.previewable !== false;

    const onInstall = async () => {
        const result = await manager.install(definition.name);
        toast({
            title: result.success
                ? `${definition.title} ready`
                : `Could not install ${definition.title}`,
            description: result.message,
            variant: result.success ? 'default' : 'destructive',
        });
    };

    const onInsert = async () => {
        const result = await manager.insert(definition.name);
        toast({
            title: result.success ? `Inserted ${definition.title}` : 'Insert failed',
            description: result.message,
            variant: result.success ? 'default' : 'destructive',
        });
    };

    return (
        <div className="flex flex-col gap-2 border-b border-border/60 px-3 py-3 last:border-b-0">
            <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                    <div className="text-sm font-medium text-foreground">{definition.title}</div>
                    <p className="mt-0.5 text-xs leading-5 text-muted-foreground">
                        {definition.description}
                    </p>
                </div>
                <span
                    className={cn(
                        'mt-1 shrink-0 rounded-full border px-2 py-0.5 text-[10px] uppercase tracking-wide',
                        installed
                            ? 'border-emerald-500/30 text-emerald-500'
                            : installable
                              ? 'border-border text-muted-foreground'
                              : 'border-amber-500/30 text-amber-600 dark:text-amber-500',
                    )}
                >
                    {installed ? 'Installed' : installable ? 'Not installed' : 'Unavailable'}
                </span>
            </div>
            <div className="flex items-center gap-2">
                {installed ? (
                    <>
                        {previewable && (
                            <Button
                                size="sm"
                                variant="outline"
                                className="h-7 px-2 text-xs"
                                onClick={() => void manager.openPreview(definition.name)}
                            >
                                Preview
                            </Button>
                        )}
                        {insertable && (
                            <Button
                                size="sm"
                                variant="secondary"
                                className="h-7 px-2 text-xs"
                                disabled={!hasSelection}
                                title={
                                    hasSelection
                                        ? 'Append this component inside the selected element'
                                        : 'Select an element in a frame first'
                                }
                                onClick={() => void onInsert()}
                            >
                                Insert
                            </Button>
                        )}
                        {!insertable && !previewable && (
                            <span className="text-[11px] text-muted-foreground">
                                Installed. Nothing to insert or preview here.
                            </span>
                        )}
                    </>
                ) : installable ? (
                    <Button
                        size="sm"
                        variant="outline"
                        className="h-7 px-2 text-xs"
                        disabled={installing}
                        onClick={() => void onInstall()}
                    >
                        {installing ? 'Installing…' : 'Install'}
                    </Button>
                ) : (
                    <span className="text-[11px] text-muted-foreground">
                        Not in the pinned registry snapshot.
                    </span>
                )}
            </div>
            {definition.limitation && (
                <p className="text-[11px] leading-5 text-muted-foreground">
                    {definition.limitation}
                </p>
            )}
        </div>
    );
}

const ComponentsTab = observer(() => {
    const editorEngine = useEditorEngine();
    const manager = editorEngine.components;
    const [previewOpen, setPreviewOpen] = useState(false);
    const [query, setQuery] = useState('');
    const projectPath = manager.projectPath;

    useEffect(() => {
        void manager.refresh();
    }, [manager, projectPath]);

    useEffect(() => {
        if (manager.previewComponent) {
            setPreviewOpen(true);
        }
    }, [manager.previewComponent]);

    const onPreviewOpenChange = (open: boolean) => {
        setPreviewOpen(open);
        if (!open) {
            void manager.closePreview();
        }
    };

    const initialize = async () => {
        const result = await manager.initialize();
        toast({
            title: result.success ? 'shadcn/ui initialized' : 'Initialization failed',
            description: result.message,
            variant: result.success ? 'default' : 'destructive',
        });
    };

    const previewDefinition = manager.catalog.find(
        (definition) => definition.name === manager.previewComponent,
    );

    const needle = query.trim().toLowerCase();
    const catalog = needle
        ? manager.catalog.filter(
              (definition) =>
                  definition.name.includes(needle) ||
                  definition.title.toLowerCase().includes(needle) ||
                  definition.description.toLowerCase().includes(needle),
          )
        : manager.catalog;

    return (
        <div className="flex h-full w-full flex-col">
            <div className="flex items-center justify-between border-b px-3 py-2">
                <div>
                    <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                        shadcn/ui
                    </div>
                    <div className="text-[11px] text-muted-foreground">
                        {manager.status?.initialized
                            ? 'Real components from this project'
                            : 'Official registry components'}
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

            {!projectPath && (
                <div className="p-4 text-xs leading-5 text-muted-foreground">
                    Open a project to install and preview components.
                </div>
            )}

            {projectPath && manager.status && !manager.status.supported && (
                <div className="space-y-2 p-4 text-xs leading-5 text-muted-foreground">
                    <p className="font-medium text-foreground">Components unavailable</p>
                    <p>{manager.status.reason}</p>
                </div>
            )}

            {projectPath && manager.status?.supported && !manager.status.initialized && (
                <div className="space-y-3 border-b p-4">
                    <p className="text-xs leading-5 text-muted-foreground">
                        This project uses Tailwind but has no components.json yet. Initialize
                        shadcn/ui before installing components.
                    </p>
                    <Button
                        size="sm"
                        className="h-7 px-2 text-xs"
                        disabled={manager.initializing}
                        onClick={() => void initialize()}
                    >
                        {manager.initializing ? 'Initializing…' : 'Initialize shadcn/ui'}
                    </Button>
                </div>
            )}

            {projectPath && manager.status?.supported && (
                <>
                    <div className="border-b px-3 py-2">
                        <Input
                            value={query}
                            onChange={(event) => setQuery(event.target.value)}
                            placeholder="Search 54 components"
                            className="h-7 text-xs"
                            aria-label="Search components"
                        />
                    </div>
                    <div className="min-h-0 flex-1 overflow-auto">
                        {catalog.map((definition) => (
                            <ComponentRow key={definition.name} definition={definition} />
                        ))}
                        {catalog.length === 0 && (
                            <div className="p-4 text-xs leading-5 text-muted-foreground">
                                No component matches “{query.trim()}”.
                            </div>
                        )}
                    </div>
                </>
            )}

            {manager.lastLog && (
                <details className="border-t px-3 py-2 text-[11px] text-muted-foreground">
                    <summary className="cursor-pointer select-none">Last CLI output</summary>
                    <pre className="mt-2 max-h-40 overflow-auto whitespace-pre-wrap break-words">
                        {manager.lastLog}
                    </pre>
                </details>
            )}

            <Dialog open={previewOpen} onOpenChange={onPreviewOpenChange}>
                <DialogContent className="flex h-[560px] w-[900px] max-w-[92vw] flex-col gap-3 p-4">
                    <DialogHeader>
                        <DialogTitle>
                            {previewDefinition ? `${previewDefinition.title} preview` : 'Preview'}
                        </DialogTitle>
                        <DialogDescription>
                            Rendered from this project&apos;s installed component and compiled
                            Tailwind CSS.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="min-h-0 flex-1 overflow-hidden rounded-md border bg-background">
                        {manager.previewLoading && (
                            <div className="flex h-full items-center justify-center text-xs text-muted-foreground">
                                Starting isolated preview…
                            </div>
                        )}
                        {!manager.previewLoading && manager.previewError && (
                            <div className="flex h-full items-center justify-center p-6 text-center text-xs text-muted-foreground">
                                {manager.previewError}
                            </div>
                        )}
                        {!manager.previewLoading && manager.previewUrl && (
                            <iframe
                                key={manager.previewUrl}
                                title="Component preview"
                                src={manager.previewUrl}
                                className="h-full w-full"
                                sandbox="allow-scripts allow-same-origin allow-forms"
                            />
                        )}
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
});

export default ComponentsTab;
