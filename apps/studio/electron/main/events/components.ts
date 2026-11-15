import type { ShadcnInstallProgress } from '@kumite/models';
import { MainChannels } from '@kumite/models/constants';
import { ipcMain, type WebContents } from 'electron';
import {
    cancelComponentInstall,
    getComponentStatus,
    initializeComponents,
    installComponent,
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
    ipcMain.handle(MainChannels.COMPONENTS_GET_STATUS, (_event, projectPath: string) => {
        return getComponentStatus(projectPath);
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
        async (_event, args: { projectPath: string; component: string }) => {
            return startComponentPreview(args?.projectPath, args?.component);
        },
    );

    ipcMain.handle(MainChannels.COMPONENTS_PREVIEW_STOP, async () => {
        return stopComponentPreview();
    });

    ipcMain.handle(
        MainChannels.COMPONENTS_PREVIEW_CATALOG,
        async (event, args: { components?: string[] }) => {
            return startCatalogPreview(args?.components, progressReporter(event.sender));
        },
    );
}
