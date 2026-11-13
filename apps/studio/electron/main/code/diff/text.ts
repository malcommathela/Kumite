import * as t from '@babel/types';
import { readCodeBlock } from '..';
import runManager from '../../run';
import { parseJsxCodeBlock } from '../helpers';
import { textContentField } from '../intelligence/content';

export interface TextEditVerdict {
    ok: boolean;
    message?: string;
}

/**
 * Replaces an element's plain text.
 *
 * The editability rule comes from the content model, so the gate the UI shows
 * and the guard this write uses cannot disagree. Before this guard existed, an
 * element whose text was `{title}` could have its expression replaced by a
 * string literal.
 */
export function updateNodeTextContent(
    node: t.JSXElement,
    textContent: string,
): TextEditVerdict {
    const field = textContentField(node);
    if (!field.editable) {
        return {
            ok: false,
            message: field.reason ?? 'This element does not hold plain text.',
        };
    }

    const textNode = node.children.find((child) => t.isJSXText(child)) as t.JSXText | undefined;
    if (textNode) {
        textNode.value = textContent;
    } else {
        node.children.unshift(t.jsxText(textContent));
    }
    return { ok: true };
}

export async function isChildTextEditable(oid: string): Promise<boolean | null> {
    const templateNode = runManager.getTemplateNode(oid);
    if (!templateNode) {
        console.error('Failed to get code block. No template node found.');
        return null;
    }
    const code = await readCodeBlock(templateNode, false);
    if (!code) {
        console.error('Failed to get code block. No code found.');
        return null;
    }
    const jsxElement = await parseJsxCodeBlock(code);
    if (!jsxElement) {
        console.error('Failed to parse code block. No AST found.');
        return null;
    }

    return textContentField(jsxElement).editable;
}
