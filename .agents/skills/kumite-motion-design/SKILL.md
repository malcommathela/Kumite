---
name: kumite-motion-design
description: >-
  Coordinate evidence-based motion design without prescribing an animation
  library. Use installed specialist motion skills when available, inspect
  observed reference behaviour, respect reduced motion and accessibility, and
  select the simplest technology already appropriate to the project.
---

# Motion Design

Motion is part of interaction and visual design, not automatic decoration.
Kumite coordinates motion decisions; it does not ship an animation engine,
framework-specific implementation skills or a mandatory library.

## Principles

- Inspect the selected reference's actual behaviour where possible.
- A static screenshot does not evidence timing, easing, springs, stagger or
  scroll behaviour.
- Use a live website, source, Figma prototype or recording as evidence when
  available. Mark inaccessible behaviour as unknown.
- Do not invent motion to make a page feel more elaborate.
- Use motion for orientation, state change, feedback or purposeful expression.
- Respect reduced-motion preferences, keyboard interaction, touch, focus,
  interruption, performance and cleanup.

## Specialist knowledge

Use an installed design/motion specialist skill if the host environment has
one. Do not vendor or download a particular animation library's skill as a
Kumite dependency. If no specialist skill is available, apply these principles
and consult the documentation for the project's existing animation technology
only when needed.

## Implementation choice

Inspect the project's existing dependencies and conventions first. Prefer:
1. Native CSS transitions/animations for simple presentation and state changes.
2. Web Animations API or framework-native tools when already used by the project.
3. An installed animation library when the approved motion requires it and the
   project can reasonably support it.

Do not prescribe GSAP, Lenis, Framer Motion or any other tool. Do not add a
dependency merely because a reference uses it.

## Motion specification

For each meaningful animated interaction, record:
- Element and trigger.
- Purpose and start/end states.
- Duration, delay and easing only when observed or deliberately approved.
- Scroll, pointer, keyboard and touch behaviour.
- Responsive behaviour.
- Reduced-motion alternative.
- Interruption, cleanup and performance considerations.
- Evidence: observed, source-supported, approved functional addition or unknown.

## Approval and audit

Motion is approved with the design direction or separately when it materially
changes the experience. Audit for unnecessary repetition, distracting effects,
keyboard delays, inaccessible movement and performance regressions. Static
references remain static unless the user explicitly requests purposeful motion.
