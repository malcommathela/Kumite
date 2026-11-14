import { parse } from '@babel/parser';
import { generate } from '@babel/generator';
import * as t from '@babel/types';
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { addClassToNode, replaceNodeClasses } from './diff/style';
import { checkClassNameForwarding, countOidOccurrences } from './edit-target/ast';
import { findComponentInvocation } from './templateNode-lookup';

const PARSE_OPTIONS = { plugins: ['typescript', 'jsx'] as const, sourceType: 'module' as const };

function parseFile(code: string): t.File {
    return parse(code, PARSE_OPTIONS as never) as t.File;
}

function parseElement(code: string): t.JSXElement {
    const ast = parseFile(`const x = ${code};`);
    const declaration = ast.program.body[0] as t.VariableDeclaration;
    const init = declaration.declarations[0].init;
    assert.ok(t.isJSXElement(init), 'fixture is not a JSX element');
    return init;
}

function print(node: t.File | t.JSXElement): string {
    return generate(node).code;
}

describe('Phase 3C — component boundary lookup (T01, T02, T06, T17)', () => {
    const twoCards = parseFile(`
        export function App() {
            return (
                <main>
                    <Card data-oid="card-a" />
                    <Card data-oid="card-b" />
                </main>
            );
        }
    `);

    it('resolves the second of two call sites by index', () => {
        const result = findComponentInvocation(twoCards, 'Card', 1);
        assert.deepEqual(result, { ok: true, instanceId: 'card-b', component: 'Card' });
    });

    it('refuses an out-of-range index instead of returning the last candidate', () => {
        const result = findComponentInvocation(twoCards, 'Card', 5);
        assert.equal(result.ok, false);
        assert.equal((result as { reason: string }).reason, 'no-candidate');
    });

    it('refuses -1 when more than one call site exists', () => {
        const result = findComponentInvocation(twoCards, 'Card', -1);
        assert.equal(result.ok, false);
        assert.equal((result as { reason: string }).reason, 'ambiguous-candidate');
    });

    it('accepts -1 only for a single call site', () => {
        const single = parseFile(`
            export function App() {
                return <main><Card data-oid="only" /></main>;
            }
        `);
        assert.deepEqual(findComponentInvocation(single, 'Card', -1), {
            ok: true,
            instanceId: 'only',
            component: 'Card',
        });
    });

    it('refuses a member-expression component instead of guessing', () => {
        const dynamic = parseFile(`
            export function App() {
                return <main><UI.Card data-oid="ui-card" /></main>;
            }
        `);
        const result = findComponentInvocation(dynamic, 'Card', 0);
        assert.equal(result.ok, false);
        assert.equal((result as { reason: string }).reason, 'unsupported-component-name');
    });

    it('reports no candidate when the component is absent', () => {
        const result = findComponentInvocation(twoCards, 'Panel', 0);
        assert.equal(result.ok, false);
        assert.equal((result as { reason: string }).reason, 'no-candidate');
    });
});

describe('Phase 3C — instance style preconditions (T03, T05, T13)', () => {
    const forwarding = `
        import { cn } from "@/lib/utils";
        export function Card({ className, ...props }: React.ComponentProps<"div">) {
            return <div data-oid="impl" className={cn("rounded-xl border", className)} {...props} />;
        }
    `;

    it('accepts a component that forwards className through a props binding', () => {
        const result = checkClassNameForwarding(parseFile(forwarding), 'Card');
        assert.equal(result.ok, true);
    });

    it('accepts a component that spreads its props object', () => {
        const result = checkClassNameForwarding(
            parseFile(`
                export function Card(props) {
                    return <div data-oid="impl" {...props} />;
                }
            `),
            'Card',
        );
        assert.equal(result.ok, true);
    });

    it('accepts an arrow component with a destructured className', () => {
        const result = checkClassNameForwarding(
            parseFile(`
                export const Card = ({ className }) => <div data-oid="impl" className={className} />;
            `),
            'Card',
        );
        assert.equal(result.ok, true);
    });

    it('accepts a component wrapped in React.forwardRef (shadcn/ui shape)', () => {
        const result = checkClassNameForwarding(
            parseFile(`
                const CardHeader = React.forwardRef<
                    HTMLDivElement,
                    React.HTMLAttributes<HTMLDivElement>
                >(({ className, ...props }, ref) => (
                    <div
                        ref={ref}
                        className={cn("flex flex-col p-6", className)}
                        {...props}
                        data-oid="impl"
                    />
                ));
            `),
            'CardHeader',
        );
        assert.equal(result.ok, true);
    });

    it('looks inside a forwardRef wrapper instead of trusting its name', () => {
        const result = checkClassNameForwarding(
            parseFile(`
                const CardHeader = React.forwardRef(({ className }, ref) => (
                    <div ref={ref} className="static-header" data-oid="impl" />
                ));
            `),
            'CardHeader',
        );
        assert.equal(result.ok, false);
        assert.equal((result as { reason: string }).reason, 'no-classname-forwarding');
    });

    it('refuses a component that returns a fragment', () => {
        const result = checkClassNameForwarding(
            parseFile(`
                export function Card({ className }) {
                    return <><div data-oid="a" /><div className={className} /></>;
                }
            `),
            'Card',
        );
        assert.equal(result.ok, false);
        assert.equal((result as { reason: string }).reason, 'no-classname-forwarding');
    });

    it('refuses a component that ignores className (T05)', () => {
        const result = checkClassNameForwarding(
            parseFile(`
                export function Card({ className }) {
                    return <div data-oid="impl" className="base-card" />;
                }
            `),
            'Card',
        );
        assert.equal(result.ok, false);
        assert.equal((result as { reason: string }).reason, 'no-classname-forwarding');
    });

    it('refuses a component that takes no props', () => {
        const result = checkClassNameForwarding(
            parseFile(`
                export function Card() {
                    return <div data-oid="impl" className="base-card" />;
                }
            `),
            'Card',
        );
        assert.equal(result.ok, false);
        assert.equal((result as { reason: string }).reason, 'no-classname-prop');
    });

    it('refuses a component that cannot be found by name', () => {
        const result = checkClassNameForwarding(parseFile(forwarding), 'Panel');
        assert.equal(result.ok, false);
        assert.equal((result as { reason: string }).reason, 'component-not-found');
    });
});

describe('Phase 3C — one target, one source node (T12, T18)', () => {
    it('counts a single occurrence', () => {
        const ast = parseFile(`export const a = <div data-oid="x" />;`);
        assert.equal(countOidOccurrences(ast, 'x'), 1);
    });

    it('counts a duplicated oid so the batch can be refused', () => {
        const ast = parseFile(`
            export const a = <div data-oid="x" />;
            export const b = <span data-oid="x" />;
        `);
        assert.equal(countOidOccurrences(ast, 'x'), 2);
    });

    it('reports zero for a missing target', () => {
        const ast = parseFile(`export const a = <div data-oid="x" />;`);
        assert.equal(countOidOccurrences(ast, 'gone'), 0);
    });
});

describe('Phase 3C — class expression transforms (T08, T09, T10, T11)', () => {
    it('merges into a static string', () => {
        const node = parseElement('<div className="bg-blue-500" />');
        assert.equal(addClassToNode(node, 'bg-red-500').ok, true);
        assert.equal(print(node), '<div className="bg-red-500" />');
    });

    it('inserts className when none exists', () => {
        const node = parseElement('<div data-oid="x" />');
        assert.equal(addClassToNode(node, 'p-4').ok, true);
        assert.match(print(node), /className="p-4"/);
    });

    it('appends an argument to a recognised cn() call and preserves its logic (T08)', () => {
        const node = parseElement('<div className={cn("base", variantClass)} />');
        assert.equal(addClassToNode(node, 'rounded-lg').ok, true);
        assert.equal(print(node), '<div className={cn("base", variantClass, "rounded-lg")} />');
    });

    it('rejects an unknown helper call without touching it (T09)', () => {
        const node = parseElement('<div className={getClassName(props)} />');
        const before = print(node);
        const result = addClassToNode(node, 'p-4');
        assert.equal(result.ok, false);
        assert.equal((result as { reason: string }).reason, 'unsupported-call');
        assert.equal(print(node), before);
    });

    it('rejects a conditional className without touching it (T10)', () => {
        const node = parseElement('<div className={active ? "a" : "b"} />');
        const before = print(node);
        const result = addClassToNode(node, 'p-4');
        assert.equal(result.ok, false);
        assert.equal((result as { reason: string }).reason, 'unsupported-conditional');
        assert.equal(print(node), before);
    });

    it('rejects a logical className without touching it (T10)', () => {
        const node = parseElement('<div className={active && "a"} />');
        const before = print(node);
        const result = addClassToNode(node, 'p-4');
        assert.equal(result.ok, false);
        assert.equal(print(node), before);
    });

    it('rejects a spread that may own className (T11)', () => {
        const node = parseElement('<div {...props} />');
        const before = print(node);
        const result = addClassToNode(node, 'p-4');
        assert.equal(result.ok, false);
        assert.equal((result as { reason: string }).reason, 'spread-may-own-classname');
        assert.equal(print(node), before);
    });

    it('rejects a dynamic template literal', () => {
        const node = parseElement('<div className={`base ${extra}`} />');
        const result = addClassToNode(node, 'p-4');
        assert.equal(result.ok, false);
        assert.equal((result as { reason: string }).reason, 'dynamic-class-expression');
    });

    it('adds to a static template literal without losing its classes', () => {
        const node = parseElement('<div className={`base extra`} />');
        assert.equal(addClassToNode(node, 'p-4').ok, true);
        assert.equal(print(node), '<div className="base extra p-4" />');
    });

    it('replaces a static string on override', () => {
        const node = parseElement('<div className="bg-blue-500" />');
        assert.equal(replaceNodeClasses(node, 'bg-red-500').ok, true);
        assert.equal(print(node), '<div className="bg-red-500" />');
    });

    it('replaces the literal classes of a cn() call and keeps the forwarded className (Phase 3B data-loss case)', () => {
        const source = '<div className={cn("rounded-xl border", className)} />';
        const node = parseElement(source);
        const result = replaceNodeClasses(node, 'bg-red-500');
        assert.equal(result.ok, true);
        assert.equal(print(node), '<div className={cn("bg-red-500", className)} />');
    });

    it('restyles a spread component root without dropping its className prop', () => {
        const node = parseElement(
            '<div className={cn("flex flex-col gap-6", className)} {...props} />',
        );
        const result = replaceNodeClasses(node, 'flex flex-col gap-6 bg-red-500');
        assert.equal(result.ok, true);
        assert.equal(
            print(node),
            '<div className={cn("flex flex-col gap-6 bg-red-500", className)} {...props} />',
        );
    });

    it('adds a class to a spread component root when it already owns a className', () => {
        const node = parseElement('<div className="p-4" {...props} />');
        assert.equal(addClassToNode(node, 'bg-red-500').ok, true);
        assert.equal(print(node), '<div className="p-4 bg-red-500" {...props} />');
    });

    it('refuses to overwrite a conditional', () => {
        const node = parseElement('<div className={active ? "a" : "b"} />');
        const before = print(node);
        assert.equal(replaceNodeClasses(node, 'x').ok, false);
        assert.equal(print(node), before);
    });
});
