import { describe, expect, it } from 'bun:test';
import path from 'path';
import {
    assertInsideRoot,
    assertSafeFileName,
    assertSafeRoutePaths,
} from '../electron/main/validation';

const root = path.resolve('projects', 'app');

describe('assertInsideRoot', () => {
    it('accepts paths under the root', () => {
        expect(() => assertInsideRoot(root, path.join(root, 'public', 'a.png'), 'outside')).not.toThrow();
    });

    it('rejects a path that escapes the root', () => {
        expect(() => assertInsideRoot(root, path.join(root, '..', 'Desktop'), 'outside')).toThrow(
            'outside',
        );
    });
});

describe('assertSafeFileName', () => {
    it('accepts a plain file name', () => {
        expect(() => assertSafeFileName('logo.png')).not.toThrow();
    });

    it('rejects separators and empty names', () => {
        expect(() => assertSafeFileName('../../secret')).toThrow();
        expect(() => assertSafeFileName('..')).toThrow();
        expect(() => assertSafeFileName('')).toThrow();
    });
});

describe('assertSafeRoutePaths', () => {
    it('accepts a normal route', () => {
        expect(() => assertSafeRoutePaths(root, '/about', '[id]')).not.toThrow();
    });

    it('rejects traversal and characters that are not route segments', () => {
        expect(() => assertSafeRoutePaths(root, '../../Desktop')).toThrow();
        expect(() => assertSafeRoutePaths(root, 'my page')).toThrow();
    });
});
