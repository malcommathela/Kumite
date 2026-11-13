import { useEditorEngine } from '@/components/Context';
import { WebviewState } from '@/lib/editor/engine/webview';
import { Button } from '@kumite/ui/button';
import { Icons } from '@kumite/ui/icons';
import { Popover, PopoverContent, PopoverTrigger } from '@kumite/ui/popover';
import { cn } from '@kumite/ui/utils';
import { observer } from 'mobx-react-lite';
import { assertNever } from '/common/helpers';

const EnabledButton = observer(({ webviewId }: { webviewId: string }) => {
    const editorEngine = useEditorEngine();
    const selected = editorEngine.webviews.isSelected(webviewId);
    const state = editorEngine.webviews.getState(webviewId);

    // Only show button for error states
    if (state !== WebviewState.DOM_NO_KUMITE) {
        return null;
    }

    const button = (
        <Button
            variant="ghost"
            className="group px-1 text-amber-300 hover:text-amber-100 hover:bg-amber-400/10"
            size={'icon'}
        >
            <Icons.ExclamationTriangle
                className={cn('fill-inherit', selected && 'group-hover:text-amber-100')}
            />
        </Button>
    );

    return (
        <Popover>
            <PopoverTrigger asChild>{button}</PopoverTrigger>
            <PopoverContent>
                <div className="space-y-2 flex flex-col w-80 items-center">
                    <div className="flex gap-2 justify-center">
                        <p className="text-active text-regularPlus">
                            {"Kumite won't work on this page"}
                        </p>
                        <Icons.CircleBackslash className="mt-[3px] text-red-500" />
                    </div>
                    <p className="text-foreground-kumite text-small text-left">
                        {
                            "This url is not linked to Kumite's editor. Please navigate to a url that is linked to Kumite's editor."
                        }
                    </p>
                </div>
            </PopoverContent>
        </Popover>
    );
});

export default EnabledButton;
