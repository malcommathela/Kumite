import type { Project } from '@kumite/models/projects';
import { timeAgo } from '@kumite/utility';
import { cn } from '@kumite/ui/utils';
import ProjectSettingsButton from './Select/ProjectSettingsButton';
import { getPreviewImage } from '../helpers';
import { useEffect, useState } from 'react';
import { Skeleton } from '@kumite/ui/skeleton';

export function ProjectPreview({ project, className }: { project: Project; className?: string }) {
    const [src, setSrc] = useState<string | null>(null);

    useEffect(() => {
        let active = true;
        if (!project.previewImg) {
            setSrc(null);
            return;
        }
        getPreviewImage(project.previewImg)
            .then((image) => {
                if (active) setSrc(image);
            })
            .catch((error) => {
                console.warn('Could not load project preview:', error);
                if (active) setSrc(null);
            });
        return () => {
            active = false;
        };
    }, [project.previewImg]);

    return (
        <div
            className={cn(
                'relative flex aspect-[4/3] w-full items-center justify-center overflow-hidden rounded-2xl border border-border bg-surface transition-colors group-hover:border-border-hover',
                className,
            )}
        >
            {src ? (
                <img
                    src={src}
                    alt={`${project.name} preview`}
                    className="h-full w-full object-cover object-top"
                    draggable={false}
                />
            ) : (
                <PreviewPlaceholder name={project.name} />
            )}
        </div>
    );
}

function PreviewPlaceholder({ name }: { name: string }) {
    return (
        <div className="flex h-full w-full flex-col items-center justify-center gap-3 p-6 text-center">
            <div className="grid w-3/4 gap-2">
                <Skeleton className="h-2.5 w-2/5" />
                <Skeleton className="h-2 w-full" />
                <Skeleton className="h-2 w-4/5" />
                <div className="mt-2 grid grid-cols-2 gap-2">
                    <Skeleton className="h-12 rounded-lg" />
                    <Skeleton className="h-12 rounded-lg" />
                </div>
            </div>
            <p className="text-[10.5px] text-foreground-quadranary">
                Open {name} once to generate its preview
            </p>
        </div>
    );
}

export function ProjectCard({
    project,
    archived,
    onOpen,
}: {
    project: Project;
    archived?: boolean;
    onOpen: (project: Project) => void;
}) {
    return (
        <div className="group relative flex flex-col gap-3">
            <button
                className="absolute inset-x-0 top-0 z-10 aspect-[4/3] rounded-2xl focus-visible:outline-none"
                aria-label={`Open ${project.name}`}
                onClick={() => onOpen(project)}
            />
            <ProjectPreview project={project} />

            <div className="absolute right-2.5 top-2.5 z-20 opacity-0 transition-opacity focus-within:opacity-100 group-hover:opacity-100">
                <ProjectSettingsButton project={project} iconOnly />
            </div>

            <div className="flex items-start justify-between gap-2 px-0.5">
                <div className="min-w-0">
                    <p className="truncate text-[13.5px] font-medium text-foreground">
                        {project.name}
                    </p>
                    <p className="mt-0.5 text-[11.5px] text-foreground-tertiary">
                        {archived ? 'Archived' : 'Edited'} {timeAgo(project.updatedAt)} ago
                    </p>
                </div>
            </div>
        </div>
    );
}
