# Implementation Specification — Atelier Kōhaku

Completed implementation specification for the Kumite Design Intelligence
milestone demonstration. The source is a live production page observed through
screenshots and DOM inspection; the implementation is a **fictional studio
page** that reproduces the reference's composition, not its content, brand or
photography.

Artefacts:

- Design Memory Map: [`design-memory.json`](design-memory.json)
- Implementation manifest: [`implementation-manifest.json`](implementation-manifest.json)
- Anti-slop review: [`anti-slop-review.json`](anti-slop-review.json)
- Discrepancy report: [`discrepancy-report.md`](discrepancy-report.md)
- Built page: [`index.html`](index.html) · [`styles.css`](styles.css)

---

## 1. Source and evidence

| Field | Value |
|-------|-------|
| Source type | Web page, observed as screenshots plus rendered DOM |
| Source identity | `https://kononenkogroup.com` ("Kononenko Architectural Bureau") |
| Community URL / ID | Not applicable — no Figma Community file was used |
| Resolved design URL / file key | **None.** No Figma file, node id or design file was available for this reference |
| Author | Kononenko Architectural Bureau |
| Licence and attribution | No licence statement was visible. Reference used for internal design study only; no reference photo, code or brand asset is reused |
| Access method | Browser capture (Inspo archive + live DOM inspection) |
| Access limitations | Rendered output only. No tokens, CSS variables, typeface files, component definitions or interaction states |
| Capture viewports | 1440×900 (hero), 768×10151 (full page), 375×10939 (full page) |
| Capture date | 2026-09-10 |
| Evidence index | `E-SHOT-HERO`, `E-SHOT-FULL-768`, `E-SHOT-MOBILE`, `E-CROP-HERO-TEXT`, `E-CSS-DOM`, `E-MEASURE-HERO`, `E-MEASURE-LAYOUT`, `E-MEASURE-CONTRAST`, `E-INFER-TYPE` (all resolved in `design-memory.json`) |

**Figma access note.** A Figma MCP connection was verified separately
(`whoami`, and `get_metadata` on file `s5ovdLYnQHqRd4et0M4eNW`). No suitable
landing-page file was found in that account, so **no Figma Community resource
was used** and no Figma identifier, node or token is claimed for this reference.
Everything below derives from the captures listed above.

**Unavailable information.** The display typeface cannot be identified from
pixels; the demo substitutes a local stack. Hover, focus, loading and error
states were never captured. Section rhythm and some crop positions are
estimated. Reference photography is not licensed for reuse, so every image is
replaced.

---

## 2. Confidence legend

| Marker | Meaning | Use for |
|--------|---------|---------|
| `exact` | Structured node data, variable or source token | Not available for this reference |
| `measured` | Defined crop or computed style at a stated viewport | Rendered colour, size, order |
| `estimated` | Inferred from visual proportion | Crop positions, some gaps |
| `unknown` | Not evidenced | Typeface identity, licences, states |

No value was promoted a level without new evidence.

---

## 3. Page structure and section order

| # | Section | Memory id | Purpose | Background | Container | Height | Confidence | Evidence |
|---|---------|-----------|---------|------------|-----------|--------|------------|----------|
| 1 | Header | `sec-header` | Wordmark and primary navigation over the hero | Transparent (sits on hero) | 24px insets | ~72px | estimated | `E-SHOT-HERO` |
| 2 | Hero | `sec-hero` | Full-bleed photograph and studio wordmark | `#111111` fallback under image | Full bleed | 100svh | measured | `E-SHOT-HERO` |
| 3 | Introduction | `sec-intro` | Studio statement, photograph, metadata and body copy | `#EFEDE8` | 24px insets | auto | measured | `E-SHOT-FULL-768` |
| 4 | Approach | `sec-approach` | Method statement, ordered steps and interior photograph | `#EFEDE8` | 24px insets | auto | measured | `E-SHOT-FULL-768` |
| 5 | Selected Work | `sec-projects` | Three-project editorial image grid with captions | `#EFEDE8` | 24px insets | auto | measured | `E-SHOT-FULL-768` |
| 6 | Studio Note | `sec-quote` | Centred quotation on a dark band | `#111111` | 24px insets | auto | measured | `E-SHOT-FULL-768` |
| 7 | Footer | `sec-footer` | Contact call to action, navigation, oversized wordmark, legal bar | `#111111` | 24px insets | auto | measured | `E-SHOT-FULL-768` |

**Page-level layout.** Maximum content width 1440px; outer gutters
`clamp(16px, 1.7vw, 24px)` (24px at 1440 and 768, 16px at 375). Sections use a
12-column editorial grid with a 24px gutter. Vertical rhythm is
`clamp(96px, 11vw, 176px)`; at 1440 that resolves to ~158px, wider than the
reference's measured 120px — a deliberate adaptation for a shorter page.

**Fold.** At 1440×900 the hero fills the viewport: wordmark top-left, primary
navigation top-right, and the studio statement on the lower-left lawn. At
375×844 the hero keeps the same order with a compact menu.

---

## 4. Design tokens

### Colour

| Token | Value | Role | Confidence | Evidence |
|-------|-------|------|------------|----------|
| `--paper` | `#EFEDE8` | Page and section surface | measured | `E-SHOT-FULL-768` |
| `--ink` | `#111111` | Body text and dark bands | measured | `E-SHOT-FULL-768` |
| `--muted` | `#6B6B66` (reference `#8A8A82`) | Labels and captions | reference measured; implementation darkened deliberately | `E-SHOT-FULL-768` |
| `--line` | `#D6D2C8` | Hairline border | measured | `E-SHOT-FULL-768` |
| `--dark` | `#111111` | Quote and footer surfaces | measured | `E-SHOT-FULL-768` |
| `--white` | `#FFFFFF` | Hero text | measured | `E-SHOT-HERO` |
| `--accent` | `#9E8B66` | Focus ring only | design decision | — |
| `--on-dark-muted` | `rgba(239,237,232,.72)` | Secondary text on dark | estimated | `E-SHOT-FULL-768` |
| `--on-dark-faint` | `rgba(239,237,232,.55)` | Legal text on dark | estimated | `E-SHOT-FULL-768` |
| `--on-dark-line` | `rgba(239,237,232,.22)` | Hairline on dark | estimated | `E-SHOT-FULL-768` |

### Typography

| Role | Family | Size | Weight | Line height | Tracking | Confidence | Evidence |
|------|--------|------|--------|-------------|----------|------------|----------|
| Hero display | `Helvetica Neue, Helvetica, Arial, sans-serif` | `clamp(34px, 3.5vw, 52px)` (52px at 1440) | 400 | 0.98 | −0.035em | measured size, estimated family | `E-MEASURE-HERO`, `E-INFER-TYPE` |
| Section display | `"Bodoni MT", Didot, "Times New Roman", Times, serif` | `clamp(30px, 4.4vw, 62px)` | 400 | 0.98 | −0.02em | measured size, estimated family | `E-SHOT-FULL-768`, `E-INFER-TYPE` |
| Body | sans stack | 16px | 400 | 1.5 | 0 | measured | `E-SHOT-FULL-768` |
| Label | sans stack | 11px | 400 | 1.3 | 0.04em | measured | `E-SHOT-HERO` |
| Caption | sans stack | 11–12px | 400 | 1.5 | 0.02em | measured | `E-SHOT-FULL-768` |

The reference hero wordmark is an all-sans grotesque (confirmed by
`ref-title-zoom` in `capture/`); section statements use a high-contrast Didone
serif. The demo reproduces that split. The exact serif family is unknown; the
Bodoni/Didot/Times stack is a substitution, not the reference typeface.

### Spacing

| Token | Value | Use | Confidence | Evidence |
|-------|-------|-----|------------|----------|
| Page inset | `clamp(16px, 1.7vw, 24px)` | Left/right gutters | measured | `E-MEASURE-LAYOUT` |
| Grid gutter | 24px | Column gap | measured | `E-MEASURE-LAYOUT` |
| Section rhythm | `clamp(96px, 11vw, 176px)` | Vertical section padding | estimated | `E-MEASURE-LAYOUT` |
| Meta row padding | 9px block | Metadata list rows | estimated | `E-SHOT-FULL-768` |
| Step padding | 10px block | Ordered steps | estimated | `E-SHOT-FULL-768` |

### Radius, border and shadow

| Token | Value | Use | Confidence | Evidence |
|-------|-------|-----|------------|----------|
| Radius | `0` | All surfaces and images | measured | `E-SHOT-HERO` |
| Border | `1px solid #D6D2C8` | Metadata and footer hairlines | measured | `E-SHOT-FULL-768` |
| Shadow | `none` | No elevation in the reference | estimated | `E-SHOT-FULL-768` |

### Layout

| Property | Value | Confidence | Evidence |
|----------|-------|------------|----------|
| Container width | 1440px (`--max`) | measured | `E-MEASURE-LAYOUT` |
| Gutter | 24px at ≥768, 16px at 375 | measured | `E-MEASURE-LAYOUT` |
| Grid | 12-column editorial grid, full-bleed hero | measured | `E-MEASURE-LAYOUT` |
| Breakpoints | 375, 768, 1440 | measured | `E-SHOT-MOBILE`, `E-SHOT-FULL-768` |

---

## 5. Component inventory

| Component | Memory id | Reference instance | Project primitive | Reuse or build | Variants used | Confidence | Evidence |
|-----------|-----------|--------------------|-------------------|----------------|---------------|------------|----------|
| Header Navigation | `cmp-header-nav` | Wordmark left, Work / Approach / Studio / Contact right | Hand-written nav; `<details>` menu under 768px | Build (no existing DS in repo) | Desktop, Mobile | measured | `E-SHOT-HERO` |
| Project Card | `cmp-project-card` | Image with name + location/year caption below | `<a class="project">` + `<img>` + caption | Build | Landscape, Portrait | measured | `E-SHOT-FULL-768` |
| Studio Metadata List | `cmp-meta-list` | Label/value pairs beside body copy | `<dl class="meta">` | Build | Default | measured | `E-SHOT-FULL-768` |

**Header Navigation.** Anatomy: wordmark link, desktop link row, compact
`<details>` menu. Variants: Desktop (links visible), Mobile (menu summary).
States: default, hover/focus underline scale-in. Deviation: a top-only
`linear-gradient(rgba(0,0,0,.42), transparent)` sits under the header for
navigation contrast over the photograph. The reference has no header surface;
this is a functional requirement, recorded in the anti-slop review and the
discrepancy report.

**Project Card.** Anatomy: image, then a caption row with name left and
metadata right. Variants: Landscape (4:3) and Portrait (4:5). States: hover
image scale `1.015` over 500ms. No surface, padding or radius — the card is
image-led, as in the reference.

**Studio Metadata List.** Anatomy: four label/value rows. No border in the
demo: the reference's metadata sits on the open page; borders were removed
after the anti-slop review found them unsupported. Typography 13px values,
11px labels, 1.35 leading.

---

## 6. Image composition requirements

| Image | Role | Source asset | Licence | Focal point | Text-safe area | Aspect ratio | Object-fit / position | Overlay | Responsive crop | Confidence |
|-------|------|--------------|---------|-------------|----------------|--------------|-----------------------|---------|-----------------|------------|
| `img-hero` | full-bleed background | `assets/intro.jpg` (2000×1333) | Unsplash License | 0.52, 0.46 | 0.03, 0.76, 0.55, 0.18 | 16:10 container | `cover` / `52% 46%` | Independent header scrim only (top 72px) | mobile: same position, safe area 0.05, 0.78, 0.90, 0.16 | estimated |
| `img-intro` | inline editorial | `assets/hero.jpg` (2400×2013) | Unsplash License | 0.50, 0.46 | lower band unused | 2:1 → 4:3 mobile | `cover` / `50% 50%` | none | position unchanged | estimated |
| `img-approach` | inline editorial | `assets/approach.jpg` (1600×1088) | Unsplash License | 0.50, 0.52 | lower band unused | 16:9 → 4:3 mobile | `cover` / `50% 55%` | none | position unchanged | estimated |
| `img-project-1` | inline editorial | `assets/project-1.jpg` (1200×800) | Unsplash License | 0.50, 0.50 | lower band unused | 4:3 | `cover` / `50% 50%` | none | position unchanged | estimated |
| `img-project-2` | inline editorial | `assets/project-2.jpg` (1200×800) | Unsplash License | 0.50, 0.45 | lower band unused | 4:5 → 4:3 mobile | `cover` / `50% 45%` | none | position unchanged | estimated |
| `img-project-3` | inline editorial | `assets/project-3.jpg` (1200×1800) | Unsplash License | 0.50, 0.50 | lower band unused | 4:5 | `cover` / `50% 50%` | none | position unchanged | estimated |

**Licence status.** All six photographs are from Unsplash and used under the
[Unsplash License](https://unsplash.com/license). The individual photo IDs and
photographer attributions were **not retained** in the working tree; they are
recorded as `unknown` rather than invented. Before any public use, the download
records must be recovered and attributed. This is a stated limitation, not a
completed verification.

**Layering.** Hero: image layer (`position:absolute; inset:0; z-index:0`) →
header scrim layer (`linear-gradient` on the absolutely positioned header,
`z-index:30`) → content layer (`position:relative; z-index:2`). Other images
are plain block images with captions below the frame; no text sits on them.

**Selection rule.** The reference photographs are not licensed for reuse, so
each was replaced by an authentic Unsplash photo chosen for **composition**,
not merely subject: centre of mass near the reference focal point, dark
lower-left region for the hero copy, and a portrait source for the portrait
frame. No AI-generated photography and no whole-image fade or blur is used.

**After-integration verification.** Screenshots at 1440×900 and 390×844
confirm every image paints, keeps its subject in frame, and that hero copy sits
on the dark lawn. The reference's own hero measures only 1.65–2.1:1 contrast;
the demo measures 5.0:1 or better by asset choice and copy placement, not by
fading the photograph (`E-MEASURE-CONTRAST`).

---

## 7. Responsive behaviour

| Breakpoint | Container | Grid | Type scale | Image behaviour | Nav behaviour | Visible/hidden | Evidence |
|------------|-----------|------|------------|-----------------|---------------|----------------|----------|
| 1440 (desktop) | 1440px, 24px gutters | 12-column editorial | hero 52px; section display 62px | landscape/portrait per card | full link row | all sections | `E-SHOT-HERO` |
| 768 (tablet) | fluid, 24px gutters | 12-column, stacked groups | fluid | 4:3 for mid cards | full link row | all sections | `E-SHOT-FULL-768` |
| 375 (mobile) | fluid, 16px gutters | single column | hero `clamp(32px,9.5vw,44px)`; section display fluid | `project-mid` 4:3; `project-wide` 4:5 | `<details>` menu | desktop nav hidden | `E-SHOT-MOBILE` |

375 and 768 are evidenced; intermediate widths are inferred and carry at most
`estimated` confidence.

---

## 8. Interaction requirements

| Interaction | Trigger | Behaviour | Duration / easing | Reduced motion | Evidence |
|-------------|---------|-----------|-------------------|----------------|----------|
| Nav underline | hover / focus-visible | 1px rule scales from the left | 220ms `cubic-bezier(.2,.7,.2,1)` | inherits instant state | `E-SHOT-HERO` (static underlines) |
| Project image zoom | hover | `scale(1.015)` | 500ms same easing | disabled by reduced-motion? No — scale remains; documented as estimated | none |
| Smooth section jump | anchor click | `scroll-behavior: smooth` | browser default | `scroll-behavior:auto` | inferred |

No motion was added for decoration. Hover/focus states are inferred; the
reference capture exposes only static output.

---

## 9. Accessibility requirements

| Requirement | Target | Verified by | Status |
|-------------|--------|-------------|--------|
| Colour contrast | WCAG 2.1 AA minimum | Pillow contrast measurement on desktop hero; token check | Hero ≥5:1; muted text `#6B6B66` on `#EFEDE8` is 4.58:1 (AA pass). The reference's own `#8A8A82` measures 2.97:1 and was deliberately darkened |
| Keyboard navigation | All interactive elements | Logical DOM order; skip link first | Verified by inspection |
| Focus visibility | Visible indicator on every control | `:focus-visible` outline in `--accent` | Verified by CSS |
| Semantic structure | Headings, landmarks, lists | `header/main/footer`, one `h1`, ordered steps, `dl`, `blockquote` | Verified by inspection |
| Accessible names | Labels for icon-only controls | No icon-only controls; menu uses text summary | Pass |
| Image alternatives | Meaningful `alt`, decorative `alt=""` | Every image has descriptive alt; footer wordmark `aria-hidden` | Pass |
| Reduced motion | Honours `prefers-reduced-motion` | Media query disables smooth scroll | Partial: image zoom not disabled |
| Touch targets | Adequate size and spacing | Labels 11px with 3px padding — **below 44px** | Known limitation |

---

## 10. Anti-slop review reference

| Field | Value |
|-------|-------|
| Rules version | `anti-slop-rules.json` v1.0.0 (AS-01 … AS-20) |
| Review table | `anti-slop-review-template.md` |
| Reference evidence available | `true` |
| Review status | passed (0 unsupported findings) |
| Unsupported findings | 0 |
| Source-supported exceptions | AS-03 serif display (reference uses a Didone for section statements); AS-04 negative tracking (measured in both hero and section display) |
| Design-system exceptions | none — the repository has no application design system |
| Functional-requirement exceptions | AS-05 header scrim for navigation contrast; AS-11 ordered step numbers communicate sequence |

Detail: [`anti-slop-review.json`](anti-slop-review.json).

---

## 11. Unresolved questions

| # | Question | Impact if unresolved | Owner | Deadline | Fallback |
|---|----------|----------------------|-------|----------|----------|
| 1 | Which exact Unsplash photos and photographers were used? | Attribution/licence audit incomplete | implementer | before publish | keep local files; record `unknown`; do not claim attribution |
| 2 | Which licensed typeface does the reference use? | Display never matches exactly | designer | not blocking demo | local Bodoni/Didot/Times stack |
| 3 | Reference statistics and client-wall sections | Cannot reproduce without inventing metrics/identities | product | out of scope | omitted and recorded |
| 4 | Reference hover/focus/loading states | Interactions are inferred | designer | not blocking demo | conservative hover/focus only |

---

## 12. Fidelity acceptance checklist

- [x] Section order matches the memory map (7 sections).
- [x] Background surfaces match the recorded tokens.
- [x] Typography roles and scale are close; the serif family is substituted.
- [x] Image placement, focal point and object-position match the manifest.
- [x] Overlay: none on photography; header scrim recorded as a deviation.
- [x] Components use the reference variants (Desktop nav, Landscape card, Default metadata).
- [x] Spacing is close; section rhythm is wider than the reference (recorded).
- [x] Density and visible item counts are honest (3 projects; no invented statistics).
- [x] Decorative detail is limited to source-supported rules and hover underlines.
- [x] Responsive behaviour is recorded at 375/768/1440.
- [x] No unsupported anti-slop indicator remains.
- [ ] Accessibility baseline: touch-target size remains below 44px.

**Verdict:** conditional pass. Structural, component and image-composition
fidelity pass. The known deltas are the substituted typeface, wider section
rhythm, header scrim, darkened muted token, omitted statistics/client sections
and the small touch-target sizes. Each is recorded in
`discrepancy-report.md`; none is presented as a pixel-level match.
