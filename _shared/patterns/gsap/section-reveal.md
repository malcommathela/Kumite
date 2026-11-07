# Section reveal

## Use case

A small number of section-level entrances on a content page. The motion orients
the reader at a boundary; it is not applied to every block. Good for a long
editorial or marketing page with a quiet, deliberate pace.

Do not use it on dense product screens, data tables or content that must be
readable immediately.

## Pipeline fit

- Content Experience: yes, for a few named sections.
- Product Experience: rarely; use state feedback instead.
- Frequency: occasional.

## Evidence

Source-supported when the reference recording or approved motion direction shows
a section entering. Functional only when it prevents a genuine orientation
problem. Otherwise omit it.

## Technology

`gsap-core` + `gsap-scrolltrigger`. CSS alone is enough for a simple fade; use
GSAP when the sequence or trigger needs control.

## API and implementation

```js
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

const mm = gsap.matchMedia();

mm.add("(prefers-reduced-motion: no-preference)", () => {
  const sections = gsap.utils.toArray("[data-reveal-section]");

  sections.forEach((section) => {
    gsap.from(section, {
      y: 28,
      opacity: 0,
      duration: 0.7,
      ease: "power2.out",
      scrollTrigger: {
        trigger: section,
        start: "top 82%",
        once: true,
      },
      clearProps: "transform,opacity",
    });
  });
});

mm.add("(prefers-reduced-motion: reduce)", () => {
  gsap.set("[data-reveal-section]", { clearProps: "all" });
});
```

## Reduced motion

No transform, no opacity entrance. The section is visible at first paint. Do not
leave a hidden state in CSS that only the animated branch clears.

## Performance

- One trigger per section, not per child.
- `once: true` avoids re-animation on scroll direction changes.
- Use `ScrollTrigger.batch()` only when many elements enter together; a long
  stagger is still a slop tell.
- Refresh after fonts, images and dynamic content change layout.

## Cleanup

`mm.revert()` reverts the matchMedia branches. If you create ScrollTriggers
outside a context, call `trigger.kill()` on teardown. In React, use `useGSAP`
with a scope.

## Pitfalls

- Revealing every section identically (MAS-05).
- Animating a section that contains a pinned child.
- Measuring the trigger before images load, then never refreshing.
- Using scroll reveal on content that is already above the fold.

## References

- `gsap-scrolltrigger` skill.
- `https://gsap.com/docs/v3/Plugins/ScrollTrigger/`
- `_shared/references/anti-slop-rules.json` (AS and MAS indicators).
