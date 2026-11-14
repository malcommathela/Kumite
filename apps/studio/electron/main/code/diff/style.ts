import * as t from '@babel/types';
import { twMerge } from 'tailwind-merge';
import {
    findClassNameAttribute,
    hasSpreadAttribute,
    isSupportedClassUtilityCall,
    readStaticClassValue,
    replaceCallLiteralClasses,
} from './class-expression';

export type ClassTransformFailure =
    | 'dynamic-class-expression'
    | 'unsupported-call'
    | 'spread-may-own-classname'
    | 'unsupported-conditional'
    | 'invalid-classname-value';

export type ClassTransformResult =
    { ok: true } | { ok: false; reason: ClassTransformFailure; message: string };

function fail(reason: ClassTransformFailure, message: string): ClassTransformResult {
    return { ok: false, reason, message };
}

/**
 * Adds classes while preserving the existing expression. Refuses whenever the
 * current value cannot be read and re-emitted without changing behaviour.
 *
 * A spread only blocks the edit when there is no `className` to extend: adding a
 * class to an existing value cannot change what the spread owns. It may still
 * override the result at runtime, exactly as it did before the edit.
 */
export function addClassToNode(node: t.JSXElement, className: string): ClassTransformResult {
    const openingElement = node.openingElement;
    const classNameAttr = findClassNameAttribute(openingElement);
    if (!classNameAttr && hasSpreadAttribute(openingElement)) {
        return fail(
            'spread-may-own-classname',
            'A spread attribute may own className, so the class cannot be added safely.',
        );
    }

    if (!classNameAttr) {
        insertClassAttribute(openingElement, className);
        return { ok: true };
    }

    const value = classNameAttr.value;
    if (t.isStringLiteral(value)) {
        value.value = twMerge(value.value, className);
        return { ok: true };
    }

    if (t.isJSXExpressionContainer(value)) {
        const expression = value.expression;

        if (t.isStringLiteral(expression)) {
            classNameAttr.value = t.stringLiteral(twMerge(expression.value, className));
            return { ok: true };
        }

        if (t.isCallExpression(expression)) {
            if (!isSupportedClassUtilityCall(expression)) {
                return fail(
                    'unsupported-call',
                    'className calls an unrecognised helper, so appending an argument may change its meaning.',
                );
            }
            expression.arguments.push(t.stringLiteral(className));
            return { ok: true };
        }

        if (t.isConditionalExpression(expression) || t.isLogicalExpression(expression)) {
            return fail(
                'unsupported-conditional',
                'className is conditional; adding a class would change which branch applies.',
            );
        }

        if (t.isTemplateLiteral(expression)) {
            const staticClasses = readStaticClassValue(value);
            if (staticClasses) {
                classNameAttr.value = t.stringLiteral(twMerge(staticClasses.join(' '), className));
                return { ok: true };
            }
            return fail(
                'dynamic-class-expression',
                'className is a template literal with interpolations.',
            );
        }

        return fail(
            'dynamic-class-expression',
            'className is an expression that cannot be preserved by adding a class.',
        );
    }

    return fail('invalid-classname-value', 'className has a value this writer cannot read.');
}

/**
 * Replaces classes only when the current value can be rewritten without losing
 * logic. A supported merge call keeps its dynamic arguments (variant flags and
 * the forwarded `className` prop) and has only its literal class arguments
 * replaced. A spread does not block a rewrite that keeps the `className` value
 * intact: it can override the result at runtime, never lose it.
 */
export function replaceNodeClasses(node: t.JSXElement, className: string): ClassTransformResult {
    const openingElement = node.openingElement;
    const classNameAttr = findClassNameAttribute(openingElement);
    if (!classNameAttr && hasSpreadAttribute(openingElement)) {
        return fail(
            'spread-may-own-classname',
            'A spread attribute may own className, so the class cannot be replaced safely.',
        );
    }

    if (!classNameAttr) {
        insertClassAttribute(openingElement, className);
        return { ok: true };
    }

    const staticClasses = readStaticClassValue(classNameAttr.value);
    if (staticClasses === null) {
        const expression = t.isJSXExpressionContainer(classNameAttr.value)
            ? classNameAttr.value.expression
            : null;
        if (
            expression &&
            t.isCallExpression(expression) &&
            isSupportedClassUtilityCall(expression)
        ) {
            replaceCallLiteralClasses(expression, className);
            return { ok: true };
        }
        if (
            expression &&
            (t.isConditionalExpression(expression) || t.isLogicalExpression(expression))
        ) {
            return fail(
                'unsupported-conditional',
                'className is conditional; replacing it would drop the condition.',
            );
        }
        return fail(
            'dynamic-class-expression',
            'className is dynamic; replacing it would drop the existing expression.',
        );
    }

    classNameAttr.value = t.stringLiteral(className);
    return { ok: true };
}

function insertClassAttribute(openingElement: t.JSXOpeningElement, className: string): void {
    const attribute = t.jsxAttribute(t.jsxIdentifier('className'), t.stringLiteral(className));
    openingElement.attributes.push(attribute);
}

export function updateNodeProp(node: t.JSXElement, key: string, value: any): void {
    const openingElement = node.openingElement;
    const existingAttr = openingElement.attributes.find(
        (attr) => t.isJSXAttribute(attr) && attr.name.name === key,
    ) as t.JSXAttribute | undefined;

    if (existingAttr) {
        if (typeof value === 'boolean') {
            existingAttr.value = t.jsxExpressionContainer(t.booleanLiteral(value));
        } else if (typeof value === 'string') {
            existingAttr.value = t.stringLiteral(value);
        } else if (typeof value === 'function') {
            existingAttr.value = t.jsxExpressionContainer(
                t.arrowFunctionExpression([], t.blockStatement([])),
            );
        } else {
            existingAttr.value = t.jsxExpressionContainer(t.identifier(value.toString()));
        }
    } else {
        let newAttr: t.JSXAttribute;
        if (typeof value === 'boolean') {
            newAttr = t.jsxAttribute(
                t.jsxIdentifier(key),
                t.jsxExpressionContainer(t.booleanLiteral(value)),
            );
        } else if (typeof value === 'string') {
            newAttr = t.jsxAttribute(t.jsxIdentifier(key), t.stringLiteral(value));
        } else if (typeof value === 'function') {
            newAttr = t.jsxAttribute(
                t.jsxIdentifier(key),
                t.jsxExpressionContainer(t.arrowFunctionExpression([], t.blockStatement([]))),
            );
        } else {
            newAttr = t.jsxAttribute(
                t.jsxIdentifier(key),
                t.jsxExpressionContainer(t.identifier(value.toString())),
            );
        }

        openingElement.attributes.push(newAttr);
    }
}
