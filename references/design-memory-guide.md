# Design Memory Map Guide

The Design Memory Map is Kumite's machine-readable record of an extracted design
reference and the contract between discovery, extraction, implementation and QA.
Schema: [`design-memory-schema.json`](design-memory-schema.json). Worked example:
[`design-memory-example.json`](design-memory-example.json). Schema version
`1.1.0`. Documents declaring `1.0.0` remain valid; the `motion` section is
optional.

## 1. Purpose

A full-page glance is not enough to implement faithfully. The map records what was
observed, where, and how confidently: implementers work from structured values,
every claim traces to evidence, gaps appear as `unknown`, and QA compares against
the same reference. It is not a stylesheet, Figma file or design system.

## 2. The six categories

### A. Source
- `sourceType`: `figma`, `screenshot`, `image`, `webpage` or `other`.
- `identity`: title, author and licence as traced values, plus optional Community
  URL/ID, Design URL, file key, original URL, capture date and attribution.
- `access`: `direct-mcp`, `duplicated-drafts`, `screenshot-only`, `denied` or
  `not-applicable`, plus the extraction method and its limitations.
- `unavailable`: properties that could not be observed, each with a reason.

If access was denied or only screenshots existed, say so. A screenshot-derived map
must never describe itself as node-derived data.

### B. Foundations
- `colours`: raw `palette` and role-based `semantic` colours.
- `typography`: `families`, `sizes`, `weights`, `lineHeights`, `letterSpacing`.
- `spacing`: `scale` and `sectionRhythm`.
- `borders`: `widths`, `colours`, optional `styles`; `radii`: `scale`.
- `shadows` and `backgrounds`.
- `layout`: `maxWidth`, named `breakpoints` and `grid`.

Every value is traced. Foundations are shared defaults, not a substitute for
component-level properties.

### C. Components
Each component records its variants, not a single averaged appearance:

- `id`, `name`, `type`, `sourceLocation`, `confidence`, `evidence`.
- `variants` (at least one), each with a name and its own `properties` bag.
- the property bag also carries optional `states` (`default`, `hover`, `focus`,
  `active`, `disabled`) and `responsive` changes.

Never assume that all buttons, cards or inputs share styling. A primary button and
a compact button are separate variants with separate evidence.

### D. Sections and imagery
Sections record page order and structure: `order`, `name`, `type`, `background`,
`layout`, `responsive`, `confidence`, `evidence`, plus optional `dimensions`,
`components` (component ids) and `decorativeAssets`. `layout` covers `structure`,
`contentAlignment`, `columns` and `spacing`.

Images are first-class records: `role` (usage such as full-bleed, split or
floating), `composition` (focal point, text-safe area, negative space, aspect
ratio, original dimensions, image-to-container mapping), `css` (fit, position and
layer separation), `overlays` (gradient or wash, independence, image preservation)
and `qa` (coverage, focal point, gradient direction/strength, subject visibility,
text contrast).

Image `composition` coordinates are normalised to `0..1`; evidence coordinates are
pixels within their stated viewport. Do not mix the two conventions.

A full-bleed or blended photographic background must keep any overlay independent
(`layer: "independent"`, `preservesImage: true`). Never darken or blur the whole
photograph when only the text region needs contrast. An overlay of kind `none`
must use `layer: "none"`.

### E. Evidence and confidence
`evidence` is a global index; every id referenced anywhere must exist in it. Each
entry has:

- `id` (unique), `kind` (`figma-node`, `screenshot-region`, `crop`,
  `css-declaration`, `measurement`, `documentation` or `inference`) and `ref`
  (node id, selector, measurement description or citation).
- optional `coordinates`, `viewport`, `cropFile`, `cropScale` and `note`.

`figma-node` refs use `124:450` or `124-450`. Screenshot and crop evidence should
carry coordinates; if they genuinely cannot be recovered, add a note explaining
why. Broken references and duplicate ids are validator errors.

### F. Motion (optional)
Motion is recorded only when it is evidenced or deliberately decided. A map
without `motion` is valid. When present, the section records:

- `status`: `observed`, `static`, `partial` or `unknown`. Use `static` when the
  source is a still image, screenshot or design board; use `unknown` when motion
  existed but could not be captured.
- `identity`: motion `style`, `personality`, optional `principles` and project
  `context`, each traced.
- `components`: each animated component, its `trigger`, interaction states,
  duration, delay, easing, spring parameters, stagger, enter/exit transitions,
  scroll behaviour, hover/focus/loading motion, responsive changes,
  reduced-motion alternative, performance notes and its evidence.
- `sourceSupported`: motion the reference actually evidences.
- `functionalAdditions`: motion added to satisfy a real interaction requirement,
  with the requirement recorded in a traced note.
- `intentionallyOmitted`: motion deliberately not added, with the reason.
- `reducedMotion`: the global strategy, media query and alternatives.
- `performance`: animated properties, known risks and notes.
- `responsiveDifferences`: breakpoint-specific motion changes.
- `confidence` and `evidence`: the section-level confidence and evidence index.

Static references must not acquire invented motion. Record `status: "static"` or
`"unknown"`, leave `components` empty when nothing was observed, and explain the
omission in `intentionallyOmitted`.

A trigger is one or more of `mount`, `unmount`, `load`, `hover`, `focus`,
`click`, `pointer`, `keyboard`, `scroll`, `state-change`, `timer`, `gesture` or
`none`. Classify each animated component as `source-supported`,
`design-system-supported`, `functional-requirement` or `intentionally-omitted`.

## 3. The traced-value model

Every extracted visual property is an object, never a bare value:

```json
{
  "value": "#111827",
  "confidence": "exact",
  "evidence": ["E-FIGMA-TOKENS"],
  "note": "Primary action background from the published variable collection."
}
```

`value` may be a string, number, boolean, array, object or `null`. `confidence` is
required; `evidence` and `note` are constrained by the rules below.

Bare values such as `"background": "#111827"` are invalid for foundations,
component properties, section properties and image properties. Plain values are
limited to structural fields: ids, names, enums, image geometry and the contents
of `unresolved`.

## 4. Confidence rules

| Confidence | Meaning | Required |
| --- | --- | --- |
| `exact` | Verbatim source data: a Figma node, variable, CSS declaration or visible text. | At least one evidence id. |
| `measured` | Measured from a capture, but not present as source data. | Evidence id, or a note describing the direct measurement. |
| `estimated` | Inferred from adjacent evidence, judgement or scaling. | A note explaining the inference. |
| `unknown` | Not observed or not recoverable. | Value must be `null`; a note is strongly recommended. |

Examples: `exact` is a value read from a Figma variable; `measured` is a size from
a 1440px capture; `estimated` is tracking judged from a wordmark; `unknown` is a
hover colour that was never captured.

Do not promote confidence. A screenshot measurement remains `measured` even when
several people agree; call a screenshot observation `exact` only for a verbatim
transcription, such as visible copy or an image's pixel dimensions.

## 5. Components and variants

A variant is a distinct rendering. Record only the properties that were observed:

```json
{
  "id": "cmp-button", "name": "Primary Button", "type": "button",
  "sourceLocation": "Hero / Actions", "confidence": "exact",
  "evidence": ["E-FIGMA-HERO-FRAME"],
  "variants": [{
    "name": "Default",
    "properties": {
      "background": { "value": "#111827", "confidence": "exact", "evidence": ["E-CSS-BUTTON"] },
      "states": [{
        "state": "hover",
        "changes": {
          "background": { "value": "#1F2937", "confidence": "estimated", "note": "Hover was not exported; shade estimated one step lighter." }
        }
      }]
    }
  }]
}
```

- At least one variant is required; zero variants is a schema error.
- Variant names are human-readable and unique within the component.
- `properties.states.changes` and `properties.responsive.changes` are maps of
  traced values, never raw values. If a state was not observed, omit it or record
  an explicit estimate; never invent an interaction state.

## 6. Responsive variations

Responsive data is delta-based: record only what changes at a named breakpoint.

- Sections and components use `{ "breakpoint": "mobile", "changes": { ... } }`.
- Image `responsive` entries may change `objectPosition`, `crop` and
  `textSafeArea`.
- Breakpoint names should match `foundations.layout.breakpoints`. Never invent
  uncaptured breakpoints; record the gap in `unresolved` or `source.unavailable`.

Mobile is not a scaled desktop. Re-check focal points, text-safe areas and
typography at each captured width.

## 7. Source identity separation

Two Figma identifiers are different and must never be interchanged:

| Concept | Example | Use |
| --- | --- | --- |
| Community ID | `1324762163080748317` (numeric) | Community page identity only. |
| Design file key | `s5ovdLYnQHqRd4et0M4eNW` (22 alphanumeric characters) | Figma MCP and Design URLs. |

The validator enforces:

- `communityId` must not equal or be used as `fileKey`.
- a numeric `fileKey` that looks like a Community ID is rejected.
- `designUrl` must contain the recorded `fileKey` and must not be a Community URL.
- `communityUrl` must contain the recorded `communityId`.

Record them separately: `communityUrl` with `communityId`, and `designUrl` with
`fileKey`. If no Design URL is known, omit it and record the access limitation.
Never derive a file key from a Community ID.

## 8. What must never be fabricated

Do not invent Figma file keys, node ids, URLs or Community IDs; measurements,
viewport widths or image dimensions; component variants, states or responsive
behaviour; licences, authors or attribution requirements; gradients, overlays or
decorative effects not present in the reference; or API responses, MCP
capabilities and extraction successes.

When something is unavailable, record `unknown` with a note, add the property to
`source.unavailable` and list the remaining question in top-level `unresolved`.
An honest gap is more useful than a plausible guess.

## 9. Writing and validating workflow

1. Capture evidence first: node ids, screenshot regions, crops, CSS declarations,
   measurements and documentation.
2. Extract foundations, then components, sections and images, keeping the evidence
   index open, and use `exact` only where source data supports it.
3. Validate before handing the map on:

```bash
node scripts/validate-memory.mjs references/design-memory-example.json
node scripts/validate-memory.mjs path/to/map.json --json
```

The CLI prints errors and warnings by code and path. It exits `1` on errors and
`0` otherwise. `--json` emits `{ valid, errors, warnings }` for tooling.

4. Run the deterministic tests:

```bash
node --test tests/design-memory.test.mjs
```

Schema validation catches structural mistakes. Semantic validation catches
dangling evidence, confidence contradictions, identifier confusion, broken
references, duplicate ids and invalid overlay layering. Fix errors before
implementation; review warnings explicitly.

## 10. How implementers consume the map

1. Read `source` first. Screenshot-only access means more estimates; do not pretend otherwise.
2. Bind `foundations` to the project token layer. Reuse existing design-system
   tokens where they match; record deliberate substitutions.
3. Map each component variant to a real component; never collapse variants into one implementation.
4. Build sections in `order`, using `layout` and `responsive` deltas.
5. Implement images using `composition`, `css` and `overlays`. Preserve the focal
   point and text-safe area at every captured breakpoint.
6. Implement `motion` only after resolving the specialist motion skill. Reproduce
   source-supported motion; record functional additions; leave intentionally
   omitted motion out. A static `motion` section is a result, not a gap to fill.
7. Resolve `unknown` values by re-extracting or asking the user, never by
   invention. Keep the map with the project so later changes can be checked.

The map feeds two downstream artefacts. The **implementation spec** maps
components and foundations to project primitives, lists exact values and carries
every `unknown` forward as an open question. **Fidelity QA** compares the rendered
interface with the reference at the same viewports and regions, citing the same
evidence ids and confidence levels. Pixel diffs and working interactions are not
proof of fidelity; typography, spacing, colour, variants, responsive behaviour,
image composition and motion are checked separately. Motion QA runs in Audit mode
through `kumite-motion-design` before final acceptance.

## 11. Files

- Schema and example: [`design-memory-schema.json`](design-memory-schema.json),
  [`design-memory-example.json`](design-memory-example.json)
- Validators: [`scripts/lib/design-memory.mjs`](../scripts/lib/design-memory.mjs),
  [`scripts/lib/schema.mjs`](../scripts/lib/schema.mjs)
- CLI and tests: [`scripts/validate-memory.mjs`](../scripts/validate-memory.mjs),
  [`tests/design-memory.test.mjs`](../tests/design-memory.test.mjs)
