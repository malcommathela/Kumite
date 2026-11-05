# Visual fidelity discrepancy report — Atelier Kōhaku

| Field | Value |
|-------|-------|
| Subject | `examples/design-intelligence-demo/index.html` |
| Reference | `https://kononenkogroup.com` (Kononenko Architectural Bureau) |
| Reference evidence | `design-memory.json` + `reference/hero-1440.webp`, `reference/full-768.webp`, `reference/mobile-full.png` |
| Implementation evidence | `capture/desktop-hero.png`, `capture/desktop-full.png`, `capture/tablet-full.png`, `capture/mobile-full.png`, `capture/impl-*.png` |
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
node scripts/fidelity-check.mjs \
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
| 9 | Interaction states | Hover and focus are inferred, not captured | minor | Static reference captures expose no states | Accepted; only underline and image zoom are used |
| 10 | Licence records | Individual Unsplash photo IDs and photographers were not retained | major (operational) | Image EXIF contains no attribution; `assets/*.jpg` are local copies | Open. Recover download records and attribute before any public use |

---

## 5. Functional correctness (reported separately)

| Check | Result |
|-------|--------|
| Navigation | Plain anchor links to `#work`, `#approach`, `#studio`, `#contact`, `#top`; DOM order is logical |
| Skip link | First focusable element, targets `#main` |
| Mobile menu | Native `<details>` disclosure; no script required |
| Reduced motion | `prefers-reduced-motion` disables smooth scrolling |
| Keyboard focus | `:focus-visible` outline on all links |
| Console | No JavaScript is shipped, so there are no script errors; this was not a substitute for a full accessibility audit |
| Images | All six images report `complete` and non-zero natural width at capture time (`media: { images: 6, failed: 0 }`) |

Functional success does not close any visual deviation above, and the visual
match does not excuse the open accessibility and licence items.

---

## 6. Verdict

**Automated fidelity: PASS.**
**Manual region fidelity: CONDITIONAL PASS.**

Structure, section order, component variants and image composition match the
reference at 1440, 768 and 390. The conditional status comes from one
scope-approved omission (statistics and client wall), a substituted typeface and
photography, and two open operational items (touch-target size and Unsplash
attribution). None of these is hidden in the manifest or presented as a
pixel-level match.
