import { invokeMainChannel } from '@/lib/utils';
import { MainChannels } from '@kumite/models/constants';
import { WindowCommand } from '@kumite/models/projects';
import { Button } from '@kumite/ui/button';
import { Cancel01Icon, MinusSignIcon, SquareIcon } from '@hugeicons/core-free-icons';
import { HugeiconsIcon } from '@hugeicons/react';
import { useState } from 'react';

export const WindowsControls = () => {
    const [isMaximized, setIsMaximized] = useState(true);

    if (process.platform !== 'win32' && process.platform !== 'linux') {
        return null;
    }

    function sendCommand(command: WindowCommand) {
        invokeMainChannel(MainChannels.SEND_WINDOW_COMMAND, command);
        if (command === WindowCommand.MAXIMIZE || command === WindowCommand.UNMAXIMIZE) {
            setIsMaximized(!isMaximized);
        }
    }

    return (
        <div className="flex h-full items-stretch text-foreground-tertiary">
            <Button
                onClick={() => sendCommand(WindowCommand.MINIMIZE)}
                variant="ghost"
                className="h-full w-11 rounded-none text-foreground-tertiary hover:bg-background-hover hover:text-foreground"
                aria-label="Minimize"
            >
                <HugeiconsIcon icon={MinusSignIcon} size={14} strokeWidth={1.6} />
            </Button>
            <Button
                onClick={() =>
                    sendCommand(isMaximized ? WindowCommand.UNMAXIMIZE : WindowCommand.MAXIMIZE)
                }
                variant="ghost"
                className="h-full w-11 rounded-none text-foreground-tertiary hover:bg-background-hover hover:text-foreground"
                aria-label="Maximize"
            >
                <HugeiconsIcon icon={SquareIcon} size={12} strokeWidth={1.6} />
            </Button>
            <Button
                onClick={() => sendCommand(WindowCommand.CLOSE)}
                variant="ghost"
                className="h-full w-11 rounded-none text-foreground-tertiary hover:bg-[#e81123] hover:text-white"
                aria-label="Close"
            >
                <HugeiconsIcon icon={Cancel01Icon} size={14} strokeWidth={1.6} />
            </Button>
        </div>
    );
};
