# Text split reveal

## Use case

A display headline or a short editorial statement that reveals by line or word
behind a mask. It suits one hero moment, not body copy, navigation or every
heading on the page.

## Pipeline fit

- Content Experience: yes, for one display moment.
- Product Experience: rarely; headings should be stable and immediate.
- Frequency: rare.

## Evidence

Source-supported when the reference recording shows a split or masked reveal.
Text that is merely important does not need motion.

## Technology

`gsap-plugins` for `SplitText`, plus `gsap-core` for the tween. The plugin is now
free under the standard GSAP licence. If the project cannot use the plugin,
mask lines with CSS and animate the wrapper instead.

## API and implementation

```js
import { gsap } from "gsap";
import { SplitText } from "gsap/SplitText";

gsap.registerPlugin(SplitText);

const mm = gsap.matchMedia();

mm.add("(prefers-reduced-motion: no-preference)", () => {
  const split = SplitText.create("[data-split-heading]", {
    type: "lines",
    linesClass: "split-line",
    mask: "lines",
  });

  gsap.from(split.lines, {
    yPercent: 110,
    duration: 0.8,
    ease: "power3.out",
    stagger: 0.08,
    clearProps: "transform",
  });

  return () => split.revert();
});

mm.add("(prefers-reduced-motion: reduce)", () => {
  gsap.set("[data-split-heading]", { clearProps: "all" });
});
```

## Reduced motion

No split, no mask, no transform. The heading is readable at first paint and
remains selectable. Never leave the text duplicated or hidden after teardown.

## Performance

- Split once, after fonts load, so line breaks are measured correctly.
- Revert the split after the animation when the page does not need it again.
- Do not split long paragraphs or every heading.
- `mask: "lines"` creates wrappers; verify overflow and focus order.

## Cleanup

Return `split.revert()` from the matchMedia callback or call it on unmount. In
React, `useGSAP` with a scope handles the context; still revert SplitText.

## Pitfalls

- Splitting text that contains links or interactive children.
- A flash of unstyled or hidden text before the split runs.
- Re-splitting on every resize without reverting.
- Using split text as a substitute for a strong headline.

## References

- `gsap-plugins` and `gsap-core` skills.
- `https://gsap.com/docs/v3/Plugins/SplitText/`
- `_shared/references/anti-slop-rules.json` (MAS-06, MAS-07).
