# Design Intelligence demonstration — Atelier Kōhaku

A compact, runnable single-page demonstration of Kumite's reference-led design
workflow. **Atelier Kōhaku is a fictional studio.** This is a composition study,
not a clone of the source website or a production site.

## Reference

- Source: https://kononenkogroup.com/ (Kononenko Architectural Bureau).
- Studied through live browser rendering, DOM and computed-style inspection.
- Raw reference screenshots, crops, implementation captures and generated
  audit artifacts are not stored in this repository; they are project-specific
  working evidence rather than reusable Kumite source material.
- No Figma Community file or Figma source was used.

## Files

- `index.html`, `styles.css`, `motion.js` — the demonstration page.
- `assets/` — six Unsplash photographs used by the page.

## Run it

From the repository root:

```sh
python -m http.server 8123 --bind 127.0.0.1
```

Open `http://127.0.0.1:8123/examples/design-intelligence-demo/`.

## Notes

- Statistics and client-wall sections from the source are omitted; reproducing
  them would require inventing metrics and client identities.
- The display typeface is substituted; the licensed family is unknown.
- The source photography is not reused. The page uses separate Unsplash images.
- Motion is implemented with native CSS and a small dependency-free script.
- This is a demonstration artifact, not a production-ready studio website.
