import type { StyleChange } from '../style';

export type Change<T> = {
    updated: T;
    original: T;
};

export interface ActionTarget {
    domId: string;
    oid: string | null;
    webviewId: string;
}

/**
 * Explicit source identity for an edit.
 *
 * `implementation-node` targets the JSX element itself (Root mode).
 * `component-instance` targets the JSX invocation that produced the rendered
 * node (Instance mode). The two are different files whenever the component is
 * defined elsewhere, so they must never be collapsed into one field.
 */
export type EditTarget =
    | {
          kind: 'implementation-node';
          oid: string;
      }
    | {
          kind: 'component-instance';
          callSiteOid: string;
          instanceId: string;
          /** Filled in by the main-process resolver from the source mapping. */
          componentName?: string;
          implementationOid: string;
      };

export interface StyleActionTarget extends ActionTarget {
    /**
     * Explicit target. When absent, `oid` is read as an implementation oid
     * (the pre-3C behaviour) by the narrow compatibility adapter.
     */
    editTarget?: EditTarget;
    change: Change<Record<string, StyleChange>>;
}
