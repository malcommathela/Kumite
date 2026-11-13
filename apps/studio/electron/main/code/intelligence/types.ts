/**
 * Shared vocabulary for the component intelligence engine.
 *
 * Two rules keep the engine honest:
 *
 * 1. Every claim carries `evidence` that names the file and the exact proof it
 *    came from. A caller can print it next to a refusal.
 * 2. Confidence is coarse on purpose. `proven` means the claim follows from the
 *    AST alone; `inferred` means a recorded identity or a unique name match was
 *    re-checked but not re-derived; `ambiguous` means more than one reading is
 *    possible and the caller must refuse rather than pick one.
 */

export type Confidence = 'proven' | 'inferred' | 'ambiguous';

export type EvidenceKind =
    | 'export'
    | 'import'
    | 'declaration'
    | 'jsx-invocation'
    | 'className-forwarding'
    | 'class-expression'
    | 'spread'
    | 'children'
    | 'alias'
    | 'unresolved';

export interface Evidence {
    kind: EvidenceKind;
    /** One sentence a human can audit against the file. */
    detail: string;
    /** File the evidence was read from. */
    path: string;
}

export type ResolutionFailure =
    | 'file-not-indexed'
    | 'component-not-found'
    | 'ambiguous-definition'
    | 'import-not-resolved'
    | 'external-module'
    | 'not-exported'
    | 'element-not-found';

/**
 * A lookup that can fail.
 *
 * Failures are values, not exceptions: the edit path turns every one of them
 * into a typed refusal instead of falling back to a guess.
 */
export type Lookup<T> =
    | { ok: true; value: T }
    | { ok: false; reason: ResolutionFailure; message: string };
