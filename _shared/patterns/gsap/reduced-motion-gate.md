# Reduced-motion gate

## Use case

Every animated page or component. This is the base pattern every other GSAP
pattern builds on. It makes `prefers-reduced-motion` a real alternative rather
than a disabled animation that leaves content invisible.

## Pipeline fit

- Content Experience: required for every motion pattern.
- Product Experience: required for every state transition and entrance.
- Frequency: every run with motion.

## Evidence

A reduced-motion branch is a functional and accessibility requirement, not a
style choice. It is always supported.

## Technology

GSAP core plus `gsap.matchMedia()`. No plugin registration needed.

## API and implementation

```js
import { gsap } from "gsap";

const mm = gsap.matchMedia();

mm.add("(prefers-reduced-motion: no-preference)", () => {
  gsap.from("[data-reveal]", {
    y: 24,
    opacity: 0,
    duration: 0.6,
    ease: "power2.out",
    stagger: 0.06,
    clearProps: "transform,opacity",
  });
});

mm.add("(prefers-reduced-motion: reduce)", () => {
  gsap.set("[data-reveal]", { clearProps: "all" });
});

// Teardown:
// mm.revert();
```

## Reduced motion

The `reduce` branch must set the final state. Do not merely skip the animation
if the element starts hidden in CSS. Remove parallax, pinning and scroll-linked
transforms entirely in that branch.

## Performance

- Animate only `transform`, `opacity` and, when justified, `filter`.
- Use `clearProps` so finished elements do not keep inline transforms that
  create containing blocks.
- Do not add `will-change` globally; add it only around an active animation.

## Cleanup

Call `mm.revert()` when the component unmounts or the page is torn down. In
React, create the context inside `useGSAP` and let it revert automatically.

## Pitfalls

- Leaving content at `opacity: 0` when motion is reduced.
- Using a CSS media query and a GSAP branch that disagree.
- Forgetting that `gsap.matchMedia()` callbacks re-run when the query changes.
- Animating a parent that contains `position: fixed` children without testing.

## References

- `gsap-core` skill, reduced-motion guidance.
- `https://gsap.com/docs/v3/GSAP/gsap.matchMedia()`
- `_shared/foundations/responsive-and-accessibility.md`
