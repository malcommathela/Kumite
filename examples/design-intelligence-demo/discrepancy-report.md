# Visual fidelity discrepancy report — Atelier Kōhaku

| Field | Value |
|-------|-------|
| Subject | `examples/design-intelligence-demo/index.html` |
| Reference | `https://kononenkogroup.com` (Kononenko Architectural Bureau) |
| Reference evidence | `design-memory.json` + `reference/hero-1440.webp`, `reference/full-768.webp`, `reference/mobile-full.png`; live computed-style inspection on 2026-11-05 |
| Implementation evidence | `capture/desktop-hero.png`, `capture/desktop-full.png`, `capture/tablet-full.png`, `capture/mobile-full.png`, `capture/impl-*.png`, `capture/motion-*.png` |
| Viewports compared | 1440×900, 768 (full page), 390×844 (DPR 2) |
| Capture date | 2026-11-05 |
| Reviewer | OpenCode agent (Kumite) |

**Automated manifest comparison: PASS.** 7 sections, 3 components and 6 images
agree with the Design Memory Map; 0 high, 0 medium, 0 low findings. This only
proves that the recorded implementation manifest matches the recorded map. It
does **not** prove pixel fidelity — the manual region review below is the
fidelity judgement.

---

## 1. Automated result

```text
# Visual fidelity discrepancy report — implementation-manifest.json
Verdict: PASS
Compared 7 sections, 3 components and 6 images.
0 high, 0 medium, 0 low.
```

Command:

```sh
node _shared/scripts/fidelity-check.mjs \
  examples/design-intelligence-demo/design-memory.json \
  examples/design-intelligence-demo/implementation-manifest.json
```

---

## 2. Manual region comparison (desktop, 1440×900)

| Region | Reference observation | Implementation observation | Result |
|--------|----------------------|----------------------------|--------|
| Header | 11px sans wordmark at a 24px left inset; 11px nav at the right; no header surface | Same 24px inset, 11px wordmark and nav, same order (Work / Approach / Studio / Contact) | Match, plus a top-only scrim (deviation 4) |
| Hero | Full-bleed photograph; two-line all-sans wordmark at the lower left; ~50px type, 49px baseline distance; 24px inset | Full-bleed photograph; two-line all-sans wordmark at the lower left; 52px type, 0.98 leading, 24px inset | Match in composition; photography substituted (deviation 7) |
| Introduction | Centred high-contrast serif statement; full-bleed 2:1 photograph; metadata left, body copy right | Same centred serif statement, full-bleed 2:1 photograph, 4/12 metadata + 8/12 body | Match in structure; typeface substituted (deviation 2) |
| Approach | Large statement left, process copy and numbered steps right, wide interior photograph beneath | Same two-column split, three numbered steps, 16:9 interior photograph beneath | Match in structure; wider vertical rhythm (deviation 3) |
| Selected Work | Asymmetric grid: large landscape left (~58%), offset portrait right (~33%), centred portrait below (~42%); caption under each | 7/12 left, 4/12 offset right with top margin, 5/12 centred below; caption under each | Match in proportion and order; different photographs |
| Studio Note | Dark band, centred serif quotation, small attribution | Same dark band, centred serif quotation, 11px attribution | Match |
| Footer | Contact CTA left, nav right, oversized wordmark, single-row legal bar | Same order and legal bar; wordmark fitted to the container rather than bleeding off-canvas | Match with one deviation (6) |
| Statistics / client wall | Present in the reference between the quote and footer | **Absent by scope** | Deliberate omission (deviation 1) |

## 3. Manual region comparison (mobile, 390×844)

| Region | Reference observation | Implementation observation | Result |
|--------|----------------------|----------------------------|--------|
| Header | Wordmark left, compact menu right | Wordmark left, `Menu` disclosure right | Match in structure |
| Hero | Full-bleed photograph, wordmark and sub-line at the lower left | Same, two-line wordmark, sub-line at the lower left | Match in composition |
| Content | Single column, images edge-to-edge | Single column; intro image full-bleed; approach image full-bleed | Match |
| Projects | Stacked cards with captions | Stacked cards, landscape 4:3 and portrait 4:5 | Match in structure |
| Footer | Oversized wordmark and stacked legal text | Wordmark fits the width; legal text wraps to two lines | Minor deviation (6) |

No horizontal overflow was observed at 390, 768 or 1440.

---

## 4. Deviations

| # | Region | Difference | Severity | Evidence | Disposition |
|---|--------|------------|----------|----------|-------------|
| 1 | Statistics / client wall | Two reference regions are not implemented | major (scope-approved) | Reference `full-768.webp` contains metrics and a client wall; `design-memory.json` records them under `source.unavailable` and `unresolved` | Accepted. Reproducing them would require inventing metrics and client identities, which the project forbids |
| 2 | Typography | Unidentified licensed Didone replaced by a Bodoni/Didot/Times stack; hero uses Helvetica/Arial | major | `E-INFER-TYPE`; `design-memory.json` families are `estimated` | Accepted; typeface identity is `unknown` |
| 3 | Vertical rhythm | Section padding resolves to ~158px at 1440; reference measures ~120px | minor | `E-MEASURE-LAYOUT` vs `--section-space: clamp(96px, 11vw, 176px)` | Accepted for the shorter demo page; recorded in the implementation spec |
| 4 | Header | Top-only gradient scrim `rgba(0,0,0,.42)` → transparent | minor (functional) | Reference has no header surface; white nav over a bright sky fails contrast without it | Accepted; scrim limited to the header band and fades to transparent |
| 5 | Colour | Muted text `#6B6B66` instead of the reference `#8A8A82` | minor (accessibility) | `#8A8A82` on `#EFEDE8` measures 2.97:1; `#6B6B66` measures 4.58:1 | Accepted; reference token recorded, AA restored |
| 6 | Footer | Oversized wordmark is fitted instead of bleeding | minor | Reference footer wordmark runs past the right edge; the demo constrains it to the container | Accepted; prevents clipped glyphs |
| 7 | Hero / all images | Reference photography replaced with Unsplash photographs | major (content) | Reference photography is not licensed for reuse; `design-memory.json` `unresolved` | Accepted; photos chosen for composition, not subject alone |
| 8 | Navigation / labels | Target height is ~16px, below the 44px recommendation | major (accessibility) | 11px labels with 3px underline padding; measured from the rendered header | Open. Fix before production by adding vertical padding without changing the visual label size |
| 9 | Motion extent | Heading rises, hero settle, photograph fades, the scroll bar, link underlines and the project image scale are reproduced. Lenis inertia, WebGL shader effects, the preloader, page transitions, the custom cursor, the fixed mix-blend header, the caption overlay, the marquee, the drag gallery and scroll-pinned sections are omitted | minor (scope-approved) | `E-MOTION-REF-SOURCE`; `motion.intentionallyOmitted` in `design-memory.json` | Accepted. The omitted effects need a WebGL pipeline or router, intercept native scrolling, or have no equivalent state in the adapted composition |
| 10 | Licence records | Individual Unsplash photo IDs and photographers were not retained | major (operational) | Image EXIF contains no attribution; `assets/*.jpg` are local copies | Open. Recover download records and attribute before any public use |
| 11 | Reduced motion | The reference leaves nav and header transitions active under reduced motion; the demo removes the hero and heading animations, resolves every reveal to its final state, disables the image scale and keeps a static caption underline | improvement (accessibility) | `E-MOTION-MEASURE-SCROLL`; CDP emulation at 1440×900 | Accepted as a deliberate accessibility improvement over the reference |

---

## 5. Motion verification

The motion audit used the installed `design-motion-principles` skill (Create
mode, Jakub Krehel primary with Emil Kowalski restraint) and the Kumite motion
anti-slop policy. Reference timing was read from live computed styles and then
confirmed against the site's shipped bundle and inlined stylesheet, not from the
static captures. The bundle ships GSAP, ScrollTrigger, SplitText, Lenis and a
Three.js/WebGL pipeline; only the behaviours that translate faithfully to CSS and
one small script were carried over.

| Check | Result | Evidence |
|-------|--------|----------|
| Heading rise matches the reference mechanic | PASS — `translateY(105%→0)` inside a clipped mask, 1109ms, no delay; reference uses `yPercent: 101`, `duration: Si()` | `motion2-work-reveal.png`, `motion2-footer-reveal.png`, `E-MOTION-REF-SOURCE` |
| Hero title and image entrance | PASS — title rises 31.8px→0; image settles `scale 1.0818→1.00256` over 2.4s; both end at identity | `motion2-hero-load.png`, `motion2-hero-settled.png`, `E-MOTION-MEASURE-SCROLL` |
| Photograph fade-in | PASS — `opacity 0→1` over 300ms `cubic-bezier(0.17,0.84,0.44,1)`; reference declares the same property and timing on `.qct img` | `motion2-work-reveal.png`, `E-MOTION-REF-SOURCE` |
| Scroll progress bar | PASS — fixed 4px bar, `scaleX(0.630088)` mid-page and `scaleX(1)` at the bottom, `aria-hidden`, passive listener | `motion2-work-reveal.png`, `motion2-footer-reveal.png`, `E-MOTION-IMPL-JS` |
| Reveals fire once | PASS — each target reaches `is-inview` with `opacity: 1` and `transform: none`, then is unobserved; scrolling back does not replay | `E-MOTION-MEASURE-SCROLL`, `motion.js` |
| Link underline matches the reference curve and origin behaviour | PASS — `matrix(1,0,0,1,0,0)`, left origin on hover; `transform 1.109s cubic-bezier(0.17,0.84,0.44,1)` | `motion-desktop-nav-hover.png`, `E-MOTION-MEASURE` |
| Project image matches the reference scale | PASS — `matrix(1.035,0,0,1.035,0,0)` with the same transition, clipped by `overflow: hidden` | `motion-desktop-project-hover.png`, `E-MOTION-MEASURE` |
| Pressed feedback | PASS — card opacity `0.86`, links `0.72`, 80ms linear | `motion-desktop-project-pressed.png`, `E-MOTION-MEASURE` |
| Mobile menu enter | PASS — 160ms opacity/translateY; panel settles at 180×158 | `motion-mobile-menu-open.png` |
| Keyboard focus parity | PASS — Tab reaches nav links and project cards; `:focus-visible` true; 2px accent outline visible | `motion-desktop-nav-focus.png`, `motion-desktop-project-focus.png`, `motion-mobile-menu-focus.png` |
| Reduced motion | PASS — hero animations removed (`animation-name: none`), reveals at `opacity: 1`/`transform: none`, durations `1e-05s`, caption underline 3px, `scroll-behavior: auto`, menu opens without animation | `motion2-reduced-work.png`, `motion-reduced-desktop-project-hover.png`, `E-MOTION-MEASURE-SCROLL` |
| Horizontal overflow / layout shift | PASS — document `scrollWidth` 390 at a 390 viewport; motion is transform/opacity only; clipped masks reserve their own space | `E-MOTION-MEASURE`, `E-MOTION-MEASURE-SCROLL` |
| Continuous or looping animation | PASS — none; the progress bar only changes when scroll position changes and no rAF loop runs while idle | `E-MOTION-IMPL-JS` |
| Frame-level recording | NOT PRODUCED — no video or GIF tool was available; timings are measured from the shipped bundle and CDP computed values | `design-memory.json` `motion.performance.notes` |
| Motion anti-slop MAS-01…MAS-09 | PASS — no pulsing, universal hover scaling, stagger, bouncy springs, uniform section fades, blur entrances or decorative loops. MAS-05/MAS-06 are source-supported exceptions: the reference itself reveals photography and its hero on entry, and the demo reproduces that mechanic rather than inventing it. | `implementation-spec.md` section 8, `anti-slop-review.json` |

The reference itself is not fully reduced-motion compliant: nav and header
transitions remained active under emulation. The demo deliberately improves on
it. This is recorded as an improvement, not as a fidelity failure.

Two defects were found and fixed during verification. A specificity collision
(`.project img.reveal-img` outranking `.reveal-img.is-inview`) left project
photographs invisible after their fade-in; the rules were split so only the
transition is overridden. An earlier draft also used an invented `scale(1.035)`
entrance for photographs; it was replaced with the reference's actual 300ms
opacity transition after the bundle inspection.

---

## 6. Functional correctness (reported separately)

| Check | Result |
|-------|--------|
| Navigation | Plain anchor links to `#work`, `#approach`, `#studio`, `#contact`, `#top`; DOM order is logical |
| Skip link | First focusable element, targets `#main` |
| Mobile menu | Native `<details>` disclosure; no script required |
| Reduced motion | `prefers-reduced-motion` removes the hero and heading animations, resolves every reveal to its final state, disables the image scale, keeps a static caption underline and forces `scroll-behavior: auto` |
| Keyboard focus | `:focus-visible` outline on all links and project cards; verified by keyboard Tab and CDP |
| Motion states | Entrance, scroll reveals, hover, focus, pressed and open-menu states verified at 1440×900 and 390×844; see section 5 |
| Console | No errors from `motion.js` in headless CDP at desktop, mobile and reduced-motion settings; this is not a substitute for a full accessibility audit |
| Images | All six images report `complete` and non-zero natural width at capture time (`media: { images: 6, failed: 0 }`) |

Functional success does not close any visual deviation above, and the visual
match does not excuse the open accessibility and licence items.

---

## 7. Verdict

**Automated fidelity: PASS.**
**Manual region fidelity: CONDITIONAL PASS.**
**Motion audit: PASS.**

Structure, section order, component variants, image composition and motion match
the reference at 1440, 768 and 390. The conditional status comes from one
scope-approved omission (statistics and client wall), a substituted typeface and
photography, and two open operational items (touch-target size and Unsplash
attribution). Reference motion that does not fit the adapted composition is
explicitly omitted rather than imitated. None of these is hidden in the
manifest or presented as a pixel-level match.
