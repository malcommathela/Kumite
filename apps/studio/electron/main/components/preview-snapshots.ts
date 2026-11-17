import { app, BrowserWindow } from 'electron';
import fs from 'node:fs';
import path from 'node:path';
import { COMPONENT_CLI_VERSION, PREVIEW_MESSAGE_SOURCE } from '@kumite/models';

const SNAPSHOT_VERSION = 1;
const VIEWPORT = { width: 420, height: 280 };
const READY_TIMEOUT_MS = 30_000;
const inFlight = new Map<string, Promise<string>>();

function safeName(name: string): string {
    return name.replace(/[^a-zA-Z0-9_-]/g, '-').slice(0, 80) || 'preview';
}

export function catalogSnapshotFileName(name: string): string {
    return `library-preview-${safeName(name)}.png`;
}

function snapshotDirectory(): string {
    return path.join(app.getPath('userData'), 'library-previews');
}

function snapshotPath(name: string): string {
    return path.join(snapshotDirectory(), catalogSnapshotFileName(name));
}

function metadataPath(name: string): string {
    return path.join(snapshotDirectory(), `${safeName(name)}.json`);
}

function readSnapshotMetadata(name: string): {
    version?: number;
    sessionId?: string;
    width?: number;
    height?: number;
    catalogVersion?: string;
} | null {
    try {
        return JSON.parse(fs.readFileSync(metadataPath(name), 'utf8'));
    } catch {
        return null;
    }
}

function readSnapshotImage(name: string): string | null {
    try {
        const base64 = fs.readFileSync(snapshotPath(name), 'base64');
        const bytes = Buffer.from(base64, 'base64');
        const pngSignature = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
        return bytes.length >= 1024 && bytes.subarray(0, 8).equals(pngSignature)
            ? `data:image/png;base64,${base64}`
            : null;
    } catch {
        return null;
    }
}

/** Returns only complete snapshots written by the current renderer version. */
export function readCatalogPreviewSnapshot(name: string): string | null {
    const metadata = readSnapshotMetadata(name);
    if (
        metadata?.version !== SNAPSHOT_VERSION ||
        metadata.catalogVersion !== COMPONENT_CLI_VERSION ||
        metadata.width !== VIEWPORT.width ||
        metadata.height !== VIEWPORT.height
    ) {
        return null;
    }
    return readSnapshotImage(name);
}

function snapshotMatches(name: string, sessionId: string): boolean {
    const metadata = readSnapshotMetadata(name);
    return Boolean(
        metadata?.version === SNAPSHOT_VERSION &&
        metadata.catalogVersion === COMPONENT_CLI_VERSION &&
        metadata.sessionId === sessionId &&
        metadata.width === VIEWPORT.width &&
        metadata.height === VIEWPORT.height &&
        readSnapshotImage(name),
    );
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
        window.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));
        await window.loadURL(url);
        await window.webContents.executeJavaScript(`
            new Promise((resolve, reject) => {
                const expectedSession = ${JSON.stringify(sessionId)};
                const expectedSource = ${JSON.stringify(PREVIEW_MESSAGE_SOURCE)};
                let timeout;
                let finished = false;
                const finish = () => {
                    if (finished) return;
                    finished = true;
                    clearTimeout(timeout);
                    window.removeEventListener('message', onMessage);
                    const imagesReady = Promise.all(
                        Array.from(document.images).map((image) =>
                            image.complete ? Promise.resolve() : image.decode().catch(() => undefined),
                        ),
                    );
                    Promise.race([
                        Promise.all([Promise.resolve(document.fonts?.ready), imagesReady]),
                        new Promise((settle) => setTimeout(settle, 2500)),
                    ])
                        .then(() => {
                            const style = document.createElement('style');
                            style.textContent =
                                '*, *::before, *::after { animation: none !important; transition: none !important; caret-color: transparent !important; }';
                            document.head.appendChild(style);
                        })
                        .then(() => new Promise(requestAnimationFrame))
                        .then(() => new Promise(requestAnimationFrame))
                        .then(() => resolve(true), reject);
                };
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
                        finish();
                    }
                }
                const current = window.__kumitePreview;
                if (current?.sessionId === expectedSession && current.state === 'mounted') {
                    finish();
                    return;
                }
                if (current?.sessionId === expectedSession && current.state === 'error') {
                    reject(new Error(current.detail || 'Preview failed while rendering.'));
                    return;
                }
                timeout = setTimeout(() => {
                    window.removeEventListener('message', onMessage);
                    reject(new Error('Preview did not finish rendering before the snapshot timeout.'));
                }, ${READY_TIMEOUT_MS});
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
        const imageFile = snapshotPath(name);
        fs.mkdirSync(path.dirname(imageFile), { recursive: true });
        const imageTemporary = `${imageFile}.${process.pid}.tmp`;
        fs.writeFileSync(imageTemporary, png);
        fs.renameSync(imageTemporary, imageFile);

        const metadataFile = metadataPath(name);
        const temporary = `${metadataFile}.${process.pid}.tmp`;
        fs.writeFileSync(
            temporary,
            JSON.stringify(
                {
                    version: SNAPSHOT_VERSION,
                    catalogVersion: COMPONENT_CLI_VERSION,
                    sessionId,
                    width: VIEWPORT.width,
                    height: VIEWPORT.height,
                    capturedAt: new Date().toISOString(),
                },
                null,
                2,
            ),
        );
        fs.renameSync(temporary, metadataFile);
        return catalogSnapshotFileName(name);
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
