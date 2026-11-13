import { MainChannels } from '@kumite/models/constants';
import { ipcMain } from 'electron';
import {
    getComponentStatus,
    initializeComponents,
    installComponent,
    startComponentPreview,
    stopComponentPreview,
} from '../components';

export function listenForComponentMessages() {
    ipcMain.handle(MainChannels.COMPONENTS_GET_STATUS, (_event, projectPath: string) => {
        return getComponentStatus(projectPath);
    });

    ipcMain.handle(MainChannels.COMPONENTS_INITIALIZE, async (_event, projectPath: string) => {
        return initializeComponents(projectPath);
    });

    ipcMain.handle(
        MainChannels.COMPONENTS_INSTALL,
        async (_event, args: { projectPath: string; component: string }) => {
            return installComponent(args?.projectPath, args?.component);
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
}
