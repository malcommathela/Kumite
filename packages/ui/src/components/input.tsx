import * as React from 'react';

import { cn } from '../utils';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
    ({ className, type, ...props }, ref) => {
        return (
            <input
                type={type}
                className={cn(
                    'flex h-9 w-full rounded-lg border border-input bg-background-secondary px-3 py-1 text-small text-foreground transition-colors',
                    'file:border-0 file:bg-transparent file:text-small file:font-medium',
                    'placeholder:text-foreground-tertiary',
                    'focus-visible:outline-none focus-visible:border-border-active focus-visible:bg-background-hover',
                    'disabled:cursor-not-allowed disabled:opacity-50',
                    className,
                )}
                ref={ref}
                {...props}
            />
        );
    },
);
Input.displayName = 'Input';

export { Input };
