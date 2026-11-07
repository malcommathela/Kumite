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
| Access limitations | Rendered output only. No tokens, CSS variables, typeface files or component definitions. Hover and focus motion was read from live computed styles; loading and page-transition states remain unobserved |
| Capture viewports | 1440×900 (hero), 768×10151 (full page), 375×10939 (full page); motion inspected at 1440×900 and 390×844 |
| Capture date | 2026-09-10 (captures); 2026-11-05 (live DOM and motion inspection) |
| Evidence index | `E-SHOT-HERO`, `E-SHOT-FULL-768`, `E-SHOT-MOBILE`, `E-CROP-HERO-TEXT`, `E-CSS-DOM`, `E-MEASURE-HERO`, `E-MEASURE-LAYOUT`, `E-MEASURE-CONTRAST`, `E-INFER-TYPE`, `E-MOTION-REF-LIVE`, `E-MOTION-IMPL-CSS`, `E-MOTION-IMPL-CAPTURE-DESKTOP`, `E-MOTION-IMPL-CAPTURE-PROJECT`, `E-MOTION-IMPL-CAPTURE-MOBILE`, `E-MOTION-IMPL-REDUCED`, `E-MOTION-MEASURE` (all resolved in `design-memory.json`) |

**Figma access note.** A Figma MCP connection was verified separately
(`whoami`, and `get_metadata` on file `s5ovdLYnQHqRd4et0M4eNW`). No suitable
landing-page file was found in that account, so **no Figma Community resource
was used** and no Figma identifier, node or token is claimed for this reference.
Everything below derives from the captures listed above.

**Unavailable information.** The display typeface cannot be identified from
pixels; the demo substitutes a local stack. Hover and focus motion was read from
live computed styles, but loading, error and page-transition states remain
unobserved. Section rhythm and some crop positions are estimated. Reference
photography is not licensed for reuse, so every image is replaced.

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

### Motion

| Token | Value | Role | Confidence | Evidence |
|-------|-------|------|------------|----------|
| `--ease` | `cubic-bezier(0.17, 0.84, 0.44, 1)` | Shared interaction and image-fade curve | measured | `E-MOTION-REF-LIVE` |
| `--ease-out` | `cubic-bezier(0.25, 0.46, 0.45, 0.94)` | Approximation of GSAP's default `power1.out` for the entrance reveals | measured | `E-MOTION-REF-SOURCE` |
| `--dur-link` | `1109ms` | Link underline reveal | measured | `E-MOTION-REF-LIVE` |
| `--dur-image` | `1109ms` | Project image hover scale | measured | `E-MOTION-REF-LIVE` |
| `--dur-reveal` | `1109ms` | Heading rise and hero title; equals the reference's `Si()` default | measured | `E-MOTION-REF-SOURCE` |
| `--dur-fade` | `300ms` | Photograph opacity fade-in | measured | `E-MOTION-REF-SOURCE` |
| `--dur-hero` | `2400ms` | Hero photograph settle from `scale(1.1)` | measured | `E-MOTION-REF-SOURCE` |
| `--dur-menu` | `160ms` | Mobile menu panel enter | measured | `E-MOTION-IMPL-CSS` |
| `--dur-press` | `80ms` | Pressed opacity feedback | measured | `E-MOTION-IMPL-CSS` |

The interaction, reveal, fade and hero durations come from the reference's
computed styles and its shipped bundle. The menu and pressed durations are demo
functional additions, not reference values.

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
States: default, hover/focus underline scale-in from a right origin at 1109ms,
80ms pressed opacity, and a 160ms panel enter for the mobile menu. Deviation: a
top-only `linear-gradient(rgba(0,0,0,.42), transparent)` sits under the header
for navigation contrast over the photograph. The reference has no header
surface; this is a functional requirement, recorded in the anti-slop review and
the discrepancy report.

**Project Card.** Anatomy: image, then a caption row with name left and
metadata right. Variants: Landscape (4:3) and Portrait (4:5). States: hover and
focus-visible image scale `1.035` over 1109ms, contained by `overflow: hidden`
on the card; 80ms pressed opacity `0.86`. Under reduced motion the image stays
at `scale(1)` and the caption receives a static underline. No surface, padding
or radius — the card is image-led, as in the reference.

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

## 8. Motion and interaction

### Specialist skill resolution

| Field | Value |
|-------|-------|
| Resolution method | installed |
| Skill | `design-motion-principles` |
| Source | `~/.agents/skills/design-motion-principles` |
| Version / commit | Not declared locally. Upstream `main` was `4a9ca879f24a361f4dca4174fe2da0f67b5ddee3` at the time of use |
| Licence | MIT in the upstream repository; the installed copy has no licence file |
| Mode | Create |
| Loaded resources | `SKILL.md`; `workflows/create.md`; `references/accessibility.md`; `references/creation-gotchas.md`; `references/performance.md`; `references/jakub-krehel.md`; `references/emil-kowalski.md`; `references/motion-cookbook.md` |
| Perspective | Primary: Jakub Krehel (production polish). Secondary: Emil Kowalski (restraint, frequency and speed). Jhey Tompkins was not applied because the page has no playful or gesture-led moment |
| Limitations | The installed `SKILL.md` checksum differs from the upstream tip, so it is treated as a local variant. Motion evidence is live computed-style inspection, not a screen recording |

### Motion decision table

| Element | Classification | Trigger | Behaviour | Timing | Reduced motion | Evidence |
|---------|----------------|---------|-----------|--------|----------------|----------|
| Hero title rise | source-supported | load | `translateY(105%→0)` inside a clipped mask; CSS keyframe, no JavaScript | 1109ms `cubic-bezier(0.25,0.46,0.45,0.94)` | Animation removed; title static | `E-MOTION-REF-SOURCE`, `E-MOTION-IMPL-CAPTURE-HERO`, `E-MOTION-IMPL-REDUCED` |
| Section heading, quote and footer wordmark rise | source-supported | scroll, once | Content wrapped in a clipped `.rise` span; `translateY(105%→0)` when the heading reaches 94% of the viewport | 1109ms same curve, 0ms delay | No mask transform or transition; final state immediately | `E-MOTION-REF-SOURCE`, `E-MOTION-IMPL-CAPTURE-REVEAL`, `E-MOTION-IMPL-REDUCED` |
| Hero photograph settle | source-supported | load | `scale(1.1→1)` on `.hero-media` | 2400ms same curve | No scale or animation | `E-MOTION-REF-SOURCE`, `E-MOTION-IMPL-CAPTURE-HERO`, `E-MOTION-IMPL-REDUCED` |
| Photograph fade-in | source-supported | scroll, once | `opacity(0→1)` on intro, approach and project images | 300ms `cubic-bezier(0.17,0.84,0.44,1)` | Fully opaque from first paint | `E-MOTION-REF-SOURCE`, `E-MOTION-IMPL-CAPTURE-REVEAL`, `E-MOTION-IMPL-REDUCED` |
| Scroll progress bar | source-supported | scroll | Fixed 4px bar, `scaleX` from a left origin, `aria-hidden`, no transition | Follows position directly | Retained; updates instantly | `E-MOTION-REF-SOURCE`, `E-MOTION-IMPL-CSS`, `E-MOTION-IMPL-JS` |
| Header, footer, text and mobile-menu link underline | source-supported | hover, `:focus-visible`, keyboard | 1px `::after` scales `scaleX(0→1)`; origin flips right→left; accent outline on focus | 1109ms `cubic-bezier(0.17,0.84,0.44,1)` | Underline appears instantly, no sweep | `E-MOTION-REF-LIVE`, `E-MOTION-IMPL-CAPTURE-DESKTOP`, `E-MOTION-IMPL-CAPTURE-MOBILE` |
| Footer email underline | source-supported pattern | hover, `:focus-visible` | Same 1px rule and origin flip as links | 1109ms same curve | Instant | `E-MOTION-REF-LIVE`, `E-MOTION-IMPL-CSS` |
| Project image | source-supported | hover (`hover: hover` only), `:focus-visible` | `scale(1→1.035)` inside the card's `overflow: hidden` | 1109ms same curve | Image stays `scale(1)`; caption gets a static 3px-offset underline | `E-MOTION-REF-LIVE`, `E-MOTION-IMPL-CAPTURE-PROJECT`, `E-MOTION-IMPL-REDUCED` |
| Pressed feedback | functional-requirement | pointer, keyboard | Opacity `0.72` on links; `0.86` on project cards | 80ms linear | State appears instantly | `E-MOTION-MEASURE`, `E-MOTION-IMPL-CSS` |
| Mobile menu panel | functional-requirement | `<details>` open | Opacity `0→1`, `translateY(-6px→0)`; closing is immediate | 160ms same curve | No animation; panel appears immediately | `E-MOTION-IMPL-CAPTURE-MOBILE`, `E-MOTION-IMPL-REDUCED` |
| Anchor section jump | functional-requirement | Link click | `scroll-behavior: smooth` | Browser default | `scroll-behavior: auto` | `E-MOTION-IMPL-CSS` |

The first five rows reproduce motion read from the reference's shipped markup,
bundle and stylesheet. The interaction rows reproduce what the live page exposes
on hover, focus and press. The pressed and menu states are functional additions:
the demo's own `<details>` disclosure has no native open animation, and
activation needs immediate confirmation. The reference keeps an inline
navigation at 390px, so it provides no evidence for a mobile panel.

The heading and image rows are one-shot. `motion.js` unobserves each target after
its reveal, so scrolling back does not replay anything and no animation frame
loop runs while the page is idle.

### Reference motion observed but intentionally omitted

- **Lenis smooth scrolling and inertia** (`html.lenis`), whose scroll velocity
  also feeds the reference's WebGL layers. Intercepting native scrolling would
  change input feel and accessibility behaviour.
- **Three.js/WebGL image effects**: KTX2 textures, shader hover (`uHover 0→1`,
  0.3s `power2.out`), scroll-scrubbed uniforms and a fixed WebGL canvas. These
  need a WebGL pipeline and the reference's texture assets.
- **Preloader** and its `app:preloaderdone` gate on entrance playback. The demo
  has no preloader, so entrances start immediately; no artificial delay was
  added.
- **Nuxt page transitions** (`.dyh` overlay, opacity and `clip-path`, 0.3s), the
  custom cursor and the fixed mix-blend header (0.6s). A single page has no
  route change to transition, and the demo header is absolute over the hero.
- **Project caption overlay reveal** (`.dlx`/`.jts` `translateY`, 0.6s with a
  0.3s underline delay). The demo's captions sit below the photograph, so an
  overlay would obscure them; they stay static.
- **Marquee text** (`.oty`), the **drag gallery** (`.eun`) and scroll-pinned or
  scrubbed sections, none of which exist in the adapted composition.
- **Per-line SplitText stagger** (`Si(1)` = 0.1s). Splitting text into measured
  lines needs runtime line-box measurement; the demo lifts one clipped block per
  heading and records the missing stagger.
- No looping, ambient, idle or decorative motion was added.

### Implementation

Interaction and entrance timing lives in [`styles.css`](styles.css). The three
behaviours that require observation live in [`motion.js`](motion.js), a
dependency-free script loaded before `</body>`:

- appends the 4px `aria-hidden` progress bar and updates it in at most one
  `requestAnimationFrame` per scroll or resize frame, from passive listeners;
- wraps heading text in a `.rise` span inside a clipped `.reveal-mask`;
- adds `.reveal-img` to the three image groups and `.is-inview` once per target
  with an `IntersectionObserver` (`rootMargin: 0px 0px -6% 0px`, `threshold:
  0.01`), then unobserves it.

The script returns before any reveal work when `IntersectionObserver` is
unavailable, so without it every heading and photograph remains in its final
state. Link and project-card reveals animate only `transform`; the fade animates
only `opacity`; the hero and headings animate only `transform`. No animation
library, framework or build step is used. The project card clips its image scale
with `overflow: hidden`, matching the reference's `.piz` wrapper and preventing
the photograph from entering the grid gutter.

The reduced-motion block removes the hero animations rather than shortening
them, resolves every mask and image to its final state, collapses remaining
durations to `0.01ms`, forces `scroll-behavior: auto`, and substitutes the
static caption underline. The progress bar still reports position but never
animates towards it.

### Verification

- Production source: `/_nuxt/BJv2xQ-z.js` contains the `linereveal` plugin
  (`yPercent: 101`, `duration: Si()`, `stagger: Si(1)`) and
  `Si(step, offset, base = 0.1) = 0.1 × 1.61803398875^(step − 1)`;
  `/_nuxt/BILhttA3.js` contains `w.from(elImg, { scale: 1.1, duration: 2.4 })`;
  the inline stylesheet declares `.yap`, `.qct img` (opacity 0.3s, transform
  1.109s) and `.dyh`.
- Entrance, headless CDP at 1440×900: hero line `translateY` 31.8px → 0 by
  600ms with a 0s delay; hero image `scale` 1.0818 → 1.00256 over 2.4s; both
  settle at identity with exactly two animations on the document.
- Reveals: intro heading and image, work heading, project image, quote and
  footer wordmark all reach `is-inview` with `opacity: 1` and `transform: none`.
  The project image is confirmed revealed, which caught a specificity bug where
  `.project img.reveal-img` outranked `.reveal-img.is-inview`.
- Progress bar: `scaleX(0.630088)` at the work section and `scaleX(1)` at the
  document bottom.
- Interaction: hover underline `matrix(1, 0, 0, 1, 0, 0)` with a left origin;
  project image `matrix(1.035, 0, 0, 1.035, 0, 0)`; both transitions `1.109s`;
  pressed card opacity `0.86`.
- Keyboard: Tab reaches every nav link and project card with `:focus-visible`
  true and a visible 2px accent outline.
- Mobile at 390×844: document `scrollWidth` 390, no horizontal overflow; the
  hero and reveals behave identically; the menu panel still animates.
- Reduced motion: `animation-name: none` on the hero title and hero image,
  every observed reveal at `opacity: 1` with `transform: none`, durations
  `1e-05s`, `scroll-behavior: auto`, and the menu opens with no animation.
- Captures: `capture/motion2-hero-load.png`, `motion2-hero-settled.png`,
  `motion2-work-reveal.png`, `motion2-footer-reveal.png`,
  `motion2-reduced-work.png`, `motion2-mobile-hero.png`, plus the interaction
  set `motion-desktop-*`, `motion-mobile-*` and `motion-reduced-*`.
- No screen recording was produced, so timings are measured from the declared
  bundle values and CDP computed values rather than captured frames. No video or
  GIF tool was available.
- No guard asserts that the observer is disconnected; it is unobserved per
  target by design, and the progress bar remains live for the page lifetime.
  Neither was benchmarked frame by frame.

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
| Reduced motion | Honours `prefers-reduced-motion` | CDP emulation: hero animations removed, reveals at `opacity: 1`/`transform: none`, durations `1e-05s`, caption underline, `scroll-behavior: auto` | Pass |
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
| Motion anti-slop | MAS-01…MAS-09 reviewed through `kumite-motion-design`; 0 unsupported findings (section 8) |

Detail: [`anti-slop-review.json`](anti-slop-review.json).

---

## 11. Unresolved questions

| # | Question | Impact if unresolved | Owner | Deadline | Fallback |
|---|----------|----------------------|-------|----------|----------|
| 1 | Which exact Unsplash photos and photographers were used? | Attribution/licence audit incomplete | implementer | before publish | keep local files; record `unknown`; do not claim attribution |
| 2 | Which licensed typeface does the reference use? | Display never matches exactly | designer | not blocking demo | local Bodoni/Didot/Times stack |
| 3 | Reference statistics and client-wall sections | Cannot reproduce without inventing metrics/identities | product | out of scope | omitted and recorded |
| 4 | Reference loading and page-transition states | Observed in the bundle (`.dyh` overlay, preloader hooks) but not reproduced | designer | not blocking demo | recorded as intentionally omitted; no invented loading motion |
| 5 | No screen recording of the reference motion | Timings come from computed styles and the shipped bundle rather than captured frames | reviewer | not blocking demo | record computed values and state clearly that no recording exists |

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
- [x] Motion section recorded in the Design Memory Map (schema 1.1.0).
- [x] Source-supported motion reproduced; functional additions documented; unrelated reference motion omitted.
- [x] Reduced-motion alternative verified in a browser.
- [x] Keyboard focus parity and visible focus indicators verified.
- [x] Motion causes no horizontal overflow or layout shift.
- [ ] Accessibility baseline: touch-target size remains below 44px.

**Verdict:** conditional pass. Structural, component, image-composition and
motion fidelity pass. The known deltas are the substituted typeface, wider
section rhythm, header scrim, darkened muted token, omitted statistics/client
sections and the small touch-target sizes. Each is recorded in
`discrepancy-report.md`; none is presented as a pixel-level match.
