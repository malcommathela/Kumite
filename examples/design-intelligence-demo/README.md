# Design Intelligence demonstration — Atelier Kōhaku

End-to-end demonstration of the Kumite Design Intelligence pipeline on one
single-page site. **Atelier Kōhaku is a fictional studio.** The page is a
composition study, not a clone of the reference and not a production site.

## Reference

- Source: `https://kononenkogroup.com` (Kononenko Architectural Bureau)
- Access: screenshots, live DOM and computed-style inspection, and the site's
  public production bundle and inlined stylesheet. **No Figma file or Community
  resource was used.**
- Captures: `reference/hero-1440.webp` (1440×900), `reference/full-768.webp`
  (768×10151), `reference/mobile-full.png` (375×10939)
- Motion: read from live computed styles on 2026-11-05 at 1440×900 and 390×844,
  then confirmed against `/_nuxt/BJv2xQ-z.js`, `/_nuxt/BILhttA3.js` and the
  inline stylesheet. The reference captures remain static evidence and do not
  evidence timing.
- Region crops: `reference/crops/`

The reference captures are kept for internal design study and comparison. They
are not licensed for redistribution.

## Artefacts

| File | Purpose |
|------|---------|
| `design-memory.json` | Design Memory Map, schema 1.1.0 (7 sections, 3 components, 6 images, 8 motion components, 21 evidence entries) |
| `implementation-spec.md` | Completed implementation specification |
| `implementation-manifest.json` | What was actually built, in the fidelity comparator's shape |
| `anti-slop-review.json` | All 20 indicators declared; 4 detected, all justified |
| `discrepancy-report.md` | Automated result + manual region comparison + deviations |
| `index.html`, `styles.css`, `motion.js` | The built page and its dependency-free scroll-motion script |
| `assets/` | Six Unsplash photographs used under the Unsplash License |
| `capture/` | Final desktop, tablet and mobile screenshots, region crops and motion-state captures (including `motion2-*` entrance and reveal frames) |

## Run it

```sh
python -m http.server 8123 --bind 127.0.0.1
# open http://127.0.0.1:8123/
```

Serve over HTTP rather than opening the file directly so the relative image
paths and capture tooling behave consistently.

## Verify it

From the repository root:

```sh
node _archive/design-memory-map/scripts/validate-memory.mjs examples/design-intelligence-demo/design-memory.json
node _shared/scripts/anti-slop-check.mjs examples/design-intelligence-demo/anti-slop-review.json
node _shared/scripts/fidelity-check.mjs \
  examples/design-intelligence-demo/design-memory.json \
  examples/design-intelligence-demo/implementation-manifest.json
node --test "tests/**/*.test.mjs" "_archive/**/*.test.mjs"
```

Expected: memory map valid, anti-slop `PASS`, fidelity `PASS`. The full test
suite is the repository-wide regression check; run it whenever shared tooling
changes.

## Honest limitations

- Statistics and client-wall sections are omitted; reproducing them would require
  invented metrics and client identities.
- The display typeface is substituted; the licenced family is `unknown`.
- Individual Unsplash photo IDs and photographers were not retained. Recover them
  before any public use.
- Motion timing was read from live computed styles and the production bundle,
  not from a screen recording; playback smoothness and the reference's WebGL
  rendering were not compared frame by frame.
- Motion reproduces the reference's heading rises, hero settle, photograph fade,
  scroll bar, link underlines, project image scale, pressed feedback and mobile
  menu. Lenis inertia, WebGL shader effects, the preloader, page transitions,
  the custom cursor, the marquee and drag gallery are omitted and recorded in
  `design-memory.json`.
- Photograph reveals are opacity-only. The reference's per-line SplitText stagger
  is not reproduced; the demo lifts each heading as one clipped block.
- Touch targets are below 44px. Fix before production.
- The manual fidelity verdict is **conditional pass**; see
  `discrepancy-report.md`.
