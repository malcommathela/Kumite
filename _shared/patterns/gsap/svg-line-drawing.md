# SVG line drawing

## Use case

A logo mark, diagram, map route or illustration that draws itself as it enters.
It works when the line itself carries meaning or identity, not as decoration on
every icon.

## Pipeline fit

- Content Experience: yes, for a brand or explanatory diagram.
- Product Experience: sometimes, for an onboarding illustration or empty state.
- Frequency: rare.

## Evidence

Source-supported when the reference shows a drawn line. Functional when the
drawing communicates a route or process. Otherwise omit it.

## Technology

`gsap-plugins` with `DrawSVGPlugin`. For a simple static line, CSS
`stroke-dasharray` and `stroke-dashoffset` are enough and avoid a plugin.

## API and implementation

```js
import { gsap } from "gsap";
import { DrawSVGPlugin } from "gsap/DrawSVGPlugin";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(DrawSVGPlugin, ScrollTrigger);

const mm = gsap.matchMedia();

mm.add("(prefers-reduced-motion: no-preference)", () => {
  gsap.from("[data-draw]", {
    drawSVG: "0% 0%",
    duration: 1.2,
    ease: "power2.inOut",
    scrollTrigger: {
      trigger: "[data-draw]",
      start: "top 80%",
      once: true,
    },
  });
});

mm.add("(prefers-reduced-motion: reduce)", () => {
  gsap.set("[data-draw]", { clearProps: "all" });
});
```

## Reduced motion

The SVG is fully drawn at first paint. Do not leave it at zero length in CSS.

## Performance

- Draw a small number of paths; hundreds of paths create many style writes.
- Use `will-change: stroke-dashoffset` only while active, if needed.
- Keep the SVG viewBox stable to avoid layout shift.
- Test with the SVG at mobile size.

## Cleanup

Revert the matchMedia context; DrawSVG restores the original stroke values.
Kill ScrollTriggers created outside it.

## Pitfalls

- Drawing every icon on hover (MAS-02, MAS-08).
- A path with no stroke or a fill-only shape, which DrawSVG cannot show.
- Zero-length paths that produce a dot.
- Forgetting `vector-effect` on a scaled SVG and getting a distorted stroke.

## References

- `gsap-plugins` and `gsap-scrolltrigger` skills.
- `https://gsap.com/docs/v3/Plugins/DrawSVGPlugin/`
