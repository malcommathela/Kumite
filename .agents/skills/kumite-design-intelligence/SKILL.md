---
name: kumite-design-intelligence
description: >-
  Route reference-based and taste-led frontend work into the correct Kumite
  experience pipeline and enforce the evidence model. Chooses Content Experience
  for pages and sites, Product Experience for app surfaces, and hands off to
  discovery, taste, Figma extraction, component intelligence, visual assets,
  design system, motion and quality. Use whenever an agent is about to implement
  UI from a screenshot, live page, Figma file, video or design board, or is asked
  to match, recreate or reproduce an interface.
---

# Design Intelligence

Turn a brief or reference into an implementation that is structurally faithful,
visually coherent and verifiable — without inventing what the source does not
show. This skill is a router and an evidence contract, not a second pipeline.

## Choose the pipeline first

| The work is… | Pipeline |
|---|---|
| A marketing page, landing page, editorial feature, portfolio, campaign page or brand site | `pipelines/content-experience/CONTEXT.md` |
| An app screen, dashboard, settings page, tool, onboarding or multi-step flow | `pipelines/product-experience/CONTEXT.md` |
| Greenfield with no reference | Run `kumite-taste`, then the chosen pipeline |

Read the chosen pipeline's `CONTEXT.md`, then only the current stage's contract.
Do not load both pipelines or every stage at once.

## The six stages

| Stage | Content | Product |
|---|---|---|
| 01 Brief | Frame the content brief | Frame the product problem |
| 02 Taste | Record visual taste | Record visual and interaction taste |
| 03 Reference / System | Decompose selected references | Inventory and extend the system |
| 04 Direction | Propose and approve the direction | Propose and approve the direction |
| 05 Motion | Discover, select and approve motion | Discover, select and approve motion |
| 06 Build | Build at checkpoints, then verify | Build at checkpoints, then verify |

Direction and motion approval are separate gates. A visual approval never
authorises motion.

## What the pipeline replaces

The former Design Memory Map is not part of the current architecture. Do not
recreate it. A project keeps only the evidence it needs, in its own `output/`,
`reference/` or `taste/` folder.

There is no replacement global schema. The minimum contract is:

- every value has a confidence label: `exact`, `measured`, `estimated` or
  `unknown`;
- every value has a traceable source: node id, crop coordinates, computed-style
  selector, token name, reference id or written brief;
- the rendered view and the structural view stay separate;
- the reference is evidence, not a licence to copy.

The full rule set is
[`_shared/references/evidence-and-confidence.md`](../../_shared/references/evidence-and-confidence.md).

## Stage handoffs

| Stage | Supplied by | Output |
|---|---|---|
| Brief | This skill + the user | Audience, job, real content, constraints, unknowns |
| Taste | `kumite-taste`, `kumite-design-discovery` | Taste profile, selection board, multi-select qualities |
| Reference / System | `kumite-figma-integration`, the adapters, `kumite-design-system` | Ten-quality evidence, confidence, limits, system inventory |
| Direction | `kumite-taste`, `kumite-design-system`, `kumite-component-intelligence` | Concept, conflicts, concept frame, tokens, spec, approval |
| Motion | `kumite-motion-design` + the GSAP skills | Separate motion approval and engineering spec |
| Build | `kumite-component-first`, `kumite-visual-assets`, `kumite-motion-design` | Checkpointed implementation |
| Verify | `kumite-design-quality` + `kumite-motion-design` | Anti-slop verdict, fidelity report, motion audit |

Hand a stage only the evidence it needs. "Looks like the reference" is not
evidence.

## Evidence authority

| Source | Authoritative for | Not authoritative for |
|---|---|---|
| Figma node data | Node ids, layout geometry, padding/gap, constraints, variables, variants, exports, prototype settings | Final rendered appearance |
| Screenshot or image | Rendered appearance, type rendering, crop, overlay, density, verification | Node identity, variable names, exact spacing |
| Live DOM + computed styles | Measured values at the inspected viewport | Design intent, other breakpoints |
| Video or recording | Sequence, approximate timing, easing feel, pointer feedback | Values hidden by compression |
| Component source | Markup, dependencies, states, accessibility | The visual direction it should serve |
| Written brief | Intent, constraints, audience | Visual detail |

**A screenshot can suggest a 24 px gap. It cannot prove one.** Never present a
pixel-read value as an exact node-derived value. When sources disagree, record
both and state which one the implementation follows.

## Taste and direction

Taste is elicited with visual examples, not adjectives. Record the answer in
`taste/profile.json` and `taste/selection-board.json`. The board supports
multi-select qualities: a card may be kept for typography and rejected for
colour.

- [`_shared/foundations/taste-profile.md`](../../_shared/foundations/taste-profile.md)
- [`_shared/foundations/selection-board.md`](../../_shared/foundations/selection-board.md)
- [`_shared/foundations/reference-decomposition.md`](../../_shared/foundations/reference-decomposition.md)
- [`_shared/foundations/conflict-resolution.md`](../../_shared/foundations/conflict-resolution.md)
- [`_shared/foundations/direction-approval.md`](../../_shared/foundations/direction-approval.md)
- [`_shared/foundations/design-system.md`](../../_shared/foundations/design-system.md)
- [`_shared/foundations/implementation-checkpoints.md`](../../_shared/foundations/implementation-checkpoints.md)
- [`_shared/foundations/responsive-and-accessibility.md`](../../_shared/foundations/responsive-and-accessibility.md)

## Reference intelligence

Use the adapter that matches the source:

- [`screenshot.md`](../../_shared/reference-intelligence/adapters/screenshot.md)
- [`live-page.md`](../../_shared/reference-intelligence/adapters/live-page.md)
- [`figma.md`](../../_shared/reference-intelligence/adapters/figma.md)
- [`video.md`](../../_shared/reference-intelligence/adapters/video.md)
- [`component-source.md`](../../_shared/reference-intelligence/adapters/component-source.md)
- [`21st-dev.md`](../../_shared/reference-intelligence/adapters/21st-dev.md)
- [`sitepeel.md`](../../_shared/reference-intelligence/adapters/sitepeel.md)
- [`showcase/gsap.md`](../../_shared/reference-intelligence/showcase/gsap.md)

SitePeel is configured globally and was verified on 2026-11-07 with a free
allowance call. Re-check at the start of a run; a configured endpoint is not a
verified connection.

## Region decomposition

Never implement from a full-page glance. Decompose in five passes:

1. **Page composition** — height, section order, vertical rhythm, fold,
   background changes.
2. **Sections** — bounds, background, container, padding, grid, alignment,
   media.
3. **Components** — identity, repeats, variants, states.
4. **Detail** — type scale and weight, icon size and stroke, borders, radii,
   shadows, dividers, focus and hover hints, overlay direction, focal point.
5. **Responsive** — the same regions at each evidenced viewport.

Record crop coordinates and viewport for every measurement. Enlargement does not
create source detail.

## Quality gates

- **Image composition** — role, focal point, text-safe area, crop and overlay
  plan before styling. See
  [`_shared/references/image-composition-intelligence.md`](../../_shared/references/image-composition-intelligence.md).
- **Anti-slop** — AS-01 to AS-20 before implementation and again before delivery.
  See [`_shared/references/anti-slop-rules.json`](../../_shared/references/anti-slop-rules.json).
- **Motion** — discover, select and approve separately; audit before accepting;
  leave static references static. See `kumite-motion-design`.
- **Fidelity** — region by region at equivalent viewports. A pixel diff is a
  pointer, not proof.

## Stop conditions

- The source is inaccessible: record the failure and downgrade confidence. Do
  not reconstruct it from a thumbnail.
- The reference covers one viewport: mark other breakpoints `unknown`.
- Node data and screenshots disagree: log both.
- Never invent a file key, node id, variable, variant, pixel value, licence or
  API capability.
- Stop when the evidence cannot support a decision that materially changes the
  result.
- Stop when direction or motion approval is missing.

## Delivery gate

- [ ] The correct pipeline was chosen and its six stages ran in order.
- [ ] Taste was asked with visual examples and recorded.
- [ ] Every value has a confidence and a source.
- [ ] Conflicts were resolved explicitly, not averaged.
- [ ] Direction and motion were approved separately.
- [ ] Every image has a role, crop, focal point and overlay plan.
- [ ] Motion was analysed before implementation and audited before acceptance.
- [ ] A static reference gained no invented animation.
- [ ] AS-01 to AS-20 and MAS-01 to MAS-09 have a verdict and evidence.
- [ ] The implementation spec is complete, with `unknown` where unevidenced.
- [ ] Region-based fidelity is recorded at equivalent viewports.
- [ ] `prefers-reduced-motion`, keyboard, focus and touch were verified.
- [ ] Mid-course changes were impact-checked and unaffected work preserved.
