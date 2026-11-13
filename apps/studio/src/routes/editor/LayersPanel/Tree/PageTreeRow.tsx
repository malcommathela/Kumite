import type { PageNode } from '@kumite/models/pages';
import { cn } from '@kumite/ui/utils';
import { forwardRef } from 'react';
import type { RowRendererProps } from 'react-arborist';

const PageTreeRow = forwardRef<
    HTMLDivElement,
    RowRendererProps<PageNode> & { isHighlighted?: boolean }
>(({ attrs, children, isHighlighted }, ref) => {
    return (
        <div
            ref={ref}
            {...attrs}
            className={cn(
                'outline-none h-6 cursor-pointer w-full rounded',
                'text-foreground-kumite/70',
                !attrs['aria-selected'] && [
                    isHighlighted && 'bg-background-kumite text-foreground-primary',
                    'hover:text-foreground-primary hover:bg-background-kumite',
                ],
                attrs['aria-selected'] && [
                    '!bg-[#FA003C] dark:!bg-[#FA003C]',
                    '!text-primary dark:!text-primary',
                    '![&]:hover:bg-[#FA003C] dark:[&]:hover:bg-[#FA003C]',
                ],
            )}
        >
            {children}
        </div>
    );
});

PageTreeRow.displayName = 'PageTreeRow';
export default PageTreeRow;
