import {
    PREVIEW_MESSAGE_SOURCE,
    advancePreviewState,
    parsePreviewMessage,
} from '@kumite/models/components';
import { describe, expect, it } from 'bun:test';

const valid = {
    source: PREVIEW_MESSAGE_SOURCE,
    sessionId: 'ks_1234',
    state: 'mounted',
};

describe('parsePreviewMessage', () => {
    it('accepts a valid handshake message', () => {
        expect(parsePreviewMessage({ ...valid, detail: 'ready' })).toEqual({
            sessionId: 'ks_1234',
            state: 'mounted',
            detail: 'ready',
        });
    });

    it('normalizes a missing or empty detail', () => {
        expect(parsePreviewMessage(valid)?.detail).toBeNull();
        expect(parsePreviewMessage({ ...valid, detail: '' })?.detail).toBeNull();
    });

    it('rejects messages from another source', () => {
        expect(parsePreviewMessage({ ...valid, source: 'other' })).toBeNull();
    });

    it('rejects messages without a session id', () => {
        expect(parsePreviewMessage({ ...valid, sessionId: '' })).toBeNull();
        expect(parsePreviewMessage({ ...valid, sessionId: 42 })).toBeNull();
    });

    it('rejects unknown states and non-objects', () => {
        expect(parsePreviewMessage({ ...valid, state: 'ready' })).toBeNull();
        expect(parsePreviewMessage(null)).toBeNull();
        expect(parsePreviewMessage('mounted')).toBeNull();
    });
});

describe('advancePreviewState', () => {
    const message = (state: 'booting' | 'mounted' | 'error') => ({
        sessionId: 'ks_1234',
        state,
        detail: null,
    });

    it('moves idle to booting', () => {
        expect(advancePreviewState('idle', message('booting'))).toBe('booting');
    });

    it('does not restart a booting preview on a repeated boot message', () => {
        expect(advancePreviewState('booting', message('booting'))).toBeNull();
    });

    it('moves booting to mounted and ignores later boot messages', () => {
        expect(advancePreviewState('booting', message('mounted'))).toBe('mounted');
        expect(advancePreviewState('mounted', message('booting'))).toBeNull();
    });

    it('moves any state to error', () => {
        expect(advancePreviewState('idle', message('error'))).toBe('error');
        expect(advancePreviewState('mounted', message('error'))).toBe('error');
    });

    it('recovers from error only when the preview reports mounted', () => {
        expect(advancePreviewState('error', message('mounted'))).toBe('mounted');
        expect(advancePreviewState('error', message('booting'))).toBeNull();
    });
});
