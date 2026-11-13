import { cn } from '../utils';

/**
 * Typographic wordmark. Replaces the upstream Onlook logo artwork, which is not
 * Kumite's to ship; a designed mark can be dropped in here later.
 */
export function KumiteWordmark({ className }: { className?: string }) {
    return (
        <span className={cn('select-none font-medium leading-none tracking-tight', className)}>
            Kumite
        </span>
    );
}
