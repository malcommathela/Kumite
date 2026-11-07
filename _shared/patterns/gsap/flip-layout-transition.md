# Flip layout transition

## Use case

An element changes position or size because the layout changes: a card expands
into a detail view, a list reorders, a filter changes the grid, or a thumbnail
becomes a hero. Flip makes the change look continuous without animating layout
properties frame by frame.

## Pipeline fit

- Product Experience: yes, for expand, reorder and view transitions.
- Content Experience: sometimes, for a gallery or filter.
- Frequency: occasional.

## Evidence

Functional when a state change would otherwise jump and the user loses context.
Source-supported when the reference shows a shared-element transition.

## Technology

`gsap-plugins` with `Flip`. Do not use it if a simple CSS transition on transform
and opacity is enough.

## API and implementation

```js
import { gsap } from "gsap";
import { Flip } from "gsap/Flip";

gsap.registerPlugin(Flip);

const grid = document.querySelector("[data-grid]");
const reduce = window.matchMedia("(prefers-reduced-motion: reduce)");

function reorder() {
  const state = Flip.getState("[data-card]");
  grid.classList.toggle("is-expanded");

  if (reduce.matches) return;

  Flip.from(state, {
    duration: 0.45,
    ease: "power2.inOut",
    absolute: true,
    nested: true,
    onEnter: (elements) =>
      gsap.fromTo(elements, { opacity: 0 }, { opacity: 1, duration: 0.2 }),
    onLeave: (elements) =>
      gsap.to(elements, { opacity: 0, duration: 0.2 }),
  });
}
```

## Reduced motion

Skip `Flip.from` entirely; the class toggle still produces the final layout.
Never leave the element at an intermediate absolute position.

## Performance

- Capture state before any DOM change.
- `absolute: true` can collapse layout; test containers and following content.
- `scale: true` is often cheaper than width/height, but can distort borders and
  text.
- Batch multiple independent flips with `Flip.batch()`.
- Test during scroll and resize; in-progress flips are not responsive.

## Cleanup

Kill active flips on unmount with `Flip.killFlipsOf(targets, true)`.
In a framework, keep the DOM change and the flip in the same committed update.

## Pitfalls

- Capturing state after the class change.
- Animating the same element with another tween at the same time.
- `absolute: true` on a container whose height collapses.
- Using Flip for a simple hover or a modal that should fade.

## References

- `gsap-plugins` skill.
- `https://gsap.com/docs/v3/Plugins/Flip/`
- `_shared/foundations/implementation-checkpoints.md`
