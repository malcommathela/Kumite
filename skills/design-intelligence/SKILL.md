---
name: kumite-design-intelligence
description: >-
  Mandatory analysis layer for implementing frontend UI from a visual or
  structured design reference — screenshot, image, live webpage or Figma file.
  Decomposes the reference region by region, produces a Design Memory Map and a
  source-grounded implementation specification, governs image composition and
  gradient overlays, requires evidence-based motion analysis and anti-AI-slop
  validation, and verifies visual and motion fidelity at equivalent viewports.
  Use whenever an agent is about to implement UI from a design reference, or is
  asked to match, recreate, clone or reproduce an existing interface.
---

# Design Intelligence

Turn a design reference into an implementation that is structurally faithful and
visually verifiable — without inventing what the reference does not show.

## Mandatory before implementation

This skill is **mandatory** whenever a design reference exists and frontend UI is
about to be written: a screenshot, crop, image or design board; a live or
archived webpage; a Figma file or selection; or a structured export of any of
these. Do not start coding from a full-page glance — run the pipeline, produce
the artefacts, then implement.

This skill **coordinates**; it does not duplicate the other six skills. Each
stage names the skill that supplies the evidence and the skill that consumes it.
If the task is greenfield with no reference, use `kumite-component-first`,
`kumite-visual-assets`, `kumite-motion-design` and `kumite-design-quality`
directly.

## The pipeline

Run the stages in order. Skip a stage only when its input does not exist; record
the skip and lower confidence accordingly.

| # | Stage | Supplied by | Output |
|---|-------|-------------|--------|
| 1 | Source acquisition | `kumite-design-discovery`, `kumite-figma-integration` | Identified source, access status, licence, evidence |
| 2 | Global design analysis | This skill | Page type, hierarchy, grid, density, palette, type roles |
| 3 | Screenshot decomposition | This skill | Region tree: full page, sections, components, detail, viewports |
| 4 | Component-level inspection | This skill + Figma node data | Component inventory, variants, states |
| 5 | Design Memory Map generation | This skill | Validated memory map (the source of truth), including optional motion |
| 6 | Image Composition Intelligence | `kumite-visual-assets` | Per-image role, crop, focal point, overlay plan |
| 7 | Motion analysis | `kumite-motion-design` | Motion identity, components, triggers, timing, reduced motion and evidence |
| 8 | Anti-AI-slop validation | `kumite-design-quality` | Reviewed visual and motion indicator tables with verdicts |
| 9 | Implementation specification | This skill | Completed spec, including motion requirements, ready to code against |
| 10 | Implementation | `kumite-component-first`, `kumite-visual-assets`, `kumite-motion-design` | Working interface built from the spec |
| 11 | Visual and motion audit | `kumite-design-quality`, `kumite-motion-design` | Region-based discrepancy table, motion findings and verdict |

Stages 5–9 are artefacts, not optional notes. If you cannot produce one, stop and
report why. Motion analysis happens **before** implementation; motion auditing
happens **before** final acceptance. A static reference is not a reason to add
motion: record the absence and move on.

## Skill handoffs

| Skill | Hands to this skill | This skill requires |
|-------|--------------------|---------------------|
| `kumite-design-discovery` | Source identity, Community URL/ID, resolved design URL or file key, author, licence, accessibility limits | No design URL is inferred; no licence is assumed |
| `kumite-figma-integration` | Structured nodes and locations, variable collections, component sets and variants, layout properties, exported assets | Values marked `exact`, with node ids |
| `kumite-design-intelligence` | — | Converts all evidence into the memory map and implementation spec |
| `kumite-component-first` | Project component inventory and library coverage, including interaction states | Maps reference components to primitives without collapsing variants |
| `kumite-visual-assets` | Authentic imagery with focal-point and crop suitability | Composition requirements, not just subject matter |
| `kumite-motion-design` | Resolved specialist motion skill, motion evidence, Create or Audit findings | Installed skill or GitHub fallback provenance; no invented timing or easing |
| `kumite-design-quality` | Anti-slop review, visual fidelity and motion audit QA | Evidence per finding; no pass without comparison |

Hand a stage to another skill only with the evidence it needs. "Looks like the
reference" is not evidence.

## Evidence model: structured versus rendered

| Evidence | Authoritative for | Not authoritative for |
|----------|-------------------|-----------------------|
| Figma node data | Node ids, layout geometry, padding/gap, constraints, variable collections, component sets, variants, asset exports | Final rendered appearance — font substitution, rasterisation, effects and overlays can differ |
| Screenshot or image | Rendered appearance, actual type rendering, image crop, overlay, visible density, visual verification | Structural values — node identity, variable names, auto-layout parameters, exact spacing |
| Live page DOM + computed styles | Measured values at the inspected viewport | Design intent, other breakpoints, variants not rendered |
| Written brief | Intent, constraints, audience | Visual detail |

**A screenshot can suggest a 24 px gap. It cannot prove one.** Screenshots
**cannot** provide the same structural certainty as node data. Never present a
value read from pixels as an exact node-derived value.

Prefer node data for structure and the screenshot for rendered appearance. When
they disagree, record the disagreement; do not silently pick one.

## Stage 2 — Global design analysis

Before zooming in, answer:

- What page type is this, and what is the single primary task? What is read
  first, second, third?
- Fixed container, fluid or full-bleed? What are the content width and outer
  gutter at each viewport, and how dense is the page — airy editorial, balanced
  product page, or data-dense application?
- What are the type roles and their relationships (display, heading, body,
  label, caption, numeric)?
- What is the palette structure: surface, raised surface, text, muted text,
  border, accent, semantic states?
- How is imagery used — structural, editorial, product evidence, or decoration?
- What motion exists, and does it communicate state or only decorate? If the
  reference is static, record that motion cannot be evidenced; do not infer an
  animation style from a still image.
- Which breakpoints are evidenced, and which are inferred?

These answers become the map's global section.

## Stage 3 — Screenshot decomposition

Full-page inspection alone is prohibited. Decompose in five stages, each a
narrower region of the previous:

1. **Full-page composition** — total height, section count and order, vertical
   rhythm, fold position, background changes between sections.
2. **Section regions** — one per section: bounds, background, container width,
   padding, internal grid, alignment, media presence.
3. **Component regions** — cards, nav bars, forms, tables, buttons, badges,
   avatars, list rows; identity, repeated instances and variant cues.
4. **Fine-detail regions** — type scale and weight, icon size and stroke,
   borders, radii, shadows, dividers, focus and hover hints, overlay direction,
   image focal point.
5. **Responsive variations** — the same regions at each evidenced viewport;
   what reflows, stacks, hides, resizes or changes order.

Inspect region by region. Never generalise a section from its top strip, or a
component from one instance.

### Crop requirements

| Field | Meaning |
|-------|---------|
| Original file and dimensions | Source path or URL, full width × height in pixels |
| Crop coordinates | `x, y, width, height` in source pixels |
| Parent section and component identity | Where the crop sits and what it shows |
| Viewport and crop scale | Capture width; enlargement factor after cropping |

Keep surrounding context — a button cropped to its fill proves nothing about its
padding. When a screenshot is too small to inspect, crop and enlarge it, but
state the scale. **Enlargement does not create source detail.** Do not claim a
value that only becomes visible after interpolation.

## Stage 5 — Design Memory Map

The Design Memory Map is the **source of truth for implementation**. Code,
tokens, component choices and QA all trace back to it. It records six
categories:

| Category | Contents |
|----------|----------|
| **A. Source** | Source type, identity, author, licence, access method, unavailable properties |
| **B. Foundations** | Colour, typography, spacing, borders, radii, shadows, backgrounds, layout |
| **C. Components** | Each component, its variants, states, source location, responsive changes |
| **D. Sections and imagery** | Section order and layout; image role, composition, CSS layers, overlays, QA |
| **E. Evidence and confidence** | Global evidence index, traced values, confidence rationale, unresolved questions |
| **F. Motion (optional)** | Motion identity, animated components, triggers, states, timing, easing, springs, stagger, enter/exit, scroll, hover/focus, loading, responsive changes, reduced motion, performance, source support and omissions |

Every value carries a confidence marker — `exact` (node data, variables, source
tokens), `measured` (defined crop or computed style at a stated viewport),
`estimated` (inferred from visual proportion, never presented as exact) or
`unknown` (not evidenced — leave it unknown, do not guess). Each entry also
carries its evidence: node id, crop coordinates, token name or computed-style
source. Values without evidence are downgraded.

Author the map against the schema, then validate it:

- Schema: [`references/design-memory-schema.json`](../../references/design-memory-schema.json)
- Guide: [`references/design-memory-guide.md`](../../references/design-memory-guide.md)
- Worked example: [`references/design-memory-example.json`](../../references/design-memory-example.json)

Do not restate or fork the schema here. If validation fails, fix the map before
writing UI.

## Stage 6 — Image Composition Intelligence

Composition is decided **before** styling. An image that matches the subject but
not the composition is the wrong image.

**Classification.** Classify every image into one of seven roles and record it
in the memory map: `full-bleed-background`, `blended-photographic-background`,
`split-composition`, `floating-photography`, `product-photography`,
`decorative-photography` and `inline-editorial-photography`. The role determines
crop tolerance, required resolution, overlay treatment and whether the image may
be replaced. Canonical role definitions and selection rules live in
[`references/image-composition-intelligence.md`](../../references/image-composition-intelligence.md).

**Composition before styling.** Answer in order: is this a background or an
independent element; does it occupy the whole section; where is the focal point;
where can text sit without covering the subject; does the photograph already
provide the contrast the copy needs; is an additional gradient genuinely
required, and over which region; does the crop or focal point change at another
breakpoint?

**Layered full-bleed structure.** Use three independent layers — image layer,
then gradient overlay layer, then content layer. Position the image with
`object-fit` and `object-position`; never stretch it. The overlay has its own
element, with direction, stops and opacity derived from the source, and exists
only to protect text contrast. Content sits above and is unaffected by the
image's pixels.

**Gradient rules.**

- Never fade, blur or darken the **whole photograph** when only one region needs
  darkening. Apply the overlay only where the text sits.
- No arbitrary gradients. Every stop must trace to the reference or a
  design-system token. Never add a gradient the reference does not have.
- Preserve the subject. If an overlay kills the focal point, the crop or the
  overlay is wrong.

**Focal point, crop and responsiveness.**

- Record the focal point as a relative position and keep it in frame at every
  breakpoint.
- Use `object-fit: cover` where the role fills its frame and `contain` where the
  whole subject must survive; set a purposeful `object-position`; never stretch.
- Define a separate crop for each evidenced viewport. Do not assume the desktop
  crop survives a narrow screen.
- Prefer selecting a better authentic image over forcing an incompatible crop.
  Never substitute an AI-generated photograph for a real one.

**Image QA (9 points).** Coverage, with no letterboxing, stretching or gaps;
focal-point preservation inside the visible crop at every breakpoint; gradient
direction that protects the copy without darkening the subject; gradient strength
(0.25 minimum for a text-contrast scrim unless justified); subject visibility at
thumbnail and narrow widths; photographic detail surviving the overlay without
whole-image opacity, blur or desaturation; crop accuracy against the recorded
crop; responsive crop for every changed aspect ratio; text contrast at WCAG 2.1
AA (4.5:1 body, 3:1 large).

## Stage 7 — Motion analysis

Motion analysis is **mandatory before implementation** whenever the reference or
the required interaction includes motion. Invoke `kumite-motion-design`; it
resolves the specialist `design-motion-principles` skill from the agent
environment or retrieves it from
[`github.com/kylezantos/design-motion-principles`](https://github.com/kylezantos/design-motion-principles)
when it is not installed. Record the resolution method, source, version or
commit, licence, loaded resources and limitations.

Run the specialist skill's **Create** workflow before writing motion. Establish:

- motion identity and style, with confidence and evidence;
- each animated component and its trigger;
- interaction states and what changes between them;
- duration, delay and easing, or spring parameters;
- stagger behaviour and its limit;
- enter and exit transitions, with exits subtler than entrances;
- scroll-triggered behaviour and its reduced-motion alternative;
- hover, focus, loading and feedback motion;
- responsive differences;
- performance considerations and which properties animate;
- source-supported motion, functional additions and intentionally omitted
  motion.

Record all of it in the Design Memory Map `motion` section. Do not infer timing,
easing, springs or scroll behaviour from a still image. If the reference is
static, set `status` to `static` or `unknown`, leave invented components out and
explain the omission in `intentionallyOmitted`. **Do not force animations into a
static reference.**

The full motion workflow, anti-slop policy and memory fields are in
[`skills/motion-design/SKILL.md`](../motion-design/SKILL.md).

## Stage 8 — Anti-AI-slop validation

Twenty indicators are checked before implementation and again before delivery.
The compact index:

| ID | Indicator | ID | Indicator |
|----|-----------|----|-----------|
| AS-01 | Tags and pills | AS-11 | Unnecessary code breadcrumbs |
| AS-02 | Excessive italics | AS-12 | Arbitrary section numbering |
| AS-03 | Instrument Serif or unjustified fashionable typography choices | AS-13 | Unrequested eyebrows |
| AS-04 | Negative kerning | AS-14 | Dithering |
| AS-05 | Over-the-top detailed UI | AS-15 | ASCII images |
| AS-06 | Excessive dividers | AS-16 | Unnecessary squircles |
| AS-07 | Unnecessary colour shades and opacity variations | AS-17 | Excessive monospace typography |
| AS-08 | Unnecessary bordered containers | AS-18 | Unnecessary ALL-CAPS subtitles |
| AS-09 | Overly detailed diagrams | AS-19 | Unrequested gradient backgrounds |
| AS-10 | Verbose and redundant text | AS-20 | Unnecessary periods in titles |

Canonical definitions, detection criteria and severity live in
[`references/anti-slop-rules.json`](../../references/anti-slop-rules.json) and
[`references/visual-quality-policy.md`](../../references/visual-quality-policy.md).

### Enforcement principle

**The reference wins.** An indicator is acceptable only when it is
**source-supported** (visible in the reference or node data, with evidence),
**design-system-supported** (defined by project tokens or components),
**functional-requirement** (required by real data or real interaction) or
**unsupported** (none of the above — remove it).

Every verdict needs evidence: a crop coordinate, node id, token name, data
source or documented interaction. "It looks better" is not evidence and never
overrides an unsupported verdict. Use the review table in
[`references/anti-slop-review-template.md`](../../references/anti-slop-review-template.md)
with columns `Indicator`, `Detected pattern`, `Evidence in reference`,
`Justified` and `Required action`.

Motion anti-slop is checked in the same pass using `MAS-01` to `MAS-09` from
[`skills/motion-design/SKILL.md`](../motion-design/SKILL.md): unnecessary
pulsing, hover scaling on everything, excessive stagger, unjustified bouncy
springs, identical fade-ins, page-load animation, excessive blur entrances,
distracting decoration, and motion that harms accessibility or performance. The
same classification model applies: source-supported, design-system-supported,
functional-requirement or unsupported.

## Stage 9 — Implementation specification

The implementation spec is **mandatory before coding**. It is the bridge between
the memory map and the codebase, and contains: page structure and section
hierarchy; design tokens (colour, type, spacing, radius, shadow, layout);
component inventory with variants and states; image composition requirements per
image; responsive behaviour per breakpoint; interaction and motion requirements;
accessibility requirements; anti-slop review reference; unresolved questions and
their impact; confidence and evidence per section; and a fidelity acceptance
checklist.

The spec also records the motion resolved in Stage 7: each animated component,
trigger, state, duration, delay, easing, spring, stagger, enter/exit, scroll,
hover/focus, loading, responsive differences, reduced-motion alternative,
performance notes and the specialist-skill resolution record. A static
reference records the omission instead of a fabricated animation.

Use [`references/implementation-spec-template.md`](../../references/implementation-spec-template.md).
Mark anything unevidenced as `unknown`; never fill a gap with a plausible value.

## Stage 10 — Implementation

Build against the spec. Use `kumite-component-first` for component selection and
variants, `kumite-visual-assets` for image composition, and
`kumite-motion-design` in Create mode for interaction motion. Do not add motion
that Stage 7 marked unsupported, unknown or intentionally omitted.

## Stage 11 — Visual and motion audit

Compare the implementation against the reference **region by region**, at
**equivalent viewports**. A full-page comparison at a different width proves
nothing.

Compare section proportions and vertical rhythm; background surfaces and section
transitions; typography scale, weight, line height and measure; image placement,
crop, focal point and overlay; gradient direction, stops and regional extent;
button, card, badge and form treatments; spacing and padding at container and
component level; information density and visible item counts; decorative detail
the reference actually contains; and responsive transformations at each
breakpoint.

Record every difference:

| Region | Difference | Severity | Evidence | Required correction |
|--------|------------|----------|----------|---------------------|
| | | | | |

Rules:

- **No pixel-diff-only verdicts.** A diff highlights change; it does not explain
  cause or severity.
- **Functional correctness is not visual fidelity.** Working interactions do not
  excuse a wrong layout.
- **No pass without evidence.** Each region is compared, not assumed.
- Fix and re-compare. A finding is closed only after a second look.

### Motion audit

Invoke `kumite-motion-design` in **Audit** mode before acceptance. Compare the
implemented motion with the memory map and any captured interaction evidence:
trigger, states, duration, delay, easing, springs, stagger, enter/exit, scroll,
hover, focus, loading, responsive behaviour and reduced-motion handling. Record
over-motion, missing feedback, accessibility failures, performance risks and
unsupported decoration with severity, evidence and required correction. Fix
blocking and major findings, then re-audit.

Working interactions do not excuse a missing reduced-motion path, and a static
reference does not require an animation that was never observed.

## Limitations and stop conditions

- If the source is inaccessible, record the access failure and downgrade
  confidence. Do not reconstruct it from a thumbnail.
- If the reference covers one viewport, mark other breakpoints `unknown` and
  state the responsive assumption.
- If node data and screenshots disagree, log both and resolve with the user or
  source owner.
- Never invent a file key, node id, variable name, component variant, pixel
  value, licence or API capability.
- Stop and report when the evidence cannot support a decision that materially
  changes the result.

## Delivery gate

- [ ] A validated Design Memory Map exists.
- [ ] Every image has a role, crop, focal point and overlay plan.
- [ ] Motion analysis is recorded, and a static reference has no invented animation.
- [ ] The specialist motion skill was resolved and its provenance recorded.
- [ ] All 20 visual anti-slop indicators and MAS-01 to MAS-09 have a verdict and evidence.
- [ ] The implementation spec is complete, with `unknown` where unevidenced.
- [ ] Region-based fidelity comparison is recorded at equivalent viewports.
- [ ] Motion audit is complete, with `prefers-reduced-motion` verified.
