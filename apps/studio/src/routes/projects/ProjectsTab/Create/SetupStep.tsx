import { invokeMainChannel, sendAnalytics } from '@/lib/utils';
import { CreateMethod } from '@/routes/projects/helpers';
import type { Channels } from '@kumite/models/constants';
import { MainChannels } from '@kumite/models/constants';
import { Button } from '@kumite/ui/button';
import { CardDescription, CardTitle } from '@kumite/ui/card';
import { Icons } from '@kumite/ui/icons';
import { Progress } from '@kumite/ui/progress';
import { AnimatePresence, motion, MotionConfig } from 'motion/react';
import { useEffect, useState } from 'react';
import type { StepComponent } from './withStepProps';

enum StepState {
    INSTALLING = 'installing',
    INSTALLED = 'installed',
    ERROR = 'error',
}

export interface SetupStepConfig {
    channel: Channels;
    method: CreateMethod;
    /** Progress percentage for each stage reported by the main process. */
    stageProgress: Record<string, number>;
    errorMessageClassName?: string;
}

/**
 * The install screen shared by the new-project and import-project flows.
 * They differ only in the IPC channel, stage names and error overflow style.
 */
export function createSetupStep({
    channel,
    method,
    stageProgress,
    errorMessageClassName = '',
}: SetupStepConfig): StepComponent {
    return ({ props, variant }) => {
        const { projectData, prevStep, nextStep } = props;
        const [state, setState] = useState<StepState>(StepState.INSTALLING);
        const [progress, setProgress] = useState<number>(0);
        const [message, setMessage] = useState<string>('Installing project');

        useEffect(() => {
            window.api.on(channel, ({ stage, message }: { stage: string; message: string }) => {
                setMessage(message);
                if (stage === 'error') {
                    setState(StepState.ERROR);
                    sendAnalytics('create project error', { message, method });
                    return;
                }
                const nextProgress = stageProgress[stage];
                if (nextProgress === undefined) {
                    return;
                }
                setProgress(nextProgress);
                if (stage === 'complete') {
                    setState(StepState.INSTALLED);
                }
            });

            return () => {
                window.api.removeAllListeners(channel);
            };
        }, []);

        function handleClickPath() {
            invokeMainChannel(MainChannels.OPEN_IN_EXPLORER, projectData.folderPath);
        }

        const renderHeader = () => (
            <>
                <CardTitle>{renderTitle()}</CardTitle>
                <CardDescription>{renderDescription()}</CardDescription>
            </>
        );

        const renderContent = () => (
            <MotionConfig transition={{ duration: 0.5, type: 'spring', bounce: 0 }}>
                <AnimatePresence mode="popLayout">
                    {state === StepState.INSTALLED && (
                        <motion.div
                            key="installed"
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.9 }}
                            className="w-full flex flex-row items-center border-[0.5px] p-4 rounded gap-2 text-green-950 bg-green-100/40 border-green-400 dark:border-green-500 dark:text-green-300 dark:bg-green-950"
                        >
                            <div className={'flex flex-col text-sm gap-1 break-all'}>
                                <p className="text-regularPlus">{projectData.name}</p>
                                <button
                                    className="hover:underline text-mini text-start"
                                    onClick={handleClickPath}
                                >
                                    {projectData.folderPath}
                                </button>
                            </div>
                            <Icons.CheckCircled className="ml-auto" />
                        </motion.div>
                    )}
                    {state === StepState.ERROR && (
                        <motion.div
                            key="error"
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.9 }}
                            className="text-sm w-full flex flex-row items-center border-[0.5px] p-4 rounded gap-2 border-red-500 text-red-900 bg-red-100/40 dark:border-red-600 dark:text-red-200 dark:bg-red-900"
                        >
                            <p className={errorMessageClassName}>{message}</p>
                            <Icons.CrossCircled className="ml-auto w-12" />
                        </motion.div>
                    )}
                    {state === StepState.INSTALLING && (
                        <motion.div
                            key="installing"
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.9 }}
                            className="flex flex-col w-full gap-2 text-sm"
                        >
                            <Progress value={progress} className="w-full" />
                            <p>{message}</p>
                        </motion.div>
                    )}
                </AnimatePresence>
            </MotionConfig>
        );

        const renderFooter = () => (
            <>
                <Button type="button" onClick={prevStep} variant="ghost">
                    {state === StepState.INSTALLING ? 'Cancel' : 'Back'}
                </Button>
                <Button
                    disabled={state === StepState.INSTALLING}
                    variant={'outline'}
                    onClick={nextStep}
                >
                    {state === StepState.ERROR ? 'Continue anyway' : 'Complete setup'}
                </Button>
            </>
        );

        function renderTitle() {
            if (state === StepState.INSTALLED) {
                return 'Your project is ready';
            }
            if (state === StepState.ERROR) {
                return 'Error creating project';
            }
            return 'Setting up project...';
        }

        function renderDescription(): string | JSX.Element {
            if (state === StepState.INSTALLED) {
                return 'Open this project in Kumite any time to start designing';
            }
            if (state === StepState.ERROR) {
                return (
                    <p>
                        {`Please try again or `}
                        <a
                            href="https://github.com/malcommathela/Kumite/issues"
                            className="underline"
                        >
                            {'contact support'}
                        </a>
                        {` for help.`}
                    </p>
                );
            }
            return 'Installing the right files and folders for you.';
        }

        switch (variant) {
            case 'header':
                return renderHeader();
            case 'content':
                return renderContent();
            case 'footer':
                return renderFooter();
        }
    };
}
