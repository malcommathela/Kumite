import { useEditorEngine } from '@/components/Context';
import { Button } from '@kumite/ui/button';
import { Icons } from '@kumite/ui/icons';
import { Tooltip, TooltipContent, TooltipTrigger } from '@kumite/ui/tooltip';
import { TooltipArrow } from '@radix-ui/react-tooltip';
import { observer } from 'mobx-react-lite';

export const ChatControls = observer(() => {
    const editorEngine = useEditorEngine();
    const handleNewChat = () => {
        editorEngine.chat.conversation.startNewConversation();
        editorEngine.chat.focusChatInput();
    };

    return (
        <div className="flex flex-row opacity-0 transition-opacity duration-200 group-hover/panel:opacity-100">
            <Tooltip>
                <TooltipTrigger asChild>
                    <Button
                        variant={'ghost'}
                        size={'icon'}
                        className="p-2 w-fit h-fit hover:bg-background-kumite"
                        onClick={handleNewChat}
                        disabled={editorEngine.chat.isWaiting}
                    >
                        <Icons.Plus />
                    </Button>
                </TooltipTrigger>
                <TooltipContent side="bottom">
                    <p>New Chat</p>
                    <TooltipArrow className="fill-foreground" />
                </TooltipContent>
            </Tooltip>
        </div>
    );
});
