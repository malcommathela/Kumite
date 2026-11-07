# GSAP showcase adapter

Use when the question is **how motion behaves**, not what a site looks like. The
GSAP showcase and demo galleries are research material: real interactions,
documented techniques and production sites. They are not a licence to copy a
site's identity, composition or assets.

- Showcase: `https://gsap.com/showcase/`
- Demos: `https://gsap.com/demos/`
- Observed: 2026-11-07. Re-check before citing; the catalogue changes.

## What a showcase entry can prove

| Evidence | Confidence | Rule |
|---|---|---|
| The interaction exists and is observable | `measured` | Only after you open it and trigger it |
| Sequence and approximate duration | `estimated` | From at least three repetitions; never from a still |
| Exact duration, easing or spring values | `exact` | Only from demo source, documentation or computed values |
| The visual direction of the production site | `measured` | Appearance only; it is not a motion value |
| That the technique fits the current brief | `unknown` | That is a design decision, not a source fact |

A showcase card, thumbnail or screenshot proves none of the timing. If the demo
cannot be opened or its source cannot be read, record `unknown` and move on.

## Observed production sites

These entries were seen in the showcase during the 2026-11-07 review. Record the
site name, URL and observation date when you use one; do not treat this list as a
permanent index.

| Site | Useful for | Do not infer |
|---|---|---|
| Yevgeniya Grab | Editorial pacing, image reveals, restrained type motion | Its exact easing from the live page |
| The Whoopsies | Playful character motion, expressive hover | That playfulness suits the brief |
| Nocturnal Dream | Atmospheric scroll, layered depth | That every section is scroll-linked |
| Mike Fernandez | Portfolio transitions, project hover | The underlying layout system |
| Guillaume Colombel | Type-led motion, minimal interface | That the motion is CSS rather than JS |
| Liubomyr Ulytskyi | Product-style interaction, card motion | Accessibility of the observed interaction |
| Max Milkin | High-energy composition and transitions | Performance cost on a low-end device |
| Olha Lazarieva | Soft editorial reveals, image treatment | Image licence or asset ownership |

## Observed demo techniques

The demo gallery exposes isolated techniques. These are useful because the
mechanism is visible, not because the style should be copied.

| Demo | Technique | Typical use | Cost or risk |
|---|---|---|---|
| Magnetic Button | Pointer-follow transform with a bounded return | Primary call to action | Pointer-only; provide a keyboard-equivalent state |
| Proximity scale grid | Distance-driven scale on a grid | Gallery or feature grid | Many elements; batch reads and writes |
| Cursor Trail | Decaying pointer trail | Expressive brand moment | Distracting; skip on touch and reduced motion |
| MacOS Dock Effect | Neighbour-based scale | Tool or app launcher | Needs a stable pointer and clear focus states |
| Velocity Skew | Scroll-velocity mapping | Editorial image strips | Can cause motion sickness; cap and gate it |
| Card stack | Layered cards with scroll or drag progress | Story or feature sequence | Interruption and cleanup are hard |
| Scrubbed bento gallery | Scroll progress mapped to a bento layout | Long-form feature page | Pin length and mobile height need testing |
| Infinite card slider | Looped track with drag or auto-advance | Logo or work reel | Must pause, be keyboard operable and not trap focus |

## Procedure

1. **Name the decision.** "Which scroll behaviour should the case-study section
   use?" is research. "Make it feel like this site" is not.
2. **Open the source and trigger the interaction.** Record the URL, date and what
   you actually observed.
3. **Classify the evidence.** Separate what you saw, what you measured and what
   you read in source or documentation.
4. **Extract the mechanism, not the skin.** Name the trigger, the animated
   properties, the interruption story and the reduced-motion alternative.
5. **Check the pattern library.** If
   [`../../patterns/gsap/`](../../patterns/gsap/README.md) already covers the
   mechanism, reuse it instead of writing a new implementation.
6. **Add it to the selection board only as a candidate.** Motion is selected and
   approved separately. See
   [`../../motion/motion-selection.md`](../../motion/motion-selection.md).

## Limits

- A production site can change or disappear; record the observation date.
- A demo often omits responsive, keyboard, touch and reduced-motion behaviour.
- Showcase work is not a licence for the site's assets, copy, fonts or identity.
- The presence of GSAP does not mean GSAP is the right tool for the current task.
  Prefer CSS for a single hover or a simple state change.

## Output

A short research note in the project's motion output:

```md
## Showcase research

- Decision: <what the motion must do>
- Source: <URL>, observed <date>
- Observed: <interaction and sequence>
- Confidence: measured | estimated | unknown
- Mechanism: <trigger, properties, interruption, reduced motion>
- Reused pattern: <path or none>
- Not copied: <identity, assets, copy>
```
