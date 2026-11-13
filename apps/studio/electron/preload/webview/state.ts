import { WebviewChannels } from '@kumite/models/constants';
import { ipcRenderer } from 'electron';

export function setWebviewId(webviewId: string) {
    (window as any)._kumiteWebviewId = webviewId;
}

export function getWebviewId(): string {
    const webviewId = (window as any)._kumiteWebviewId;
    if (!webviewId) {
        console.warn('Webview id not found');
        ipcRenderer.sendToHost(WebviewChannels.GET_WEBVIEW_ID);
        return '';
    }
    return webviewId;
}
