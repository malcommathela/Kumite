# Visual Quality Policy

This policy defines what is and is not acceptable in frontend implementations
produced with Kumite's guidance. It covers two different questions:

1. **Visual quality** — is every element purposeful, honest and free of
   unsupported AI decoration?
2. **Visual fidelity** — does the implementation reproduce the reference design,
   region by region, at equivalent viewports?

A page must satisfy both. It can be anti-slop-clean and still fail fidelity, and
it can be a faithful copy that still adds one unsupported decoration. Neither
result is acceptable.

The machine-readable form of this policy is
`_shared/references/anti-slop-rules.json`; reviews are checked with
`_shared/scripts/anti-slop-check.mjs`.

## Enforcement principle

The 20 indicators below are **detection defaults, not unconditional bans**. The
reference takes precedence. If the original design uses an eyebrow, a pill
button, an uppercase heading, a monospace label, section numbering, a gradient,
a border or a squircle, reproduce it faithfully. Removing a legitimate design
decision in the name of anti-slop is also a fidelity failure.

For every detected pattern, ask in this order:

1. **Does the reference do it?** If yes, it is source-supported. Cite the quote,
   measurement, region or node.
2. **Does the design system define it?** If yes, it is design-system-supported.
   Name the token, component or variant.
3. **Is it required to make the interface work or meet a real requirement?** If
   yes, it is a functional requirement. Cite the requirement.
4. **Otherwise it is unsupported AI decoration.** Remove it or replace it with
   the closest supported equivalent.

"Looks better", "feels modern", "matches current trends" and "best practice" are
not evidence. Evidence is something another reviewer can verify in the source
material.

## The 20 AI-design-slop indicators

| ID | Indicator | Typical unsupported pattern | Why it harms fidelity |
| --- | --- | --- | --- |
| AS-01 | Tags and pills | Rounded-full tag rows, invented status chips, badges beside every heading | Fragments content, implies state or filtering that does not exist, and competes with the reference hierarchy |
| AS-02 | Excessive italics | Italic body copy, italic display headings, emphasis on every second line | Adds editorial emphasis the source never made and weakens scanability |
| AS-03 | Instrument Serif or unjustified fashionable typography choices | Instrument Serif or another trend typeface swapped in without a token | Replaces the reference's voice with a current portfolio trend and breaks type metrics |
| AS-04 | Negative kerning | `tracking-tighter` applied by default, overlapping glyphs at display sizes | Changes measured type rhythm and can reduce legibility |
| AS-05 | Over-the-top detailed UI | Nested cards, invented toolbars, decorative panel chrome | Suggests functionality and depth that the product does not have |
| AS-06 | Excessive dividers | Rules between every row, borders used as rhythm | Adds visual noise and overrides the reference's use of spacing |
| AS-07 | Unnecessary colour shades and opacity variations | Five near-identical greys, arbitrary `text-white/60` steps | Bypasses colour tokens and makes states ambiguous |
| AS-08 | Unnecessary bordered containers | Borders on every card and nested card, outlined plain text | Creates boxes inside boxes and changes perceived grouping |
| AS-09 | Overly detailed diagrams | Invented architecture graphs, decorative flowcharts | Presents fictional systems as documentation |
| AS-10 | Verbose and redundant text | Three sentences saying the same thing, lists repeating the heading | Pads the page and displaces the content the reference prioritised |
| AS-11 | Unnecessary code breadcrumbs | File paths above snippets, fake step trails on static copy | Signals technical credibility that is not real |
| AS-12 | Arbitrary section numbering | 01 / 02 / 03 on unordered marketing sections | Implies a sequence the content does not have |
| AS-13 | Unrequested eyebrows | Kicker labels above every heading that restate the title | Duplicates hierarchy and adds a category nobody asked for |
| AS-14 | Dithering | Noise, grain or halftone overlays on flat surfaces | Introduces a texture the reference does not use and muddies colour |
| AS-15 | ASCII images | ASCII art, box-drawing banners, text-art logos | Substitutes decoration for authentic imagery |
| AS-16 | Unnecessary squircles | Superellipse masks on icons, avatars and images | Imports a platform style that the reference or design system does not specify |
| AS-17 | Excessive monospace typography | Monospace body copy, navigation or labels on non-technical content | Signals "developer" as a costume and disrupts reading rhythm |
| AS-18 | Unnecessary ALL-CAPS subtitles | Uppercase subheads and micro-labels added for emphasis | Shouts hierarchy that the reference expresses through size and weight |
| AS-19 | Unrequested gradient backgrounds | Mesh, aurora, radial glow or decorative linear gradients | Adds a colour story the source never had and often harms text contrast |
| AS-20 | Unnecessary periods in titles | Full stops appended to headings, card titles and navigation labels | Imitates an editorial voice rather than reproducing the reference |

The JSON rules add concrete signals, a default action and the acceptable
classifications for each indicator. Read the rule before arguing about a
specific instance.

## Classification model

Every detected indicator is classified before it can pass.

| Classification | Meaning | Required evidence | Accepted when |
| --- | --- | --- | --- |
| `source-supported` | The reference design contains the pattern | Non-empty `referenceEvidence`: a quote, measurement, viewport plus region, or node id | The review records `referenceEvidenceAvailable: true` |
| `design-system-supported` | The project's design system defines the pattern | Non-empty `designSystemReference`: token, component, variant or documented rule | The named source actually exists in the project |
| `functional-requirement` | The pattern is needed for real behaviour, content or compliance | Non-empty `requirementReference`: specification line, ordered sequence, legal requirement or state rule | The requirement is external to the agent's taste |
| `unsupported` | No source, system or requirement justifies it | None | Never — remove or replace it |

Every non-unsupported classification also needs a written `justification` and
`justified: true`. A classification without evidence is a claim, not an
exception.

### Evidence requirements in detail

- **Source-supported** evidence must be specific: "hero capture, lower third,
  scrim from `rgb(0 0 0 / 0.55)` to transparent", not "the reference looks
  gradienty". A viewport without a region is weak; a region without a
  measurement is weak; a node id without a file key is not evidence.
- **Design-system-supported** evidence must name something a developer can
  inspect: `--border`, `Card/default`, `label/uppercase`, `radius-lg`. "The
  library probably has borders" is not evidence.
- **Functional-requirement** evidence must point to a real constraint: an
  ordered onboarding sequence, a compliance statement that cannot be shortened,
  a chart that needs axes. "Users expect it" is not a requirement.
- **Unsupported** is the default. When in doubt, remove the element and compare
  the result with the reference again.

## Review table

Every implementation produces a review with all 20 indicators declared. The
required table is:

| Indicator | Detected pattern | Evidence in reference | Justified | Required action |
| --- | --- | --- | --- | --- |
| AS-18 Unnecessary ALL-CAPS subtitles | Uppercase subheads above pricing groups | Hero capture at 1440px — uppercase 12px, `0.08em` tracking | Yes | keep |
| AS-19 Unrequested gradient backgrounds | Dark-to-transparent scrim behind hero copy | Hero capture at 1440px — `rgb(0 0 0 / 0.55)` to transparent, lower third | Yes | keep |
| AS-19 Unrequested gradient backgrounds | Radial glow behind the hero | None | No | remove |
| AS-08 Unnecessary bordered containers | Border around every paragraph | None | No | remove |

Worked result: the first two rows are source-supported and pass. The radial
glow has no evidence, so it fails with `UNSUPPORTED_ADDITION`. The paragraph
borders also fail and must be removed. The overall verdict is `fail` until both
unsupported rows are fixed.

The companion template is `_shared/references/anti-slop-review-template.md`.

## Prohibited patterns

The original integrity rules remain in force. They are not replaced by the
anti-slop indicators.

### Fake operational indicators

- Mock battery, signal strength, or time status bars
- Invented uptime percentages (e.g. "99.9% uptime" with no real data)
- Fabricated server status dashboards
- Fake "live" monitoring widgets with generated data

### Unnecessary decorative elements

- Floating abstract 3D spheres or blobs
- Generic 3D decorations without functional purpose
- Particle effects or animated backgrounds without design intent
- Random gradient overlays for visual complexity

### AI-generated visual content

- Generated photographs used as placeholder content
- AI illustrations used as decorative filler
- Deepfake-style avatar images

### Visual noise

- Gratuitous blur, glow or shadow effects
- Animations that serve no interaction purpose
- Excessive colour without design-system backing
- Ornamental borders, dividers or decorative elements

These map onto the indicators without exhausting them. A fake uptime badge is
also AS-01 when rendered as a pill, but it fails the stronger rule: fabricated
data is never acceptable, even if a reference happens to contain a similar
badge. Fidelity never authorises invented facts.

## Permitted alternatives

### When real data exists

- Display actual application status from real data sources
- Show genuine metrics and monitoring from connected systems
- Use real user avatars and content

### When real data is unavailable

- Use well-designed empty states
- Show clear placeholder indicators ("Add your photo")
- Use skeleton loading states for deferred content
- Prefer clean, minimal layouts over fabricated content

### When 3D or animation is justified

- Product visualisation (e-commerce, configurators)
- Data visualisation (charts, graphs, maps)
- Interaction feedback (button press, drag confirmation)
- Branding elements specified by the design system

The same evidence discipline applies: a justified 3D object needs a product,
data or brand source, not a gap in the layout.

## How anti-slop differs from visual fidelity

Anti-slop asks **"should this element exist?"** Fidelity asks **"does this
element match the reference?"**

| Scenario | Anti-slop | Fidelity |
| --- | --- | --- |
| Clean page that ignores the reference's two-column hero | Pass | Fail |
| Faithful copy with an extra tag-pill row | Fail | Partial |
| Reference uses uppercase labels and the implementation copies them | Pass | Pass |
| Reference uses no borders and the implementation adds cards | Fail | Fail |

Consequences:

- A passing anti-slop verdict is not evidence of fidelity.
- A close pixel match does not excuse fabricated content or unsupported
  decoration.
- Fixing a fidelity discrepancy may legitimately reintroduce a pattern from the
  indicator list. That is allowed when the reference supports it and the review
  records the evidence.

## Region-based visual fidelity QA

Whole-page impressions hide local errors. Compare the reference and the
implementation **region by region, at equivalent viewports**, and record what
was compared.

### Viewport equivalence

Before comparing, make the two captures comparable:

- Same CSS viewport width and height (for example 390, 768 and 1440 CSS px).
- Same device pixel ratio and zoom.
- Same theme, locale, font loading state and content state.
- Same scroll position for the region, or a full-page capture at the same width.
- Fixed or frozen data for dynamic regions.

A comparison at 1440px against a 1280px capture is not evidence.

### Region table

Define regions from the reference evidence record and its captures, then compare
each one. The rows below are illustrative; replace the sources and measurements
with real evidence from the capture:

| Region | Reference source | Implementation region | Checks | Result |
| --- | --- | --- | --- | --- |
| Header and navigation | Hero capture, top 96px | `/` header | Height, logo size, link order, spacing, border | match / discrepancy |
| Hero | Hero capture, 0-720px | `/` hero section | Grid, type scale, image crop, overlay, CTA variant | match / discrepancy |
| Primary content | Full-page capture, sections 1-4 | `/` main | Column widths, gaps, headings, body size | match / discrepancy |
| Data or cards | Full-page capture, pricing | `/` pricing | Card count, border, radius, padding, alignment | match / discrepancy |
| Footer | Mobile capture, final screen | `/` footer | Link groups, order, spacing, legal text | match / discrepancy |

Every row needs a source and a result. "Looks close" is not a result.

### Procedure

1. Load the reference evidence record and confirm which capture covers each
   region.
2. Capture the implementation at the same viewport and state as the reference.
3. Compare structure first: region order, grid, column count, alignment.
4. Compare type: family, size, weight, line-height, tracking, case.
5. Compare spacing: section rhythm, padding, gaps, container widths.
6. Compare colour and surface: tokens, borders, radii, shadows, gradients.
7. Compare components and states: variants, icon set, hover, focus, disabled.
8. Compare content: labels, order, punctuation, truncation.
9. Record each difference with evidence and severity.
10. Correct the highest severity first, then re-capture and re-compare.

### Discrepancy report

Illustrative rows, with the evidence each finding needs:

| Region | Difference | Severity | Evidence | Required correction |
| --- | --- | --- | --- | --- |
| Hero | Headline is 48px instead of 64px | major | Reference crop vs implementation crop; computed `font-size` | Use the display type token at the reference size |
| Pricing | Cards use `radius-md` instead of `radius-lg` | minor | Reference crop and computed radius | Apply the card radius token |
| Header | Navigation order differs | blocking | Reference top bar vs implementation | Restore the reference order |
| Footer | Extra divider above legal text | minor | Reference has spacing only | Remove the divider |

Severity definitions:

- **blocking** — wrong content, missing or extra regions, broken interaction,
  inaccessible contrast, or a discrepancy that changes meaning.
- **major** — wrong type scale, structure, spacing system or component variant;
  visible at normal viewing distance.
- **minor** — small token, alignment or punctuation differences that do not
  change meaning.

### Do not rely on pixel diff alone

Pixel differences are useful for locating change, not for judging fidelity.
They flag anti-aliasing, font rasterisation and image compression as loudly as
a wrong heading size, and they miss semantic errors such as swapped labels with
identical dimensions. Use pixel diff as a pointer, then confirm with region
crops, measurements and computed styles.

### Separate functional correctness from visual fidelity

A working page is not a faithful page, and a faithful page is not necessarily
correct. Record them separately:

- **Functional**: navigation works, forms submit, states change, keyboard access
  works, no console errors.
- **Visual**: regions, type, spacing, colour, components and content match the
  reference at equivalent viewports.

Do not close a fidelity finding because the interaction works. Do not close a
functional bug because the page looks right.

## Motion quality

Motion is governed by the same evidence principle and by
`.agents/skills/kumite-motion-design/SKILL.md`, which resolves the specialist
`design-motion-principles` skill. Motion is acceptable only when it is
source-supported, design-system-supported or a functional requirement.

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

`prefers-reduced-motion`, keyboard behaviour, focus visibility, touch feedback,
interruptibility and animated properties are hard requirements. Static
references record the absence of motion; they never justify invented animation.

## Enforcement

This policy is enforced by the `kumite-design-quality` skill.

Before implementation:

- check the planned additions against the 20 indicators;
- record planned exceptions with their classification and evidence.

After implementation:

- complete `_shared/references/anti-slop-review-template.md` for all 20 indicators;
- review MAS-01 to MAS-09 and run the motion audit;
- run the checker;
- complete the region-based fidelity comparison;
- deliver only when the anti-slop verdict, the fidelity review and the motion
  audit pass.

```sh
node _shared/scripts/anti-slop-check.mjs path/to/review.json
node _shared/scripts/anti-slop-check.mjs path/to/review.json --rules _shared/references/anti-slop-rules.json --json
```

Exit code `0` means pass, `1` means at least one violation, and `2` means the
arguments or input could not be read. The evaluator never trusts the verdict
written in the document: it recomputes the verdict from the declared evidence.
