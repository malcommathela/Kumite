import { MainChannels } from '@kumite/models/constants';
import type { IpcRendererEvent } from 'electron';
import { ipcRenderer } from 'electron';

export function onKumiteViewCode(callback: (data: any) => void) {
    const subscription = (_event: IpcRendererEvent, data: any) => callback(data);
    ipcRenderer.on(MainChannels.VIEW_CODE_IN_KUMITE, subscription);
    return () => ipcRenderer.removeListener(MainChannels.VIEW_CODE_IN_KUMITE, subscription);
}

export function removeKumiteViewCode(callback: (data: any) => void) {
    ipcRenderer.removeListener(
        MainChannels.VIEW_CODE_IN_KUMITE,
        callback as (event: IpcRendererEvent, ...args: any[]) => void,
    );
}

export function viewCodeInKumite(args: any) {
    return ipcRenderer.invoke(MainChannels.VIEW_CODE_IN_KUMITE, args);
}
