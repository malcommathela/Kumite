# Decomposition — two coffee references, five passes

Sources: `reference/fellow-full-1440.webp`, `reference/fellow-mobile-full.png`,
`reference/bluebottle-full-1440.webp`, `reference/bluebottle-mobile-full.png`,
all from the Inspo archive. Study only; the captures are not redistributed.

## Pass 1 — page composition

Both pages are long, single-column commerce pages that alternate a paper field
with photography. Fellow opens on a full-bleed photograph with copy on the left
third; Blue Bottle opens on a still life above a left-aligned headline block.
Both close on a near-black footer with a newsletter field.

The page is not one continuous grid. It is a stack of bands: paper, photo, paper,
photo, dark. The band change is the primary rhythm device, not a card border.

## Pass 2 — sections

| # | Fellow | Blue Bottle |
|---|---|---|
| 1 | Full-bleed hero, product right, copy left | Centered nav, still life, headline below |
| 2 | Four pale category tiles | Four pale product tiles with price |
| 3 | Split editorial, image left | Half-bleed split, image left, copy right |
| 4 | Full-bleed photo band with short headline | Split subscription band |
| 5 | Four-by-two image grid, no captions | Three brew-guide cards |
| 6 | Dark footer with newsletter and three columns | Dark footer with four columns |

Observed at 1440. On the 360 capture the splits become image-over-text and the
four-up rows become a single column or a two-up grid. Confidence: `measured` for
order and stacking, `estimated` for ratios.

## Pass 3 — components

- **Header:** wordmark left, links centre, icons right on desktop; on mobile the
  links collapse and only the mark and bag remain.
- **Display headline:** very large, tight leading, two or three lines. Fellow is
  sentence case; Blue Bottle is tracked caps.
- **Action:** outlined pill over photography; solid dark block on paper.
- **Product tile:** pale field, product centred, name and price beneath. No
  badges, stars or urgency copy in the captured rows.
- **Section label:** small tracked caps, often paired with a one-line heading.
- **Footer:** newsletter field plus three link columns and a legal row.

## Pass 4 — detail

- Paper fields are warm, not white: the measured palettes sit around
  `#c4aca1`/`#d4acac` with near-black text.
- Photography is the only saturated element. Interface colour stays neutral.
- Radii are small; buttons are pills only over photography.
- Type scale jump is large — display to body is roughly 4:1 or more.
- Vertical padding between bands is generous; content never crowds the band edge.

## Pass 5 — responsive

- Desktop: 55/45 or 60/40 splits, four-up rows, centred nav.
- Tablet: splits stay side by side but narrow; four-up becomes two-up.
- Mobile: single column, image above copy, full-width actions, reduced display
  size but the same case and leading relationship.

## What the source cannot prove

- Exact type sizes, tracking and line heights (screenshots only).
- Exact section padding, container width and breakpoints.
- Hover, focus and scroll behaviour.
- Motion of any kind: the captures are stills. `motion.status` is `unknown`.
- The reference sites' own image licences.

## Adaptation decisions

The build takes the band rhythm, split ratio, tonal fields, tile restraint and
footer structure from these references. It replaces the reference typefaces with
Fraunces and Instrument Sans, and replaces product photography with licensed
Pexels photographs of generic coffee scenes. Section backgrounds in
`reference-evidence.json` are the chosen tokens, marked `estimated`, because the
reference fields are close but not identical to the adapted palette.
