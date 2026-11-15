import type { DomElement } from '@kumite/models/element';
import { getDomElement } from '../helpers';
import { elementFromDomId, isValidHtmlElement } from '/common/helpers';

export function moveElement(
    domId: string,
    newIndex: number,
    parentDomId?: string,
): DomElement | undefined {
    const el = elementFromDomId(domId) as HTMLElement | null;
    if (!el) {
        console.warn(`Move element not found: ${domId}`);
        return;
    }

    const explicitParent = parentDomId
        ? (elementFromDomId(parentDomId) as HTMLElement | null)
        : null;
    const parent = explicitParent ?? el.parentElement;
    if (!parent) {
        console.warn(`Move parent not found: ${parentDomId ?? 'current parent'}`);
        return;
    }
    if (parent === el || el.contains(parent)) {
        console.warn('Cannot move an element into itself');
        return;
    }

    if (parent === el.parentElement) {
        const movedEl = moveElToIndex(el, newIndex);
        if (!movedEl) {
            console.warn(`Failed to move element: ${domId}`);
            return;
        }
        return getDomElement(movedEl, true);
    }

    // Reparent: the index counts the target parent's children without the
    // dragged element, so inserting before that node is the same convention
    // the sibling reorder uses.
    const referenceNode = Array.from(parent.children).filter(isValidHtmlElement)[newIndex];
    parent.insertBefore(el, referenceNode ?? null);
    return getDomElement(el, true);
}

export function getElementIndex(domId: string): number {
    const el = elementFromDomId(domId) as HTMLElement | null;
    if (!el) {
        console.warn(`Element not found: ${domId}`);
        return -1;
    }

    const htmlElments = Array.from(el.parentElement?.children || []).filter(isValidHtmlElement);
    const index = htmlElments.indexOf(el);
    return index;
}

export function moveElToIndex(el: HTMLElement, newIndex: number): HTMLElement | undefined {
    const parent = el.parentElement;
    if (!parent) {
        console.warn('Parent not found');
        return;
    }

    parent.removeChild(el);
    if (newIndex >= parent.children.length) {
        parent.appendChild(el);
        return el;
    }

    const referenceNode = parent.children[newIndex];
    parent.insertBefore(el, referenceNode);
    return el;
}
