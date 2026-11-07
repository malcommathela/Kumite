# GSAP pattern library

A curated set of implementation patterns. Each file follows the same contract:
use case, pipeline fit, evidence, technology, API, reduced motion, performance,
cleanup, pitfalls and references. Adapt values to the approved motion spec; do
not copy them as a default polish layer.

The official GSAP skills in `.agents/skills/gsap-*` remain the API authority. The
patterns show how a Kumite run applies them.

| Pattern | Use when | Pipeline | GSAP skill |
|---|---|---|---|
| [`reduced-motion-gate.md`](reduced-motion-gate.md) | Any animated page | Both | `gsap-core` |
| [`section-reveal.md`](section-reveal.md) | A few section-level entrances | Content | `gsap-scrolltrigger` |
| [`staggered-entrance.md`](staggered-entrance.md) | One deliberate group entrance | Both | `gsap-core` |
| [`scroll-pinned-sequence.md`](scroll-pinned-sequence.md) | A held narrative frame | Content | `gsap-scrolltrigger` |
| [`scroll-scrub-progress.md`](scroll-scrub-progress.md) | Progress or a scrubbed effect | Both | `gsap-scrolltrigger` |
| [`text-split-reveal.md`](text-split-reveal.md) | A display headline with a masking reveal | Content | `gsap-plugins` + `gsap-core` |
| [`svg-line-drawing.md`](svg-line-drawing.md) | An evidenced line-drawing motif | Both | `gsap-plugins` |
| [`flip-layout-transition.md`](flip-layout-transition.md) | Reorder, expand or share an element | Product | `gsap-plugins` |
| [`draggable-gallery.md`](draggable-gallery.md) | A real drag interaction | Content | `gsap-plugins` |
| [`lenis-smooth-scroll.md`](lenis-smooth-scroll.md) | Approved inertial scrolling | Content | `gsap-scrolltrigger` + `lenis` |

## Selection rules

- Simple hover, press, focus, disclosure and colour feedback: CSS first.
- Page-load animation is not a default. See MAS-06.
- Do not animate every list row or section. One deliberate moment per view reads
  as design; the same reveal everywhere reads as a template.
- Never animate layout properties (`width`, `height`, `top`, `left`, `margin`,
  `padding`) for continuous motion. Use transforms.
- Register plugins once, at the entry point. Do not register in every component.
- Keep every animation interruptible. A new state must not wait for a decorative
  entrance.

## Evidence

A pattern may be used when it is source-supported (the reference or recording
shows it), design-system-supported (the project's motion language already uses
it) or a functional requirement (feedback for a real state change). Otherwise it
is unsupported and must not be added.

## References

- GSAP docs: `https://gsap.com/docs/v3/`
- GSAP skills: `https://github.com/greensock/gsap-skills`
- Showcase research:
  [`../../reference-intelligence/showcase/gsap.md`](../../reference-intelligence/showcase/gsap.md)
- Motion contract: [`../../motion/README.md`](../../motion/README.md)
- Lenis: [`../../motion/lenis.md`](../../motion/lenis.md)
