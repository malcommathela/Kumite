# Kumite — Agent Routing

Kumite is a portable design-engineering system for AI coding agents. It turns a
brief or a design reference into an evidence-grounded interface through two
pipelines that share one factory.

## Start here

- New to the repository: read `CONTEXT.md`.
- Content page, marketing site, editorial or portfolio:
  `pipelines/content-experience/CONTEXT.md`.
- App screen, dashboard, tool or multi-step flow:
  `pipelines/product-experience/CONTEXT.md`.
- Shared references, scripts and motion:
  `_shared/CONTEXT.md`.
- Discoverable skills: `.agents/skills/` (one directory per skill).
- Worked example: `examples/design-intelligence-demo/README.md`.
- Archived Design Memory Map: `_archive/design-memory-map/README.md` (read-only).

## Non-negotiables

1. **Inspect before building.** Read the project's files, dependencies and
   components before introducing anything.
2. **Component-first.** Reuse what exists; prefer shadcn/ui for React and
   Hugeicons for interface icons.
3. **No fabrication.** No invented metrics, testimonials, awards, identifiers,
   capabilities or evidence. Mark what is unknown.
4. **Authentic assets.** Real photography from Pexels, Unsplash or Pixabay, with
   verified licences. Never substitute an AI photograph.
5. **Evidence over assumption.** Every value is `exact`, `measured`, `estimated`
   or `unknown`, with a traceable source.
6. **The reference wins.** A visual or motion device is acceptable only when it
   is source-supported, design-system-supported or a functional requirement.
7. **Static references stay static.** A screenshot cannot evidence timing,
   easing, springs or scroll behaviour.
8. **Motion is accessible.** Honour `prefers-reduced-motion`, keyboard use,
   focus visibility, touch and performance in the same change.
9. **Minimalism.** Use the smallest change that fully solves the task.

## Validation

Run from the repository root:

```sh
node --test "tests/**/*.test.mjs" "_archive/**/*.test.mjs"
```

Do not commit, push, merge or discard work without explicit approval.
