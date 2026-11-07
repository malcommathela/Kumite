# GSAP pattern library

Reusable patterns that already respect reduced motion and cleanup. Adapt the
values to the project's motion spec; do not copy them as a default polish layer.
The official GSAP skills in `.agents/skills/gsap-*` remain the API authority.

## 1. Reduced-motion gate

Use `gsap.matchMedia()` so the reduced-motion branch is a real alternative, not
a disabled animation that leaves content invisible.

```js
import { gsap } from "gsap";

const mm = gsap.matchMedia();

mm.add("(prefers-reduced-motion: no-preference)", () => {
  gsap.from(".reveal", {
    y: 24,
    opacity: 0,
    duration: 0.6,
    ease: "power2.out",
    stagger: 0.06,
  });
});

mm.add("(prefers-reduced-motion: reduce)", () => {
  gsap.set(".reveal", { clearProps: "all" });
});

// On teardown:
// mm.revert();
```

## 2. Scroll reveal, once

```js
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

gsap.utils.toArray("[data-reveal]").forEach((element) => {
  gsap.fromTo(
    element,
    { y: 28, opacity: 0 },
    {
      y: 0,
      opacity: 1,
      duration: 0.7,
      ease: "power2.out",
      scrollTrigger: {
        trigger: element,
        start: "top 82%",
        once: true,
      },
    },
  );
});
```

`once: true` prevents re-animation on every scroll direction change. Do not put
this on every list row; use it for a few section-level moments.

## 3. Pinned sequence

Pin only when the content genuinely benefits from a held frame. Always provide a
non-pinned reduced-motion branch.

```js
mm.add("(prefers-reduced-motion: no-preference)", () => {
  const timeline = gsap.timeline({
    scrollTrigger: {
      trigger: ".process",
      start: "top top",
      end: "+=120%",
      pin: true,
      scrub: 0.6,
    },
  });

  timeline
    .to(".process-step-1", { opacity: 1, y: 0 })
    .to(".process-step-2", { opacity: 1, y: 0 })
    .to(".process-step-3", { opacity: 1, y: 0 });
});
```

Test pinning at every breakpoint; it is the most common source of layout jumps.

## 4. Hover and focus feedback

Animate the state, not a new variant. Use the same treatment for keyboard focus
so the interface does not depend on hover.

```css
.card {
  transition: transform 180ms ease, border-color 180ms ease;
}

.card:hover,
.card:focus-visible {
  transform: translateY(-2px);
}

@media (prefers-reduced-motion: reduce) {
  .card {
    transition: none;
  }
  .card:hover,
  .card:focus-visible {
    transform: none;
  }
}
```

CSS transitions are enough for simple state feedback. Do not add GSAP for one
hover.

## 5. Lenis + ScrollTrigger

```js
import Lenis from "lenis";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

const lenis = new Lenis({ autoRaf: false, respectReducedMotion: true });

lenis.on("scroll", ScrollTrigger.update);

const tick = (time) => lenis.raf(time * 1000);
gsap.ticker.add(tick);
gsap.ticker.lagSmoothing(0);

// Teardown:
// gsap.ticker.remove(tick);
// lenis.destroy();
```

## 6. Cleanup

Every timeline, ScrollTrigger and matchMedia context must be reversible. In a
component, return a cleanup function; in a plain page, keep references so a
teardown path exists. A hot reload that leaves stale triggers is a bug.

## 7. Performance

- Animate `transform`, `opacity` and `filter` for continuous motion.
- Avoid width, height, top, left, margin and padding animation.
- Batch DOM reads and writes; do not interleave them in a loop.
- Use `will-change` sparingly and remove it after the animation.
- Test on a throttled CPU and a narrow viewport before claiming smoothness.
