# Staggered entrance

## Use case

One deliberate group entrance: a hero's supporting elements, a short list of
cards, or a single navigation group. It is not a default for every grid.

## Pipeline fit

- Content Experience: yes, once per view.
- Product Experience: yes, only for a first-run or celebratory moment, not for
  routine data loading.
- Frequency: rare.

## Evidence

Source-supported when the reference shows a stagger. Design-system-supported
when the project already has a stagger token. Otherwise it is likely MAS-03.

## Technology

`gsap-core`. Use a timeline when the stagger needs a preceding step.

## API and implementation

```js
import { gsap } from "gsap";

const mm = gsap.matchMedia();

mm.add("(prefers-reduced-motion: no-preference)", () => {
  const items = gsap.utils.toArray("[data-stagger] > *");

  gsap.from(items, {
    y: 18,
    opacity: 0,
    duration: 0.5,
    ease: "power2.out",
    stagger: { each: 0.06, from: "start" },
    clearProps: "transform,opacity",
  });
});

mm.add("(prefers-reduced-motion: reduce)", () => {
  gsap.set("[data-stagger] > *", { clearProps: "all" });
});
```

## Reduced motion

No stagger, no hidden start state. The group is visible immediately and in the
same order.

## Performance

- Stagger transforms and opacity only.
- Cap the number of animated items; animating 100 rows is not an entrance.
- Use `gsap.utils.toArray` once, not inside a loop.
- Avoid `from` on elements that are already visible if a refresh can replay it.

## Cleanup

Revert the matchMedia context. A timeline created outside the context needs
`timeline.kill()`.

## Pitfalls

- Stagger on every section, card grid and list (MAS-03).
- Long index-based delays that make the last item feel broken.
- Animating layout properties to create the stagger.
- Replaying the entrance on every scroll direction change.

## References

- `gsap-core` skill, stagger and easing.
- `https://gsap.com/resources/getting-started/Staggers`
- `_shared/references/anti-slop-rules.json` (MAS-03).
