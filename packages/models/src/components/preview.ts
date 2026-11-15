/**
 * Lifecycle handshake shared by the preview page, the Electron main process,
 * and the renderer.
 *
 * A preview iframe can fire `load` while the page is still an empty Vite shell,
 * so the host waits for a `mounted` message instead. The helpers here are pure:
 * main validates what it receives while generating entries, and the renderer
 * validates what arrives through `postMessage`.
 */

export const PREVIEW_MESSAGE_SOURCE = 'kumite-preview';

export type PreviewLifecycleState = 'booting' | 'mounted' | 'error';

export interface PreviewMessage {
    sessionId: string;
    state: PreviewLifecycleState;
    detail: string | null;
}

/** Validates a `message` event's data. Returns null for anything else. */
export function parsePreviewMessage(data: unknown): PreviewMessage | null {
    if (!data || typeof data !== 'object') {
        return null;
    }
    const record = data as Record<string, unknown>;
    if (record.source !== PREVIEW_MESSAGE_SOURCE) {
        return null;
    }
    if (typeof record.sessionId !== 'string' || record.sessionId.length === 0) {
        return null;
    }
    const state = record.state;
    if (state !== 'booting' && state !== 'mounted' && state !== 'error') {
        return null;
    }
    return {
        sessionId: record.sessionId,
        state,
        detail:
            typeof record.detail === 'string' && record.detail.length > 0 ? record.detail : null,
    };
}

/** The next state for a handshake message, or null when it should be ignored. */
export function advancePreviewState(
    current: PreviewLifecycleState | 'idle',
    message: PreviewMessage,
): PreviewLifecycleState | null {
    if (message.state === 'error') {
        return 'error';
    }
    if (message.state === 'mounted') {
        return 'mounted';
    }
    return current === 'idle' ? 'booting' : null;
}
