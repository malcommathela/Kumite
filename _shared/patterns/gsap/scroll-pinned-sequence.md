# Scroll-pinned sequence

## Use case

A held narrative frame: a process, a product reveal or a short story where the
content genuinely benefits from staying in place while the user scrolls. It is
the most expensive pattern in this library and the easiest to misuse.

Do not pin a page just to make it feel designed. Do not pin inside a pinned
container; nested pinning is not supported.

## Pipeline fit

- Content Experience: yes, for one narrative section.
- Product Experience: rarely; a pinned product demo can work, a pinned settings
  panel cannot.
- Frequency: rare.

## Evidence

Source-supported when the reference shows a held frame. A static screenshot
cannot prove pinning. If the approved motion direction does not name it, omit it.

## Technology

`gsap-scrolltrigger` with a timeline. No additional plugin.

## API and implementation

```js
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

const mm = gsap.matchMedia();

mm.add("(prefers-reduced-motion: no-preference) and (min-width: 900px)", () => {
  const timeline = gsap.timeline({
    scrollTrigger: {
      trigger: ".process",
      start: "top top",
      end: "+=120%",
      pin: true,
      scrub: 0.6,
      anticipatePin: 1,
      invalidateOnRefresh: true,
    },
  });

  timeline
    .from(".process-step-1", { opacity: 0, y: 24 })
    .from(".process-step-2", { opacity: 0, y: 24 })
    .from(".process-step-3", { opacity: 0, y: 24 });
});

mm.add("(prefers-reduced-motion: reduce), (max-width: 899px)", () => {
  gsap.set(".process-step-1, .process-step-2, .process-step-3", {
    clearProps: "all",
  });
});
```

## Reduced motion

No pin, no scrub, no hidden steps. The section becomes a normal vertical
sequence. On mobile, prefer the non-pinned branch unless the approved direction
evidences a mobile pin.

## Performance

- Pin only one section; each pin changes document height and refresh cost.
- Animate children inside the pinned element, never the pinned element itself.
- Use `anticipatePin` to avoid a flash when scrolling fast.
- Test at every breakpoint and after images load.
- Call `ScrollTrigger.refresh()` after layout changes.

## Cleanup

`mm.revert()` reverts the pin and the timeline. If a trigger is created outside
the context, call `kill(true)` to restore the DOM.

## Pitfalls

- Scroll-jacking that ignores native scroll or keyboard.
- Pinned content taller than the viewport.
- Nested pinning.
- A pin that traps focus or hides content for keyboard users.
- No reduced-motion branch.

## References

- `gsap-scrolltrigger` skill, pinning and refresh.
- `https://gsap.com/docs/v3/Plugins/ScrollTrigger/`
- `https://gsap.com/resources/st-mistakes`
