import { EditorAttributes } from '@kumite/models/constants';
import { getOrAssignDomId } from '../../ids';
import { elementFromDomId, isValidHtmlElement } from '/common/helpers';
import { restoreElementStyle } from '../helpers';

/** Where the element sat, and how far it was already offset, when the drag started. */
interface DragOrigin {
    left: number;
    top: number;
    offsetLeft: number;
    offsetTop: number;
}

/** The offset the element should end up with, relative to its layout slot. */
export interface DragOffset {
    left: number;
    top: number;
}

export function startDrag(domId: string): number | null {
    const el = elementFromDomId(domId);
    if (!el) {
        console.warn(`Start drag element not found: ${domId}`);
        return null;
    }
    const parent = el.parentElement;
    if (!parent) {
        console.warn('Start drag parent not found');
        return null;
    }
    const htmlChildren = Array.from(parent.children).filter(isValidHtmlElement);
    const originalIndex = htmlChildren.indexOf(el);

    const rect = el.getBoundingClientRect();
    const computed = window.getComputedStyle(el);
    const origin: DragOrigin = {
        left: rect.left + window.scrollX,
        top: rect.top + window.scrollY,
        offsetLeft: parseFloat(computed.left) || 0,
        offsetTop: parseFloat(computed.top) || 0,
    };
    el.setAttribute(EditorAttributes.DATA_KUMITE_DRAG_START_POSITION, JSON.stringify(origin));

    prepareElementForDragging(el);
    return originalIndex;
}

/**
 * Moves the element with the pointer. Dragging is free positioning: the element
 * is taken out of the flow visually (`fixed`) and never reparented, so it can be
 * released anywhere instead of snapping into a layout slot.
 */
export function drag(domId: string, dx: number, dy: number) {
    const el = elementFromDomId(domId);
    if (!el) {
        console.warn('Dragging element not found');
        return;
    }
    const origin = readOrigin(el);
    if (!origin) {
        return;
    }

    const styles = window.getComputedStyle(el);
    el.style.width = styles.width;
    el.style.height = styles.height;
    el.style.left = `${origin.left + dx - window.scrollX}px`;
    el.style.top = `${origin.top + dy - window.scrollY}px`;
    el.style.position = 'fixed';
}

/**
 * Finishes the drag and reports the offset that keeps the element where it was
 * released. Nothing moves in the document tree, so the drop point is exact.
 */
export function endDrag(domId: string): DragOffset | null {
    const el = elementFromDomId(domId);
    if (!el) {
        console.warn('End drag element not found');
        endAllDrag();
        return null;
    }

    const origin = readOrigin(el);
    const rect = el.getBoundingClientRect();
    cleanUpElementAfterDragging(el);

    if (!origin) {
        return null;
    }

    const dx = Math.round(rect.left + window.scrollX - origin.left);
    const dy = Math.round(rect.top + window.scrollY - origin.top);
    if (dx === 0 && dy === 0) {
        return null;
    }

    return {
        left: Math.round(origin.offsetLeft) + dx,
        top: Math.round(origin.offsetTop) + dy,
    };
}

function readOrigin(el: HTMLElement): DragOrigin | null {
    const raw = el.getAttribute(EditorAttributes.DATA_KUMITE_DRAG_START_POSITION);
    if (!raw) {
        return null;
    }
    try {
        return JSON.parse(raw) as DragOrigin;
    } catch {
        return null;
    }
}

function prepareElementForDragging(el: HTMLElement) {
    const saved = el.getAttribute(EditorAttributes.DATA_KUMITE_DRAG_SAVED_STYLE);
    if (saved) {
        return;
    }

    const style = {
        position: el.style.position,
        transform: el.style.transform,
        width: el.style.width,
        height: el.style.height,
        left: el.style.left,
        top: el.style.top,
    };

    el.setAttribute(EditorAttributes.DATA_KUMITE_DRAG_SAVED_STYLE, JSON.stringify(style));
    el.setAttribute(EditorAttributes.DATA_KUMITE_DRAGGING, 'true');
}

function cleanUpElementAfterDragging(el: HTMLElement) {
    restoreElementStyle(el);
    removeDragAttributes(el);
    getOrAssignDomId(el);
}

function removeDragAttributes(el: HTMLElement) {
    el.removeAttribute(EditorAttributes.DATA_KUMITE_DRAG_SAVED_STYLE);
    el.removeAttribute(EditorAttributes.DATA_KUMITE_DRAGGING);
    el.removeAttribute(EditorAttributes.DATA_KUMITE_DRAG_DIRECTION);
    el.removeAttribute(EditorAttributes.DATA_KUMITE_DRAG_START_POSITION);
}

export function endAllDrag() {
    const draggingElements = document.querySelectorAll(
        `[${EditorAttributes.DATA_KUMITE_DRAGGING}]`,
    );
    for (const el of draggingElements) {
        cleanUpElementAfterDragging(el as HTMLElement);
    }
}
