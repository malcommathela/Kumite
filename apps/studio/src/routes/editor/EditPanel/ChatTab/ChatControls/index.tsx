import { useEditorEngine } from '@/components/Context';
import { Button } from '@kumite/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@kumite/ui/tooltip';
import { PlusSignIcon } from '@hugeicons/core-free-icons';
import { HugeiconsIcon } from '@hugeicons/react';
import { observer } from 'mobx-react-lite';

export const ChatControls = observer(() => {
    const editorEngine = useEditorEngine();
    const handleNewChat = () => {
        editorEngine.chat.conversation.startNewConversation();
        editorEngine.chat.focusChatInput();
    };

    return (
        <div className="flex flex-row">
            <Tooltip>
                <TooltipTrigger asChild>
                    <Button
                        variant={'ghost'}
                        size="icon-sm"
                        className="text-foreground-tertiary"
                        aria-label="New chat"
                        onClick={handleNewChat}
                        disabled={editorEngine.chat.isWaiting}
                    >
                        <HugeiconsIcon icon={PlusSignIcon} size={16} />
                    </Button>
                </TooltipTrigger>
                <TooltipContent side="bottom">New chat</TooltipContent>
            </Tooltip>
        </div>
    );
});
