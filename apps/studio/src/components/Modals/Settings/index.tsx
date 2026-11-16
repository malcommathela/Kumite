import { useEditorEngine, useProjectsManager } from '@/components/Context';
import { SettingsTabValue } from '@/lib/models';
import type { PageNode } from '@kumite/models';
import { cn } from '@kumite/ui/utils';
import { AnimatePresence, motion } from 'framer-motion';
import { X } from 'lucide-react';
import { observer } from 'mobx-react-lite';
import { useEffect, useMemo } from 'react';
import { capitalizeFirstLetter } from '/common/helpers';
import AdvancedTab from './Advance';
import { DomainTab } from './Domain';
import PreferencesTab from './Preferences';
import ProjectTab from './Project';
import { SiteTab } from './Site';
import { PageTab } from './Site/Page';
import { VersionsTab } from './Versions';

interface SettingTab {
    label: SettingsTabValue | string;
    group: 'Project' | 'Global' | 'Pages';
    component: React.ReactNode;
}

export const SettingsModal = observer(() => {
    const editorEngine = useEditorEngine();
    const projectsManager = useProjectsManager();
    const project = projectsManager.project;
    const pagesManager = editorEngine.pages;

    useEffect(() => {
        if (editorEngine.isSettingsOpen && project) {
            pagesManager.scanPages();
            editorEngine.image.scanImages();
            projectsManager.scanProjectMetadata(project);
        }
    }, [editorEngine.isSettingsOpen]);

    const flattenPages = useMemo(() => {
        return pagesManager.tree.reduce((acc, page) => {
            const flattenNode = (node: typeof page) => {
                if (node.children?.length) {
                    node.children.forEach((child) => flattenNode(child));
                } else {
                    acc.push(node);
                }
            };
            flattenNode(page);
            return acc;
        }, [] as PageNode[]);
    }, [pagesManager.tree]);

    const projectOnlyTabs: SettingTab[] = [
        { label: SettingsTabValue.SITE, group: 'Project', component: <SiteTab /> },
        { label: SettingsTabValue.DOMAIN, group: 'Project', component: <DomainTab /> },
        { label: SettingsTabValue.PROJECT, group: 'Project', component: <ProjectTab /> },
        { label: SettingsTabValue.VERSIONS, group: 'Project', component: <VersionsTab /> },
    ];

    const globalTabs: SettingTab[] = [
        {
            label: SettingsTabValue.PREFERENCES,
            group: 'Global',
            component: <PreferencesTab />,
        },
        { label: SettingsTabValue.ADVANCED, group: 'Global', component: <AdvancedTab /> },
    ];

    const pagesTabs: SettingTab[] = flattenPages.map((page) => ({
        label: page.path === '/' ? 'Home' : page.path,
        group: 'Pages' as const,
        component: <PageTab metadata={page.metadata} path={page.path} />,
    }));

    const tabs = project ? [...projectOnlyTabs, ...globalTabs, ...pagesTabs] : [...globalTabs];
    const activeTab = tabs.find((tab) => tab.label === editorEngine.settingsTab) ?? tabs[0];

    return (
        <AnimatePresence>
            {editorEngine.isSettingsOpen && (
                <>
                    {/* Backdrop */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-50 bg-background/70 backdrop-blur-sm"
                        onClick={() => (editorEngine.isSettingsOpen = false)}
                    />

                    {/* Modal */}
                    <motion.div
                        initial={{ opacity: 0, scale: 0.97 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.97 }}
                        transition={{ duration: 0.15 }}
                        className="pointer-events-none fixed inset-0 z-50 flex items-center justify-center p-6"
                    >
                        <div className="pointer-events-auto flex h-[min(760px,calc(100vh-3rem))] w-[min(1040px,calc(100vw-3rem))] flex-col overflow-hidden rounded-2xl border border-border bg-background shadow-2xl">
                            <div className="flex shrink-0 items-center justify-between px-8 pb-6 pt-8">
                                <h1 className="font-display text-[2.8rem] leading-none tracking-[-0.02em] text-foreground">
                                    Settings
                                </h1>
                                <button
                                    className="flex h-8 w-8 items-center justify-center rounded-full text-foreground-tertiary transition-colors hover:bg-background-hover hover:text-foreground"
                                    onClick={() => (editorEngine.isSettingsOpen = false)}
                                    aria-label="Close settings"
                                >
                                    <X className="h-4 w-4" strokeWidth={1.7} />
                                </button>
                            </div>

                            <div className="flex shrink-0 gap-6 overflow-x-auto border-b border-border px-8 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                                {tabs.map((tab, index) => {
                                    const isFirstOfPages =
                                        tab.group === 'Pages' && tabs[index - 1]?.group !== 'Pages';
                                    return (
                                        <button
                                            key={tab.label}
                                            onClick={() => (editorEngine.settingsTab = tab.label)}
                                            className={cn(
                                                'relative shrink-0 whitespace-nowrap pb-3 pt-1 text-[12.5px] transition-colors',
                                                isFirstOfPages &&
                                                    'ml-2 border-l border-border pl-6',
                                                activeTab?.label === tab.label
                                                    ? 'text-foreground'
                                                    : 'text-foreground-tertiary hover:text-foreground-secondary',
                                            )}
                                        >
                                            {capitalizeFirstLetter(tab.label.toLowerCase())}
                                            {activeTab?.label === tab.label && (
                                                <span className="absolute inset-x-0 -bottom-px h-px bg-foreground" />
                                            )}
                                        </button>
                                    );
                                })}
                            </div>

                            <div className="min-h-0 flex-1 overflow-y-auto px-8 py-8">
                                <div className="mx-auto max-w-[780px]">{activeTab?.component}</div>
                            </div>
                        </div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
});
