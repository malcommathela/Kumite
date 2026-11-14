import * as t from '@babel/types';

/**
 * Helpers whose contract is "concatenate the class arguments". Appending one
 * more string argument is safe for these and unsafe for anything else, so the
 * list is closed on purpose.
 */
const CLASS_UTILITIES = new Set(['cn', 'clsx', 'classNames', 'cx', 'twMerge']);

export function isSupportedClassUtilityCall(expression: t.Node): boolean {
    if (!t.isCallExpression(expression)) {
        return false;
    }
    const callee = expression.callee;
    return t.isIdentifier(callee) && CLASS_UTILITIES.has(callee.name);
}

export function findClassNameAttribute(
    openingElement: t.JSXOpeningElement,
): t.JSXAttribute | undefined {
    return openingElement.attributes.find(
        (attribute): attribute is t.JSXAttribute =>
            t.isJSXAttribute(attribute) && attribute.name.name === 'className',
    );
}

/** A spread can supply or overwrite `className`, so its ownership is not proven. */
export function hasSpreadAttribute(openingElement: t.JSXOpeningElement): boolean {
    return openingElement.attributes.some((attribute) => t.isJSXSpreadAttribute(attribute));
}

function isStaticTemplateLiteral(expression: t.Node): expression is t.TemplateLiteral {
    return t.isTemplateLiteral(expression) && expression.expressions.length === 0;
}

/**
 * Classes contributed by the literal arguments of a supported merge call. The
 * other arguments (variant flags, the forwarded `className` prop) cannot be read
 * statically and are intentionally omitted.
 */
export function readCallLiteralClasses(expression: t.CallExpression): string[] {
    const classes: string[] = [];
    for (const argument of expression.arguments) {
        if (t.isStringLiteral(argument)) {
            classes.push(...splitClasses(argument.value));
            continue;
        }
        if (isStaticTemplateLiteral(argument)) {
            classes.push(...splitClasses(argument.quasis.map((quasi) => quasi.value.raw).join('')));
        }
    }
    return classes;
}

/**
 * Rewrites the literal class arguments of a supported merge call, keeping every
 * dynamic argument in place. This is how a component root such as
 * `className={cn("flex flex-col gap-6", className)}` can be restyled without
 * dropping the forwarded `className` prop.
 */
export function replaceCallLiteralClasses(expression: t.CallExpression, className: string): void {
    const next: t.CallExpression['arguments'] = [];
    let replaced = false;
    for (const argument of expression.arguments) {
        if (t.isStringLiteral(argument) || isStaticTemplateLiteral(argument)) {
            if (!replaced) {
                next.push(t.stringLiteral(className));
                replaced = true;
            }
            continue;
        }
        next.push(argument);
    }
    if (!replaced) {
        next.unshift(t.stringLiteral(className));
    }
    expression.arguments = next;
}

/**
 * Classes of a fully static className value, or `null` when the value cannot be
 * read without evaluating code. A missing value or empty attribute yields `[]`.
 */
export function readStaticClassValue(value: t.JSXAttribute['value'] | null): string[] | null {
    if (value == null) {
        return [];
    }
    if (t.isStringLiteral(value)) {
        return splitClasses(value.value);
    }
    if (t.isJSXExpressionContainer(value)) {
        const expression = value.expression;
        if (t.isStringLiteral(expression)) {
            return splitClasses(expression.value);
        }
        if (t.isTemplateLiteral(expression) && expression.expressions.length === 0) {
            return splitClasses(expression.quasis.map((quasi) => quasi.value.raw).join(''));
        }
    }
    return null;
}

function splitClasses(value: string): string[] {
    return value.split(/\s+/).filter(Boolean);
}
