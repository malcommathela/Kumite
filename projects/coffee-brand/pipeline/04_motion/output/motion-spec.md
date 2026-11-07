# Motion specification — Hollow Pine Coffee

## Specialist resolution

| Field | Value |
|---|---|
| Resolution method | installed |
| Skill | `design-motion-principles` |
| Source | `C:\Users\malco\.agents\skills\design-motion-principles` |
| Version or commit | not declared by the skill |
| Licence | not declared by the skill |
| Loaded resources | `SKILL.md`, `workflows/create.md`, `references/creation-gotchas.md` |
| Limitations | No version or licence file is shipped with the installed copy; recorded as unknown rather than inferred. |

Project context: marketing / e-commerce landing page. Weighting per the skill:
**Primary Jakub Krehel** (production polish), **Secondary Jhey Tompkins**
(selective expression), **Emil Kowalski** for forms and navigation. Frequency gate
applied to every item below.

## Evidence position

The reference record says `motion.status: "unknown"`. The captures are stills and
prove nothing about timing, easing or scroll behaviour. **No motion below is
claimed as source-supported.** The brief requires a GSAP build, so the layer is
recorded as a functional requirement: orientation on arrival, feedback on action,
and one restrained expression on the photographic band. If the brief did not ask
for it, the correct amount would be none.

## Motion inventory

| # | Element and trigger | Purpose | States | Duration | Delay | Easing | Stagger | Scroll | Hover / focus | Loading | Responsive | Reduced motion | Performance | Classification |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| 1 | Header, after 24px scroll | Legibility and orientation | flat → raised | 180ms | 0 | `cubic-bezier(.22,1,.36,1)` | none | class toggle at 24px | n/a | none | same | instant | background and border only | functional-requirement |
| 2 | Section headings, on enter | Orientation | 16px down, 0 → 1 | 480ms | 0 | `power2.out` | 60ms, max 3 | `top 85%`, once | n/a | none | same | opacity only, 1 frame | transform, opacity | functional-requirement |
| 3 | Section body and cards, on enter | Orientation | 12px down, 0 → 1 | 420ms | 60ms | `power2.out` | 50ms, max 4 | `top 85%`, once | n/a | none | same | opacity only | transform, opacity | functional-requirement |
| 4 | Band image, scroll through band | Expression, depth | 1.06 → 1 | scrub | 0 | none (scrub) | none | `top bottom` → `bottom top` | n/a | none | off below 768px | static 1.0 | transform | functional-requirement |
| 5 | Product card, hover / focus-within | Feedback | rest → lift 4px, field shift | 220ms | 0 | `cubic-bezier(.22,1,.36,1)` | none | n/a | lift and field change | none | same | no lift, field change only | transform, background | functional-requirement |
| 6 | Add to bag, click | Feedback and state | count +1, toast in | 240ms | 0 | `power2.out` | none | n/a | focus ring unchanged | none | same | count text only, toast instant | transform, opacity | functional-requirement |
| 7 | Newsletter submit | Feedback | status line in | 200ms | 0 | `ease-out` | none | n/a | n/a | n/a | same | instant | opacity | functional-requirement |
| 8 | Anchor navigation | Orientation | jump → target | native smooth | n/a | n/a | n/a | n/a | n/a | none | same | `auto` | scroll only | functional-requirement |

There is **no** page-load animation, preloader, cursor effect, marquee, pinned
section, scroll-jacked sequence, looping pulse or decorative loop.

## Implementation notes

- GSAP 3.13 from `cdn.jsdelivr.net`, plus ScrollTrigger. Skills loaded for the
  build: `gsap-core` (tweens, `matchMedia`, reduced motion), `gsap-scrolltrigger`
  (reveals and the one scrub), `gsap-performance` (transform-only, no
  `will-change` spray).
- `gsap.matchMedia()` owns the reduced-motion branch and the breakpoint branch,
  and reverts both on change.
- Reveals use `once: true`; nothing re-hides on scroll back.
- Only `transform` and `opacity` are animated. The header changes
  `background-color` and `border-color`, which are paint-only.
- `will-change` is not set globally. It is not set at all: the animated sets are
  small and short-lived.
- Focus is never animated. Keyboard-triggered actions are instant.
- The add-to-bag pulse is a single 240ms acknowledgement, not a loop.

## Lenis decision

**Not used.** The page has no long scroll-linked sequence, no horizontal gallery
and no pinned narrative that would benefit from smoothed scrolling. Native scroll
keeps keyboard, trackpad, touch and assistive technology behaviour intact and
avoids a wrapper that can break anchor targets. The repository keeps Lenis
available for pages that need it, with the official GSAP ticker sync documented
in `_shared/motion/README.md`.

## Motion anti-slop review (MAS-01 … MAS-09)

| ID | Pattern | Finding |
|---|---|---|
| MAS-01 | Unnecessary pulsing | None. One 240ms acknowledgement on bag change; no loop. |
| MAS-02 | Hover scaling everywhere | None. Cards lift 4px; buttons change colour only; no scale on hover. |
| MAS-03 | Excessive stagger | Capped at 4 items and 60ms. |
| MAS-04 | Unjustified bouncy springs | None. No springs, no bounce. |
| MAS-05 | Identical fade-ins | Headings, body and images use different distances and durations; images do not fade, they scale. |
| MAS-06 | Page-load animation | None. Nothing above the fold animates on load. |
| MAS-07 | Excessive blur entrances | None. No blur. |
| MAS-08 | Distracting decoration | None. No marquee, cursor, particles or gradient motion. |
| MAS-09 | Accessibility or performance harm | Reduced-motion branch, transform/opacity only, no scroll-jacking, parallax off on mobile. |

Verdict: **pass**, conditional on the reduced-motion and keyboard checks in
`05_build`.
