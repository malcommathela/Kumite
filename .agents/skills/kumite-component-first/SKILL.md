---
name: kumite-component-first
description: >-
  Select and reuse established UI components before introducing new
  dependencies or writing custom implementations. Inspects existing project
  dependencies, prefers shadcn/ui for React projects, Hugeicons for interface
  icons, and established accessible component libraries. Use when implementing
  any frontend UI component, choosing a component library, or deciding whether
  to build custom versus reuse existing.
---

# Component-First Implementation

Always inspect what exists before introducing anything new.

## When to use

- Any frontend component needs to be implemented.
- A component library needs to be selected for a project.
- The decision is between custom implementation and library reuse.

## The component ladder

Stop at the first rung that holds:

1. **Already in this project?** Check `package.json`, existing component
   directories and shared utilities. Reuse what is there.
2. **Already-installed library covers it?** Use the project's library before
   adding another.
3. **shadcn/ui covers it?** For React with Tailwind, shadcn/ui components are
   accessible, composable and locally owned. Prefer them.
4. **Established accessible library covers it?** Radix UI, Headless UI, React
   Aria or equivalent accessible primitives for the framework.
5. **Hugeicons covers it?** For interface icons, prefer Hugeicons. If the
   project already uses another icon library, use that instead.
6. **Only then: custom component.** Justify why existing options are
   insufficient and document the reason.

## Procedure

### 1. Inspect the project

```text
Check:
- package.json for existing UI dependencies
- component directories for existing implementations
- import statements for library usage patterns
- Tailwind / CSS framework configuration
```

### 2. Match the requirement

For each component needed, walk the ladder. Record the rung selected and why.

### 3. Install only what is needed

- Prefer `shadcn/ui add <component>` (source, no runtime dependency).
- For libraries, add the minimum package, not a full framework.
- For icons, `npm install @hugeicons/react` or the project's existing set.

### 4. Refuse unjustified custom implementations

If someone proposes a custom component when a library covers it, require:

- the specific requirement the library cannot satisfy;
- whether it is a genuine constraint or a preference;
- whether composition or extension solves it.

## Consuming reference evidence

When a design reference exists, the component inventory and variants come from
the pipeline's reference record and the project's system inventory. Do not
rebuild the inventory by eye from a screenshot.

For **Content Experience**, the reference record comes from
`pipelines/content-experience/02_reference/output/reference-evidence.json` and
the composition stage's implementation spec.

For **Product Experience**, the system inventory comes from
`pipelines/product-experience/02_system/output/system-inventory.md`.

Rules:

1. **Map every reference component to a primitive.** Walk the ladder for each
   entry. Record the rung selected and the project component used.
2. **Never collapse distinct reference variants into one.** If the reference has
   primary, secondary, outline and ghost buttons, implement four visual
   variants, even when one component expresses all four through props.
3. **Preserve variants through composition.** Extending an existing component
   with props, slots or wrapper styles is preferred over replacing it.
4. **Record what was implemented.** Note the variant name, props, values and any
   state that differs from the reference.
5. **Evidence every deviation.** A deviation is acceptable only when it is
   source-supported, design-system-supported or functional. Record the reason and
   evidence; otherwise it is a defect.

Missing or ambiguous variants are recorded as `unknown` in the implementation
spec. They are not invented to make the page look complete.

## States and motion handoff

Reference evidence records component states (`default`, `hover`, `focus`,
`active`, `disabled`) separately from motion. Keep that boundary:

1. **Motion is a state treatment, not a new variant.** Do not create a "hover
   card" variant because the reference animates on hover; implement the state on
   the existing variant.
2. **Consume the motion spec.** When `motion-spec.md` names a component, pass its
   triggers, timing, easing and reduced-motion alternative to
   `kumite-motion-design`. Do not guess a duration from the visual style.
3. **Invoke the specialist motion skill before animating.** Component-first
   chooses the primitive; the motion skill decides whether and how it moves.
4. **Do not add interaction motion by default.** No hover scale, lift, glow or
   entrance animation on a component merely because it is interactive.
5. **Keep states accessible.** Hover is not the only feedback: focus must remain
   visible, keyboard activation must not be delayed, and reduced-motion users
   must retain every state change without animation.
6. **Record deviations.** If an existing component cannot express a reference
   state, record the gap and the workaround; do not silently drop the state.

## Anti-patterns

- Installing a full UI framework for one component.
- Writing a custom date picker when `<input type="date">` suffices.
- Adding multiple icon libraries to one project.
- Reimplementing accessible primitives that libraries handle correctly.
- Adding hover scaling, entrance animation or bouncy springs to every component.
- Treating a motion state as a separate visual variant.
- Shipping interaction motion without a `prefers-reduced-motion` alternative.
