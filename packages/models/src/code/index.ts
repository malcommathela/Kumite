import { type CodeAction } from '../actions/code';
import type { EditTarget } from '../actions/target';

export interface CodeImport {
    source: string;
    defaultImport?: string | null;
    namedImports?: string[] | null;
}

/** A source span as Babel reports it: 1-based line, 0-based column. */
export interface ContentSpan {
    start: { line: number; column: number };
    end: { line: number; column: number };
}

/**
 * A guarded content edit.
 *
 * The span and `expected` come from the content model that was shown to the
 * user. The main process re-finds the literal at that span and refuses the whole
 * batch when the file no longer says what the model said, so content cannot be
 * written over a source that moved underneath it.
 */
export interface ContentChange {
    span: ContentSpan;
    expected: string;
    value: string;
}

export interface CodeDiffRequest {
    oid: string;
    attributes: Record<string, any>;
    textContent: string | null;
    overrideClasses: boolean | null;
    structureChanges: CodeAction[];
    imports?: CodeImport[] | null;
    /**
     * Explicit target kind and instance identity. Absent means the oid is an
     * implementation-node oid, which is the pre-3C behaviour.
     */
    editTarget?: EditTarget | null;
    /** File the request was resolved from; verified against the mapping in main. */
    sourcePath?: string | null;
    /** Span-addressed literal edits, guarded by `expected`. */
    contentChanges?: ContentChange[] | null;
}

export interface CodeDiff {
    original: string;
    generated: string;
    path: string;
}

/**
 * Reasons a batch of diff requests can be refused. The whole batch is refused
 * when one request fails, so no partial write can happen.
 */
export type CodeDiffFailureReason =
    | 'missing-oid'
    | 'missing-instance-id'
    | 'missing-source-mapping'
    | 'duplicate-target'
    | 'stale-mapping'
    | 'source-node-not-found'
    | 'unsupported-instance-style'
    | 'class-transform-unsupported'
    /**
     * The element's mapping has no recorded component identity, so the engine
     * cannot prove which definition owns it. Restarting the run rebuilds the
     * mapping with identity.
     */
    | 'unverified-component-ownership'
    /**
     * The recorded identity disagrees with the source: a sibling owns the
     * element, the definition vanished, or a part no longer exists.
     */
    | 'ambiguous-component-ownership'
    /** A content edit's span no longer matches the source it was extracted from. */
    | 'stale-content'
    /** The element's children are not plain text, so replacing them would lose logic. */
    | 'text-content-unsupported'
    | 'source-write-failure';

export type CodeDiffResult =
    | { ok: true; diffs: CodeDiff[] }
    | { ok: false; reason: CodeDiffFailureReason; message: string };
