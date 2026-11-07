# Build audit — Hollow Pine Coffee

Run: `projects/coffee-brand` · audited 2026-11-07 · Content Experience pipeline, stages 01–05.

Verdict: **pass**. No blocking or major finding is open.

This audit reports what was measured on the built page, not what the design
intended. Each claim names its method. Claims that could not be tested in this
environment are listed under **Not verified**.

## What was built

A single static page at `projects/coffee-brand/site/`: `index.html`, one
stylesheet, one ES module, six authentic photographs, an SVG favicon, GSAP 3.13
from the official CDN. No framework, no bundler, no backend. Nine sections in
the order recorded by the reference evidence: `header`, `hero`, `roasts`,
`craft`, `roast-day`, `origin`, `method`, `close`, `footer`.

## Verification matrix

| Area | Method | Result |
|---|---|---|
| Production readiness | Static site served over HTTP from `site/`; no build step to run | pass |
| Reference fidelity | `node _shared/scripts/fidelity-check.mjs …` | **pass** — 9 sections, 11 components, 6 images, 0 findings |
| Anti-slop review | `node _shared/scripts/anti-slop-check.mjs …` | **pass** — all 20 indicators declared; 4 detected and justified |
| Horizontal overflow | CDP `scrollWidth − clientWidth` at 390, 768, 1440 | 0 at every viewport |
| Images | CDP `naturalWidth` / `naturalHeight` after load | 6/6 loaded, all 1800px wide |
| Console | CDP `Log`, `Runtime.exceptionThrown`, console API during load and scroll | 0 errors, 0 exceptions; only Edge Tracking Prevention warnings for the CDN and the lazy-load info notice |
| Headings | CDP DOM query | one `h1`; 17 headings, levels descend without skips |
| Landmarks | CDP DOM query | 1 `header`, 2 `nav`, 1 `main`, 1 `footer` |
| Skip link | Keyboard walk | first Tab stop, visible, targets `#main` |
| Focus | 40 Tab presses, CDP `activeElement` + computed style | 22 stops, all visible, all with 2px solid `rgb(176,74,40)` |
| Form labelling | CDP DOM query | email input has `<label for="email">`, `type="email"`, `required` |
| Contrast | Computed colours with alpha blending, 1440 | all sampled text passes WCAG AA |
| Touch targets | CDP bounding boxes | all controls ≥ 24×24 except one inline link (documented exception) |
| Reduced motion | `Emulation.setEmulatedMedia` + CDP | no reveal styles, no scrub, content fully visible |
| Motion (normal) | CDP after scripted scroll | 33 reveal targets, 27 hidden at load, 0 hidden after scroll |
| Capture | `capture-screenshots.mjs` at 1440/768/390 | 7 PNGs, 6/6 images loaded, no console errors |

## Accessibility

Measured at 390×844, 768×1024 and 1440×900 with device scale 1.

- **Structure.** One `h1` (“Coffee, roasted for the cup in front of you”), a
  single `main`, one `header`, one `footer`, and two `nav` landmarks
  (primary and footer) distinguished by accessible names. Section headings use
  `aria-labelledby` on their regions.
- **Images.** All six photographs have descriptive `alt` text naming the
  subject, not the brand. Decorative scrims are `aria-hidden="true"`.
- **Keyboard.** 22 stops in DOM order: skip link → wordmark → primary nav →
  bag → hero actions → three “Add to bag” buttons → craft/origin/method links →
  footer nav → newsletter field → join → credits. No focus trap, no
  `tabindex` above 0. Every stop shows a 2px solid clay outline; focus is never
  animated.
- **Motion.** Under `prefers-reduced-motion: reduce` the GSAP branch does not
  run: reveal elements stay at opacity 1 with no transform, the band image keeps
  `transform: none`, and only non-animated state changes (header background,
  bag count) remain. The audit found **0 GSAP inline styles** in that run; the
  single `style=""` seen afterwards is the audit script restoring
  `scroll-behavior` on `<html>`.
- **Touch targets.** Every control measures at least 24px in both axes
  (WCAG 2.5.8, AA). The smallest non-inline control is the 27px-high text link
  “How we roast”; buttons are 40–52px. The inline “Credits” link in the legal
  sentence measures 40×15 and is covered by the in-sentence inline exception.
- **Contrast.** Sampled from the rendered page; ratios include the effective
  background after alpha blending.

| Role | Ratio | Requirement |
|---|---|---|
| Body and nav text on paper | 15.37 | 4.5 |
| Hero headline | 15.37 | 3.0 (large) |
| Hero lede | 6.83 | 4.5 |
| Section label | 5.63 | 4.5 |
| Fine print | 5.83 | 4.5 |
| Roast notes | 6.83 | 4.5 |
| Text over band photograph | 10.76 | 4.5 |
| Text over close photograph | 9.94 | 4.5 |
| Footer body and links | 10.76 | 4.5 |
| Legal row | 6.57 | 4.5 |
| Solid button label | 15.37 | 4.5 |

## Responsive

| Viewport | Document height | Overflow | Result |
|---|---|---|---|
| 390×844 | 6540px | 0px | pass |
| 768×1024 | 7486px | 0px | pass |
| 1440×900 | 5951px | 0px | pass |

Breakpoints were exercised at 1023, 900, 819 and 600px in the stylesheet. The
header collapses to wordmark + bag below 820px; the split sections stack below
900px; the hero image switches from a 70vh crop to a 4:3 crop below 820px. The
band and close sections keep a 70vh minimum on small screens. Full-page captures
exist at all three evidenced widths.

## Motion

Normal-motion run at 1440×900, measured after a scripted scroll to the band:

- GSAP and ScrollTrigger loaded from the CDN (`window.gsap` present).
- 33 reveal targets; 27 are hidden at load (below the fold) and **0 remain
  hidden** after scrolling the page.
- The header gains `is-raised` once past 24px of scroll.
- The band photograph scrubs from `scale(1.06)` to `scale(1.0329)` while the
  section is in view. This is the only scroll-linked animation.
- No pinned section, no scroll hijack, no looping decorative animation.
- Lenis is deliberately absent: the page has no long scroll-linked sequence, so
  native scrolling is the more accessible choice. The decision and the upstream
  sync recipe are recorded in `pipeline/04_motion/output/motion-spec.md` and
  `_shared/motion/README.md`.

## Reference fidelity

`fidelity-report.md` records the comparator output: **PASS**, 9 sections,
11 components, 6 images, 0 high / 0 medium / 0 low findings. The implementation
manifest is reconciled to the built CSS, including the roast-card background
`#E6DACA` and the hero crop `center 55%`.

Two limits are recorded rather than hidden:

1. The reference record is an adaptation of two public commerce sites captured
   as stills, not a pixel target. The comparator checks structure, order,
   backgrounds, component variants, focal points and overlays; it does not
   compare pixels.
2. Timing, easing and scroll behaviour are `unknown` in the reference. The motion
   layer is classified as a **functional requirement** from the brief, never as
   source-supported.

## Anti-slop review

`anti-slop-review.json` declares all 20 indicators and the checker returns
**PASS**. Four are detected and classified `source-supported`:

| Indicator | Device | Why it stays |
|---|---|---|
| AS-04 | Negative tracking on display type | Reference shows tight display setting; limited to display sizes, never body copy |
| AS-13 | Tracked-caps section labels | Reference records a label system; each label names its band, no eyebrow repetition |
| AS-18 | Uppercase metadata | Confined to labels, roast metadata and footer headings; body and nav stay sentence case |
| AS-19 | Gradient scrims over photography | Two independent linear scrims matching the reference; they protect measured contrast |

No arbitrary numerals, no invented statistics, no fake testimonials, no
decorative pills, no looping motion. The product cards use names and tasting
notes only.

## Assets and licensing

Six photographs from Pexels, downloaded at 1800px, with photographer credits in
`site/assets/CREDITS.md` and visible in the page footer. The reference captures
under `reference/` are study material from the public Inspo archive and are not
redistributed as site assets. Instrument Sans is served by Google Fonts under the
SIL Open Font License. GSAP is served by jsDelivr under its standard licence.

## Findings raised and resolved during this run

| Finding | Resolution |
|---|---|
| Roast cards carried arbitrary 01/02/03 numerals | Removed; cards lead with name, origin and notes (AS-12) |
| Dark-surface text used scattered opacity values | Consolidated into `--on-dark-muted`, `--on-dark-faint`, `--on-dark-line`, `--on-dark-border` |
| Wordmark and footer links below the 24px target | Padding added; all controls now meet 24×24 |
| Band scrim too weak over the brightest part of the photograph | Scrim strengthened; measured contrast 10.76 |
| Hero crop cut the pour-over stream | `object-position: center 55%` |
| Method portrait centred on the counter, not the machine | `object-position: center 40%` |
| Image `height` attributes did not match the downloaded files | Corrected to the true intrinsic sizes; layout unchanged because CSS sets aspect ratios |
| `favicon.ico` returned 404 in the console | Added an inline SVG favicon at `site/assets/favicon.svg` and linked it |
| Italic font axis was downloaded but never used | Removed `ital` from the Google Fonts request |
| `capture-screenshots.mjs` captured pre-reveal content | Added `--scroll` and `--reduced-motion` flags |

## Not verified

These are outside what this environment could test. They are not claimed as
passing:

- **Screen readers.** No NVDA, JAWS or VoiceOver session was run. Structure,
  names and order were checked in the DOM only.
- **Browsers other than Chromium.** All measurements come from headless
  Microsoft Edge (Chromium). Safari, Firefox and real iOS/Android rendering were
  not tested.
- **Real devices and input.** Touch targets were measured geometrically; no
  physical touch, trackpad or assistive-pointer session was run.
- **SitePeel measurement.** The MCP server is configured, but no live
  measurement call was made for this page. Its tools were not used to produce
  any value in this audit.
- **Figma.** No Figma file was read or written for this build.
- **Performance scoring.** No Lighthouse or field-data score was taken. The
  performance work is structural: six compressed images, lazy loading below the
  fold, transform/opacity-only animation, no global `will-change`.
- **Production deployment.** The page was served locally over HTTP; no host,
  CDN configuration or cache policy was tested.

## Evidence

- `capture/desktop-1440.png`, `capture/tablet-768.png`, `capture/mobile-390.png`
  — full page, reduced motion, scroll-revealed content visible.
- `capture/desktop-full-motion.png` — full page with the normal-motion path.
- `capture/*-hero.png` — above-the-fold crops.
- `output/fidelity-report.md` — comparator output.
- `output/anti-slop-review.json` — 20-indicator review.
- `output/implementation-manifest.json` — what was built, as compared.
