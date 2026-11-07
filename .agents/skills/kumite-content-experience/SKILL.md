---
name: kumite-content-experience
description: >-
  Route content-led frontend work through Kumite's six-stage Content Experience
  pipeline: frame the brief, discover and record taste, decompose the selected
  references, approve a direction, approve motion separately, then build and
  verify. Use for marketing pages, landing pages, editorial features, portfolios,
  campaign pages and brand sites where the page's job is to communicate, persuade
  or present.
---

# Content Experience

A content page is an argument made visible. This skill routes the work into the
pipeline that keeps the argument, the composition, the taste and the evidence
aligned.

## When to use

- A marketing page, landing page, editorial feature, portfolio, campaign page or
  brand site.
- The work is driven by a brief, references or both.
- The page must communicate, persuade or present rather than run a product task.

Use `kumite-product-experience` instead for app screens, dashboards, tools,
onboarding and multi-step flows.

## The pipeline

Read and run the stages in order:

| Stage | Contract | Job |
|---|---|---|
| `01_brief` | `pipelines/content-experience/01_brief/CONTEXT.md` | Frame the content brief |
| `02_taste` | `pipelines/content-experience/02_taste/CONTEXT.md` | Discover and record taste |
| `03_reference` | `pipelines/content-experience/03_reference/CONTEXT.md` | Decompose the selected references |
| `04_direction` | `pipelines/content-experience/04_direction/CONTEXT.md` | Propose and approve the direction |
| `05_motion` | `pipelines/content-experience/05_motion/CONTEXT.md` | Discover, select and approve motion |
| `06_build` | `pipelines/content-experience/06_build/CONTEXT.md` | Build at checkpoints, then verify |

The pipeline router is `pipelines/content-experience/CONTEXT.md`. Read it first,
then the current stage's contract. Do not load every stage at once.

## What each stage must produce

1. **Brief** — audience, page job, one primary action, real content per section,
   constraints, references with access and licence, explicit unknowns.
2. **Taste** — `taste/profile.json` and `taste/selection-board.json`, with
   multi-select qualities, the user's own words, rejected cards and reasons.
3. **Reference** — source identity, ten-quality decomposition of kept cards,
   evidence with confidence, motion status, what each source cannot prove.
4. **Direction** — a coherent concept, conflict resolutions, a concept frame, a
   living design system, an implementation spec, and explicit user approval.
5. **Motion** — separate motion discovery, selection and approval; specialist
   resolution; per-element engineering spec; GSAP skill loaded; Lenis decision;
   reduced-motion path.
6. **Build** — checkpointed implementation, captures, anti-slop review, fidelity
   report, final verification, `check.md`.

## Non-negotiables

- **Ask for taste with visual examples.** Not a questionnaire, not a blank page.
- **No invented content.** A metric, testimonial, award or claim without a real
  source is removed or marked `unknown`.
- **No full-page glance.** Decompose region by region and record coordinates or
  node ids.
- **No screenshot-as-structure.** Screenshots prove rendered appearance only.
- **No averaged direction.** Resolve conflicts explicitly.
- **No building before approval.** Direction and motion each have their own gate.
- **No invented motion.** A static reference stays static.
- **No unsupported decoration.** AS-01 to AS-20 and MAS-01 to MAS-09 are checked
  before implementation and again before acceptance.
- **No inaccessible build.** Contrast, keyboard, focus, touch and reduced motion
  are part of the build, not a follow-up.
- **No silent rework.** A mid-course change gets an impact list and preserves
  unaffected approved work.

## Shared inputs

Read only what a stage names:

- `_shared/foundations/taste-profile.md`
- `_shared/foundations/selection-board.md`
- `_shared/foundations/reference-decomposition.md`
- `_shared/foundations/conflict-resolution.md`
- `_shared/foundations/direction-approval.md`
- `_shared/foundations/design-system.md`
- `_shared/foundations/implementation-checkpoints.md`
- `_shared/foundations/responsive-and-accessibility.md`
- `_shared/references/evidence-and-confidence.md`
- `_shared/references/reference-intelligence.md`
- `_shared/references/image-composition-intelligence.md`
- `_shared/references/anti-slop-rules.json`
- `_shared/references/visual-quality-policy.md`
- `_shared/references/implementation-spec-template.md`
- `_shared/motion/README.md`
- `_shared/motion/motion-selection.md`
- `_shared/patterns/gsap/README.md`
- `_shared/scripts/anti-slop-check.mjs`
- `_shared/scripts/fidelity-check.mjs`
- `_shared/scripts/capture-screenshots.mjs`

## Stop conditions

Stop and report when the brief or references are missing, the source is
inaccessible, a material decision depends on an `unknown`, the licence is
unverified, direction or motion approval is absent, or a required tool has not
been verified.
