# Image Composition Intelligence

This guide defines how Kumite reads a photograph before styling it. It is the
companion to the `image` record in `references/design-memory-schema.json` and
the checks in `scripts/lib/image-composition.mjs`.

The central claim: **a photograph is a composition, not a texture.** Its subject
sits somewhere; its negative space sits somewhere. Copy either fits those facts
or fights them. Styling can support a composition; it cannot repair one chosen
for the wrong reasons.

## 1. Why composition comes before styling

The common failure is replacing a reference photograph with one that merely
shows a similar subject. A hotel lobby becomes another hotel lobby; a ceramic
vessel becomes another vessel. The subject matches, so the swap looks safe. Then
the headline lands on a window instead of a wall, the crop removes the
staircase, and a gradient appears to rescue contrast. The section technically
contains a lobby and visually contains nothing.

A similar subject is not a similar composition. Ask instead:

- Does the new image put the subject in the same region of the frame?
- Does it offer an equally quiet region for the copy?
- Does it survive the same aspect-ratio crop?
- Is its light coming from a direction that supports the intended overlay?

If any answer is no, **search for a better authentic photograph**; do not force
the crop. The visual-assets workflow exists so the search can be repeated
cheaply. The implementation should not absorb the cost of a bad frame.

### Refusal rules

- **No arbitrary gradients.** A gradient needs a purpose that names the text or
  region it protects. "Adds depth" is not a purpose.
- **No forced crops.** If the focal point or text-safe area cannot survive the
  container crop, the asset is wrong for the container.
- **No AI-generated photographs as substitutes.** Generated images are not
  evidence of a real place, product or person. Prefer a clean layout, an empty
  state or a clearly marked placeholder.
- **No whole-image fading or blurring** to make text readable. Darken the
  region; leave the photograph intact.
- **No invented measurements.** A focal point read from a thumbnail is
  `estimated`, not `exact`, and must be recorded that way.

## 2. The seven usage classifications

Classify by what the photograph does in the layout, not by what it depicts.

| Role | Recognition cue | Typical CSS | Main pitfall |
| --- | --- | --- | --- |
| `full-bleed-background` | Image reaches every section edge; headings and controls sit on it | `position:absolute; inset:0` + `object-fit:cover` + sibling overlay | Fading the whole image instead of the copy region |
| `blended-photographic-background` | Image fills the section but dissolves into the page colour at one edge | Cover image plus a mask or page-colour gradient in a separate layer | Baking the gradient into the image's `background-image` |
| `split-composition` | Image and copy occupy separate columns, neither on top of the other | `display:grid` with an image column and `aspect-ratio` on the frame | Leaving `object-position` at centre and cropping the subject |
| `floating-photography` | Cropped image sits offset on the page surface, copy beside or over it | Positioned `figure` with controlled width, radius and shadow | Decorative shadow implying depth the reference lacks |
| `product-photography` | The product is the subject, on a clean field or controlled set | Contained or cover image inside a product frame | Cropping the product to fill a shape and losing its silhouette |
| `decorative-photography` | Atmosphere or rhythm; copy does not depend on it | Contained image with generous spacing | Using decoration to disguise a missing content decision |
| `inline-editorial-photography` | Image sits in running copy, captioned in flow | Figure sized to the measure, caption below | Upscaling a small asset and calling the softness "editorial" |

**Full-bleed and blended** backgrounds require `object-fit: cover`; `contain`
leaves letterbox bands and is rejected (`FULL_BLEED_OBJECT_FIT`).

**Blended** backgrounds are full-bleed images whose edge has been deliberately
removed. The blend must be a separate overlay or mask, never pixels painted into
the image. If the photograph already ends in a dark or page-coloured field, do
not add a gradient just to have one.

**Split** images are peers of the copy. They need an `object-position` decision
at every breakpoint where the column aspect ratio changes.

**Floating** images are cropped objects; offset, width and overlap are decisions
that must survive at narrow widths. Most become ordinary split layouts on
mobile. **Product** images put fidelity first: cover-cropping a bottle into a
square may remove its neck. **Decorative** images carry no information and are
not used as text backgrounds. **Inline editorial** images follow the text
measure, with captions outside the frame.

## 3. Composition before styling: seven questions

Answer these before writing CSS. Each answer maps to an image-record field, so
the decision survives the implementation session.

1. **Background or independent element?** A background fills a section and
   receives copy; an independent element has its own frame, caption or column.
   The answer decides the layer model.
2. **Does it occupy the whole section?** Whole-section occupation forces
   `cover`, a focal point and at least one non-desktop responsive entry.
3. **Where is the focal point?** Record normalised `x` and `y`. If the subject
   cannot be identified, record `unknown` and leave text placement unresolved;
   never assume the centre.
4. **Where can text sit without covering the subject?** Record a normalised
   text-safe rectangle and describe what is there — wall, sky, shadow or
   repeated pattern. If no such region exists, the image may be wrong for
   overlaid copy.
5. **Does the photograph already provide a dark or light region?** If yes, do
   not add a gradient. Record the region in `textSafeArea.description` and
   `qa.textContrast`.
6. **Is a gradient genuinely required?** Name the protected region and the
   direction it must run. Record it as an independent overlay with stops,
   direction, purpose and justification.
7. **Does the crop or focal point change at another breakpoint?** Record
   per-breakpoint `objectPosition`, `crop` or `textSafeArea`. A desktop crop
   silently applied to mobile is an unrecorded design decision.

## 4. Worked anatomy of a full-bleed hero

A full-bleed hero has three independently controllable layers. Everything else
is detail.

```
section.hero
├── .hero__media      image layer     z-index: 0
│   └── img           object-fit: cover; object-position: 50% 46%
├── .hero__scrim      overlay layer   z-index: 1; pointer-events: none
│   └── linear-gradient(to right, ...)
└── .hero__content    text layer      z-index: 2
```

```css
.hero { position: relative; isolation: isolate; min-height: 42rem; background: var(--surface-page); }
.hero__media { position: absolute; inset: 0; z-index: 0; }
.hero__media img { width: 100%; height: 100%; object-fit: cover; object-position: 50% 46%; }
.hero__scrim {
  position: absolute; inset: 0; z-index: 1; pointer-events: none;
  background: linear-gradient(to right, rgba(12,14,16,0) 0%, rgba(12,14,16,.55) 55%, rgba(12,14,16,.82) 100%);
}
.hero__content {
  position: relative; z-index: 2; max-width: 34rem;
  margin-inline-start: auto; padding: clamp(1.5rem, 4vw, 4rem);
}
```

### Why the layers stay separate

- The image keeps its own pixels, opacity and colour; the gradient cannot recolour the subject.
- The overlay can change direction or strength per breakpoint without re-cropping.
- The text layer can move without touching either visual layer.
- The treatment can be removed during review without re-exporting the asset.

`background-image` is a **layer**, never a replacement for the photograph. Even
when the image is applied as a CSS background, the treatment needs its own
element. A shorthand such as `background: linear-gradient(...), url(hero.jpg)`
embeds the gradient in the image layer and is rejected (`OVERLAY_EMBEDDED`) for
background roles.

### Why not fade the whole image?

Lowering `opacity` on the image, or applying a full-frame dark wash, reduces detail and contrast
everywhere. The subject greys out with the copy region, and the photograph starts to look like a
disabled state. Darken only the column that needs it; if the image needs to be lighter overall,
choose a lighter photograph.

### When a radial gradient is justified

A radial gradient is defensible when the reference uses a vignette centred on
the corner or edge where the copy sits, or when a spotlight metaphor is part of
the art direction. It must carry a traced `justification` explaining why a
linear scrim would destroy a highlight or fail to follow the composition.
Otherwise use a linear gradient aligned with the text. A radial gradient without
a justification is a warning (`RADIAL_UNJUSTIFIED`), not a style choice.

A solid overlay is legitimate as a low-alpha brand wash — for example a 6%
page-colour tint that unifies a studio backdrop — provided `preservesImage:
true` and the opacity is low enough that material and colour remain truthful.

## 5. Focal point and text-safe area

Both use **normalised image coordinates**: origin top-left, `x` right, `y` down,
all values 0..1. Normalised values survive changes of source resolution and
container size; convert to pixels only when measuring or running QA.

```
0,0 ────────────────────────────────────────────── x → 1
  ┌───────────────────────────────────────────────┐
  │          ·  focal point (0.31, 0.46)          │
  │                          ┌──────────────────┐ │
  │                          │  text-safe area  │ │
  │                          │  0.52, 0.48      │ │
  │                          │  0.40 × 0.38     │ │
  │                          └──────────────────┘ │
  └───────────────────────────────────────────────┘
y ↓ 1
```

- `primaryFocalPoint` is the one thing the crop must retain.
- `textSafeArea` is a rectangle the copy may occupy. It must not contain the
  focal point (`TEXT_OVERLAPS_FOCAL_POINT`) and must have non-zero area
  (`TEXT_SAFE_AREA_EMPTY`).
- A safe area outside the image bounds is invalid; the copy would fall off the
  photograph.
- Secondary subjects are traced values, not extra focal points. They inform the
  crop but do not override the primary subject.

### The unknown case

`unknown` is a legitimate confidence value, but it changes what the record may
claim. If the focal point is unknown: do not silently treat the image as
centre-weighted; mark text placement unresolved; keep the record out of
production until the asset is inspected; expect
`UNKNOWN_FOCAL_POINT_UNRESOLVED`. The same applies to an assumed text-safe
area — an assumption is not a measurement.

## 6. Image selection checklist

Run this against the candidate before it enters the Design Memory Map.

- [ ] **Subject positioning** — the subject sits in the same region as the reference, not merely in the same kind of room.
- [ ] **Negative space** — a quiet region exists where the copy must go, large enough for the longest line at the narrowest breakpoint.
- [ ] **Focal point** — one primary subject is identifiable at thumbnail size; competing subjects leave no defensible centre.
- [ ] **Crop compatibility** — focal point and text-safe area survive the cover crop; `checkAssetSuitability` is the gate.
- [ ] **Resolution** — source pixels meet or exceed the rendered container at the device pixel ratio in use, within a stated upscale tolerance.
- [ ] **Lighting and contrast** — light falls where the copy will sit, or the dark region is genuinely dark; a gradient must not manufacture all of it.
- [ ] **Container suitability** — orientation, aspect ratio and subject scale match the frame; a portrait still life is wrong for a wide banner.
- [ ] **Material fidelity** — for products, colours and textures are not tinted by a brand wash or a heavy grade.

When a candidate fails, the honest options are: search for a different
authentic photograph with the required composition; change the layout so copy
does not sit on the image; or omit the image and use a clean section. Forcing a
crop, mirroring a subject that should face a particular direction, or generating
a replacement are not options. Record why the asset was rejected so the next
search is targeted.

Licensing is checked in visual-assets. Composition records keep `assetRef`; they
do not store credentials, temporary download URLs or unverified licence claims.

## 7. Responsive focal-point behaviour

Responsive image work is not "the same crop, smaller". It is a set of recorded
decisions about what must remain visible.

**Focal-point retention.** The focal point is a commitment; every rendered crop
must still contain it. If a narrower viewport would cut the subject out, change
one of: `object-position`, the container aspect ratio, the image, or the
placement of the copy.

**Per-breakpoint records.** Each `responsive` entry names a breakpoint and at
least one of `objectPosition`, `crop` or `textSafeArea`. Full-bleed and blended
backgrounds must have at least one non-desktop entry; otherwise the desktop crop
is forced on every viewport and validation fails (`RESPONSIVE_CROP_MISSING`).

| Breakpoint | Container | Object position | Text-safe area | Crop |
| --- | --- | --- | --- | --- |
| desktop | 1600 × 900 | `50% 46%` | right 40% | none |
| tablet | 1024 × 768 | `38% 44%` | right 45% | trim 6% each side |
| mobile | 390 × 720 | `32% 40%` | lower 84% | trim lower detail |

The values are illustrative. What matters is that every change is recorded with
a confidence and evidence, and that the focal point survives each one.

**Crop policy.** Prefer `object-position` changes over destructive crops: a crop
changes which pixels exist, a position change chooses which pixels are shown.
Use `crop` when the source contains material that should never appear (a
competitor logo, a distracting edge object), never to remove a subject the copy
still references.

**Text-safe re-evaluation.** A safe area measured for a 16:9 desktop hero is not
automatically safe for a 9:16 mobile crop. Re-measure wherever the visible
window changes and record the new rectangle. If it would overlap the focal
point, change the crop or move the text; do not accept the overlap.

## 8. Image QA checklist

Validate the record, then the rendered page. A check is either evidenced or
explicitly unknown; a silent pass is not a result.

| # | Check | Pass criterion |
| --- | --- | --- |
| 1 | **Coverage** | Image fills the intended frame at every recorded breakpoint, with no unintended letterboxing, stretching or gaps. |
| 2 | **Focal-point preservation** | Primary focal point is inside the visible crop at every breakpoint; evidenced by measurement or screenshot comparison. |
| 3 | **Gradient direction** | Gradient runs along the axis that protects the copy — usually from the copy edge into the image — and does not darken the subject. |
| 4 | **Gradient strength** | Darkest stop reaches enough alpha to protect text (0.25 minimum for a text-contrast scrim unless justified) while material detail remains visible. |
| 5 | **Subject visibility** | Subject is recognisable at thumbnail size and at the narrowest breakpoint; no figure is cut in half by the frame edge. |
| 6 | **Photographic detail** | Texture, material and colour survive the overlay; no whole-image opacity reduction, blur or desaturation without exact or measured source evidence. |
| 7 | **Crop accuracy** | Recorded crop matches the rendered crop; no pixels hidden by padding or borders and no shift in the intended region. |
| 8 | **Responsive crop** | Every breakpoint with a different aspect ratio has a recorded position or crop; no breakpoint silently inherits desktop. |
| 9 | **Text contrast** | Rendered text meets WCAG 2.1 AA (4.5:1 body, 3:1 large) against the darkest and lightest points of the text-safe area. |

Also verify: alt text describes content and function, not styling; controls over
the image keep a visible focus indicator and an independent hit area; the
aspect ratio is reserved to prevent layout shift; reduced-motion and
reduced-data preferences do not remove information the copy depends on.

## 9. Handoff

### To visual-assets

The composition record is the search brief: role, section, required aspect ratio
and container size, focal point and text-safe area, whether the image must
survive a cover crop, and the existing light and dark regions.

Before accepting a candidate, call `checkAssetSuitability({ asset, container,
focalPoint, textSafeArea })`. It returns `{ suitable, issues }` and rejects:

- `ASSET_TOO_SMALL` — source resolution below the container;
- `CROP_EXCLUDES_FOCAL_POINT` — the cover crop removes the subject;
- `TEXT_SAFE_AREA_UNSAFE` — the crop removes the region reserved for copy;
- `ASPECT_MISMATCH` — warning that the crop discards much of the frame, so a
  closer asset is preferable.

If the candidate fails, search again; do not lower the requirement to fit the
first result.

### To design-quality

Call `validateImageRecord(record, { evidenceIds })` before publishing. Errors
block; warnings require a recorded resolution. Then verify the rendered page:
compare the intended layer structure with the DOM, not only the screenshot;
confirm the gradient is a sibling layer and the image keeps full opacity;
measure contrast on the rendered text-safe area; check the focal point at each
recorded breakpoint; confirm licence and attribution.

`summariseComposition(record)` produces a line for review reports:
`full-bleed-background · focal point (0.31, 0.46) · text-safe area (0.52, 0.48,
0.4 x 0.38) · linear-gradient on independent layer preserving image detail`.

### To the Design Memory Map

Record `role`, `sectionId`, `assetRef` and the traced reference description;
`primaryFocalPoint`, `textSafeArea`, `negativeSpace`, `aspectRatio`,
`originalDimensions`, `imageToContainer` and any `crop`; `css.objectFit`,
`css.objectPosition` and the three layer descriptions; each overlay with `kind`,
`layer`, `purpose`, `preservesImage`, `direction`, `stops`, `justification` and
`cssValue`; each responsive entry; all six QA results, record confidence and
evidence identifiers. The implementation spec quotes these values rather than
re-deriving them from a screenshot.

Validate with:

```bash
node --test tests/image-composition.test.mjs
```

## 10. Limitations

- **Screenshots cannot prove layer structure.** A dark region may come from a gradient, a mask, a shadow or the photograph; inspect the DOM or design file.
- **Measurements carry error.** Screenshot coordinates are `estimated`; full-resolution source measurements are `measured`; design-file values may be `exact`. Never promote an estimate because it looks convincing.
- **Focal points are not detected automatically.** These validators check the record, not the pixels; a human or vision-capable review must identify the subject.
- **Contrast depends on the rendered state.** Font weight, anti-aliasing, compression and the darkest pixel under a glyph all matter.
- **Asset suitability assumes centred alignment** unless `container.objectPosition` is supplied; pass it when the implementation uses a different alignment.
- **Licensing and taste are out of scope.** A composition can be perfect and the asset unusable; validation can reject an arbitrary gradient, but cannot judge whether the photograph is the right creative choice.

When in doubt, record the uncertainty. A record that says `unknown` is useful; a
record that guesses and claims `exact` is worse than no record at all.
