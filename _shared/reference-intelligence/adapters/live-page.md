# Live-page adapter

Use when the reference is a webpage that can be loaded and inspected.

## Before extraction

1. Confirm the page is on the selection board and name the approved
   contribution. See
   [`../../foundations/selection-board.md`](../../foundations/selection-board.md).
2. Record the URL, access status, date and licence. A public page is not
   automatically licensed for reuse; record what the terms actually allow.

## Procedure

1. **Capture at explicit viewports.** At minimum desktop (1440), tablet (768) and
   mobile (390), with the same device pixel ratio. Save the captures in the
   project's `reference/` folder.
2. **Read computed styles** for the values you need: font family, size, weight,
   line height, letter spacing, colour, spacing, radius, shadow, layout.
   Record the selector and viewport with each value.
3. **Decompose in five passes.** Page composition, sections, components, detail,
   responsive. Do not generalise a section from its top strip.
4. **Map the evidence to the ten qualities.** Use
   [`../../foundations/reference-decomposition.md`](../../foundations/reference-decomposition.md).
   Record only the qualities the user selected.
5. **Record interaction states only when you can trigger them.** Hover, focus,
   active, selected and loading states are `measured` when captured; otherwise
   `unknown`.
6. **Record motion only when you can observe it.** A live page may expose
   transitions in computed styles or a screen recording. Do not infer the rest.
   When timing matters, read
   [`video.md`](video.md) and measure at least three repetitions.
7. **Use SitePeel when connected.** It can return rendered fonts, colours, stack,
   assets and screenshots in one measurement. Read
   [`sitepeel.md`](sitepeel.md) first; never run a paid measurement without the
   user's approval.

## Limits

- Computed styles prove one viewport, not design intent or other breakpoints.
- A live page can change between captures; record the date and the exact URL.
- Third-party fonts, analytics and consent banners can alter the rendering.
- A public page's visual design is not a licence to copy its assets.
- A hover style in CSS does not prove the full interaction or its timing.

## Output

Viewport captures, a computed-style table with selectors and viewports, a region
tree, per-quality evidence, interaction-state evidence, and a list of what remains
`unknown`.
