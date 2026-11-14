import * as t from '@babel/types';
import type { ClassParsingResult, TemplateNode } from '@kumite/models/element';
import { readCodeBlock } from '.';
import {
    findClassNameAttribute,
    hasSpreadAttribute,
    isSupportedClassUtilityCall,
    readCallLiteralClasses,
    readStaticClassValue,
} from './diff/class-expression';
import { parseJsxCodeBlock } from './helpers';

export async function getTemplateNodeClass(
    templateNode: TemplateNode,
): Promise<ClassParsingResult> {
    const codeBlock = await readCodeBlock(templateNode);
    if (codeBlock == null) {
        console.error(`Failed to read code block: ${templateNode.path}`);
        return { type: 'error', reason: 'Code block could not be read.' };
    }
    const ast = parseJsxCodeBlock(codeBlock);

    if (!ast) {
        return { type: 'error', reason: 'AST could not be parsed.' };
    }

    return getNodeClasses(ast);
}

/**
 * Reads classes for display. It uses the same supported-expression rules as the
 * writer, so a value the writer would refuse is never shown as editable.
 */
export function getNodeClasses(node: t.JSXElement): ClassParsingResult {
    const openingElement = node.openingElement;
    const classNameAttr = findClassNameAttribute(openingElement);

    if (!classNameAttr) {
        if (hasSpreadAttribute(openingElement)) {
            return {
                type: 'error',
                reason: 'The class may come from a spread.',
            };
        }
        return {
            type: 'classes',
            value: [''],
        };
    }

    const classes = readStaticClassValue(classNameAttr.value);
    if (classes !== null) {
        return { type: 'classes', value: classes };
    }

    const expression = t.isJSXExpressionContainer(classNameAttr.value)
        ? classNameAttr.value.expression
        : null;
    if (expression && t.isCallExpression(expression) && isSupportedClassUtilityCall(expression)) {
        return { type: 'classes', value: readCallLiteralClasses(expression) };
    }

    return {
        type: 'error',
        reason: 'Unsupported className format.',
    };
}
