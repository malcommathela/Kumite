import { useEditorEngine, useUserManager } from '@/components/Context';
import { Icons } from '@kumite/ui/icons/index';
import { observer } from 'mobx-react-lite';
import { motion } from 'motion/react';
import { forwardRef, useImperativeHandle, useRef, useState } from 'react';

export interface SuggestionsRef {
    handleTabNavigation: () => boolean;
    handleEnterSelection: () => boolean;
}

const Suggestions = forwardRef<
    SuggestionsRef,
    {
        disabled: boolean;
        inputValue: string;
        setInput: (input: string) => void;
        onSuggestionFocus?: (isFocused: boolean) => void;
    }
>(({ disabled, inputValue, setInput, onSuggestionFocus }, ref) => {
    const editorEngine = useEditorEngine();
    const userManager = useUserManager();
    const [focusedIndex, setFocusedIndex] = useState<number>(-1);
    const buttonRefs = useRef<(HTMLButtonElement | null)[]>([]);

    const suggestions = editorEngine.chat.suggestions.suggestions;
    const shouldHideSuggestions =
        editorEngine.chat.suggestions.shouldHide ||
        !userManager.settings.settings?.chat?.showSuggestions ||
        disabled ||
        inputValue.trim().length > 0 ||
        editorEngine.errors.errors.length > 0;

    const handleTabNavigation = () => {
        if (shouldHideSuggestions || suggestions.length === 0) {
            return false;
        }

        // Calculate next index
        const nextIndex = focusedIndex === -1 ? 0 : focusedIndex + 1;

        // If we would exceed the suggestions, return false to move to chat input
        if (nextIndex >= suggestions.length) {
            buttonRefs.current[focusedIndex]?.blur();
            setFocusedIndex(-1);
            onSuggestionFocus?.(false);
            return false;
        }

        // Force blur current button before focusing next
        if (focusedIndex !== -1) {
            buttonRefs.current[focusedIndex]?.blur();
        }
        // Force focus next button
        buttonRefs.current[nextIndex]?.focus();
        setFocusedIndex(nextIndex);
        onSuggestionFocus?.(true);
        return true;
    };

    const handleEnterSelection = () => {
        if (focusedIndex === -1 || shouldHideSuggestions) {
            return false;
        }
        setInput(suggestions[focusedIndex].prompt);
        setFocusedIndex(-1);
        onSuggestionFocus?.(false);
        return true;
    };

    useImperativeHandle(ref, () => ({
        handleTabNavigation,
        handleEnterSelection,
    }));

    return (
        <motion.div
            tabIndex={-1}
            className="flex flex-col overflow-hidden"
            animate={{ height: shouldHideSuggestions ? 0 : 'auto' }}
            initial={false}
            transition={{ duration: 0.3, ease: 'easeOut' }}
        >
            <motion.div
                tabIndex={-1}
                className="flex flex-col gap-1.5 px-3 pb-2"
                animate={{ opacity: shouldHideSuggestions ? 0 : 1 }}
                initial={false}
                transition={{ duration: 0.2 }}
            >
                {suggestions.map((suggestion, index) => (
                    <motion.button
                        ref={(el) => (buttonRefs.current[index] = el)}
                        initial={{ opacity: 0, y: 20, filter: 'blur(8px)' }}
                        animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
                        transition={{
                            delay: 0.1 + index * 0.1,
                            duration: 0.3,
                            ease: 'easeOut',
                        }}
                        key={suggestion.title}
                        className="relative flex items-center gap-2 rounded-xl border border-border/80 bg-surface px-3 py-2.5 text-left text-xs text-foreground-secondary transition-colors hover:border-border-hover hover:bg-background-hover hover:text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                        onClick={() => setInput(suggestion.prompt)}
                        onFocus={() => {
                            setFocusedIndex(index);
                            onSuggestionFocus?.(true);
                        }}
                        onBlur={(e) => {
                            // Don't reset focus if we're moving to another suggestion
                            const isMovingToAnotherSuggestion = buttonRefs.current.includes(
                                e.relatedTarget as HTMLButtonElement,
                            );
                            if (!isMovingToAnotherSuggestion) {
                                setFocusedIndex(-1);
                                onSuggestionFocus?.(false);
                            }
                        }}
                    >
                        <Icons.Lightbulb className="h-4 w-4 shrink-0 text-foreground-tertiary" />
                        <span className="min-w-0 flex-1 truncate">{suggestion.title}</span>
                        <Icons.ArrowRight className="h-3.5 w-3.5 text-foreground-tertiary" />
                    </motion.button>
                ))}
            </motion.div>
        </motion.div>
    );
});

Suggestions.displayName = 'Suggestions';
export default observer(Suggestions);
