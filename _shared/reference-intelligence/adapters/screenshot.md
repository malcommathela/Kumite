# Screenshot adapter

Use when the only source is an image: a screenshot, a crop, a design board or an
exported frame.

## Before extraction

1. Confirm the image is on the selection board. Decompose a kept card, not a
   catalogue. See
   [`../../foundations/selection-board.md`](../../foundations/selection-board.md).
2. Record the source: file path or URL, intrinsic width × height, capture
   viewport if known, and licence. If the viewport is unknown, say so.
3. Name the approved contribution. "Layout and type only" prevents the image
   from silently supplying colour, identity or motion.

## Procedure

1. **Keep the original untouched.** Copy it into the project's `reference/`
   folder; never overwrite the source.
2. **Capture the full page when possible.** Use
   `_shared/scripts/capture-screenshots.mjs` for live pages.
3. **Decompose in five passes.** Page composition, sections, components, detail,
   responsive variations. Record crop coordinates for every region.
4. **Map the crop to the ten qualities.** Use
   [`../../foundations/reference-decomposition.md`](../../foundations/reference-decomposition.md)
   as the checklist. Leave a quality empty when the image does not show it.
5. **Enlarge only to inspect.** State the scale. Enlargement does not create
   source detail.
6. **Record values with confidence.** Type sizes, spacing and colours read from
   pixels are `measured` at best. Anything you cannot see is `unknown`.
7. **Record motion as `static`.** A still frame cannot evidence timing, easing,
   springs, stagger or scroll behaviour.

## Limits

- No node identity, variable names, auto-layout parameters or variant
  membership.
- No proof of another breakpoint.
- No proof that a gap is exactly 24 px.
- No licence inference from the image itself.
- No motion evidence, even when the frame looks mid-transition.

## Output

A region tree with crop coordinates, a per-quality record with confidence and
evidence ids, and an explicit list of what the screenshot cannot prove.
