import { EditorAttributes } from '@kumite/models/constants';
import { uuid } from './bundles';

export function getOrAssignDomId(node: HTMLElement): string {
    let domId = node.getAttribute(EditorAttributes.DATA_KUMITE_DOM_ID) as string;
    if (!domId) {
        domId = `odid-${uuid()}`;
        node.setAttribute(EditorAttributes.DATA_KUMITE_DOM_ID, domId);
    }
    return domId;
}
