import type { CodeDiffFailureReason, CodeDiffRequest } from '@kumite/models/code';
import runManager from '../../run';
import { readFile } from '../files';
import { parseJsxFile } from '../helpers';
import { checkClassNameForwarding } from './ast';
import { checkOwnership } from './ownership';

export interface ResolvedEditTarget {
    kind: 'implementation-node' | 'component-instance';
    /** The oid matched against `data-oid` inside `sourcePath`. */
    sourceOid: string;
    /** The file that will be transformed. */
    sourcePath: string;
    /** Component whose props must forward className (instance edits only). */
    componentName?: string;
}

export type EditTargetResolution =
    | { ok: true; target: ResolvedEditTarget }
    | { ok: false; reason: CodeDiffFailureReason; message: string };

/**
 * Resolves a diff request to one verified source owner. Read-only: it never
 * writes or mutates the project.
 *
 * The main process is authoritative here — the renderer's chosen oid is only a
 * claim until it is matched against the mapping, the component engine proves
 * that the element still starts inside the declaration the mapping recorded, and
 * (for instance edits) the component that would receive the call-site prop is
 * found. Any of those failing is a typed refusal, never a fallback.
 */
export async function resolveEditTarget(
    request: CodeDiffRequest,
): Promise<EditTargetResolution> {
    if (!request.oid) {
        return fail(
            'missing-oid',
            'This edit has no source target. Select the element again and retry.',
        );
    }

    const templateNode = runManager.getTemplateNode(request.oid);
    if (!templateNode) {
        return fail(
            'missing-source-mapping',
            'The selected element is not mapped to source. Restart the project run and retry.',
        );
    }

    if (request.sourcePath && request.sourcePath !== templateNode.path) {
        return fail(
            'stale-mapping',
            'The source file changed since this edit was created. Re-select the element.',
        );
    }

    const sourcePath = templateNode.path;
    const ast = await readParsedFile(sourcePath);
    if (!ast) {
        return fail(
            'source-node-not-found',
            `The source file for this element could not be read or parsed (${sourcePath}).`,
        );
    }

    const ownership = checkOwnership(templateNode, ast);
    if (!ownership.ok) {
        return fail(ownership.reason, ownership.message);
    }

    const editTarget = request.editTarget ?? null;
    if (!editTarget || editTarget.kind === 'implementation-node') {
        return { ok: true, target: { kind: 'implementation-node', sourceOid: request.oid, sourcePath } };
    }

    if (!editTarget.instanceId) {
        return fail(
            'missing-instance-id',
            'This element has no component instance id. Re-select the instance and retry.',
        );
    }
    if (editTarget.instanceId !== editTarget.callSiteOid || editTarget.callSiteOid !== request.oid) {
        // The runtime instance id is derived from the call-site oid; a mismatch
        // means the mapping moved underneath the action.
        return fail(
            'stale-mapping',
            'The component instance no longer matches its call site. Re-select the element.',
        );
    }

    const implementationNode = runManager.getTemplateNode(editTarget.implementationOid);
    if (!implementationNode) {
        return fail(
            'missing-source-mapping',
            'The component implementation is not mapped to source. Restart the project run and retry.',
        );
    }

    const implementationAst = await readParsedFile(implementationNode.path);
    if (!implementationAst) {
        return fail(
            'source-node-not-found',
            `The component source could not be read (${implementationNode.path}).`,
        );
    }

    const implementationOwnership = checkOwnership(implementationNode, implementationAst);
    if (!implementationOwnership.ok) {
        return fail(implementationOwnership.reason, implementationOwnership.message);
    }

    const forwarding = checkClassNameForwarding(
        implementationAst,
        editTarget.componentName || implementationNode.component || '',
    );
    if (!forwarding.ok) {
        return fail('unsupported-instance-style', forwarding.message);
    }

    return {
        ok: true,
        target: {
            kind: 'component-instance',
            sourceOid: request.oid,
            sourcePath,
            componentName: forwarding.component,
        },
    };
}

export async function readParsedFile(path: string) {
    const content = await readFile(path);
    return content ? parseJsxFile(content) : undefined;
}

function fail(reason: CodeDiffFailureReason, message: string): EditTargetResolution {
    return { ok: false, reason, message };
}
