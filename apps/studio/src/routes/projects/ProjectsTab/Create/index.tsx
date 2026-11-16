import { useProjectsManager } from '@/components/Context';
import { sendAnalytics } from '@/lib/utils';
import { CreateMethod, getStepName } from '@/routes/projects/helpers';
import { DefaultSettings } from '@kumite/models/constants';
import type { Project } from '@kumite/models/projects';
import { AnimatePresence, motion, MotionConfig } from 'motion/react';
import { useEffect, useState } from 'react';
import { loadProjectSteps, newProjectSteps, type StepContent } from './stepContents';

export interface StepProps {
    projectData: Partial<Project & { hasCopied?: boolean }>;
    setProjectData: (data: Partial<Project & { hasCopied?: boolean }>) => void;
    currentStep: number;
    totalSteps: number;
    prevStep: () => void;
    nextStep: () => void;
}

const variants = {
    initial: (direction: number) => {
        return { x: `${120 * direction}%`, opacity: 0 };
    },
    active: { x: '0%', opacity: 1 },
    exit: (direction: number) => {
        return { x: `${-120 * direction}%`, opacity: 0 };
    },
};

const DEFAULT_PROJECT_DATA = {
    url: 'http://localhost:3000',
    commands: DefaultSettings.COMMANDS,
    hasCopied: false,
};

const CreateProject = ({
    createMethod,
    setCreateMethod,
}: {
    createMethod: CreateMethod | null;
    setCreateMethod: (method: CreateMethod | null) => void;
}) => {
    const projectsManager = useProjectsManager();

    const [currentStep, setCurrentStep] = useState(0);
    const [steps, setSteps] = useState<StepContent[]>([]);
    const [projectData, setProjectData] =
        useState<Partial<Project & { hasCopied?: boolean }>>(DEFAULT_PROJECT_DATA);
    const [direction, setDirection] = useState(0);

    useEffect(() => {
        setCurrentStep(0);
        setProjectData(DEFAULT_PROJECT_DATA);

        if (createMethod === CreateMethod.NEW) {
            setSteps(newProjectSteps);
        } else if (createMethod === CreateMethod.LOAD) {
            setSteps(loadProjectSteps);
        }
        sendAnalytics('start create project', { method: createMethod });
    }, [createMethod]);

    const nextStep = () => {
        if (currentStep < steps.length - 1) {
            setDirection(1);
            setCurrentStep((prev) => prev + 1);
        } else {
            // This is the last step, so we should finalize the project
            finalizeProject();
        }
    };

    const prevStep = () => {
        if (currentStep === 0) {
            setCreateMethod(null);
            return;
        }
        setDirection(-1);
        setCurrentStep((prev) => prev - 1);
    };

    const finalizeProject = () => {
        if (
            !projectData.name ||
            !projectData.url ||
            !projectData.folderPath ||
            !projectData.commands?.run ||
            !projectData.commands?.build ||
            !projectData.commands?.install
        ) {
            throw new Error('Project data is missing.');
        }

        const newProject = projectsManager.createProject(
            projectData.name,
            projectData.url,
            projectData.folderPath,
            {
                run: projectData.commands.run,
                build: projectData.commands.build,
                install: projectData.commands.install,
            },
        );

        void projectsManager.openProject(newProject);

        sendAnalytics('create project', {
            url: newProject.url,
            method: createMethod,
            id: newProject.id,
        });
        setCreateMethod(null);
    };

    const renderStep = () => {
        const stepContent = steps[currentStep];
        if (!stepContent) {
            return (
                <motion.p
                    layout="position"
                    initial={{ opacity: 0, y: 200 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 200 }}
                >
                    {'Project created successfully.'}
                </motion.p>
            );
        }

        const stepProps: StepProps = {
            projectData,
            setProjectData: (newData) =>
                setProjectData((prevData) => ({ ...prevData, ...newData })),
            currentStep,
            totalSteps: steps.length,
            prevStep,
            nextStep,
        };

        sendAnalytics('creation step', {
            method: createMethod,
            step: currentStep,
            stepName: getStepName(createMethod, currentStep),
        });

        return (
            <>
                {stepContent.header(stepProps)}
                {stepContent.content(stepProps)}
            </>
        );
    };

    return (
        <div className="flex min-h-full flex-1 flex-col items-center justify-center px-6 py-16">
            <div className="w-full max-w-[560px]">
                <h1 className="text-center font-display text-[2.7rem] leading-[1.05] tracking-[-0.02em] text-foreground">
                    {createMethod === CreateMethod.NEW ? 'Start a project' : 'Import a project'}
                </h1>
                <p className="mx-auto mt-3 max-w-[420px] text-center text-[13px] leading-5 text-foreground-tertiary">
                    {createMethod === CreateMethod.NEW
                        ? 'Pick a name and a folder, then Kumite sets everything up.'
                        : 'Point Kumite at a folder you already have. You can review the settings before anything changes.'}
                </p>

                <MotionConfig transition={{ duration: 0.5, type: 'spring', bounce: 0 }}>
                    <div className="mt-8 overflow-hidden rounded-2xl border border-border bg-surface">
                        <AnimatePresence mode="popLayout" initial={false} custom={direction}>
                            <motion.div
                                key={currentStep}
                                custom={direction}
                                variants={variants}
                                initial="initial"
                                animate="active"
                                exit="exit"
                            >
                                {renderStep()}
                            </motion.div>
                        </AnimatePresence>
                        <div className="flex items-center border-t border-border/60 px-6 py-4 text-[12px] text-foreground-tertiary">
                            <p>{`${currentStep + 1} of ${steps.length}`}</p>
                            <div id="footer-buttons" className="ml-auto flex gap-2">
                                {steps[currentStep]?.footerButtons({
                                    projectData,
                                    setProjectData: (newData) =>
                                        setProjectData((prevData) => ({
                                            ...prevData,
                                            ...newData,
                                        })),
                                    currentStep,
                                    totalSteps: steps.length,
                                    prevStep,
                                    nextStep,
                                })}
                            </div>
                        </div>
                    </div>
                </MotionConfig>
            </div>
        </div>
    );
};

export default CreateProject;
