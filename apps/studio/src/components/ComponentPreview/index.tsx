import {
    advancePreviewState,
    parsePreviewMessage,
    type PreviewLifecycleState,
} from '@kumite/models';
import { Button } from '@kumite/ui/button';
import { cn } from '@kumite/ui/utils';
import { useEffect, useLayoutEffect, useRef, useState } from 'react';

export const CATEGORIES: Record<string, string[]> = {
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

export function getCategory(name: string): string {
    return CATEGORY_FOR_COMPONENT.get(name) ?? 'Other';
}

export function PreviewShimmer({ name }: { name?: string }) {
    void name;
    return (
        <div
            className="kumite-shimmer relative h-full w-full overflow-hidden bg-muted/40"
            role="status"
            aria-label="Loading preview"
        >
            <span className="sr-only">Loading preview</span>
        </div>
    );
}

/**
 * Waits for the preview page's handshake instead of trusting `load`: a Vite
 * iframe fires `load` on the empty shell before React commits, which left the
 * shimmer covering a blank frame. Messages are accepted only from this iframe
 * and only for this session id.
 */
export function usePreviewHandshake(sessionId: string | null) {
    const frameRef = useRef<HTMLIFrameElement | null>(null);
    const [state, setState] = useState<PreviewLifecycleState | 'idle'>('idle');
    const [detail, setDetail] = useState<string | null>(null);
    const [attempt, setAttempt] = useState(0);

    useLayoutEffect(() => {
        setState('idle');
        setDetail(null);
        if (!sessionId) {
            return;
        }
        // A missing handshake is not a render failure. Iframes may be queued by
        // the browser or take a long time to load Vite and its dependencies.
        // Keep the frame mounted until it reports an actual runtime error.
        const listener = (event: MessageEvent) => {
            if (event.source !== frameRef.current?.contentWindow) {
                return;
            }
            const message = parsePreviewMessage(event.data);
            if (!message || message.sessionId !== sessionId) {
                return;
            }
            if (message.state === 'error') {
                setState('error');
                setDetail(message.detail ?? 'The preview crashed while rendering.');
                return;
            }
            if (message.state === 'mounted') {
                setState('mounted');
                setDetail(null);
                return;
            }
            setState((current) => advancePreviewState(current, message) ?? current);
        };
        window.addEventListener('message', listener);
        return () => {
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

export function PreviewFrame({
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

export function ComponentThumbnail({ name }: { name: string }) {
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

export function CardPreview({
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
                loading="eager"
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
