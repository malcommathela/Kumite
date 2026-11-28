import { MainChannels } from '@kumite/models/constants';
import { WindowCommand } from '@kumite/models/projects';
import { BrowserWindow, ipcMain, shell } from 'electron';
import path from 'path';
import { mainWindow } from '..';
import { PersistentStorage } from '../storage';
import { imageStorage } from '../storage/images';
import { updater } from '../update';
import { listenForAnalyticsMessages } from './analytics';
import { listenForAssetMessages } from './asset';
import { listenForAuthMessages } from './auth';
import { listenForChatMessages } from './chat';
import { listenForCodeMessages } from './code';
import { listenForComponentMessages } from './components';
import { listenForCreateMessages } from './create';
import { listenForFileMessages } from './files';
import { listenForHostingMessages } from './hosting';
import { listenForPageMessages } from './page';
import { listenForPaymentMessages } from './payments';
import { listenForRunMessages } from './run';
import { listenForStorageMessages } from './storage';
import { listenForVersionsMessages } from './versions';

export function listenForIpcMessages() {
    listenForGeneralMessages();
    listenForAnalyticsMessages();
    listenForCodeMessages();
    listenForStorageMessages();
    listenForAuthMessages();
    listenForCreateMessages();
    listenForChatMessages();
    listenForRunMessages();
    listenForHostingMessages();
    listenForPaymentMessages();
    listenForPageMessages();
    listenForAssetMessages();
    listenForVersionsMessages();
    listenForFileMessages();
    listenForComponentMessages();
}

export function removeIpcListeners() {
    Object.values(MainChannels).forEach((channel) => {
        ipcMain.removeHandler(channel);
    });
}

function listenForGeneralMessages() {
    ipcMain.handle(MainChannels.RELOAD_APP, (e: Electron.IpcMainInvokeEvent, args: string) => {
        return mainWindow?.reload();
    });

    ipcMain.handle(
        MainChannels.OPEN_IN_EXPLORER,
        (e: Electron.IpcMainInvokeEvent, args: string) => {
            return shell.showItemInFolder(args);
        },
    );

    ipcMain.handle(
        MainChannels.OPEN_EXTERNAL_WINDOW,
        (e: Electron.IpcMainInvokeEvent, args: string) => {
            let url: URL;
            try {
                url = new URL(args);
            } catch {
                return;
            }
            if (url.protocol !== 'http:' && url.protocol !== 'https:') {
                return;
            }
            return shell.openExternal(url.toString());
        },
    );

    ipcMain.handle(
        MainChannels.QUIT_AND_INSTALL,
        (e: Electron.IpcMainInvokeEvent, args: string) => {
            return updater.quitAndInstall();
        },
    );

    ipcMain.handle(MainChannels.GET_IMAGE, (e: Electron.IpcMainInvokeEvent, args: string) => {
        return imageStorage.readImage(args);
    });

    ipcMain.handle(
        MainChannels.SAVE_IMAGE,
        (e: Electron.IpcMainInvokeEvent, args: { img: string; name: string }) => {
            return imageStorage.writeImage(args.name, args.img);
        },
    );

    ipcMain.handle(
        MainChannels.SEND_WINDOW_COMMAND,
        (e: Electron.IpcMainInvokeEvent, args: string) => {
            const window = BrowserWindow.getFocusedWindow();

            const command = args as WindowCommand;
            switch (command) {
                case WindowCommand.MINIMIZE:
                    window?.minimize();
                    break;
                case WindowCommand.MAXIMIZE:
                    window?.maximize();
                    break;
                case WindowCommand.UNMAXIMIZE:
                    window?.unmaximize();
                    break;
                case WindowCommand.CLOSE:
                    window?.close();
                    break;
            }
        },
    );

    ipcMain.handle(MainChannels.DELETE_FOLDER, (e: Electron.IpcMainInvokeEvent, args: string) => {
        const target = path.resolve(args);
        const projects = PersistentStorage.PROJECTS.read()?.projects ?? [];
        if (!projects.some((project) => path.resolve(project.folderPath) === target)) {
            throw new Error('Only a known project folder can be deleted');
        }
        return shell.trashItem(target);
    });
}
