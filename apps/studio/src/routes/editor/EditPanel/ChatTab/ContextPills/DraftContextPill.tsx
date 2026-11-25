import { type ChatMessageContext } from '@kumite/models/chat';
import {
    Attachment,
    AttachmentAction,
    AttachmentActions,
    AttachmentContent,
    AttachmentMedia,
} from '@kumite/ui/attachment';
import { Cancel01Icon } from '@hugeicons/core-free-icons';
import { HugeiconsIcon } from '@hugeicons/react';
import { motion } from 'motion/react';
import React from 'react';
import { getContextIcon, getTruncatedName } from './helpers';

export const DraftContextPill = React.forwardRef<
    HTMLDivElement,
    {
        context: ChatMessageContext;
        onRemove: () => void;
    }
>(({ context, onRemove }, ref) => {
    return (
        <motion.span
            layout="position"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            transition={{
                duration: 0.2,
                layout: {
                    duration: 0.15,
                    ease: 'easeOut',
                },
            }}
            className="relative"
            ref={ref}
        >
            <Attachment size="sm" className="max-w-48">
                <AttachmentMedia>{getContextIcon(context)}</AttachmentMedia>
                <AttachmentContent>{getTruncatedName(context)}</AttachmentContent>
                <AttachmentActions>
                    <AttachmentAction
                        aria-label={`Remove ${getTruncatedName(context)}`}
                        onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            onRemove();
                        }}
                    >
                        <HugeiconsIcon icon={Cancel01Icon} size={12} aria-hidden="true" />
                    </AttachmentAction>
                </AttachmentActions>
            </Attachment>
        </motion.span>
    );
});

DraftContextPill.displayName = 'DraftContextPill';
