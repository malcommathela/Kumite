import { useEditorEngine } from '@/components/Context';
import type { AssistantChatMessageImpl } from '@/lib/editor/engine/chat/message/assistant';
import type { ToolChatMessageImpl } from '@/lib/editor/engine/chat/message/tool';
import type { UserChatMessageImpl } from '@/lib/editor/engine/chat/message/user';
import { ChatMessageRole } from '@kumite/models/chat';
import { Button } from '@kumite/ui/button';
import { Card, CardContent } from '@kumite/ui/card';
import {
    CodeFolderIcon,
    Image01Icon,
    PaintBrush01Icon,
    SparklesIcon,
    SquareIcon,
} from '@hugeicons/core-free-icons';
import { HugeiconsIcon } from '@hugeicons/react';
import { observer } from 'mobx-react-lite';
import { AnimatePresence, motion } from 'motion/react';
import { useCallback, useEffect, useRef } from 'react';
import { AssistantMessage } from './AssistantMessage';
import { ErrorMessage } from './ErrorMessage';
import { StreamMessage } from './StreamMessage';
import { UserMessage } from './UserMessage';

export const ChatMessages = observer(() => {
    const editorEngine = useEditorEngine();
    const chatMessagesRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (chatMessagesRef.current) {
            chatMessagesRef.current.scrollTop = chatMessagesRef.current.scrollHeight;
        }
    }, [editorEngine.chat.conversation.current?.messages.length]);

    const renderMessage = useCallback(
        (message: AssistantChatMessageImpl | UserChatMessageImpl | ToolChatMessageImpl) => {
            let messageNode;
            switch (message.role) {
                case ChatMessageRole.ASSISTANT:
                    messageNode = <AssistantMessage message={message} />;
                    break;
                case ChatMessageRole.USER:
                    messageNode = <UserMessage message={message} />;
                    break;
                case ChatMessageRole.TOOL:
                    // No need to render tool results messages
                    break;
            }
            return <div key={message.id}>{messageNode}</div>;
        },
        [],
    );

    // Render in reverse order to make the latest message appear at the bottom
    return (
        <AnimatePresence mode="wait">
            {editorEngine.chat.conversation.current &&
            editorEngine.chat.conversation.current?.messages.length !== 0 ? (
                <motion.div
                    className="flex flex-col-reverse gap-2 select-text overflow-auto"
                    ref={chatMessagesRef}
                    key="conversation"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.15 }}
                >
                    <StreamMessage />
                    <ErrorMessage />
                    {[...editorEngine.chat.conversation.current.messages]
                        .reverse()
                        .map((message) => renderMessage(message))}
                </motion.div>
            ) : (
                // Only show empty state if no elements are selected
                !editorEngine.elements.selected.length && (
                    <motion.div
                        key="empty-state"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.15 }}
                        className="flex flex-1 flex-col items-center justify-center px-6 text-foreground-tertiary/80"
                    >
                        <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl border border-border bg-background-secondary text-foreground">
                            <HugeiconsIcon icon={SparklesIcon} size={20} />
                        </div>
                        <p className="text-center text-sm font-semibold tracking-tight text-foreground">
                            What should we work on?
                        </p>
                        <p className="mt-1.5 max-w-[280px] text-center text-xs leading-5 text-foreground-tertiary">
                            Choose a starting point, then select an element to give your agent
                            context.
                        </p>
                        <Card className="mt-5 w-full max-w-[290px] rounded-xl border-border/80 bg-background/50 shadow-none">
                            <CardContent className="p-3">
                                <div className="mb-2.5 flex items-center gap-2 px-0.5">
                                    <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-background-active text-foreground">
                                        <HugeiconsIcon icon={SparklesIcon} size={14} />
                                    </span>
                                    <span className="text-[11px] font-medium text-foreground-secondary">
                                        Kumite agents
                                    </span>
                                    <span className="ml-auto h-1.5 w-1.5 rounded-full bg-primary" />
                                    <span className="text-[10px] text-foreground-tertiary">
                                        Selection based
                                    </span>
                                </div>
                                <div className="grid grid-cols-2 gap-1.5">
                                    {[
                                        {
                                            icon: PaintBrush01Icon,
                                            label: 'Polish a section',
                                            prompt: 'Polish this section while preserving Kumite’s existing colors and visual direction.',
                                        },
                                        {
                                            icon: SquareIcon,
                                            label: 'Explore a layout',
                                            prompt: 'Explore a clearer layout for this section without changing its purpose or content.',
                                        },
                                        {
                                            icon: CodeFolderIcon,
                                            label: 'Refine the UI',
                                            prompt: 'Refine the UI and interactions for this selected element.',
                                        },
                                        {
                                            icon: Image01Icon,
                                            label: 'Use a reference',
                                            prompt: 'Use the attached image as a reference to improve this selected element.',
                                        },
                                    ].map(({ icon: Icon, label, prompt }) => (
                                        <Button
                                            type="button"
                                            variant="ghost"
                                            key={label}
                                            className="h-auto min-h-14 items-center justify-start gap-2 whitespace-normal rounded-xl border border-border/70 bg-surface px-2.5 py-2 text-left text-[10px] leading-4 text-foreground-secondary hover:bg-background-hover hover:text-foreground"
                                            onClick={() =>
                                                window.dispatchEvent(
                                                    new CustomEvent('kumite:chat-prompt', {
                                                        detail: prompt,
                                                    }),
                                                )
                                            }
                                        >
                                            <HugeiconsIcon
                                                icon={Icon}
                                                size={14}
                                                className="shrink-0 text-foreground-tertiary"
                                            />
                                            <span>{label}</span>
                                        </Button>
                                    ))}
                                </div>
                            </CardContent>
                        </Card>
                    </motion.div>
                )
            )}
        </AnimatePresence>
    );
});
