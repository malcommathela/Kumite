# Lenis smooth scroll with ScrollTrigger

## Use case

Approved inertial or smoothed scrolling on a content-led experience where the
reference evidences it. It is not a default and not a substitute for fixing
layout or performance.

## Pipeline fit

- Content Experience: sometimes, for long-form or scroll-driven stories.
- Product Experience: rarely; dense tools usually need immediate native scroll.
- Frequency: rare.

## Evidence

Source-supported when the reference or approved motion direction shows smoothed
scrolling. A preference for "premium feel" is not evidence.

## Technology

Lenis (optional, MIT) plus `gsap-scrolltrigger`. See
[`../../motion/lenis.md`](../../motion/lenis.md) for the full decision record.

## API and implementation

```js
import Lenis from "lenis";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

const reduce = window.matchMedia("(prefers-reduced-motion: reduce)");
let lenis;
let tick;

if (!reduce.matches) {
  lenis = new Lenis({ autoRaf: false, respectReducedMotion: true });

  lenis.on("scroll", ScrollTrigger.update);

  tick = (time) => lenis.raf(time * 1000);
  gsap.ticker.add(tick);
  gsap.ticker.lagSmoothing(0);
}

// Teardown:
// if (tick) gsap.ticker.remove(tick);
// lenis?.destroy();
```

## Reduced motion

Do not instantiate Lenis at all when the user prefers reduced motion, or keep
`respectReducedMotion: true` and verify programmatic scrolls jump. The page must
scroll natively if the script fails.

## Performance

- `autoRaf: false` with the GSAP ticker; never run two RAF loops.
- Keep `lagSmoothing(0)` when the scroll is driven by the ticker.
- Test on a throttled CPU and a low-end phone.
- Watch for layout shift from transformed wrappers and fixed headers.
- Do not use Lenis to mask janky scroll-triggered animation.

## Cleanup

Remove the ticker callback and call `lenis.destroy()` on route change or unmount.
Restore any `html`/`body` classes Lenis adds.

## Pitfalls

- Double RAF loops causing jitter.
- Anchor links that no longer land correctly.
- `position: fixed` elements inside a transformed wrapper.
- Breaking find-in-page or keyboard scrolling.
- Loading Lenis before the page can scroll without it.

## References

- `_shared/motion/lenis.md`
- `https://github.com/darkroomengineering/lenis`
- `https://gsap.com/docs/v3/Plugins/ScrollTrigger/`
