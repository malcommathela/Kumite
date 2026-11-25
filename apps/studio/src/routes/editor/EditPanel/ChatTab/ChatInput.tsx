import { useEditorEngine } from '@/components/Context';
import { FOCUS_CHAT_INPUT_EVENT } from '@/lib/editor/engine/chat';
import { EditorTabValue } from '@/lib/models';
import { compressImage } from '@/lib/utils';
import type { ChatMessageContext, ImageMessageContext } from '@kumite/models/chat';
import { MessageContextType } from '@kumite/models/chat';
import {
    InputGroup,
    InputGroupAddon,
    InputGroupButton,
    InputGroupTextarea,
} from '@kumite/ui/chat-input-group';
import { Tooltip, TooltipContent, TooltipTrigger } from '@kumite/ui/tooltip';
import { cn } from '@kumite/ui/utils';
import {
    ArrowRight01Icon,
    Image01Icon,
    LaptopIcon,
    PlusSignIcon,
    StopIcon,
} from '@hugeicons/core-free-icons';
import { HugeiconsIcon } from '@hugeicons/react';
import { observer } from 'mobx-react-lite';
import { AnimatePresence } from 'motion/react';
import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { DraftContextPill } from './ContextPills/DraftContextPill';
import { DraftImagePill } from './ContextPills/DraftingImagePill';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@kumite/ui/dropdown-menu';
import type { SuggestionsRef } from './Suggestions';
import Suggestions from './Suggestions';

export const ChatInput = observer(() => {
    const editorEngine = useEditorEngine();
    const { t } = useTranslation();

    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const [inputValue, setInputValue] = useState('');
    const [isComposing, setIsComposing] = useState(false);
    const [actionTooltipOpen, setActionTooltipOpen] = useState(false);
    const [isDragging, setIsDragging] = useState(false);

    const focusInput = () => {
        requestAnimationFrame(() => {
            textareaRef.current?.focus();
        });
    };

    useEffect(() => {
        if (textareaRef.current && !editorEngine.chat.isWaiting) {
            focusInput();
        }
    }, [editorEngine.chat.conversation.current?.messages.length]);

    useEffect(() => {
        if (editorEngine.editPanelTab === EditorTabValue.CHAT) {
            focusInput();
        }
    }, [editorEngine.editPanelTab]);

    useEffect(() => {
        const focusHandler = () => {
            if (textareaRef.current && !editorEngine.chat.isWaiting) {
                focusInput();
            }
        };

        window.addEventListener(FOCUS_CHAT_INPUT_EVENT, focusHandler);
        return () => window.removeEventListener(FOCUS_CHAT_INPUT_EVENT, focusHandler);
    }, []);

    useEffect(() => {
        const handlePrompt = (event: Event) => {
            setInputValue((event as CustomEvent<string>).detail);
            focusInput();
        };
        window.addEventListener('kumite:chat-prompt', handlePrompt);
        return () => window.removeEventListener('kumite:chat-prompt', handlePrompt);
    }, []);

    useEffect(() => {
        const handleGlobalKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Enter' && suggestionRef.current?.handleEnterSelection()) {
                e.preventDefault();
                e.stopPropagation();
                // Stop the event from bubbling to the canvas
                e.stopImmediatePropagation();
                // Handle the suggestion selection
                suggestionRef.current.handleEnterSelection();
            }
        };

        // Capture phase to intercept before it reaches the canvas
        window.addEventListener('keydown', handleGlobalKeyDown, true);
        return () => window.removeEventListener('keydown', handleGlobalKeyDown, true);
    }, []);

    const disabled = editorEngine.chat.isWaiting || editorEngine.chat.context.context.length === 0;
    const inputEmpty = !inputValue || inputValue.trim().length === 0;

    function handleInput(e: React.ChangeEvent<HTMLTextAreaElement>) {
        if (isComposing) {
            return;
        }
        e.currentTarget.style.height = 'auto';
        e.currentTarget.style.height = `${e.currentTarget.scrollHeight}px`;
    }

    const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
        if (e.key === 'Tab') {
            // Always prevent default tab behavior
            e.preventDefault();
            e.stopPropagation();

            // Only let natural tab order continue if handleTabNavigation returns false
            const handled = suggestionRef.current?.handleTabNavigation();
            if (!handled) {
                // Focus the textarea
                textareaRef.current?.focus();
            }
        } else if (e.key === 'Enter' && !e.shiftKey && !isComposing) {
            e.preventDefault();
            e.stopPropagation();

            if (suggestionRef.current?.handleEnterSelection()) {
                setTimeout(() => textareaRef.current?.focus(), 0);
                return;
            }

            if (!inputEmpty) {
                sendMessage();
            }
        }
    };

    function sendMessage() {
        if (inputEmpty) {
            console.warn('Empty message');
            return;
        }
        if (editorEngine.chat.isWaiting) {
            console.warn('Already waiting for response');
            return;
        }
        editorEngine.chat.sendNewMessage(inputValue);
        setInputValue('');
    }

    const handleRemoveContext = (contextToRemove: ChatMessageContext) => {
        const newContext = [...editorEngine.chat.context.context].filter(
            (context) => context !== contextToRemove,
        );

        editorEngine.chat.context.context = newContext;
    };

    const handleOpenFileDialog = () => {
        document.activeElement instanceof HTMLElement && document.activeElement.blur();
        const inputElement = document.createElement('input');
        inputElement.type = 'file';
        inputElement.accept = 'image/*';
        inputElement.onchange = () => {
            if (inputElement.files && inputElement.files.length > 0) {
                const file = inputElement.files[0];
                const fileName = file.name;
                handleImageEvent(file, fileName);
            }
        };
        inputElement.click();
    };

    const handlePaste = (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
        const items = e.clipboardData.items;

        for (const item of items) {
            if (item.type.startsWith('image/')) {
                e.preventDefault();
                const file = item.getAsFile();
                if (!file) {
                    continue;
                }
                handleImageEvent(file, 'Pasted image');
                break;
            }
        }
    };

    const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        e.currentTarget.removeAttribute('data-dragging-image');

        const items = e.dataTransfer.items;
        for (const item of items) {
            if (item.type.startsWith('image/')) {
                const file = item.getAsFile();
                if (!file) {
                    continue;
                }
                handleImageEvent(file, 'Dropped image');
                break;
            }
        }
    };

    const handleImageEvent = async (file: File, displayName?: string) => {
        const reader = new FileReader();
        reader.onload = async (event) => {
            const compressedImage = await compressImage(file);
            const base64URL = compressedImage || (event.target?.result as string);
            const contextImage: ImageMessageContext = {
                type: MessageContextType.IMAGE,
                content: base64URL,
                mimeType: file.type,
                displayName: displayName || file.name,
            };
            editorEngine.chat.context.context.push(contextImage);
        };
        reader.readAsDataURL(file);
    };

    const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
    };

    const handleDragStateChange = (isDragging: boolean, e: React.DragEvent) => {
        const hasImage =
            e.dataTransfer.types.length > 0 &&
            Array.from(e.dataTransfer.items).some(
                (item) =>
                    item.type.startsWith('image/') ||
                    (item.type === 'Files' && e.dataTransfer.types.includes('public.file-url')),
            );
        if (hasImage) {
            setIsDragging(isDragging);
            e.currentTarget.setAttribute('data-dragging-image', isDragging.toString());
        }
    };

    const suggestionRef = useRef<SuggestionsRef>(null);

    return (
        <div
            className={cn(
                'flex w-full flex-col border-t border-border/80 bg-background/70 text-small text-foreground-tertiary transition-colors duration-200',
                '[&[data-dragging-image=true]]:bg-teal-500/40',
                isDragging && 'cursor-copy',
            )}
            onDrop={(e) => {
                handleDrop(e);
                setIsDragging(false);
            }}
            onDragOver={handleDragOver}
            onDragEnter={(e) => {
                e.preventDefault();
                handleDragStateChange(true, e);
            }}
            onDragLeave={(e) => {
                if (!e.currentTarget.contains(e.relatedTarget as Node)) {
                    handleDragStateChange(false, e);
                }
            }}
        >
            <Suggestions
                ref={suggestionRef}
                disabled={disabled}
                inputValue={inputValue}
                setInput={(suggestion) => {
                    setInputValue(suggestion);
                    textareaRef.current?.focus();
                    setTimeout(() => {
                        if (textareaRef.current) {
                            textareaRef.current.scrollTop = textareaRef.current.scrollHeight;
                        }
                    }, 100);
                }}
                onSuggestionFocus={(isFocused) => {
                    if (!isFocused) {
                        textareaRef.current?.focus();
                    }
                }}
            />

            <div className="mx-3 my-2">
                <InputGroup>
                    {editorEngine.chat.context.context.length > 0 && (
                        <InputGroupAddon align="block-start" className="flex-wrap">
                            <AnimatePresence mode="popLayout">
                                {editorEngine.chat.context.context.map(
                                    (context: ChatMessageContext) =>
                                        context.type === MessageContextType.IMAGE ? (
                                            <DraftImagePill
                                                key={`image-${context.content}`}
                                                context={context}
                                                onRemove={() => handleRemoveContext(context)}
                                            />
                                        ) : (
                                            <DraftContextPill
                                                key={`${context.type}-${context.content}`}
                                                context={context}
                                                onRemove={() => handleRemoveContext(context)}
                                            />
                                        ),
                                )}
                            </AnimatePresence>
                        </InputGroupAddon>
                    )}
                    <InputGroupTextarea
                        ref={textareaRef}
                        disabled={disabled}
                        placeholder={
                            disabled
                                ? t('editor.panels.edit.tabs.chat.emptyState')
                                : t('editor.panels.edit.tabs.chat.input.placeholder')
                        }
                        className={cn(
                            'max-h-32 overflow-auto caret-[#FA003C] text-foreground-primary selection:bg-[#FA003C]/30 selection:text-[#FA003C] placeholder:text-foreground-primary/50',
                            isDragging ? 'pointer-events-none' : 'pointer-events-auto',
                        )}
                        rows={3}
                        style={{ resize: 'none' }}
                        value={inputValue}
                        onChange={(e) => setInputValue(e.target.value)}
                        onInput={handleInput}
                        onKeyDown={handleKeyDown}
                        onPaste={handlePaste}
                        onCompositionStart={() => setIsComposing(true)}
                        onCompositionEnd={(e) => {
                            setIsComposing(false);
                        }}
                        onDragEnter={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            e.currentTarget.parentElement?.dispatchEvent(
                                new DragEvent('dragenter', {
                                    bubbles: true,
                                    cancelable: true,
                                    dataTransfer: e.dataTransfer,
                                }),
                            );
                        }}
                        onDragOver={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            e.currentTarget.parentElement?.dispatchEvent(
                                new DragEvent('dragover', {
                                    bubbles: true,
                                    cancelable: true,
                                    dataTransfer: e.dataTransfer,
                                }),
                            );
                        }}
                        onDragLeave={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            if (!e.currentTarget.contains(e.relatedTarget as Node)) {
                                e.currentTarget.parentElement?.dispatchEvent(
                                    new DragEvent('dragleave', {
                                        bubbles: true,
                                        cancelable: true,
                                        dataTransfer: e.dataTransfer,
                                    }),
                                );
                            }
                        }}
                        onDrop={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            e.currentTarget.parentElement?.dispatchEvent(
                                new DragEvent('drop', {
                                    bubbles: true,
                                    cancelable: true,
                                    dataTransfer: e.dataTransfer,
                                }),
                            );
                        }}
                    />
                    <InputGroupAddon align="block-end" className="justify-between">
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <InputGroupButton
                                    variant="outline"
                                    size="icon-sm"
                                    className="rounded-full"
                                    aria-label="Add context"
                                    disabled={disabled}
                                >
                                    <HugeiconsIcon icon={PlusSignIcon} size={16} />
                                </InputGroupButton>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="start" side="top" className="w-52">
                                <DropdownMenuItem onSelect={handleOpenFileDialog}>
                                    <HugeiconsIcon icon={Image01Icon} size={16} />
                                    Upload image reference
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                    onSelect={() =>
                                        editorEngine.chat.context.addScreenshotContext()
                                    }
                                >
                                    <HugeiconsIcon icon={LaptopIcon} size={16} />
                                    Add current page screenshot
                                </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                        {editorEngine.chat.isWaiting ? (
                            <Tooltip open={actionTooltipOpen} onOpenChange={setActionTooltipOpen}>
                                <TooltipTrigger asChild>
                                    <InputGroupButton
                                        size="icon-sm"
                                        variant="secondary"
                                        aria-label="Stop response"
                                        className="rounded-full text-primary"
                                        onClick={() => {
                                            setActionTooltipOpen(false);
                                            editorEngine.chat.stopStream();
                                        }}
                                    >
                                        <HugeiconsIcon icon={StopIcon} size={16} />
                                    </InputGroupButton>
                                </TooltipTrigger>
                                <TooltipContent>{'Stop response'}</TooltipContent>
                            </Tooltip>
                        ) : (
                            <InputGroupButton
                                size="icon-sm"
                                variant="default"
                                aria-label="Send message"
                                className="rounded-full"
                                disabled={inputEmpty || editorEngine.chat.isWaiting}
                                onClick={sendMessage}
                            >
                                <HugeiconsIcon icon={ArrowRight01Icon} size={16} />
                            </InputGroupButton>
                        )}
                    </InputGroupAddon>
                </InputGroup>
            </div>
        </div>
    );
});
