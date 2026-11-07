# Evidence and confidence

Every value Kumite records carries a confidence label and a traceable source.
The label is a claim about how the value was obtained, not how plausible it
looks.

## The four labels

| Label | Meaning | Acceptable source |
|---|---|---|
| `exact` | Returned by structured data or a source token | Figma node data, a design-token file, an API response |
| `measured` | Read from a defined crop, a computed style at a stated viewport, or a recorded frame | Screenshot crop coordinates, DevTools computed style, a timed recording |
| `estimated` | Inferred from visual proportion or comparison | A crop without exact coordinates, a visual judgement |
| `unknown` | Not evidenced | Nothing — leave it unknown |

Rules:

1. **A screenshot can suggest a 24 px gap. It cannot prove one.** Pixel-read
   values are `measured` at best, never `exact`.
2. **A null value is `unknown`.** A note does not make a null measurable.
3. **`exact` requires evidence.** If you cannot name the node, token or
   structured field, downgrade the label.
4. **`measured` requires a measurement record.** State the viewport, crop
   coordinates or computed property.
5. **`estimated` never becomes `exact` through repetition.** One estimate does
   not corroborate another.
6. **`unknown` is a valid result.** Do not fill a gap with a plausible value to
   make the page look complete.

## Source authority

| Source | Authoritative for | Not authoritative for |
|---|---|---|
| Figma node data | Node ids, layout geometry, padding/gap, constraints, variables, component sets, variants, exports | Final rendered appearance — fonts, rasterisation, effects and overlays can differ |
| Screenshot or image | Rendered appearance, type rendering, crop, overlay, visible density, verification | Node identity, variable names, auto-layout parameters, exact spacing |
| Live page DOM + computed styles | Measured values at the inspected viewport | Design intent, other breakpoints, unrendered variants |
| Written brief | Intent, constraints, audience | Visual detail |
| Static screenshot | Composition and appearance at one moment | Motion timing, easing, springs, stagger or scroll behaviour |

When two sources disagree, record both and state which one the implementation
follows. Do not silently pick one.

## Evidence records

An evidence record needs enough to re-find the source:

```json
{
  "id": "ev-hero-1440",
  "kind": "screenshot",
  "path": "reference/hero-1440.webp",
  "viewport": { "width": 1440, "height": 900 },
  "crop": { "x": 0, "y": 0, "width": 1440, "height": 900 },
  "capturedAt": "2026-11-06",
  "note": "Full hero at desktop width."
}
```

Use stable ids (`ev-*`) and refer to them from values. An id that resolves to
nothing is worse than no id.

## Motion evidence

| Situation | Label | What to record |
|---|---|---|
| Live page, recorded interaction | `measured` | Trigger, states, duration, easing, frame or video path |
| Figma prototype with settings | `measured` or `exact` | Prototype transition settings and node ids |
| Screenshot or design board | `unknown` | `status: "static"` and an omission note |
| Written brief describing a feel | `estimated` | The brief quote, never a fabricated curve |

A static reference does not become animated because an agent wants the page to
feel more designed. When in doubt, do not animate.

## Stop conditions

Stop and report when:

- the source is inaccessible and cannot be re-obtained;
- a decision that materially changes the result depends on an `unknown`;
- node data and screenshots disagree on structure;
- a licence or attribution cannot be verified;
- a required tool or MCP capability has not been verified.
