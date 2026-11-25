import * as React from 'react';
import { Button } from './button';
import { cn } from '../utils';

export const Attachment = React.forwardRef<
    HTMLDivElement,
    React.HTMLAttributes<HTMLDivElement> & { size?: 'default' | 'sm' | 'xs' }
>(({ className, size = 'default', ...props }, ref) => (
    <div
        ref={ref}
        data-slot="attachment"
        data-size={size}
        className={cn(
            'group/attachment relative inline-flex max-w-full items-center gap-1.5 overflow-hidden rounded-md border border-border/80 bg-background-tertiary text-foreground-secondary',
            size === 'default' && 'min-h-9 px-2.5',
            size === 'sm' && 'min-h-7 px-2',
            size === 'xs' && 'min-h-6 px-1.5',
            className,
        )}
        {...props}
    />
));
Attachment.displayName = 'Attachment';

export const AttachmentMedia = ({ className, ...props }: React.HTMLAttributes<HTMLSpanElement>) => (
    <span
        data-slot="attachment-media"
        className={cn('flex size-4 shrink-0 items-center justify-center [&_svg]:size-4', className)}
        {...props}
    />
);

export const AttachmentContent = ({
    className,
    ...props
}: React.HTMLAttributes<HTMLSpanElement>) => (
    <span
        data-slot="attachment-content"
        className={cn('min-w-0 flex-1 truncate text-xs leading-none', className)}
        {...props}
    />
);

export const AttachmentTitle = ({ className, ...props }: React.HTMLAttributes<HTMLSpanElement>) => (
    <span
        data-slot="attachment-title"
        className={cn('block truncate text-xs leading-tight', className)}
        {...props}
    />
);

export const AttachmentActions = ({
    className,
    ...props
}: React.HTMLAttributes<HTMLDivElement>) => (
    <div
        data-slot="attachment-actions"
        className={cn('flex shrink-0 items-center gap-1', className)}
        {...props}
    />
);

export const AttachmentAction = React.forwardRef<
    HTMLButtonElement,
    React.ButtonHTMLAttributes<HTMLButtonElement>
>(({ className, ...props }, ref) => (
    <Button
        ref={ref}
        type="button"
        size="icon-sm"
        variant="ghost"
        data-slot="attachment-action"
        className={cn(
            'size-5 rounded-full p-0 opacity-0 transition-opacity group-hover/attachment:opacity-100 focus-visible:opacity-100',
            className,
        )}
        {...props}
    />
));
AttachmentAction.displayName = 'AttachmentAction';
