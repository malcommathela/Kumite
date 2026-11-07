# Patterns

Curated implementation patterns, not a link list. A pattern is accepted only when
it names a real use case, the evidence that justifies it, the API it uses, the
reduced-motion alternative, the performance cost, the cleanup and its references.

| Library | Folder | Scope |
|---|---|---|
| GSAP | [`gsap/`](gsap/README.md) | Motion and interaction patterns for both pipelines |

Patterns are project-neutral. Project-specific evidence, values and adaptations
stay in the project's own `output/` folder.

## Rules

1. The reference or approved direction wins. A pattern is not a reason to add
   motion.
2. Prefer CSS or a native API for simple feedback. Do not add GSAP for one hover.
3. Every pattern has a reduced-motion branch that leaves content visible.
4. Every pattern has a cleanup path and an interruption story.
5. Load only the official GSAP skill the pattern needs.
