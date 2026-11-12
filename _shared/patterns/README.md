# Patterns

This directory does not vendor library-specific motion patterns. Use the shared
[library-agnostic motion guidance](../motion/README.md) and the selected
project's existing dependencies.

A pattern documented in a project must name its real use case, supporting
evidence, API, reduced-motion alternative, performance cost, cleanup and
references. Project-specific evidence, values and adaptations stay in that
project's own `output/` folder.

## Rules

1. The reference or approved direction wins. A pattern is not a reason to add
   motion.
2. Prefer CSS or a native API for simple feedback. Do not add a dependency for
   one hover.
3. Every pattern has a reduced-motion branch that leaves content visible.
4. Every pattern has a cleanup path and an interruption story.
5. Load only the installed specialist motion skill the pattern actually needs.
