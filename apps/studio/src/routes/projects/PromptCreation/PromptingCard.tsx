import { useProjectsManager } from '@/components/Context';
import { ProjectTabs } from '@/lib/projects';
import { compressImage } from '@/lib/utils';
import { MessageContextType, type ImageMessageContext } from '@kumite/models/chat';
import { Button } from '@kumite/ui/button';
import { Textarea } from '@kumite/ui/textarea';
import { Tooltip, TooltipContent, TooltipPortal, TooltipTrigger } from '@kumite/ui/tooltip';
import { cn } from '@kumite/ui/utils';
import { ArrowUp, FilePlus2, ImagePlus } from 'lucide-react';
import { AnimatePresence, motion, MotionConfig } from 'motion/react';
import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { DraftImagePill } from '../../editor/EditPanel/ChatTab/ContextPills/DraftingImagePill';

export const PromptingCard = () => {
    const projectsManager = useProjectsManager();
    const [inputValue, setInputValue] = useState('');
    const [isDragging, setIsDragging] = useState(false);
    const [selectedImages, setSelectedImages] = useState<ImageMessageContext[]>([]);
    const [imageTooltipOpen, setImageTooltipOpen] = useState(false);
    const [isHandlingFile, setIsHandlingFile] = useState(false);
    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const isInputInvalid = !inputValue || inputValue.trim().length < 10;
    const [isComposing, setIsComposing] = useState(false);
    const imageRef = useRef<HTMLInputElement>(null);
    const { t } = useTranslation();

    useEffect(() => {
        const handleEscapeKey = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                projectsManager.projectsTab = ProjectTabs.PROJECTS;
            }
        };

        window.addEventListener('keydown', handleEscapeKey);
        return () => window.removeEventListener('keydown', handleEscapeKey);
    }, []);

    const handleSubmit = async () => {
        if (isInputInvalid) {
            console.warn('Input is too short');
            return;
        }
        projectsManager.create.sendPrompt(inputValue, selectedImages, false);
    };

    const handleBlankSubmit = async () => {
        projectsManager.create.sendPrompt('', [], true);
    };

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(true);
    };

    const handleDragLeave = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);
        setImageTooltipOpen(false);
        // Find and reset the container's data attribute
        const container = e.currentTarget.closest('.prompt-surface');
        if (container) {
            container.setAttribute('data-dragging-image', 'false');
        }
        const files = Array.from(e.dataTransfer.files);
        handleNewImageFiles(files);
    };

    const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
        setIsHandlingFile(true);
        setImageTooltipOpen(false);
        const files = Array.from(e.target.files || []);
        handleNewImageFiles(files);
    };

    const handleNewImageFiles = async (files: File[]) => {
        const imageFiles = files.filter((file) => file.type.startsWith('image/'));

        const imageContexts: ImageMessageContext[] = [];
        if (imageFiles.length > 0) {
            // Handle the dropped image files
            for (const file of imageFiles) {
                const imageContext = await createImageMessageContext(file);
                if (imageContext) {
                    imageContexts.push(imageContext);
                }
            }
        }
        setSelectedImages([...selectedImages, ...imageContexts]);
        setIsHandlingFile(false);
    };

    const handleRemoveImage = (imageContext: ImageMessageContext) => {
        if (imageRef && imageRef.current) {
            imageRef.current.value = '';
        }
        setSelectedImages(selectedImages.filter((f) => f !== imageContext));
    };

    const createImageMessageContext = async (file: File): Promise<ImageMessageContext | null> => {
        try {
            const compressedImage = await compressImage(file);

            // If compression failed, fall back to original file
            const base64 =
                compressedImage ||
                (await new Promise<string>((resolve, reject) => {
                    const reader = new FileReader();
                    reader.onloadend = () => {
                        resolve(reader.result as string);
                    };
                    reader.onerror = reject;
                    reader.readAsDataURL(file);
                }));

            return {
                type: MessageContextType.IMAGE,
                content: base64,
                displayName: file.name,
                mimeType: file.type,
            };
        } catch (error) {
            console.error('Error reading file:', error);
            return null;
        }
    };

    const handleDragStateChange = (isDragging: boolean, e: React.DragEvent) => {
        const hasImage =
            e.dataTransfer.types.length > 0 &&
            Array.from(e.dataTransfer.items).some(
                (item) =>
                    item.type.startsWith('image/') ||
                    (item.type === 'Files' && e.dataTransfer.types.includes('public.file-url')),
            );
        if (hasImage) {
            setIsDragging(isDragging);
            // Find the container div with the bg-background-secondary class
            const container = e.currentTarget.closest('.prompt-surface');
            if (container) {
                container.setAttribute('data-dragging-image', isDragging.toString());
            }
        }
    };

    const handleContainerClick = (e: React.MouseEvent) => {
        // Don't focus if clicking on a button, pill, or the textarea itself
        if (
            e.target instanceof Element &&
            (e.target.closest('button') ||
                e.target.closest('.group') || // Pills have 'group' class
                e.target === textareaRef.current)
        ) {
            return;
        }

        textareaRef.current?.focus();
    };

    const adjustTextareaHeight = () => {
        if (textareaRef.current) {
            // Reset height to auto to get the correct scrollHeight
            textareaRef.current.style.height = 'auto';

            const lineHeight = 20; // Approximate line height in pixels
            const maxHeight = lineHeight * 10; // 10 lines maximum

            const newHeight = Math.min(textareaRef.current.scrollHeight, maxHeight);
            textareaRef.current.style.height = `${newHeight}px`;
        }
    };

    return (
        <MotionConfig transition={{ duration: 0.5, type: 'spring', bounce: 0 }}>
            <div className="flex flex-col items-center">
                <motion.h2
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="text-center font-display text-[2.7rem] leading-[1.05] tracking-[-0.02em] text-foreground"
                >
                    {t('projects.prompt.title')}
                </motion.h2>
                <motion.p
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.08 }}
                    className="mt-3 max-w-[420px] text-center text-[13px] leading-5 text-foreground-tertiary"
                >
                    {t('projects.prompt.description')}
                </motion.p>

                <motion.div
                    initial={{ opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.14 }}
                    className={cn(
                        'prompt-surface mt-8 w-full overflow-hidden rounded-2xl border border-border bg-surface transition-colors',
                        isDragging && 'border-border-active bg-surface-hover',
                    )}
                    onClick={handleContainerClick}
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                >
                    <div className="flex flex-col">
                        <div className="flex flex-wrap gap-1.5 px-4 pt-3">
                            <AnimatePresence mode="popLayout">
                                {selectedImages.map((imageContext, index) => (
                                    <DraftImagePill
                                        key={`image-${index}-${imageContext.content}`}
                                        context={imageContext}
                                        onRemove={() => handleRemoveImage(imageContext)}
                                    />
                                ))}
                            </AnimatePresence>
                        </div>
                        <Textarea
                            ref={textareaRef}
                            className="min-h-[118px] w-full resize-none border-0 bg-transparent px-5 py-4 text-[14px] leading-6 text-foreground caret-foreground shadow-none outline-none placeholder:text-foreground-quadranary focus-visible:ring-0"
                            placeholder={t('projects.prompt.input.placeholder')}
                            value={inputValue}
                            onChange={(e) => {
                                setInputValue(e.target.value);
                                adjustTextareaHeight();
                            }}
                            onCompositionStart={() => setIsComposing(true)}
                            onCompositionEnd={() => {
                                setIsComposing(false);
                            }}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter' && !e.shiftKey && !isComposing) {
                                    e.preventDefault();
                                    handleSubmit();
                                }
                            }}
                            onDragEnter={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                handleDragStateChange(true, e);
                            }}
                            onDragOver={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                handleDragStateChange(true, e);
                            }}
                            onDragLeave={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                if (!e.currentTarget.contains(e.relatedTarget as Node)) {
                                    handleDragStateChange(false, e);
                                }
                            }}
                            onDrop={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                handleDragStateChange(false, e);
                                handleDrop(e);
                            }}
                            rows={4}
                            style={{ resize: 'none' }}
                        />

                        <div className="flex items-center justify-between gap-2 border-t border-border/60 px-3 py-2.5">
                            <div className="flex items-center gap-1">
                                <Tooltip
                                    open={imageTooltipOpen && !isHandlingFile}
                                    onOpenChange={(open) =>
                                        !isHandlingFile && setImageTooltipOpen(open)
                                    }
                                >
                                    <TooltipTrigger asChild>
                                        <button
                                            className="flex h-8 w-8 items-center justify-center rounded-full text-foreground-tertiary transition-colors hover:bg-background-hover hover:text-foreground"
                                            onClick={() =>
                                                document.getElementById('image-input')?.click()
                                            }
                                        >
                                            <input
                                                id="image-input"
                                                type="file"
                                                ref={imageRef}
                                                accept="image/*"
                                                multiple
                                                className="hidden"
                                                onChange={handleFileSelect}
                                            />
                                            <ImagePlus
                                                className="h-[18px] w-[18px]"
                                                strokeWidth={1.7}
                                            />
                                        </button>
                                    </TooltipTrigger>
                                    <TooltipPortal>
                                        <TooltipContent side="top" sideOffset={5}>
                                            {t('projects.prompt.input.imageUpload')}
                                        </TooltipContent>
                                    </TooltipPortal>
                                </Tooltip>
                            </div>

                            <div className="flex items-center gap-2.5">
                                <span className="hidden text-[11px] text-foreground-quadranary sm:block">
                                    Enter to start
                                </span>
                                <Tooltip>
                                    <TooltipTrigger asChild>
                                        <Button
                                            size="icon"
                                            className="h-8 w-8 rounded-full"
                                            disabled={isInputInvalid}
                                            onClick={handleSubmit}
                                        >
                                            <ArrowUp className="h-4 w-4" strokeWidth={2} />
                                        </Button>
                                    </TooltipTrigger>
                                    <TooltipPortal>
                                        <TooltipContent side="top">
                                            {t('projects.prompt.input.submit')}
                                        </TooltipContent>
                                    </TooltipPortal>
                                </Tooltip>
                            </div>
                        </div>
                    </div>
                </motion.div>

                <Button
                    variant="ghost"
                    className="mt-5 h-9 text-[12.5px] text-foreground-tertiary hover:text-foreground"
                    onClick={handleBlankSubmit}
                >
                    <FilePlus2 className="h-4 w-4" strokeWidth={1.7} />
                    {t('projects.prompt.blankStart')}
                </Button>
            </div>
        </MotionConfig>
    );
};
