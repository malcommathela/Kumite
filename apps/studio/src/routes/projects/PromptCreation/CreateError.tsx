import { useProjectsManager } from '@/components/Context';
import { CreateState } from '@/lib/projects/create';
import { Button } from '@kumite/ui/button';
import { CornerUpLeft } from 'lucide-react';
import { observer } from 'mobx-react-lite';
import { motion, MotionConfig } from 'motion/react';
import { useTranslation } from 'react-i18next';

export const CreateErrorCard = observer(() => {
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
                    {t('projects.create.error.title')}
                </motion.h2>

                <motion.div
                    initial={{ opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.08 }}
                    className="mt-8 w-full rounded-2xl border border-border bg-surface p-6"
                >
                    <p className="max-h-72 overflow-y-auto whitespace-pre-wrap text-[13px] leading-5 text-destructive">
                        {projectsManager.create.error || t('projects.create.loading.description')}
                    </p>
                    <div className="mt-5 flex justify-end">
                        <Button
                            variant="secondary"
                            className="h-8"
                            onClick={() => (projectsManager.create.state = CreateState.PROMPT)}
                        >
                            <CornerUpLeft className="h-3.5 w-3.5" strokeWidth={1.7} />
                            {t('projects.create.error.backToPrompt')}
                        </Button>
                    </div>
                </motion.div>
            </div>
        </MotionConfig>
    );
});
