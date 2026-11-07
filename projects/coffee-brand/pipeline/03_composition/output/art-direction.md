# Art direction — Hollow Pine Coffee

## Position

The category's centre of gravity is a cool grotesk SaaS page. The references that
matter here sit to the side of it: Fellow and Blue Bottle both run a warm paper
field, photography as the only saturated element, few products, and small tracked
caps labels. This page takes that side.

It does not imitate either site's typeface, product photography or motion. It
keeps their band rhythm, split ratios, tonal restraint and commerce density.

## Page type

Editorial commerce. One long page, nine bands, two actions repeated. No cards
inside cards, no dashboard furniture, no badges.

## Hierarchy

1. The headline states the position in one sentence.
2. The roasts are the only place with a repeated, scannable unit.
3. The craft, roast-day and origin bands build belief in that order.
4. The method gives a practical reason to buy.
5. The close repeats the one action.

## Grid

- Container: 1200px, gutters `clamp(20px, 5vw, 64px)`.
- Splits: 55/45 hero, 52/48 craft, 45/55 origin, 58/42 method.
- Section padding: `clamp(72px, 9vw, 136px)` vertical.
- Roast row: three equal columns with a 1px gap rule, collapsing to one column.

## Palette structure

| Role | Token | Value | Use |
|---|---|---|---|
| Paper | `--paper` | `#F2ECE1` | Page field |
| Raised paper | `--paper-2` | `#F7F3EA` | Method band, card hover |
| Sand | `--sand` | `#E6DACA` | Roast cards |
| Ink | `--ink` | `#1B1511` | Text, solid buttons |
| Muted ink | `--ink-2` | `#5B4E42` | Secondary copy |
| Clay | `--clay` | `#B04A28` | Large accents, rules, focus |
| Deep clay | `--clay-2` | `#8A3A1F` | Small links and labels |
| Espresso | `--espresso` | `#241C16` | Close band |
| Night | `--night` | `#171310` | Roast-day band, footer |
| Line | `--line` | `#D8CCBA` | Hairlines on paper |

Photography carries green and brown. Interface colour stays within this set.

## Type roles

| Role | Family | Size | Weight | Leading | Tracking |
|---|---|---|---|---|---|
| Display XL | Instrument Sans | `clamp(3rem, 7.2vw, 6.4rem)` | 500 | 0.92 | -0.02em |
| Display L | Instrument Sans | `clamp(2.2rem, 4.4vw, 3.8rem)` | 500 | 1.0 | -0.015em |
| Display M | Instrument Sans | `clamp(1.7rem, 2.8vw, 2.4rem)` | 500 | 1.05 | -0.01em |
| Body | Instrument Sans | `1.0625rem` | 400 | 1.65 | 0 |
| Small | Instrument Sans | `0.875rem` | 400 | 1.55 | 0 |
| Label | Instrument Sans | `0.72rem` | 600 | 1.2 | 0.18em, uppercase |

The display is a grotesk because both references are grotesk-led. The serif was
rejected: a fashionable display serif here would be a trend signal with no
reference support (AS-03).

## Imagery role

Photography is documentary, warm and close. Six licensed Pexels photographs:

| Slot | Subject | Role | Focal point | Text-safe area |
|---|---|---|---|---|
| Hero | Top-down pour-over on oak | Half-bleed portrait, right | centre 0.50 / 0.55 | none; copy sits on paper |
| Craft | Pour-over on a wooden counter | Half-bleed landscape, left | centre | none |
| Roast day | Roasted beans leaving the drum | Full-bleed band | 0.55 / 0.45 | lower-left, under a scrim |
| Origin | Hand in a coffee plant | Half-bleed portrait, left | centre | none |
| Method | Water hitting a filter in a machine | Inset portrait, right | 0.50 / 0.42 | none |
| Close | Beans on slate | Full-bleed background | centre | centred, under a scrim |

No image is presented as the brand's own farm, roastery or product. Captions
describe the photograph, not a claim.

## Density

Three products, three steps, three footer columns. One idea per band. The page
should feel under-filled at 1440 rather than busy.

## Motion stance

The references are stills, so no reference motion is claimed. The brief requires
a GSAP build, so a minimal functional layer is allowed: sticky-header state,
below-fold reveals, one scroll-linked scale on the band image, hover and bag
feedback. No preloader, no cursor effect, no marquee, no pinning, no Lenis.
Details and the reduced-motion alternative are in `04_motion`.
