import path from 'path';

export function assertInsideRoot(root: string, target: string, message: string): void {
    const resolvedRoot = path.resolve(root);
    const resolved = path.resolve(target);
    if (resolved !== resolvedRoot && !resolved.startsWith(resolvedRoot + path.sep)) {
        throw new Error(message);
    }
}

export function assertSafeFileName(fileName: string): void {
    if (!fileName || fileName !== path.basename(fileName) || fileName === '..') {
        throw new Error('Invalid file name');
    }
}

export function assertSafeRoutePaths(root: string, ...paths: string[]): void {
    for (const value of paths) {
        const normalized = value
            .replace(/\\/g, '/')
            .replace(/\/+/g, '/')
            .replace(/^\/|\/$/g, '');
        if (!/^[a-zA-Z0-9\-_[\]()/]+$/.test(normalized)) {
            throw new Error('Page path contains invalid characters');
        }
        assertInsideRoot(root, path.resolve(root, normalized), 'Page path is outside the project');
    }
}
