---
name: kumite-component-first
description: >-
  Select and reuse established UI components before introducing new
  dependencies or writing custom implementations. Inspects existing project
  dependencies, prefers shadcn/ui for React projects, Hugeicons for interface
  icons, and established accessible component libraries. Use when implementing
  any frontend UI component, choosing a component library, or deciding whether
  to build custom vs reuse existing.
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
   directories, and shared utilities. Reuse what's there.
2. **Already-installed library covers it?** If the project already has a
   component library, use its component before adding another.
3. **shadcn/ui covers it?** For React projects using Tailwind CSS, shadcn/ui
   components are accessible, composable and locally owned. Prefer them.
4. **Established accessible library covers it?** Radix UI, Headless UI,
   React Aria, or equivalent accessible primitives for the framework.
5. **Hugeicons covers it?** For interface icons, prefer Hugeicons. If the
   project already uses a different icon library, use that instead.
6. **Only then: custom component.** Justify why existing options are
   insufficient. Document the justification.

## Procedure

### 1. Inspect the project

```
Check:
- package.json for existing UI dependencies
- Component directories for existing implementations
- Import statements for library usage patterns
- Tailwind / CSS framework configuration
```

### 2. Match the requirement

For each component needed, walk the ladder above. Record which rung was
selected and why.

### 3. Install only what's needed

If a new dependency is necessary:
- Prefer `shadcn/ui add <component>` (adds source code, no runtime dependency)
- For libraries: add the minimum package, not a full framework
- For icons: `npm install @hugeicons/react` or the project's existing icon set

### 4. Refuse unjustified custom implementations

If someone proposes a custom component when a library covers it, require
explicit justification:
- What specific requirement can't the library satisfy?
- Is it a genuine constraint or a preference?
- Can the library component be composed or extended instead?

## Anti-patterns to prevent

- Installing a full UI framework for one component.
- Writing a custom date picker when `<input type="date">` suffices.
- Adding multiple icon libraries to the same project.
- Reimplementing accessible primitives (focus management, ARIA attributes)
  that libraries handle correctly.
