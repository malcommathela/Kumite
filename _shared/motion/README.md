# Motion

Motion is part of the design reference, not a polish layer added after layout. It
is first-class in both Content Experience and Product Experience. It may be
expressive, subtle or intentionally absent, but it is never random decoration.

This folder holds the contract. The implementation patterns live in
[`../patterns/gsap/`](../patterns/gsap/), the official GSAP skills live in
`.agents/skills/gsap-*`, and the optional smooth-scroll decision lives in
[`lenis.md`](lenis.md).

## Motion workflow

1. **Discover.** Collect motion evidence: recordings, prototypes, live
   interaction, computed styles, documentation. A still image is not motion
   evidence.
2. **Select.** Show the user motion examples and ask which qualities they want.
   This is a separate choice from the visual direction.
3. **Approve.** Record the approved motion direction before implementing it.
   See [`motion-selection.md`](motion-selection.md).
4. **Specify.** Write the engineering spec: trigger, timing, easing, movement,
   scroll and pointer behaviour, mobile behaviour, reduced-motion alternative,
   performance and cleanup.
5. **Implement.** Reuse the project's motion tokens and libraries. Load only the
   GSAP skill the task needs. Add Lenis only when the experience benefits.
6. **Audit.** Test the rendered interaction, interruption, focus, touch,
   reduced motion and frame cost. Apply MAS-01 to MAS-09.

## Static references

A screenshot, image, design board or archived page cannot evidence timing,
easing, springs, stagger or scroll behaviour. Record `status: "static"` or
`"unknown"`, list what is intentionally omitted, and add no animation. A static
reference does not become animated because an agent wants the page to feel more
designed. When in doubt, do not animate.

## Specialist resolution

`kumite-motion-design` resolves the specialist `design-motion-principles` skill
before creating or auditing motion:

1. Search the agent skill directories for `design-motion-principles`.
2. Verify its `SKILL.md` and the resources its workflow requires.
3. Use the installed copy untouched; do not vendor it into Kumite.
4. If absent, retrieve `https://github.com/kylezantos/design-motion-principles`,
   record the commit and licence, and read the real files.
5. If retrieval fails, stop the motion stage and report it. Never claim the
   specialist skill was loaded when it was not.

Record the method, source, version or commit, licence, loaded resources and
limitations in `motion-spec.md`.

## GSAP routing

The eight official GSAP skills are vendored verbatim in `.agents/skills/`. Load
the one that matches the task; do not restate their API here and do not load all
eight at once.

| Need | Skill |
|---|---|
| Tweens, easing, stagger, `matchMedia`, reduced motion | `gsap-core` |
| Sequencing, position parameter, nesting, playback | `gsap-timeline` |
| Scroll-linked animation, pinning, scrub, triggers | `gsap-scrolltrigger` |
| Plugin registration, Flip, Draggable, Observer, SplitText, SVG | `gsap-plugins` |
| `clamp`, `mapRange`, `snap`, `toArray`, `wrap` | `gsap-utils` |
| Transform-only animation, batching, layout thrash | `gsap-performance` |
| React, `useGSAP`, refs, cleanup | `gsap-react` |
| Vue, Svelte, lifecycle, scoped selectors | `gsap-frameworks` |

The vendored skills carry the upstream MIT licence. See
[`gsap/LICENSE`](gsap/LICENSE) and
[`../../THIRD-PARTY-NOTICES.md`](../../THIRD-PARTY-NOTICES.md). The GSAP runtime
itself is not MIT; it uses GreenSock's standard "no charge" licence. See the
notices file before redistributing a bundle.

## Engineering spec

Every animated element records:

| Field | Content |
|---|---|
| Element and trigger | What moves, and what starts it |
| Purpose | State change, orientation, feedback or expression |
| States | Start, end and interruption behaviour |
| Duration, delay, easing | Values with confidence and source |
| Movement | Properties, distance, transform origin |
| Spring | Type, stiffness, damping, mass, bounce, or `none` |
| Stagger | Whether, interval, order and limit |
| Enter / exit | Properties; exits subtler than entrances |
| Scroll | Trigger, progress mapping, pin, once |
| Pointer | Hover, press, drag, cursor and touch behaviour |
| Mobile | Breakpoint and touch-specific changes |
| Loading | Real state only |
| Reduced motion | The alternative, in the same change |
| Performance | Animated properties and risks |
| Cleanup | Teardown, interruption and framework integration |
| Evidence | Source-supported, functional addition or intentionally omitted |

## Motion anti-slop

The nine indicators `MAS-01` to `MAS-09` are defined in
`kumite-motion-design`: unnecessary pulsing, hover scaling everywhere, excessive
stagger, unjustified bouncy springs, identical fade-ins, page-load animation,
excessive blur entrances, distracting decoration, and motion that harms
accessibility or performance.

The same evidence discipline applies: source-supported,
design-system-supported, functional requirement, or unsupported. A single
intentional use is not automatically slop; frequency, uniformity and lack of
purpose are the tells.

## Pattern library

Use [`../patterns/gsap/README.md`](../patterns/gsap/README.md) for complete,
reduced-motion-safe patterns with APIs, performance notes and cleanup. The
library is a starting point, not a default polish layer.

## Lenis

Lenis is optional. Read [`lenis.md`](lenis.md) before adding it. Test without
Lenis first; the page must scroll and remain accessible without it.
