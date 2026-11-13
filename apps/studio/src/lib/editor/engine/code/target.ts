import type { EditTarget } from '@kumite/models/actions';
import type { DomElement } from '@kumite/models/element';

export type EditScope = 'root' | 'instance';

/**
 * Builds the explicit source target for a selection. Returns `null` when the
 * scope cannot be satisfied, so the caller refuses instead of falling back to
 * the other scope.
 */
export function getEditTarget(element: DomElement, scope: EditScope): EditTarget | null {
    if (scope === 'instance') {
        if (!element.instanceId) {
            return null;
        }
        return {
            kind: 'component-instance',
            callSiteOid: element.instanceId,
            instanceId: element.instanceId,
            implementationOid: element.oid ?? '',
        };
    }
    if (!element.oid) {
        return null;
    }
    return { kind: 'implementation-node', oid: element.oid };
}

export function getEditTargetOid(target: EditTarget | null): string {
    if (!target) {
        return '';
    }
    return target.kind === 'implementation-node' ? target.oid : target.callSiteOid;
}
