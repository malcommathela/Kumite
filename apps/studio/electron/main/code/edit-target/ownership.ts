import type * as t from '@babel/types';
import type { CodeDiffFailureReason } from '@kumite/models/code';
import type { TemplateNode } from '@kumite/models/element';
import { collectExportKinds, ComponentIntelligence, verifyContainment } from '../intelligence';

/**
 * The Stage 3 policy over the Stage 2 engine.
 *
 * The engine can prove which declaration contains an element and which exported
 * definition owns it. This module turns those proofs into an allow/refuse
 * decision for `resolveEditTarget`, and nothing else: it never writes, and it
 * has no per-component rules.
 *
 * Two claims are checked, in order:
 *
 * 1. **Containment** — the AST's innermost declaration at the element's start
 *    tag is the one the mapping recorded. A mismatch means the mapping is stale
 *    or points at a sibling; either way the edit must not proceed.
 * 2. **Ownership** — the recorded definition is the nearest exported ancestor,
 *    and (when a part is recorded) that part still exists inside it.
 *
 * A mapping that predates identity recording is refused rather than inferred:
 * the run manager rebuilds the mapping on the next run, and guessing here would
 * be exactly the silent fallback Phase 3C removed.
 *
 * One deliberate scope decision: an element inside a component that has no
 * importable ancestor is allowed when containment is proven. It is a local
 * component, not an inference, and a DOM-level edit does not need its owner to
 * be importable. `part` records the local name so callers can still tell.
 */
export type OwnershipVerdict =
    | { ok: true; owner: string | null; part: string | null }
    | { ok: false; reason: CodeDiffFailureReason; message: string };

export function checkOwnership(node: TemplateNode, ast: t.File): OwnershipVerdict {
    const containment = verifyContainment(ast, node);
    if (!containment.ok) {
        return fail('ambiguous-component-ownership', containment.message);
    }

    if (!node.component) {
        return { ok: true, owner: null, part: null };
    }

    const exported = collectExportKinds(ast);
    const owner = containment.enclosing.find((name) => exported.has(name)) ?? null;

    if (!node.definition) {
        if (!owner) {
            return { ok: true, owner: null, part: node.component };
        }
        return fail(
            'unverified-component-ownership',
            'This element was mapped before component identity was recorded. Restart the project run and retry.',
        );
    }

    if (node.definition.name !== owner) {
        return fail(
            'ambiguous-component-ownership',
            `The mapping records ${node.definition.name} as the owner, but the element is now inside ${owner ?? 'no exported definition'}. Re-select the element.`,
        );
    }

    const engine = new ComponentIntelligence([{ path: node.path, ast }]);
    const ownership = engine.ownership(node);
    if (!ownership.ok) {
        return fail('ambiguous-component-ownership', ownership.message);
    }
    if (ownership.confidence !== 'proven') {
        return fail(
            'unverified-component-ownership',
            'The component identity of this element could not be proven from the source. Restart the project run and retry.',
        );
    }

    return {
        ok: true,
        owner: ownership.definition.name,
        part: ownership.part?.name ?? null,
    };
}

function fail(reason: CodeDiffFailureReason, message: string): OwnershipVerdict {
    return { ok: false, reason, message };
}
