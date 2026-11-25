import { useUserManager } from '@/components/Context';
import { DefaultSettings } from '@kumite/models/constants';
import { Button } from '@kumite/ui/button';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@kumite/ui/dropdown-menu';
import { cn } from '@kumite/ui/utils';
import {
    CheckmarkCircle01Icon,
    Clock01Icon,
    MoreHorizontalIcon,
    SparklesIcon,
} from '@hugeicons/core-free-icons';
import { HugeiconsIcon } from '@hugeicons/react';
import { observer } from 'mobx-react-lite';
import { useState } from 'react';
import { ChatTab } from '../EditPanel/ChatTab';
import { ChatControls } from '../EditPanel/ChatTab/ChatControls';
import { ChatHistory } from '../EditPanel/ChatTab/ChatControls/ChatHistory';

export const AgentsTab = observer(() => {
    const userManager = useUserManager();
    const [isHistoryOpen, setIsHistoryOpen] = useState(false);
    const chatSettings = userManager.settings.settings?.chat || DefaultSettings.CHAT_SETTINGS;

    return (
        <div className="group/panel relative flex h-full min-h-0 flex-col">
            <div className="flex h-14 shrink-0 items-center justify-between border-b border-border/70 px-3">
                <div className="flex min-w-0 items-center gap-2.5">
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-border bg-background-active text-foreground">
                        <HugeiconsIcon icon={SparklesIcon} size={16} />
                    </span>
                    <div className="min-w-0">
                        <h2 className="truncate text-xs font-semibold tracking-tight text-foreground">
                            Kumite Agents
                        </h2>
                        <p className="mt-0.5 truncate text-[11px] text-foreground-tertiary">
                            Selection-aware chat
                        </p>
                    </div>
                </div>
                <div className="flex shrink-0 items-center gap-0.5">
                    <Button
                        variant="ghost"
                        size="icon-sm"
                        aria-label="Chat history"
                        className="text-foreground-tertiary"
                        onClick={() => setIsHistoryOpen(true)}
                    >
                        <HugeiconsIcon icon={Clock01Icon} size={16} />
                    </Button>
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button
                                variant="ghost"
                                size="icon-sm"
                                aria-label="Agent settings"
                                className="text-foreground-tertiary"
                            >
                                <HugeiconsIcon icon={MoreHorizontalIcon} size={16} />
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="min-w-[220px]">
                            <ChatSetting
                                label="Show suggestions"
                                checked={chatSettings.showSuggestions}
                                onSelect={() =>
                                    userManager.settings.updateChat({
                                        showSuggestions: !chatSettings.showSuggestions,
                                    })
                                }
                            />
                            <ChatSetting
                                label="Auto-apply results"
                                checked={chatSettings.autoApplyCode}
                                onSelect={() =>
                                    userManager.settings.updateChat({
                                        autoApplyCode: !chatSettings.autoApplyCode,
                                    })
                                }
                            />
                            <ChatSetting
                                label="Show code while rendering"
                                checked={chatSettings.expandCodeBlocks}
                                onSelect={() =>
                                    userManager.settings.updateChat({
                                        expandCodeBlocks: !chatSettings.expandCodeBlocks,
                                    })
                                }
                            />
                            <ChatSetting
                                label="Show mini chat"
                                checked={chatSettings.showMiniChat}
                                onSelect={() =>
                                    userManager.settings.updateChat({
                                        showMiniChat: !chatSettings.showMiniChat,
                                    })
                                }
                            />
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onSelect={() => setIsHistoryOpen(true)}>
                                <HugeiconsIcon icon={Clock01Icon} size={16} className="mr-2" />
                                Chat history
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                    <ChatControls />
                </div>
            </div>
            <ChatTab />
            <ChatHistory isOpen={isHistoryOpen} onOpenChange={setIsHistoryOpen} side="right" />
        </div>
    );
});

function ChatSetting({
    label,
    checked,
    onSelect,
}: {
    label: string;
    checked: boolean;
    onSelect: () => void;
}) {
    return (
        <DropdownMenuItem
            className="flex items-center py-1.5"
            onSelect={(event) => {
                event.preventDefault();
                onSelect();
            }}
        >
            <HugeiconsIcon
                icon={CheckmarkCircle01Icon}
                size={16}
                className={cn('mr-2', checked ? 'opacity-100' : 'opacity-0')}
            />
            {label}
        </DropdownMenuItem>
    );
}
