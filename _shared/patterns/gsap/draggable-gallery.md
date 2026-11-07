# Draggable gallery

## Use case

A real drag interaction: a horizontal gallery, a comparison slider, a card stack
or a canvas-like surface. It is justified only when dragging is part of the task
or the reference evidences it.

## Pipeline fit

- Content Experience: yes, for a portfolio or image story.
- Product Experience: sometimes, for a canvas, timeline or comparison tool.
- Frequency: occasional.

## Evidence

Source-supported when the reference shows direct manipulation. A gallery that
only needs horizontal scrolling should use native overflow scrolling, not drag.

## Technology

`gsap-plugins` with `Draggable`; `InertiaPlugin` only when momentum is part of
the approved feel. Native scroll with `scroll-snap` is the simpler alternative.

## API and implementation

```js
import { gsap } from "gsap";
import { Draggable } from "gsap/Draggable";
import { InertiaPlugin } from "gsap/InertiaPlugin";

gsap.registerPlugin(Draggable, InertiaPlugin);

const mm = gsap.matchMedia();

mm.add("(prefers-reduced-motion: no-preference) and (pointer: fine)", () => {
  const instances = Draggable.create("[data-drag-track]", {
    type: "x",
    bounds: "[data-drag-viewport]",
    inertia: true,
    edgeResistance: 0.8,
    cursor: "grab",
    activeCursor: "grabbing",
    onPress() {
      this.target.classList.add("is-dragging");
    },
    onRelease() {
      this.target.classList.remove("is-dragging");
    },
  });

  return () => instances.forEach((instance) => instance.kill());
});

mm.add("(prefers-reduced-motion: reduce), (pointer: coarse)", () => {
  // Use native horizontal scroll and scroll-snap instead.
});
```

## Reduced motion

No inertia, no drag-only navigation. Provide native scrolling, visible controls
and keyboard access. Touch devices should use the platform's scroll behaviour
unless drag is the product itself.

## Performance

- Drag a transform, not `left` or `scrollLeft`.
- Use `bounds` and `edgeResistance` instead of correcting position in a loop.
- Avoid large images without `loading="lazy"` and proper dimensions.
- Disable inertia when the device or user prefers reduced motion.
- Test with a trackpad, mouse wheel, touch and keyboard.

## Cleanup

Kill every Draggable instance and remove listeners on unmount. Restore native
scrolling when the draggable branch is reverted.

## Pitfalls

- Drag hijacking vertical scroll.
- No keyboard or button alternative.
- Inertia that overshoots content and hides the first or last item.
- Cursor changes without a visible grab affordance.
- Disabling text selection across the whole page.

## References

- `gsap-plugins` skill.
- `https://gsap.com/docs/v3/Plugins/Draggable/`
- `_shared/foundations/responsive-and-accessibility.md`
