import { invokeMainChannel } from '@/lib/utils';
import { getNameFromPath } from '@/routes/projects/helpers';
import { MainChannels } from '@kumite/models/constants';
import { Button } from '@kumite/ui/button';
import { CardDescription, CardTitle } from '@kumite/ui/card';
import { Icons } from '@kumite/ui/icons';
import type { StepComponent } from '../withStepProps';

const LoadSelectFolder: StepComponent = ({ props, variant }) => {
    const { projectData, setProjectData, prevStep, nextStep } = props;

    async function pickProjectFolder() {
        const path = (await invokeMainChannel(MainChannels.PICK_COMPONENTS_DIRECTORY)) as
            string | null;
        if (path == null) {
            return;
        }
        setProjectData({
            ...projectData,
            folderPath: path,
            name: getNameFromPath(path),
        });
    }

    function handleClickPath() {
        invokeMainChannel(MainChannels.OPEN_IN_EXPLORER, projectData.folderPath);
    }

    const renderHeader = () => (
        <>
            <CardTitle>{'Select your project folder'}</CardTitle>
            <CardDescription>{"This is where we'll reference your App"}</CardDescription>
        </>
    );

    const renderContent = () => (
        <>
            {projectData.folderPath ? (
                <div className="w-full flex flex-row items-center border-[0.5px] bg-background-kumite/60 px-4 py-5 rounded">
                    <div className="flex flex-col text-sm gap-1 break-all">
                        <p className="text-regularPlus">{projectData.name}</p>
                        <button
                            className="hover:underline text-mini text-foreground-kumite text-start"
                            onClick={handleClickPath}
                        >
                            {projectData.folderPath}
                        </button>
                    </div>
                    <Button
                        className="ml-auto w-10 h-10"
                        variant={'ghost'}
                        size={'icon'}
                        onClick={() => {
                            setProjectData({
                                ...projectData,
                                folderPath: undefined,
                            });
                        }}
                    >
                        <Icons.MinusCircled />
                    </Button>
                </div>
            ) : (
                <Button
                    className="h-32 w-full rounded-xl border border-dashed border-border bg-background-secondary/40 text-[13px] text-foreground-secondary hover:bg-background-hover hover:text-foreground"
                    variant={'outline'}
                    onClick={pickProjectFolder}
                >
                    {'Click to select your folder'}
                </Button>
            )}
        </>
    );

    const renderFooter = () => (
        <>
            <Button type="button" onClick={prevStep} variant="ghost">
                Back
            </Button>
            <Button
                disabled={!projectData.folderPath}
                type="button"
                onClick={nextStep}
                variant="outline"
            >
                Next
            </Button>
        </>
    );

    switch (variant) {
        case 'header':
            return renderHeader();
        case 'content':
            return renderContent();
        case 'footer':
            return renderFooter();
    }
};

export { LoadSelectFolder };
