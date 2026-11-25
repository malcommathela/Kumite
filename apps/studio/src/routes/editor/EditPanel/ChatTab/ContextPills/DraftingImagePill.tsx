import { type ChatMessageContext, MessageContextType } from '@kumite/models/chat';
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
import { getTruncatedName } from './helpers';

export const DraftImagePill = React.forwardRef<
    HTMLDivElement,
    {
        context: ChatMessageContext;
        onRemove: () => void;
    }
>(({ context, onRemove }, ref) => {
    if (context.type !== MessageContextType.IMAGE) {
        console.warn('DraftingImagePill received non-image context');
        return null;
    }

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
            key={context.displayName}
            ref={ref}
        >
            <Attachment size="sm" className="max-w-40 gap-1.5 p-0">
                <AttachmentMedia className="size-7 overflow-hidden rounded-l-md">
                    <img
                        src={context.content}
                        alt={context.displayName}
                        className="size-full object-cover"
                    />
                </AttachmentMedia>
                <AttachmentContent className="pr-2">{getTruncatedName(context)}</AttachmentContent>
                <AttachmentActions className="pr-1">
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

DraftImagePill.displayName = 'DraftImagePill';
