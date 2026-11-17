import { app, BrowserWindow } from 'electron';
import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { PREVIEW_MESSAGE_SOURCE } from '@kumite/models';
import { imageStorage } from '../storage/images';

const SNAPSHOT_VERSION = 1;
const VIEWPORT = { width: 1280, height: 800 };
const READY_TIMEOUT_MS = 30_000;
const inFlight = new Map<string, Promise<string>>();

function safeName(name: string): string {
    return name.replace(/[^a-zA-Z0-9_-]/g, '-').slice(0, 80) || 'preview';
}

export function catalogSnapshotFileName(name: string): string {
    return `library-preview-${safeName(name)}.png`;
}

function metadataPath(name: string): string {
    return path.join(app.getPath('userData'), 'library-preview-metadata', `${safeName(name)}.json`);
}

function snapshotMatches(name: string, sessionId: string): boolean {
    const image = imageStorage.readImage(catalogSnapshotFileName(name));
    if (!image) {
        return false;
    }
    try {
        const metadata = JSON.parse(fs.readFileSync(metadataPath(name), 'utf8')) as {
            version?: number;
            sessionId?: string;
            width?: number;
            height?: number;
        };
        return metadata.version === SNAPSHOT_VERSION &&
            metadata.sessionId === sessionId &&
            metadata.width === VIEWPORT.width &&
            metadata.height === VIEWPORT.height;
    } catch {
        return false;
    }
}

async function capture(url: string, name: string, sessionId: string): Promise<string> {
    if (snapshotMatches(name, sessionId)) {
        return catalogSnapshotFileName(name);
    }

    const window = new BrowserWindow({
        show: false,
        width: VIEWPORT.width,
        height: VIEWPORT.height,
        useContentSize: true,
        webPreferences: {
            backgroundThrottling: false,
            contextIsolation: true,
            nodeIntegration: false,
            sandbox: true,
        },
    });

    try {
        await window.loadURL(url);
        await window.webContents.executeJavaScript(`
            new Promise((resolve, reject) => {
                const expectedSession = ${JSON.stringify(sessionId)};
                const expectedSource = ${JSON.stringify(PREVIEW_MESSAGE_SOURCE)};
                const timeout = setTimeout(() => {
                    window.removeEventListener('message', onMessage);
                    reject(new Error('Preview did not finish rendering before the snapshot timeout.'));
                }, ${READY_TIMEOUT_MS});
                function onMessage(event) {
                    const message = event.data;
                    if (event.source !== window || !message ||
                        message.source !== expectedSource ||
                        message.sessionId !== expectedSession) return;
                    if (message.state === 'error') {
                        clearTimeout(timeout);
                        window.removeEventListener('message', onMessage);
                        reject(new Error(message.detail || 'Preview failed while rendering.'));
                    } else if (message.state === 'mounted') {
                        clearTimeout(timeout);
                        window.removeEventListener('message', onMessage);
                        Promise.resolve(document.fonts?.ready)
                            .then(() => new Promise(requestAnimationFrame))
                            .then(() => new Promise(requestAnimationFrame))
                            .then(() => resolve(true), reject);
                    }
                }
                window.addEventListener('message', onMessage);
            })
        `, true);

        const image = await window.webContents.capturePage({
            x: 0,
            y: 0,
            width: VIEWPORT.width,
            height: VIEWPORT.height,
        });
        const size = image.getSize();
        const png = image.toPNG();
        if (image.isEmpty() || size.width < 100 || size.height < 100 || png.length < 1024) {
            throw new Error('The rendered preview snapshot was empty or too small.');
        }

        // Publish the new image only after a complete, validated capture. A
        // failed render never destroys the last known-good snapshot.
        const fileName = catalogSnapshotFileName(name);
        const saved = imageStorage.writeImage(fileName, `data:image/png;base64,${png.toString('base64')}`);
        if (!saved) {
            throw new Error('Could not persist the component preview snapshot.');
        }

        const metadataFile = metadataPath(name);
        fs.mkdirSync(path.dirname(metadataFile), { recursive: true });
        const temporary = `${metadataFile}.${process.pid}.tmp`;
        fs.writeFileSync(temporary, JSON.stringify({
            version: SNAPSHOT_VERSION,
            sessionId,
            width: VIEWPORT.width,
            height: VIEWPORT.height,
            capturedAt: new Date().toISOString(),
        }, null, 2));
        fs.renameSync(temporary, metadataFile);
        return fileName;
    } finally {
        if (!window.isDestroyed()) {
            window.destroy();
        }
    }
}

/** Capture at most one snapshot per catalog item at a time. */
export function captureCatalogPreviewSnapshot(
    url: string,
    name: string,
    sessionId: string,
): Promise<string> {
    const pending = inFlight.get(name);
    if (pending) {
        return pending;
    }
    const task = capture(url, name, sessionId).finally(() => inFlight.delete(name));
    inFlight.set(name, task);
    return task;
}
