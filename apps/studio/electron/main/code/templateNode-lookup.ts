import * as t from '@babel/types';
import { getOidFromJsxElement } from './diff/helpers';
import { walkJsxElements } from './jsx-walk';

export type ComponentInvocationFailure =
    | 'unsupported-component-name'
    | 'no-candidate'
    | 'ambiguous-candidate';

export type ComponentInvocationLookup =
    | { ok: true; instanceId: string; component: string }
    | { ok: false; reason: ComponentInvocationFailure; message: string };

/**
 * Finds the single JSX invocation of `component` at `index` inside a parent
 * code block.
 *
 * `index` is the ordinal of the rendered occurrence, so an index that is out of
 * range must fail — returning the last candidate would edit the wrong call site.
 * `-1` is only safe when exactly one invocation exists.
 */
export function findComponentInvocation(
    ast: t.File,
    component: string,
    index: number,
): ComponentInvocationLookup {
    const candidates: string[] = [];
    let sawUnsupportedName = false;

    walkJsxElements(ast, (element) => {
        const name = element.openingElement.name;
        if (!t.isJSXIdentifier(name)) {
            if (t.isJSXMemberExpression(name) && name.property.name === component) {
                sawUnsupportedName = true;
            }
            return;
        }
        if (name.name !== component) {
            return;
        }
        const oid = getOidFromJsxElement(element.openingElement);
        if (!oid) {
            return;
        }
        candidates.push(oid);
    });

    if (index === -1) {
        if (candidates.length === 1) {
            return { ok: true, instanceId: candidates[0], component };
        }
        if (candidates.length === 0) {
            return sawUnsupportedName
                ? unsupported(component)
                : noCandidate(component, 0, 0);
        }
        return {
            ok: false,
            reason: 'ambiguous-candidate',
            message: `${candidates.length} invocations of <${component}> exist and no index was given.`,
        };
    }

    if (index >= 0 && index < candidates.length) {
        return { ok: true, instanceId: candidates[index], component };
    }

    return sawUnsupportedName
        ? unsupported(component)
        : noCandidate(component, index, candidates.length);
}

function noCandidate(component: string, index: number, count: number): ComponentInvocationLookup {
    return {
        ok: false,
        reason: 'no-candidate',
        message: `No invocation of <${component}> at index ${index} (${count} found).`,
    };
}

function unsupported(component: string): ComponentInvocationLookup {
    return {
        ok: false,
        reason: 'unsupported-component-name',
        message: `<${component}> is rendered through a member or dynamic expression that cannot be resolved to one call site.`,
    };
}
