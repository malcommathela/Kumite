import * as React from 'react';
import { Button, type ButtonProps } from './button';
import { Textarea, type TextareaProps } from './textarea';
import { cn } from '../utils';

/** Composer-specific shadcn input group, separate from the color picker's legacy InputGroup. */
export const InputGroup = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
    ({ className, ...props }, ref) => (
        <div
            ref={ref}
            data-slot="input-group"
            className={cn(
                'flex w-full flex-col overflow-hidden rounded-xl border border-border/80 bg-surface transition-colors focus-within:border-ring focus-within:ring-1 focus-within:ring-ring/40',
                className,
            )}
            {...props}
        />
    ),
);
InputGroup.displayName = 'InputGroup';

export const InputGroupAddon = React.forwardRef<
    HTMLDivElement,
    React.HTMLAttributes<HTMLDivElement> & { align?: 'block-start' | 'block-end' }
>(({ align = 'block-start', className, ...props }, ref) => (
    <div
        ref={ref}
        data-slot="input-group-addon"
        data-align={align}
        className={cn(
            'flex w-full items-center gap-2 px-2',
            align === 'block-start' && 'border-b border-border/60 py-2',
            align === 'block-end' && 'border-t border-border/60 py-1.5',
            className,
        )}
        {...props}
    />
));
InputGroupAddon.displayName = 'InputGroupAddon';

export const InputGroupButton = React.forwardRef<
    HTMLButtonElement,
    ButtonProps & { size?: ButtonProps['size'] }
>(({ className, size = 'icon-sm', variant = 'outline', ...props }, ref) => (
    <Button
        ref={ref}
        size={size}
        variant={variant}
        data-slot="input-group-button"
        className={cn('shrink-0 rounded-md text-foreground-secondary', className)}
        {...props}
    />
));
InputGroupButton.displayName = 'InputGroupButton';

export const InputGroupTextarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
    ({ className, ...props }, ref) => (
        <Textarea
            ref={ref}
            data-slot="input-group-textarea"
            className={cn(
                'min-h-24 w-full resize-none rounded-none border-0 bg-transparent px-3 py-3 text-small shadow-none focus-visible:border-0 focus-visible:bg-transparent focus-visible:ring-0',
                className,
            )}
            {...props}
        />
    ),
);
InputGroupTextarea.displayName = 'InputGroupTextarea';
