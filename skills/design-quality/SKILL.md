---
name: kumite-design-quality
description: >-
  Enforce visual quality and reference fidelity in frontend implementations.
  Checks the 20 visual anti-slop indicators (AS-01 to AS-20) and the nine motion
  anti-slop patterns (MAS-01 to MAS-09) with evidence-based exceptions, then
  verifies region-based visual fidelity and motion behaviour against the Design
  Memory Map and reference captures at equivalent viewports. Use before and after
  implementing any frontend interface, and whenever reviewing generated UI for
  unsupported decoration, invented data, visual drift or motion overreach.
---

# Design Quality Enforcement

Verify that every visual element serves a purpose, is evidenced by the reference
or design system, and matches the source at the right viewport.

## When to use

- Before implementing a reference-based page or component.
- After implementation, before delivery or review.
- When reviewing AI-generated frontend code for unsupported decoration.
- When a design looks plausible but does not match the reference.
- When reviewing motion for excess, missing feedback, reduced-motion coverage or
  performance problems.
- When the user asks for a design review, quality check, fidelity audit or motion
  audit.

Read `references/visual-quality-policy.md` for the full policy and
`references/anti-slop-rules.json` for the machine-readable rules.

## Pre-implementation policy check

1. Load the Design Memory Map produced by `kumite-design-intelligence` and
   validate it against `references/design-memory-schema.json`. Confirm which
   viewport and region each value comes from.
2. List every non-content visual device you intend to add: pills, eyebrows,
   uppercase labels, gradients, borders, numbering, monospace, icons, dividers.
3. List every motion you intend to add: entrance, hover, focus, press, loading,
   stagger, scroll-linked, page-load, decorative loop.
4. Check the lists against AS-01 to AS-20 and MAS-01 to MAS-09.
5. For each device and motion, decide: source-supported,
   design-system-supported, functional requirement, or unsupported.
6. Record the evidence before coding. If you cannot cite it, do not build it.
7. Prefer existing components and tokens. If the design system already defines
   the pattern, use its variant rather than rebuilding it.

Do not code from a full-page glance. The Design Memory Map is the source of
truth for values; screenshots are evidence for composition, not node data.

## The 20 anti-slop indicators

These are detection defaults, not unconditional bans. The reference wins.

| ID | Indicator |
| --- | --- |
| AS-01 | Tags and pills |
| AS-02 | Excessive italics |
| AS-03 | Instrument Serif or unjustified fashionable typography choices |
| AS-04 | Negative kerning |
| AS-05 | Over-the-top detailed UI |
| AS-06 | Excessive dividers |
| AS-07 | Unnecessary colour shades and opacity variations |
| AS-08 | Unnecessary bordered containers |
| AS-09 | Overly detailed diagrams |
| AS-10 | Verbose and redundant text |
| AS-11 | Unnecessary code breadcrumbs |
| AS-12 | Arbitrary section numbering |
| AS-13 | Unrequested eyebrows |
| AS-14 | Dithering |
| AS-15 | ASCII images |
| AS-16 | Unnecessary squircles |
| AS-17 | Excessive monospace typography |
| AS-18 | Unnecessary ALL-CAPS subtitles |
| AS-19 | Unrequested gradient backgrounds |
| AS-20 | Unnecessary periods in titles |

Flag the pattern when it is added by the implementation. Do not flag it merely
because it exists in the reference.

## Evidence-based exceptions

| Classification | Evidence required | Example |
| --- | --- | --- |
| `source-supported` | Quote, measurement, viewport plus region, or node id in `referenceEvidence` | "Hero capture at 1440px, lower third: `rgb(0 0 0 / 0.55)` to transparent scrim" |
| `design-system-supported` | Token, component or variant in `designSystemReference` | "`Card/default`, border token `--border`" |
| `functional-requirement` | Specification, ordered sequence or compliance line in `requirementReference` | "Onboarding spec: steps 1-4 unlock in order" |
| `unsupported` | None | Remove or replace the addition |

Every exception also needs a written `justification` and `justified: true`.
`referenceEvidenceAvailable` must be `true` for any source-supported claim.

Typical accepted exceptions:

- A reference hero uses a text-protection gradient: source-supported.
- A design system defines a bordered card variant: design-system-supported.
- Onboarding steps have a real order: functional-requirement.
- The reference uses uppercase subheads, monospace labels, eyebrows, pills or a
  single full stop in a display heading: reproduce them.

Typical rejected justifications: "looks modern", "adds visual interest",
"matches current design trends", "best practice", "the page felt empty".

## Review table

Complete all 20 rows, including undetected ones:

| Indicator | Detected pattern | Evidence in reference | Justified | Required action |
| --- | --- | --- | --- | --- |
| AS-19 | Radial glow behind the hero | None | No | remove |
| AS-19 | Hero text-protection scrim | Hero capture at 1440px, lower third, `rgb(0 0 0 / 0.55)` to transparent | Yes | keep |
| AS-18 | Uppercase pricing subheads | Hero capture at 1440px, 12px, `0.08em` tracking | Yes | keep |

Use `references/anti-slop-review-template.md` for the fill-in document and JSON
skeleton.

## Motion anti-slop

Motion is reviewed with the same evidence model, through `kumite-motion-design`
and its resolved specialist skill. The canonical policy and detection heuristics
are in [`skills/motion-design/SKILL.md`](../motion-design/SKILL.md). The short
index:

| ID | Pattern to prevent |
| --- | --- |
| MAS-01 | Unnecessary pulsing indicators |
| MAS-02 | Hover scaling on every element |
| MAS-03 | Excessive stagger animations |
| MAS-04 | Unjustified bouncy springs |
| MAS-05 | Identical fade-ins across all sections |
| MAS-06 | Unnecessary page-load animations |
| MAS-07 | Excessive blur entrances |
| MAS-08 | Distracting decorative animation |
| MAS-09 | Motion that harms accessibility or performance |

A motion pattern passes only when it is source-supported,
design-system-supported or a functional requirement, and the evidence is
recorded. Static references carry no motion requirement: their absence is the
correct result. `prefers-reduced-motion` coverage, keyboard behaviour, focus
visibility, touch feedback, interruptibility and animated properties are checked
as hard requirements, not polish.

## Post-implementation region-based fidelity

Whole-page screenshots hide local errors. Compare region by region at equivalent
viewports.

### 1. Match the viewports

Same CSS width and height, device pixel ratio, zoom, theme, locale, font state
and content state. A 1440px reference is not comparable with a 1280px capture.

### 2. Define regions

Use the Design Memory Map and the reference: header, hero, primary content,
cards or data, forms, footer, mobile navigation. Give each region a reference
source and an implementation selector.

### 3. Compare each region

- Structure: order, grid, columns, alignment, visible regions.
- Type: family, size, weight, line-height, tracking, case.
- Spacing: section rhythm, padding, gaps, container width.
- Colour and surface: tokens, borders, radii, shadows, gradients, overlays.
- Components and states: variant, icon set, hover, focus, disabled.
- Content: labels, order, punctuation, truncation, empty states.

### 4. Record discrepancies

| Region | Difference | Severity | Evidence | Required correction |
| --- | --- | --- | --- | --- |
| Hero | Headline 48px instead of 64px | major | Reference crop vs implementation; computed `font-size` | Apply the display type token |
| Header | Navigation order differs | blocking | Reference top bar vs implementation | Restore reference order |
| Pricing | Radius token mismatch | minor | Reference crop; computed radius | Use the card radius token |

Severity: **blocking** changes meaning, content or access; **major** is a visible
type, structure, spacing or variant error; **minor** is a small token,
alignment or punctuation difference.

### 5. Correct and re-check

Fix blocking issues first. Re-capture at the same viewport and re-compare the
affected region. Do not close a finding without new evidence.

Pixel diff is a pointer, not proof. It flags anti-aliasing and compression as
loudly as a wrong type size, and it misses swapped labels of equal dimensions.

## Motion audit

Run `kumite-motion-design` in Audit mode before acceptance whenever the
implementation has motion or the reference evidences interaction. Compare the
rendered motion with the Design Memory `motion` section and any recorded
evidence.

Check:

- **Presence:** every animated element has a communication purpose; no
  unsupported decoration.
- **Gaps:** state changes, conditional renders, modals, toasts, expandable
  regions, loading swaps and mode switches provide feedback without delay.
- **Restraint:** MAS-01 to MAS-09 are reviewed; a single intentional use is not
  treated as slop, but repeated uniform motion is.
- **Timing:** duration, delay, easing and springs match the source or the
  documented functional requirement.
- **Accessibility:** `prefers-reduced-motion` removes or replaces non-essential
  motion; keyboard actions are not delayed; focus remains visible; touch does not
  depend on hover.
- **Performance:** only `transform`, `opacity` and `filter` animate continuously;
  no layout thrash, blocked input or jank.

Record findings with severity, evidence and required correction. A working page
with an inaccessible animation is not accepted.

## Accessibility baseline

Every implementation must meet:

- WCAG 2.1 AA colour contrast for text and meaningful UI.
- Keyboard navigability for all interactive elements.
- Semantic HTML structure: headings, landmarks, lists, buttons and links.
- Accessible names for elements without visible text.
- Visible focus indicators.
- Reduced-motion handling for non-essential motion.
- Images with appropriate alternative text or deliberate decorative marking.

Accessibility failures are blocking. They are not "visual polish".

## Functional correctness versus visual fidelity

Check and report them separately:

- **Functional**: navigation, forms, state changes, keyboard access, console
  errors, responsive behaviour.
- **Visual**: region structure, type, spacing, colour, components and content
  against the reference.

A working interaction does not close a fidelity finding. A matching screenshot
does not close a functional bug.

## Verification commands

```sh
node scripts/anti-slop-check.mjs path/to/review.json
node scripts/anti-slop-check.mjs path/to/review.json --rules references/anti-slop-rules.json --json
node --test "tests/**/*.test.mjs"
```

Exit `0` means the anti-slop review passes, `1` means at least one violation,
`2` means the input could not be read. The evaluator recomputes the verdict; a
document that claims `pass` without evidence still fails.

## Related references

- `references/visual-quality-policy.md` — full policy, indicators and fidelity QA.
- `references/anti-slop-rules.json` — machine-readable rules and signals.
- `references/anti-slop-review-template.md` — fill-in review and JSON skeleton.
- `references/design-memory-schema.json` — schema for the Design Memory Map,
  including the optional motion section.
- [`skills/motion-design/SKILL.md`](../motion-design/SKILL.md) — specialist skill
  resolution, Create and Audit workflows, and MAS-01 to MAS-09.
- The Design Memory Map produced by `kumite-design-intelligence` — source of
  truth for extracted values and their confidence.
