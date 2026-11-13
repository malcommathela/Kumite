import type t from '@babel/types';
import type { TemplateNode, TemplateTag } from '@kumite/models/element';
import { readCodeBlock } from '.';
import { parseJsxFile } from './helpers';
import { findComponentInvocation, type ComponentInvocationFailure } from './templateNode-lookup';

export type TemplateNodeChildResult =
    | { ok: true; instanceId: string; component: string }
    | { ok: false; reason: ComponentInvocationFailure | 'unreadable-parent'; message: string };

export async function getTemplateNodeChild(
    parent: TemplateNode,
    child: TemplateNode,
    index: number,
): Promise<TemplateNodeChildResult> {
    const codeBlock = await readCodeBlock(parent);
    if (codeBlock == null) {
        return {
            ok: false,
            reason: 'unreadable-parent',
            message: `Failed to read code block: ${parent.path}`,
        };
    }

    const ast = parseJsxFile(codeBlock);
    if (!ast) {
        return {
            ok: false,
            reason: 'unreadable-parent',
            message: `Failed to parse code block: ${parent.path}`,
        };
    }

    if (!child.component) {
        return {
            ok: false,
            reason: 'unsupported-component-name',
            message: 'The selected element has no component name to resolve.',
        };
    }

    return findComponentInvocation(ast, child.component, index);
}

export function getTemplateNode(
    node: t.JSXElement,
    path: string,
    lineOffset: number,
): TemplateNode {
    if (!node.openingElement.loc) {
        throw new Error('No location found for opening element');
    }

    const name = (node.openingElement.name as t.JSXIdentifier).name;
    const startTag: TemplateTag = getTemplateTag(node.openingElement, lineOffset);
    const endTag: TemplateTag | null = node.closingElement
        ? getTemplateTag(node.closingElement, lineOffset)
        : null;

    const template: TemplateNode = {
        path,
        startTag,
        endTag,
        component: name,
    };
    return template;
}

function getTemplateTag(
    element: t.JSXOpeningElement | t.JSXClosingElement,
    lineOffset: number,
): TemplateTag {
    if (!element.loc) {
        throw new Error('No location found for element');
    }

    return {
        start: {
            line: element.loc.start.line + lineOffset - 1,
            column: element.loc.start.column + 1,
        },
        end: {
            line: element.loc.end.line + lineOffset - 1,
            column: element.loc.end.column,
        },
    };
}
