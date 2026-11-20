import { cn } from '../utils';

function Skeleton({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
    return <div className={cn('kumite-shimmer relative isolate overflow-hidden rounded-md bg-muted/70', className)} {...props} />;
}

export { Skeleton };
