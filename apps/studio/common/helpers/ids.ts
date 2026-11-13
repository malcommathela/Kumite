import { EditorAttributes } from '@kumite/models/constants';
export const VALID_DATA_ATTR_CHARS = 'abcdefghijklmnopqrstuvwxyz0123456789-._:';

export function getOid(node: HTMLElement): string | undefined {
    return node.getAttribute(EditorAttributes.DATA_KUMITE_ID) as string;
}

export function getInstanceId(node: HTMLElement): string | undefined {
    return node.getAttribute(EditorAttributes.DATA_KUMITE_INSTANCE_ID) as string;
}
