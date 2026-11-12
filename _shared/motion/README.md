# Motion

Motion is part of the design reference and interaction model. Kumite provides
library-agnostic design, evidence, accessibility and audit guidance; it does not
prescribe or vendor an animation engine.

## Workflow

1. **Discover.** Inspect selected live-page behaviour, Figma prototype settings,
   source code or recordings when available. A still image is not motion evidence.
2. **Select.** Identify the motion qualities relevant to the user's experience.
   Do not create a separate visual board or screenshot gallery.
3. **Approve.** Record purposeful motion and any intentionally static regions.
4. **Specify.** Define triggers, purpose, states, timing when known, responsive
   behaviour, reduced-motion alternative, performance and cleanup.
5. **Implement.** Inspect the project's dependencies and use the simplest
   appropriate existing technology. Do not add a library without a reason.
6. **Audit.** Test interruption, focus, touch, reduced motion, keyboard response
   and performance. Apply MAS-01 to MAS-09.

## Evidence

A static reference cannot establish timing, easing, springs, stagger or
scroll behaviour. Record these as unknown unless observed or explicitly approved
as a functional addition. Never add motion merely as decoration.

## Technology selection

- Native CSS for simple transitions and presentation.
- Web Animations API or framework-native tools where appropriate.
- Existing project animation libraries for interactions that need them.
- No mandatory animation engine, motion framework or scrolling dependency.

Do not vendor animation-library skills into Kumite. The host agent may use an
installed specialist motion skill or consult the selected technology's official
documentation when necessary.

## Motion specification

For each meaningful interaction, record element, trigger, purpose, states,
timing/easing evidence, scroll/pointer/keyboard/touch behaviour, responsive
behaviour, reduced-motion alternative, interruption, cleanup and performance.

## Audit

Check for unnecessary pulsing, blanket hover scaling, excessive stagger,
unjustified springs, repetitive reveals, distracting decoration, delayed
keyboard actions and movement that harms accessibility or performance.
A single purposeful animation is not automatically a problem; judge context,
frequency and user impact.
