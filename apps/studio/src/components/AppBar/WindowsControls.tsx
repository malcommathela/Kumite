import { invokeMainChannel } from '@/lib/utils';
import { MainChannels } from '@kumite/models/constants';
import { WindowCommand } from '@kumite/models/projects';
import { Button } from '@kumite/ui/button';
import { Minus, Square, X } from 'lucide-react';
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
                <Minus className="h-3.5 w-3.5" strokeWidth={1.6} />
            </Button>
            <Button
                onClick={() =>
                    sendCommand(isMaximized ? WindowCommand.UNMAXIMIZE : WindowCommand.MAXIMIZE)
                }
                variant="ghost"
                className="h-full w-11 rounded-none text-foreground-tertiary hover:bg-background-hover hover:text-foreground"
                aria-label="Maximize"
            >
                <Square className="h-3 w-3" strokeWidth={1.6} />
            </Button>
            <Button
                onClick={() => sendCommand(WindowCommand.CLOSE)}
                variant="ghost"
                className="h-full w-11 rounded-none text-foreground-tertiary hover:bg-[#e81123] hover:text-white"
                aria-label="Close"
            >
                <X className="h-3.5 w-3.5" strokeWidth={1.6} />
            </Button>
        </div>
    );
};
