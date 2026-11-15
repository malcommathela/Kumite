import { useAuthManager, useEditorEngine, useProjectsManager } from '@/components/Context';
import { SettingsTabValue } from '@/lib/models';
import { ProjectTabs } from '@/lib/projects';
import { CreateState } from '@/lib/projects/create';
import { Links } from '@kumite/models/constants';
import { Button } from '@kumite/ui/button';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@kumite/ui/dropdown-menu';
import { Tooltip, TooltipContent, TooltipTrigger } from '@kumite/ui/tooltip';
import { Download, MoreHorizontal, Settings, X } from 'lucide-react';
import { observer } from 'mobx-react-lite';
import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { CreateErrorCard } from './CreateError';
import { CreateLoadingCard } from './CreateLoading';
import { PromptingCard } from './PromptingCard';

export const PromptCreation = observer(({ initialScreen = false }: { initialScreen?: boolean }) => {
    const { t } = useTranslation();
    const editorEngine = useEditorEngine();
    const authManager = useAuthManager();
    const projectsManager = useProjectsManager();

    useEffect(() => {
        const handleEscapeKey = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                returnToProjects();
            }
        };

        window.addEventListener('keydown', handleEscapeKey);
        return () => window.removeEventListener('keydown', handleEscapeKey);
    }, []);

    const returnToProjects = () => {
        if (projectsManager.create.state === CreateState.CREATE_LOADING) {
            console.warn('Cannot return to projects while loading');
            return;
        }
        projectsManager.projectsTab = ProjectTabs.PROJECTS;
    };

    const renderCard = () => {
        switch (projectsManager.create.state) {
            case CreateState.PROMPT:
                return <PromptingCard />;
            case CreateState.CREATE_LOADING:
                return <CreateLoadingCard />;
            case CreateState.ERROR:
                return <CreateErrorCard />;
        }
    };

    return (
        <div className="relative flex min-h-full flex-1 flex-col items-center justify-center px-6 py-20">
            <div className="absolute right-6 top-6 flex items-center gap-1.5">
                <Tooltip>
                    <TooltipTrigger asChild>
                        <button
                            className="flex h-8 w-8 items-center justify-center rounded-full text-foreground-tertiary transition-colors hover:bg-background-hover hover:text-foreground"
                            onClick={() => {
                                editorEngine.isSettingsOpen = true;
                                editorEngine.settingsTab = SettingsTabValue.ADVANCED;
                            }}
                        >
                            <Settings className="h-4 w-4" strokeWidth={1.7} />
                        </button>
                    </TooltipTrigger>
                    <TooltipContent side="bottom">
                        {t('projects.create.settings.tooltip')}
                    </TooltipContent>
                </Tooltip>

                {initialScreen ? (
                    <>
                        <Button
                            variant="secondary"
                            className="h-8"
                            onClick={() =>
                                (projectsManager.projectsTab = ProjectTabs.IMPORT_PROJECT)
                            }
                        >
                            <Download className="h-3.5 w-3.5" strokeWidth={1.7} />
                            {t('projects.actions.import')}
                        </Button>
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <button className="flex h-8 w-8 items-center justify-center rounded-full text-foreground-tertiary transition-colors hover:bg-background-hover hover:text-foreground">
                                    <MoreHorizontal className="h-4 w-4" strokeWidth={1.7} />
                                </button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                                <DropdownMenuItem
                                    onClick={() => window.open(Links.GITHUB, '_blank')}
                                >
                                    {t('projects.actions.about')}
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => authManager.signOut()}>
                                    {t('projects.actions.signOut')}
                                </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </>
                ) : (
                    <button
                        className="flex h-8 w-8 items-center justify-center rounded-full text-foreground-tertiary transition-colors hover:bg-background-hover hover:text-foreground"
                        onClick={returnToProjects}
                        aria-label={t('projects.actions.close')}
                    >
                        <X className="h-4 w-4" strokeWidth={1.7} />
                    </button>
                )}
            </div>

            <div className="w-full max-w-[680px]">{renderCard()}</div>
        </div>
    );
});

export default PromptCreation;
