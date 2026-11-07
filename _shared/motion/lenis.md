# Lenis - optional smooth scrolling

Lenis is **optional**. It is not a default dependency and must not be added
because a page feels plain. Add it only when the approved motion direction says
smooth scrolling is part of the experience and the page still works without it.

- Source: `https://github.com/darkroomengineering/lenis`
- Pinned reference commit: `e01eefb1f55cd08bc051521d74f5f8182b71ee9d`
- Licence: MIT, Copyright (c) 2024 darkroom.engineering.
- Kumite does not vendor Lenis source; load it from the project's dependency or
  CDN at runtime.

## When to use it

Use Lenis when:

- the reference or approved motion direction evidences inertial or smoothed
  scrolling;
- long-form content or a scroll-driven story benefits from consistent scroll
  velocity;
- the page can still scroll, navigate and read with Lenis disabled.

Do not use it when:

- the only goal is "make it feel premium";
- it would hide a layout, focus or performance problem;
- it breaks anchor links, native scroll, keyboard navigation, find-in-page or
  mobile browser behaviour;
- the experience is a dense product surface where immediate scroll is expected.

## Official GSAP ScrollTrigger synchronization

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

## Rules

- Keep `respectReducedMotion: true`. When the user prefers reduced motion,
  Lenis disables smoothing and programmatic scrolls jump instantly.
- Keep `autoRaf: false` when driving Lenis from the GSAP ticker. Two loops
  double-advance the scroll and cause jitter.
- Destroy the instance and remove the ticker callback on teardown. In React,
  clean up in the same effect or `useGSAP` context that created it.
- Do not wrap the entire page in a transformed container without testing fixed
  elements, sticky headers and anchor targets.
- Test without Lenis first. Then test keyboard scroll, touch, reduced motion,
  route changes and anchor links with it enabled.
- Check frame cost on a throttled CPU. Smooth scrolling must not make the page
  less responsive.
- Record the decision in `motion-spec.md`: used or not, why, and the fallback.

## Decision record

```text
Lenis: used | not used
Reason:
Reference evidence:
Fallback when disabled or reduced motion:
Cleanup:
Verified: keyboard | touch | anchor | route change | reduced motion | performance
```
