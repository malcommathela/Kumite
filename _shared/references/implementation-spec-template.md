# Implementation Specification Template

A fill-in specification for implementing frontend UI from a design reference.
Complete it **before** writing code. Every field traces to a source; anything
unevidenced is marked `unknown`, never guessed.

Related artefacts:

- Reference evidence: [`evidence-and-confidence.md`](evidence-and-confidence.md),
  [`reference-intelligence.md`](reference-intelligence.md)
- Image composition method: [`image-composition-intelligence.md`](image-composition-intelligence.md)
- Anti-slop review: [`anti-slop-rules.json`](anti-slop-rules.json),
  [`anti-slop-review-template.md`](anti-slop-review-template.md)
- Quality policy: [`visual-quality-policy.md`](visual-quality-policy.md)

---

## 1. Source and evidence

| Field | Value |
|-------|-------|
| Source type | screenshot / image / webpage / Figma file / mixed |
| Source identity | URL, file key, node id, or image path |
| Community URL / ID | |
| Resolved design URL / file key | |
| Author | |
| Licence and attribution | |
| Access method | direct MCP / duplication / capture / provided file |
| Access limitations | |
| Capture viewports | |
| Capture date | |
| Evidence index | crops, node ids, token names, computed-style sources |

**Unavailable information:** list what could not be obtained and how that lowers
confidence downstream.

---

## 2. Confidence legend

| Marker | Meaning | Use for |
|--------|---------|---------|
| `exact` | Structured node data, variable or source token | Measurable layout, tokens, variants |
| `measured` | Defined crop or computed style at a stated viewport | Rendered appearance values |
| `estimated` | Inferred from visual proportion | Non-critical relationships only |
| `unknown` | Not evidenced | Anything that would otherwise be a guess |

A value may never move up a level without new evidence.

---

## 3. Page structure and section order

| # | Section | Purpose | Background | Container | Height | Confidence | Evidence |
|---|---------|---------|------------|-----------|--------|------------|----------|
| 1 | | | | | | | |

**Page-level layout:** max content width, outer gutters, grid columns, gap,
vertical rhythm.

**Fold and above-the-fold composition:** what must be visible at each evidenced
viewport.

---

## 4. Design tokens

### Colour

| Token | Value | Role | Confidence | Evidence |
|-------|-------|------|------------|----------|
| surface | | | | |
| raised surface | | | | |
| text | | | | |
| muted text | | | | |
| border | | | | |
| accent | | | | |
| semantic states | | | | |

### Typography

| Role | Family | Size | Weight | Line height | Tracking | Confidence | Evidence |
|------|--------|------|--------|-------------|----------|------------|----------|
| display | | | | | | | |
| heading | | | | | | | |
| body | | | | | | | |
| label | | | | | | | |
| caption | | | | | | | |

### Spacing

| Token | Value | Use | Confidence | Evidence |
|-------|-------|-----|------------|----------|
| | | | | |

### Radius, border and shadow

| Token | Value | Use | Confidence | Evidence |
|-------|-------|-----|------------|----------|
| | | | | |

### Layout

| Property | Value | Confidence | Evidence |
|----------|-------|------------|----------|
| container width | | | |
| gutter | | | |
| grid | | | |
| breakpoints | | | |

---

## 5. Component inventory

| Component | Reference instance | Project primitive | Reuse or build | Variants used | Confidence | Evidence |
|-----------|--------------------|-------------------|----------------|---------------|------------|----------|
| | | | | | | |

For each component, record:

- **Anatomy:** parts, order, slots.
- **Variants:** every distinct reference variant, not a collapsed default.
- **States:** default, hover, focus, active, disabled, loading, error, empty.
- **Sizes:** and what changes between them.
- **Props implemented:** names and values actually used.
- **Deviation:** any difference from the reference, its reason and evidence.

---

## 6. Image composition requirements

| Image | Role | Source asset | Licence | Focal point | Text-safe area | Aspect ratio | Crop bounds | Rendered size | Resolution | Object-fit / position | Overlay | Responsive crop | Confidence |
|-------|------|--------------|---------|-------------|----------------|--------------|-------------|---------------|------------|-----------------------|---------|-----------------|------------|
| | | | | | | | | | | | | | |

**Layering:** image layer / gradient overlay layer / content layer, with the
overlay's direction, stops, opacity and regional extent.

**Selection rule:** reject a subject-correct but composition-incompatible image
and search for a better authentic one. Never substitute an AI-generated
photograph.

**After-integration verification:** coverage at each viewport, focal point in
frame, crop matches reference, text contrast over the image.

---

## 7. Responsive behaviour

| Breakpoint | Container | Grid | Type scale | Image behaviour | Nav behaviour | Visible/hidden elements | Evidence |
|------------|-----------|------|------------|-----------------|---------------|-------------------------|----------|
| | | | | | | | |

State which breakpoints are evidenced and which are inferred. Inferred
breakpoints carry `estimated` confidence at most.

---

## 8. Interaction and motion requirements

### Specialist motion skill resolution

| Field | Value |
|-------|-------|
| Resolution method | installed / github-fallback |
| Skill | `design-motion-principles` |
| Source | installed skill directory / repository URL |
| Version or commit | declared version / commit / not declared |
| Licence | declared licence / not declared |
| Loaded resources | |
| Limitations | |

### Motion

| Element | Trigger | States | Duration | Delay | Easing / spring | Stagger | Enter / exit | Scroll | Hover / focus | Loading | Responsive | Reduced motion | Performance | Classification | Confidence | Evidence |
|---------|---------|--------|----------|-------|-----------------|---------|--------------|--------|---------------|---------|------------|----------------|-------------|----------------|------------|----------|
| | | | | | | | | | | | | | | | | |

For each element record the motion identity and style, and whether the motion is
**source-supported**, **design-system-supported**, a **functional requirement** or
**intentionally omitted**. Record source-supported, functional and omitted motion
in the project's `reference-evidence.json` motion section.

No motion without a communication purpose. Any animation absent from the source
is unsupported. A static reference records the omission; it does not require an
invented animation. `prefers-reduced-motion`, keyboard behaviour, focus
visibility, touch feedback, interruptibility and animated properties are hard
requirements.

### Motion anti-slop

| Field | Value |
|-------|-------|
| Patterns checked | MAS-01 … MAS-09 |
| Policy | `_shared/motion/README.md` |
| Source-supported motion | |
| Functional additions | |
| Intentionally omitted motion | |
| Findings and required corrections | |
| Motion audit verdict | not started / pass / conditional pass / fail |

---

## 9. Accessibility requirements

| Requirement | Target | Verified by | Status |
|-------------|--------|-------------|--------|
| Colour contrast | WCAG 2.1 AA minimum | | |
| Keyboard navigation | All interactive elements | | |
| Focus visibility | Visible indicator on every control | | |
| Semantic structure | Headings, landmarks, lists | | |
| Accessible names | Labels for icon-only controls | | |
| Image alternatives | Meaningful `alt`, decorative `alt=""` | | |
| Reduced motion | Honours `prefers-reduced-motion` | | |
| Touch targets | Adequate size and spacing | | |

---

## 10. Anti-slop review reference

| Field | Value |
|-------|-------|
| Rules version | `anti-slop-rules.json` (AS-01 … AS-20) |
| Review table | `anti-slop-review-template.md` |
| Reference evidence available | `true` / `false` |
| Review status | not started / in review / passed |
| Unsupported findings | count and owners |
| Source-supported exceptions | indicator, evidence |
| Design-system exceptions | token, component or variant |
| Functional-requirement exceptions | requirement reference |

---

## 11. Unresolved questions

| # | Question | Impact if unresolved | Owner | Deadline | Fallback |
|---|----------|----------------------|-------|----------|----------|
| 1 | | | | | |

An unresolved question that changes layout, tokens or imagery blocks
implementation until answered or explicitly accepted as `unknown`.

---

## 12. Fidelity acceptance checklist

Compare region by region at equivalent viewports. Attach evidence per row.

- [ ] Section proportions and vertical rhythm match.
- [ ] Background surfaces and section transitions match.
- [ ] Typography scale, weight, line height and measure match.
- [ ] Image placement, crop, focal point and overlay match.
- [ ] Gradient direction, stops and regional extent match.
- [ ] Buttons, cards, badges and forms match their reference variants.
- [ ] Spacing and padding match at container and component level.
- [ ] Density and visible item counts match.
- [ ] Decorative detail is present only where the reference has it.
- [ ] Responsive transformations match at every evidenced breakpoint.
- [ ] No visual anti-slop indicator remains unsupported.
- [ ] Motion matches the recorded triggers, timing and easing.
- [ ] MAS-01 to MAS-09 are reviewed with evidence.
- [ ] `prefers-reduced-motion` removes or replaces non-essential motion.
- [ ] Motion audit findings are closed and re-checked.
- [ ] Accessibility baseline verified on the rendered output.

| Region | Difference | Severity | Evidence | Required correction |
|--------|------------|----------|----------|---------------------|
| | | | | |

**Motion findings:**

| Element | Finding | Severity | Evidence | Required correction |
|---------|---------|----------|----------|---------------------|
| | | | | |

**Verdict:** pass / conditional pass / fail — with the evidence that supports it,
across both visual fidelity and motion.
