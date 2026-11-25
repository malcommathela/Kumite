import type { ShadcnInstallProgress } from '@kumite/models';
import { MainChannels } from '@kumite/models/constants';
import { ipcMain, type WebContents } from 'electron';
import {
    cancelComponentInstall,
    applyArtifactInsertion,
    cancelArtifactInsertion,
    finishArtifactInsertion,
    getComponentStatus,
    initializeComponents,
    installComponent,
    prepareArtifactInsertion,
    reconcileArtifactInsertions,
    releaseCatalogPreview,
    startCatalogPreview,
    startComponentPreview,
    stopComponentPreview,
} from '../components';

function progressReporter(sender: WebContents) {
    return (progress: ShadcnInstallProgress) => {
        if (!sender.isDestroyed()) {
            sender.send(MainChannels.COMPONENTS_INSTALL_PROGRESS, progress);
        }
    };
}

export function listenForComponentMessages() {
    ipcMain.handle(MainChannels.COMPONENTS_GET_STATUS, async (_event, projectPath: string) => {
        const artifactInsertionRecovery = await reconcileArtifactInsertions(projectPath);
        return { ...getComponentStatus(projectPath), artifactInsertionRecovery };
    });

    ipcMain.handle(MainChannels.COMPONENTS_ARTIFACT_PREPARE, async (_event, args) => {
        if (
            !args ||
            typeof args.projectPath !== 'string' ||
            !args.request ||
            !args.editorTarget ||
            typeof args.editorTarget.oid !== 'string' ||
            typeof args.editorTarget.domId !== 'string' ||
            typeof args.editorTarget.webviewId !== 'string'
        ) {
            throw new Error(
                'Artifact insertion preparation requires a project and implementation request.',
            );
        }
        const recovery = await reconcileArtifactInsertions(args.projectPath);
        if (
            recovery.some(
                (message) =>
                    message.includes('awaiting editor recovery') ||
                    message.includes('requires manual recovery'),
            )
        ) {
            throw new Error(recovery.join('\n'));
        }
        return {
            ...(await prepareArtifactInsertion(args.request, args.projectPath, args.editorTarget)),
            recovery,
        };
    });

    ipcMain.handle(MainChannels.COMPONENTS_ARTIFACT_APPLY, async (_event, args) => {
        if (
            !args ||
            typeof args.planId !== 'string' ||
            typeof args.planHash !== 'string' ||
            !/^[a-f0-9]{64}$/.test(args.planHash)
        ) {
            throw new Error('Artifact insertion approval is invalid or incomplete.');
        }
        // The plan hash is validated in applyArtifactInsertion against the prepared
        // plan, project snapshot and editor target; no extra consent dialog.
        return applyArtifactInsertion(args.planId, args.planHash);
    });

    ipcMain.handle(MainChannels.COMPONENTS_ARTIFACT_CANCEL, (_event, args) => {
        if (!args || typeof args.planId !== 'string') {
            throw new Error('Artifact insertion cancellation is invalid.');
        }
        return cancelArtifactInsertion(args.planId);
    });

    ipcMain.handle(MainChannels.COMPONENTS_ARTIFACT_COMMIT, async (_event, args) => {
        if (!args || typeof args.projectPath !== 'string' || typeof args.operationId !== 'string') {
            throw new Error('Artifact insertion completion is invalid.');
        }
        await finishArtifactInsertion(args.projectPath, args.operationId, true);
        return true;
    });

    ipcMain.handle(MainChannels.COMPONENTS_ARTIFACT_ROLLBACK, async (_event, args) => {
        if (!args || typeof args.projectPath !== 'string' || typeof args.operationId !== 'string') {
            throw new Error('Artifact insertion rollback is invalid.');
        }
        await finishArtifactInsertion(args.projectPath, args.operationId, false);
        return true;
    });

    ipcMain.handle(MainChannels.COMPONENTS_INITIALIZE, async (_event, projectPath: string) => {
        return initializeComponents(projectPath);
    });

    ipcMain.handle(
        MainChannels.COMPONENTS_INSTALL,
        async (event, args: { projectPath: string; component: string }) => {
            return installComponent(
                args?.projectPath,
                args?.component,
                progressReporter(event.sender),
            );
        },
    );

    ipcMain.handle(
        MainChannels.COMPONENTS_INSTALL_CANCEL,
        (_event, args: { projectPath: string; component: string }) => {
            return cancelComponentInstall(args?.projectPath, args?.component);
        },
    );

    ipcMain.handle(
        MainChannels.COMPONENTS_PREVIEW_START,
        async (_event, args: { projectPath: string; component: string; projectId?: string }) => {
            return startComponentPreview(args?.projectPath, args?.component, args?.projectId);
        },
    );

    ipcMain.handle(MainChannels.COMPONENTS_PREVIEW_STOP, async () => {
        return stopComponentPreview();
    });

    ipcMain.handle(
        MainChannels.COMPONENTS_PREVIEW_RELEASE,
        async (_event, args: { projectId?: string }) => {
            return releaseCatalogPreview(args?.projectId);
        },
    );

    ipcMain.handle(
        MainChannels.COMPONENTS_PREVIEW_CATALOG,
        async (event, args: { components?: string[]; projectId?: string }) => {
            return startCatalogPreview(
                args?.components,
                args?.projectId,
                progressReporter(event.sender),
            );
        },
    );
}
