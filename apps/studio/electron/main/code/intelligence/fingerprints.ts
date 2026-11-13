import { createHash } from 'node:crypto';
import type { TemplateNode } from '@kumite/models/element';
import { normalizePath } from './definitions';

/**
 * Content and span fingerprints.
 *
 * The mapping is a snapshot: it points at line/column positions in a file that
 * the user can edit at any time. A fingerprint lets an edit ask "is this still
 * the code the mapping saw?" before it writes.
 *
 * Two hashes are kept per node:
 *
 * - the file hash, which changes for any edit;
 * - the span hash, which changes only when the node's own source changes.
 *
 * A file edit outside the span therefore does not invalidate the node, while an
 * edit inside it does. A watcher event drops every node fingerprint for that
 * file, so a stale coordinate cannot be reused.
 */

export type Hash = string;

export interface FileFingerprint {
    path: string;
    contentHash: Hash;
    bytes: number;
}

export interface NodeFingerprint {
    /** Stable key derived from the path and the recorded span. */
    key: string;
    path: string;
    startTag: TemplateNode['startTag'];
    endTag: TemplateNode['endTag'];
    contentHash: Hash;
    spanHash: Hash;
}

export type FingerprintStatus =
    | 'unchanged'
    | 'file-changed-span-intact'
    | 'span-changed'
    | 'unknown-node'
    | 'unreadable-span';

export interface FingerprintCheck {
    ok: boolean;
    status: FingerprintStatus;
    fingerprint: NodeFingerprint | null;
    message: string;
}

export type WatchEvent =
    | { path: string; type: 'create' | 'update'; content: string }
    | { path: string; type: 'delete' };

export function hashContent(content: string): Hash {
    return `sha256:${createHash('sha256').update(content, 'utf8').digest('hex')}`;
}

/**
 * Extracts the node's source exactly as `readCodeBlock` does.
 *
 * The mapping stores the opening tag's start and the closing tag's end, with a
 * 1-based start column and an exclusive end column. Slicing mirrors the reader
 * so a fingerprint covers the same bytes the editor shows.
 */
export function readNodeSource(content: string, node: TemplateNode): string | null {
    const start = node.startTag.start;
    const end = (node.endTag ?? node.startTag).end;
    const lines = content.split('\n');

    if (start.line < 1 || end.line < start.line || end.line > lines.length) {
        return null;
    }

    return lines
        .slice(start.line - 1, end.line)
        .map((line, index, array) => {
            if (index === 0 && array.length === 1) {
                return line.substring(start.column - 1, end.column);
            }
            if (index === 0) {
                return line.substring(start.column - 1);
            }
            if (index === array.length - 1) {
                return line.substring(0, end.column);
            }
            return line;
        })
        .join('\n');
}

export function hashNodeSpan(content: string, node: TemplateNode): Hash | null {
    const source = readNodeSource(content, node);
    return source === null ? null : hashContent(source);
}

export function fingerprintKey(node: TemplateNode): string {
    const start = node.startTag.start;
    const end = (node.endTag ?? node.startTag).end;
    return `${normalizePath(node.path)}#${start.line}:${start.column}-${end.line}:${end.column}`;
}

export class FingerprintStore {
    private files = new Map<string, FileFingerprint>();
    private nodes = new Map<string, NodeFingerprint>();

    recordFile(path: string, content: string): FileFingerprint {
        const fingerprint: FileFingerprint = {
            path: normalizePath(path),
            contentHash: hashContent(content),
            bytes: Buffer.byteLength(content, 'utf8'),
        };
        this.files.set(fingerprint.path, fingerprint);
        return fingerprint;
    }

    file(path: string): FileFingerprint | undefined {
        return this.files.get(normalizePath(path));
    }

    get(key: string): NodeFingerprint | undefined {
        return this.nodes.get(key);
    }

    recordNode(node: TemplateNode, content: string): NodeFingerprint | null {
        const spanHash = hashNodeSpan(content, node);
        if (spanHash === null) {
            return null;
        }
        const file = this.recordFile(node.path, content);
        const fingerprint: NodeFingerprint = {
            key: fingerprintKey(node),
            path: file.path,
            startTag: node.startTag,
            endTag: node.endTag,
            contentHash: file.contentHash,
            spanHash,
        };
        this.nodes.set(fingerprint.key, fingerprint);
        return fingerprint;
    }

    /**
     * Checks a node against its recorded fingerprint.
     *
     * `file-changed-span-intact` is safe to edit: the node's own source is
     * byte-identical. `span-changed` is not, because the mapping's coordinates
     * now describe different code.
     */
    verifyNode(node: TemplateNode, content: string | null): FingerprintCheck {
        const key = fingerprintKey(node);
        const recorded = this.nodes.get(key);
        if (!recorded) {
            return {
                ok: false,
                status: 'unknown-node',
                fingerprint: null,
                message: 'This node has no recorded fingerprint. Re-map the file before editing.',
            };
        }
        if (content === null) {
            return {
                ok: false,
                status: 'unreadable-span',
                fingerprint: recorded,
                message: 'The file could not be read, so the node cannot be verified.',
            };
        }

        const spanHash = hashNodeSpan(content, node);
        if (spanHash === null) {
            return {
                ok: false,
                status: 'unreadable-span',
                fingerprint: recorded,
                message: 'The recorded span no longer exists in the file.',
            };
        }

        const contentHash = hashContent(content);
        if (contentHash === recorded.contentHash) {
            return {
                ok: true,
                status: 'unchanged',
                fingerprint: recorded,
                message: 'The file and the node are unchanged.',
            };
        }
        if (spanHash === recorded.spanHash) {
            return {
                ok: true,
                status: 'file-changed-span-intact',
                fingerprint: recorded,
                message: 'The file changed outside this node; the node source is unchanged.',
            };
        }
        return {
            ok: false,
            status: 'span-changed',
            fingerprint: recorded,
            message: 'The node source changed since it was mapped. Re-map before editing.',
        };
    }

    /**
     * Applies a watcher event. Every node fingerprint for the file is dropped:
     * the mapping's coordinates may have moved, and re-verifying them against a
     * content hash recorded before the change would be a guess.
     */
    handleFileEvent(event: WatchEvent): void {
        const path = normalizePath(event.path);
        for (const [key, fingerprint] of this.nodes) {
            if (fingerprint.path === path) {
                this.nodes.delete(key);
            }
        }
        if (event.type === 'delete') {
            this.files.delete(path);
            return;
        }
        this.recordFile(path, event.content);
    }

    clear(): void {
        this.files.clear();
        this.nodes.clear();
    }
}
