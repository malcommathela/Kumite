# Kumite — Agent Routing

Kumite is a taste-led design-engineering system for AI coding agents. It turns a
brief and user-selected references into an evidence-grounded, approved interface.

## Start here

- New to the repository: read `CONTEXT.md`.
- Content-led page: `pipelines/content-experience/CONTEXT.md`.
- Product interface: `pipelines/product-experience/CONTEXT.md`.
- Shared foundations, references and tools: `_shared/CONTEXT.md`.
- Discoverable skills: `.agents/skills/` (one directory per skill).
- Worked example: `examples/design-intelligence-demo/README.md`.

## Non-negotiables

1. **Inspect before building.** Read project files, dependencies and components.
2. **Ask for taste.** Use supplied references or research relevant websites and
   Figma designs; present names, short reasons and direct links, then retain the user's
   choices and words. Do not repeat questions already answered.
3. **Get direction approval.** Present a concept frame and resolve reference
   conflicts before implementation. Motion has a separate approval gate.
4. **Component-first.** Reuse existing components; prefer accessible primitives.
5. **No fabrication.** No invented metrics, content, identifiers, capabilities
   or evidence. Mark unknowns explicitly.
6. **Evidence over assumption.** Every value is exact, measured, estimated or
   unknown, with a traceable source. Screenshots do not prove structure.
7. **Reference-led visuals.** Avoid unsupported decoration, random gradients,
   fake status bars, unnecessary 3D objects and invented imagery.
8. **Authentic assets.** Verify external asset licences and preserve attribution.
9. **Accessible motion.** Respect reduced motion, keyboard, focus, touch,
   performance and lifecycle cleanup. Static references stay static.
10. **Minimalism.** Reuse first; add only what solves the task.

## Validation

Run from the repository root:

```sh
node --test "tests/**/*.test.mjs"
python _tools/links.py
```

Never commit, push or merge without explicit user approval.
