import {
    type DisplayDirection,
    findInsertionIndex as findFlexBlockInsertionIndex,
    findGridInsertionIndex,
    getDisplayDirection,
} from './helpers';
import { EditorAttributes } from '@kumite/models/constants';
import { isValidHtmlElement } from '/common/helpers';

/** Tags whose box is text flow, not a layout container. */
const TEXT_ONLY_TAGS = new Set([
    'A',
    'ABBR',
    'B',
    'BLOCKQUOTE',
    'BUTTON',
    'CITE',
    'CODE',
    'EM',
    'H1',
    'H2',
    'H3',
    'H4',
    'H5',
    'H6',
    'I',
    'LABEL',
    'LI',
    'P',
    'PRE',
    'SMALL',
    'SPAN',
    'STRONG',
    'TD',
    'TH',
    'TIME',
]);

const CONTAINER_DISPLAYS = new Set([
    'block',
    'flex',
    'grid',
    'flow-root',
    'list-item',
    'table',
    'table-row',
    'table-cell',
]);

export function createStub(el: HTMLElement) {
    const stub = document.createElement('div');
    const styles = window.getComputedStyle(el);

    stub.id = EditorAttributes.KUMITE_STUB_ID;
    stub.style.width = styles.width;
    stub.style.height = styles.height;
    stub.style.margin = styles.margin;
    stub.style.padding = styles.padding;
    stub.style.borderRadius = styles.borderRadius;
    stub.style.backgroundColor = 'rgba(0, 0, 0, 0.2)';
    stub.style.display = 'none';

    document.body.appendChild(stub);
}

/**
 * The container a drop at (x, y) should land in.
 *
 * `elementsFromPoint` returns the deepest paintable nodes first, so a text span
 * inside a card inside a section is inspected before the section itself. The
 * first node that can legally hold children wins: that is what makes dropping
 * onto a card reparent into the card instead of only reordering siblings.
 */
export function findDropParent(el: HTMLElement, x: number, y: number): HTMLElement | null {
    const candidates = document.elementsFromPoint(x, y);
    for (const candidate of candidates) {
        if (!(candidate instanceof HTMLElement)) {
            continue;
        }
        if (candidate === el || el.contains(candidate)) {
            continue;
        }
        if (candidate.id === EditorAttributes.KUMITE_STUB_ID) {
            continue;
        }
        if (!isValidHtmlElement(candidate) || TEXT_ONLY_TAGS.has(candidate.tagName)) {
            continue;
        }
        const style = window.getComputedStyle(candidate);
        if (!CONTAINER_DISPLAYS.has(style.display)) {
            continue;
        }
        return candidate;
    }
    return null;
}

export function moveStub(el: HTMLElement, x: number, y: number) {
    const stub = document.getElementById(EditorAttributes.KUMITE_STUB_ID);
    if (!stub) {
        return;
    }

    const dropParent = findDropParent(el, x, y) ?? el.parentElement;
    if (!dropParent) {
        return;
    }

    let displayDirection = el.getAttribute(EditorAttributes.DATA_KUMITE_DRAG_DIRECTION);
    if (!displayDirection) {
        displayDirection = getDisplayDirection(dropParent);
    }

    const parentStyle = window.getComputedStyle(dropParent);
    const isGridLayout = parentStyle.display === 'grid';

    const siblings = Array.from(dropParent.children).filter(
        (child) => child !== el && child !== stub && isValidHtmlElement(child),
    );

    let insertionIndex;
    if (isGridLayout) {
        insertionIndex = findGridInsertionIndex(dropParent, siblings, x, y);
    } else {
        insertionIndex = findFlexBlockInsertionIndex(
            siblings,
            x,
            y,
            displayDirection as DisplayDirection,
        );
    }

    stub.remove();

    // Append element at the insertion index
    if (insertionIndex >= siblings.length) {
        dropParent.appendChild(stub);
    } else {
        dropParent.insertBefore(stub, siblings[insertionIndex]);
    }

    stub.style.display = 'block';
}

export function removeStub() {
    const stub = document.getElementById(EditorAttributes.KUMITE_STUB_ID);
    if (!stub) {
        return;
    }
    stub.remove();
}

export function getCurrentStubIndex(parent: HTMLElement, el: HTMLElement): number {
    const stub = document.getElementById(EditorAttributes.KUMITE_STUB_ID);
    if (!stub) {
        return -1;
    }

    const siblings = Array.from(parent.children).filter((child) => child !== el);
    return siblings.indexOf(stub);
}
