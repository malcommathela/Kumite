# Hollow Pine Coffee — Content Experience validation run

A single-page coffee brand site built to validate the Kumite Content Experience
pipeline end to end: brief → reference → composition → motion → build and audit.

**This is a demonstration, not a real business.** Read the disclosure below
before reusing anything here.

## Disclosure

- **Hollow Pine Coffee is fictional.** The name, wordmark, roasts (Kiln,
  Understory, Night Shift), prices (£14, £16, £13), tasting notes, roast-day
  claim, sourcing story and brewing recipe were written for this demo. They are
  not claims about a real product, farm, roastery or person.
- **The photographs are generic.** Six Pexels images of coffee scenes stand in
  for a brand's photography. They are not photographs of these products, this
  farm or this roastery. Credits and licences are in
  `site/assets/CREDITS.md`.
- **Nothing is transacted.** “Add to bag” updates a local count only. There is no
  checkout, payment, account, stock or fulfilment. The newsletter form validates
  the field and shows a local confirmation; it sends nothing and stores nothing.
- **No analytics, cookies or tracking** are present.
- **The reference captures are study material.** `reference/` holds screenshots
  of fellowproducts.com and bluebottlecoffee.com from the Inspo archive, used for
  composition only. They are not redistributed as site assets.

## Run layout

```
projects/coffee-brand/
  input/brief.md
  reference/                     four Inspo captures (desktop + mobile)
  pipeline/01_brief/output/      brief.md, check.md
  pipeline/02_reference/output/  reference-evidence.json, decomposition.md, check.md
  pipeline/03_composition/output/ art-direction.md, implementation-spec.md, check.md
  pipeline/04_motion/output/     motion-spec.md, check.md
  pipeline/05_build/output/      implementation-manifest.json, anti-slop-review.json,
                                 fidelity-report.md, audit.md, check.md
  site/                          index.html, styles.css, main.js, favicon.svg, images/
  capture/                       seven rendered screenshots
```

Every stage's `check.md` starts with `pass` or `fail: <why>`. The build verdict
and the list of what was and was not verified are in
`pipeline/05_build/output/audit.md`.

## Run it

Any static file server works; there is no build step and no package install.

```sh
cd projects/coffee-brand
python -m http.server 8080 --directory site
```

Open `http://127.0.0.1:8080/`. The page loads GSAP 3.13 and Instrument Sans from
public CDNs, so it needs a network connection; everything else is local.

## Re-run the checks

From the repository root:

```sh
# Reference fidelity: structure, order, backgrounds, variants, crops, overlays
node _shared/scripts/fidelity-check.mjs \
  projects/coffee-brand/pipeline/02_reference/output/reference-evidence.json \
  projects/coffee-brand/pipeline/05_build/output/implementation-manifest.json

# Anti-slop review: all 20 indicators must be declared
node _shared/scripts/anti-slop-check.mjs \
  projects/coffee-brand/pipeline/05_build/output/anti-slop-review.json

# Markdown links
python -I _tools/links.py

# Repository test suite
node --test "tests/**/*.test.mjs" "_archive/**/*.test.mjs"
```

## Re-capture screenshots

With the local server running on port 8080:

```sh
node _shared/scripts/capture-screenshots.mjs \
  --url http://127.0.0.1:8080/ \
  --out projects/coffee-brand/capture/desktop-1440.png \
  --width 1440 --height 900 --full-page --scroll --reduced-motion
```

`--scroll` reveals below-the-fold content before capture; `--reduced-motion`
skips GSAP reveals so the full page renders. The shipped captures are:

| File | Viewport | Motion |
|---|---|---|
| `desktop-1440.png` | 1440×900, full page | reduced |
| `tablet-768.png` | 768×1024, full page | reduced |
| `mobile-390.png` | 390×844, full page | reduced |
| `desktop-full-motion.png` | 1440×900, full page | normal |
| `desktop-hero.png`, `tablet-hero.png`, `mobile-hero.png` | above the fold | normal |

## What this run verified

Measured on the built page at 390, 768 and 1440:

- 0 horizontal overflow; one `h1`; 1 header, 2 nav, 1 main, 1 footer landmark.
- Six images loaded with descriptive alt text; labelled email field; skip link
  is the first Tab stop.
- 22 keyboard stops, all visible, all with a 2px clay focus ring.
- WCAG AA contrast on every sampled text role (lowest 5.63:1).
- Controls at least 24×24px, except one in-sentence inline link (documented
  exception under WCAG 2.5.8).
- Reduced motion: no reveal styles, no scrub, all content visible.
- Fidelity verdict `pass` (9 sections, 11 components, 6 images, 0 findings).
- Anti-slop verdict `pass` (AS-04, AS-13, AS-18, AS-19 detected and justified).

Not verified: screen readers, non-Chromium browsers, real devices, SitePeel
measurement, Figma, Lighthouse scoring and production deployment. See
`pipeline/05_build/output/audit.md` for the full account.
