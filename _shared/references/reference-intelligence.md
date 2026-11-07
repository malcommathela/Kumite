# Reference intelligence

Reference intelligence is the hybrid practice of reading a design source through
more than one adapter and keeping their authorities separate. It replaces the
old mandatory Design Memory Map with a small, per-project evidence record.

## Adapter selection

| Source | Adapter | Primary authority | Read |
|---|---|---|---|
| Screenshot, crop, image, design board | Screenshot | Rendered appearance at one moment | `adapters/screenshot.md` |
| Live or archived webpage | Live page | Computed styles at a stated viewport | `adapters/live-page.md` |
| Figma file, selection or prototype | Figma | Node structure, variables, variants | `adapters/figma.md` |
| SitePeel MCP, when authenticated | SitePeel | Whatever a verified tool call returns | Confirm the tool and result first; do not assume |

SitePeel is an optional external adapter. Its endpoint is configured in the
user's OpenCode config, but it requires OAuth. Until a tool call returns data,
treat it as unavailable and say so. Do not describe SitePeel capabilities from
documentation alone.

## Combining adapters

1. **Start with the strongest structural source available.** Figma node data
   beats a screenshot for structure; computed styles beat a screenshot for a
   live page's measured values.
2. **Use the screenshot for rendered appearance.** It shows what the user
   actually sees, including font substitution, rasterisation and overlay.
3. **Record disagreements.** If node data says 24 px and the screenshot suggests
   32 px, log both, state the viewport and choose the one the implementation
   follows.
4. **Never promote a weaker source.** A screenshot does not become `exact`
   because it is high resolution. A live page does not prove another breakpoint.
5. **Stop when the source is inaccessible.** A thumbnail is not a substitute for
   the file.

## The evidence record

There is no global schema. A project keeps a `reference-evidence.json` (or an
equivalent Markdown table) only when it needs one. A suggested shape:

```json
{
  "source": {
    "type": "screenshot | live-page | figma",
    "identity": "what it is and where it came from",
    "licence": "verified licence or unknown",
    "access": "direct | duplicated | screenshot-only | inaccessible"
  },
  "evidence": [
    { "id": "ev-*", "kind": "screenshot | node | computed-style", "path": "...", "note": "..." }
  ],
  "sections": [
    { "id": "hero", "order": 1, "background": { "value": "#111", "confidence": "measured", "evidence": ["ev-hero"] } }
  ],
  "components": [
    { "id": "hero-heading", "variant": "display", "values": { "fontSize": { "value": 64, "confidence": "measured", "evidence": ["ev-hero"] } } }
  ],
  "images": [
    { "id": "hero-image", "role": "full-bleed-background", "focalPoint": { "x": 0.7, "y": 0.5 }, "overlay": "independent linear-gradient", "evidence": ["ev-hero"] }
  ],
  "motion": {
    "status": "observed | static | partial | unknown",
    "source": "recording, prototype or none",
    "notes": "..."
  }
}
```

This shape is a convenience, not a contract. It is deliberately smaller than the
archived Design Memory Map and is not required for a run. The rule that matters
is traceability: every value names its confidence and its evidence.

## Region decomposition

Never implement from a full-page glance. Decompose in five passes:

1. **Page composition** — height, section order, vertical rhythm, fold,
   background changes.
2. **Sections** — bounds, background, container, padding, grid, alignment,
   media.
3. **Components** — identity, repeats, variants, states.
4. **Detail** — type scale and weight, icon size and stroke, borders, radii,
   shadows, dividers, focus and hover hints, overlay direction, focal point.
5. **Responsive** — the same regions at each evidenced viewport; what reflows,
   stacks, hides, resizes or changes order.

Record crop coordinates and viewport for every measurement. Enlargement does not
create source detail; do not claim a value that only appears after interpolation.
