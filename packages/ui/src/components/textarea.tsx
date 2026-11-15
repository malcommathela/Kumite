import * as React from 'react';

import { cn } from '../utils';

export interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {}

const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
    ({ className, ...props }, ref) => {
        return (
            <textarea
                className={cn(
                    'flex min-h-[64px] w-full rounded-lg border border-input bg-background-secondary px-3 py-2 text-small text-foreground placeholder:text-foreground-tertiary focus-visible:outline-none focus-visible:border-border-active focus-visible:bg-background-hover disabled:cursor-not-allowed disabled:opacity-50',
                    className,
                )}
                ref={ref}
                {...props}
            />
        );
    },
);
Textarea.displayName = 'Textarea';

export { Textarea };
