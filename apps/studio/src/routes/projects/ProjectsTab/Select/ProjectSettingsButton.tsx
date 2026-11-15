import { useProjectsManager } from '@/components/Context';
import { invokeMainChannel } from '@/lib/utils';
import { getRandomPlaceholder } from '@/routes/projects/helpers';
import { MainChannels } from '@kumite/models/constants';
import type { Project } from '@kumite/models/projects';
import {
    AlertDialog,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from '@kumite/ui/alert-dialog';
import { Button } from '@kumite/ui/button';
import { Checkbox } from '@kumite/ui/checkbox';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@kumite/ui/dropdown-menu';
import { Input } from '@kumite/ui/input';
import { Label } from '@kumite/ui/label';
import { cn } from '@kumite/ui/utils';
import { Archive, ArchiveRestore, FolderOpen, MoreHorizontal, Pencil, Trash2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useEffect, useMemo, useState } from 'react';

export default function ProjectSettingsButton({
    project,
    iconOnly = false,
}: {
    project: Project;
    iconOnly?: boolean;
}) {
    const { t } = useTranslation();
    const projectsManager = useProjectsManager();
    const [showDeleteDialog, setShowDeleteDialog] = useState(false);
    const [deleteProjectFolder, setDeleteProjectFolder] = useState(false);
    const [showRenameDialog, setShowRenameDialog] = useState(false);
    const [projectName, setProjectName] = useState(project.name);
    const isProjectNameEmpty = useMemo(() => projectName.length === 0, [projectName]);
    const isArchived = !!project.archivedAt;

    useEffect(() => {
        setProjectName(project.name);
    }, [project.name]);

    const handleDeleteProject = async () => {
        await projectsManager.deleteProject(project, deleteProjectFolder);
        setShowDeleteDialog(false);
    };

    const handleRenameProject = () => {
        projectsManager.updateProject({ ...project, name: projectName });
        setShowRenameDialog(false);
    };

    const handleOpenProjectFolder = () => {
        if (project.folderPath) {
            invokeMainChannel(MainChannels.OPEN_IN_EXPLORER, project.folderPath);
        }
    };

    return (
        <>
            <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    {iconOnly ? (
                        <Button
                            size="icon-sm"
                            variant="secondary"
                            className="border-border bg-background/90 text-foreground-secondary backdrop-blur"
                            aria-label={`${project.name} options`}
                        >
                            <MoreHorizontal className="h-3.5 w-3.5" />
                        </Button>
                    ) : (
                        <Button size="default" variant="ghost" className="w-full gap-2 lg:w-auto">
                            <MoreHorizontal className="h-4 w-4" />
                            <p>{t('projects.actions.projectSettings')}</p>
                        </Button>
                    )}
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                    <DropdownMenuItem onSelect={handleOpenProjectFolder}>
                        <FolderOpen />
                        {t('projects.actions.showInExplorer')}
                    </DropdownMenuItem>
                    <DropdownMenuItem onSelect={() => setShowRenameDialog(true)}>
                        <Pencil />
                        {t('projects.actions.renameProject')}
                    </DropdownMenuItem>
                    <DropdownMenuItem
                        onSelect={() => projectsManager.setProjectArchived(project, !isArchived)}
                    >
                        {isArchived ? <ArchiveRestore /> : <Archive />}
                        {isArchived ? 'Restore from archive' : 'Move to archive'}
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                        onSelect={() => setShowDeleteDialog(true)}
                        className={cn('text-red-400 focus:bg-red-500/10 focus:text-red-300')}
                    >
                        <Trash2 />
                        {t('projects.actions.deleteProject')}
                    </DropdownMenuItem>
                </DropdownMenuContent>
            </DropdownMenu>

            <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>{t('projects.dialogs.delete.title')}</AlertDialogTitle>
                        <AlertDialogDescription>
                            {t('projects.dialogs.delete.description')}
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <div className="flex items-center space-x-2">
                        <Checkbox
                            id="deleteFolder"
                            checked={deleteProjectFolder}
                            onCheckedChange={(checked) =>
                                setDeleteProjectFolder(checked as boolean)
                            }
                        />
                        <Label htmlFor="deleteFolder">
                            {t('projects.dialogs.delete.moveToTrash')}
                        </Label>
                    </div>
                    <AlertDialogFooter>
                        <Button variant="outline" onClick={() => setShowDeleteDialog(false)}>
                            {t('projects.actions.cancel')}
                        </Button>
                        <Button
                            variant="destructive"
                            className="text-sm"
                            onClick={handleDeleteProject}
                        >
                            {t('projects.actions.delete')}
                        </Button>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            <AlertDialog open={showRenameDialog} onOpenChange={setShowRenameDialog}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>{t('projects.dialogs.rename.title')}</AlertDialogTitle>
                    </AlertDialogHeader>
                    <div className="flex w-full flex-col gap-2">
                        <Label htmlFor="text">{t('projects.dialogs.rename.label')}</Label>
                        <Input
                            minLength={0}
                            type="text"
                            placeholder={getRandomPlaceholder()}
                            value={projectName || ''}
                            onInput={(e) => setProjectName(e.currentTarget.value)}
                        />
                        <p
                            className={cn(
                                'text-xs text-red-500 transition-opacity',
                                isProjectNameEmpty ? 'opacity-100' : 'opacity-0',
                            )}
                        >
                            {t('projects.dialogs.rename.error')}
                        </p>
                    </div>
                    <AlertDialogFooter>
                        <Button variant="outline" onClick={() => setShowRenameDialog(false)}>
                            {t('projects.actions.cancel')}
                        </Button>
                        <Button disabled={isProjectNameEmpty} onClick={handleRenameProject}>
                            {t('projects.actions.rename')}
                        </Button>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </>
    );
}
