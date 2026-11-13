import type { CodeDiff, CodeDiffFailureReason, CodeDiffRequest, CodeDiffResult } from '@kumite/models/code';
import { GENERATE_CODE_OPTIONS } from '../../run/helpers';
import { parseJsxFile } from '../helpers';
import { resolveEditTarget } from '../edit-target';
import { countOidOccurrences } from '../edit-target/ast';
import { readFile } from '../files';
import { generateCode } from './helpers';
import { transformAst } from './transform';

interface SourceGroup {
    path: string;
    oidToRequest: Map<string, CodeDiffRequest>;
}

type GroupResult =
    | { ok: true; diff: CodeDiff }
    | { ok: false; reason: CodeDiffFailureReason; message: string };

/**
 * Produces source diffs for a whole batch, or refuses the batch.
 *
 * Every request is resolved and every target oid is located exactly once before
 * any AST is changed, so one bad target cannot leave the other targets
 * half-written.
 */
export async function getCodeDiffs(requests: CodeDiffRequest[]): Promise<CodeDiffResult> {
    const groups = new Map<string, SourceGroup>();

    for (const request of requests) {
        const resolution = await resolveEditTarget(request);
        if (!resolution.ok) {
            return resolution;
        }
        const { target } = resolution;
        let group = groups.get(target.sourcePath);
        if (!group) {
            group = { path: target.sourcePath, oidToRequest: new Map() };
            groups.set(target.sourcePath, group);
        }
        if (group.oidToRequest.has(target.sourceOid)) {
            // Two requests for one source node would race; the batch is refused
            // instead of letting one target silently win.
            return {
                ok: false,
                reason: 'duplicate-target',
                message: `Two edits target the same source node (${target.sourceOid}). Retry them separately.`,
            };
        }
        group.oidToRequest.set(target.sourceOid, request);
    }

    const diffs: CodeDiff[] = [];
    for (const group of groups.values()) {
        const result = await processGroup(group);
        if (!result.ok) {
            return result;
        }
        diffs.push(result.diff);
    }

    return { ok: true, diffs };
}

async function processGroup(group: SourceGroup): Promise<GroupResult> {
    const content = await readFile(group.path);
    const ast = content ? parseJsxFile(content) : undefined;
    if (!content || !ast) {
        return {
            ok: false,
            reason: 'source-node-not-found',
            message: `The source file could not be read or parsed (${group.path}).`,
        };
    }

    for (const oid of group.oidToRequest.keys()) {
        const occurrences = countOidOccurrences(ast, oid);
        if (occurrences !== 1) {
            return {
                ok: false,
                reason: 'source-node-not-found',
                message:
                    occurrences === 0
                        ? `The mapped source node is no longer in ${group.path}. Re-select the element.`
                        : `The target oid matches ${occurrences} nodes in ${group.path}, so the edit is ambiguous.`,
            };
        }
    }

    const original = generateCode(ast, GENERATE_CODE_OPTIONS, content);
    const report = transformAst(ast, group.oidToRequest);

    if (report.failures.length > 0) {
        return {
            ok: false,
            reason: report.failures[0].reason ?? 'class-transform-unsupported',
            message: report.failures[0].message,
        };
    }

    for (const oid of group.oidToRequest.keys()) {
        if (report.matched.get(oid) !== 1) {
            return {
                ok: false,
                reason: 'source-node-not-found',
                message: `The target element could not be transformed in ${group.path}.`,
            };
        }
    }

    const generated = generateCode(ast, GENERATE_CODE_OPTIONS, content);
    return { ok: true, diff: { original, generated, path: group.path } };
}
