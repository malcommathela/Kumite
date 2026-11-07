# Scroll-scrubbed progress

## Use case

An effect whose progress is tied to scroll: a reading-progress indicator, a
chapter index, a small parallax layer or a diagram that completes as the section
passes. It scrubs; it does not pin.

## Pipeline fit

- Content Experience: yes, especially long-form reading.
- Product Experience: sometimes, for a long document or an onboarding story.
- Frequency: occasional.

## Evidence

Source-supported when the reference shows scroll-linked movement or the brief
requires a progress indicator. A progress bar that communicates real position is
a functional requirement; decorative parallax is not.

## Technology

`gsap-scrolltrigger` with `scrub`. CSS `position: sticky` can replace some
progress indicators without JS; prefer it when it is enough.

## API and implementation

```js
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

const mm = gsap.matchMedia();

mm.add("(prefers-reduced-motion: no-preference)", () => {
  gsap.to("[data-progress-bar]", {
    scaleX: 1,
    ease: "none",
    scrollTrigger: {
      trigger: "[data-article]",
      start: "top top",
      end: "bottom bottom",
      scrub: true,
    },
  });

  gsap.to("[data-parallax]", {
    yPercent: -12,
    ease: "none",
    scrollTrigger: {
      trigger: "[data-parallax]",
      start: "top bottom",
      end: "bottom top",
      scrub: true,
    },
  });
});

mm.add("(prefers-reduced-motion: reduce)", () => {
  gsap.set("[data-progress-bar]", { scaleX: 0, clearProps: "transform" });
  gsap.set("[data-parallax]", { clearProps: "all" });
});
```

## Reduced motion

Progress may remain as a static indicator or be removed; parallax is removed
entirely. The reading experience must not depend on the scrubbed element.

## Performance

- `scrub: true` is cheaper than a numeric catch-up; use a small number only when
  the feel needs it.
- Animate `transform` and `opacity`.
- Avoid updating text content or layout on every scroll tick.
- Use `invalidateOnRefresh` when start values depend on viewport size.

## Cleanup

Revert the matchMedia context. Kill standalone triggers on teardown.

## Pitfalls

- Parallax on every image, which creates a floating, weightless page.
- A progress bar that is the only way to understand position.
- Scrubbing a pinned section and a progress bar at once without testing.
- Layout thrash from reading and writing in the same tick.

## References

- `gsap-scrolltrigger` skill.
- `https://gsap.com/docs/v3/Plugins/ScrollTrigger/scrub`
- `_shared/references/anti-slop-rules.json` (MAS-08).
