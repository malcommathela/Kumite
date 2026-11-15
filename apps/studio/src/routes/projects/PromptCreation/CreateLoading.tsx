import { useProjectsManager } from '@/components/Context';
import { Button } from '@kumite/ui/button';
import { Progress } from '@kumite/ui/progress';
import { CircleSlash } from 'lucide-react';
import { observer } from 'mobx-react-lite';
import { motion, MotionConfig } from 'motion/react';
import { useTranslation } from 'react-i18next';

export const CreateLoadingCard = observer(() => {
    const { t } = useTranslation();
    const projectsManager = useProjectsManager();

    return (
        <MotionConfig transition={{ duration: 0.5, type: 'spring', bounce: 0 }}>
            <div className="flex flex-col items-center">
                <motion.h2
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="text-center font-display text-[2.7rem] leading-[1.05] tracking-[-0.02em] text-foreground"
                >
                    {t('projects.create.loading.title')}
                </motion.h2>
                <motion.p
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.08 }}
                    className="mt-3 max-w-[440px] text-center text-[13px] leading-5 text-foreground-tertiary"
                >
                    {projectsManager.create.message || t('projects.create.loading.description')}
                </motion.p>

                <motion.div
                    initial={{ opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.14 }}
                    className="mt-8 w-full rounded-2xl border border-border bg-surface p-6"
                >
                    <Progress value={projectsManager.create.progress} className="w-full" />
                    <div className="mt-5 flex justify-end">
                        <Button
                            variant="ghost"
                            className="h-8 text-[12.5px] text-foreground-tertiary hover:text-foreground"
                            onClick={() => projectsManager.create.cancel()}
                        >
                            <CircleSlash className="h-4 w-4" strokeWidth={1.7} />
                            {t('projects.create.loading.cancel')}
                        </Button>
                    </div>
                </motion.div>
            </div>
        </MotionConfig>
    );
});
