---
name: kumite-product-experience
description: >-
  Route product frontend work through Kumite's five-stage Product Experience
  pipeline: frame the product problem, record taste, inventory and extend the
  system, approve a direction, approve interaction motion separately, then build
  and verify. Use for app screens, dashboards, settings, onboarding, data tools,
  admin panels and multi-step flows where the work is an application surface.
---

# Product Experience

A product surface is a system of states, not a single picture. This skill routes
the work into the pipeline that puts the project's real system first while still
recording the user's taste and approving the direction.

## When to use

- An app screen, dashboard, settings page, tool, admin panel or onboarding flow.
- A multi-step flow with entry, success, empty, error, loading or permission
  states.
- The work must reuse the project's components and tokens rather than invent a
  new visual language.

Use `kumite-content-experience` instead for marketing pages, landing pages,
editorial features, portfolios and brand sites.

## The pipeline

Read the router, then run its five stage contracts in order:

| Stage | Contract | Job |
|---|---|---|
| `01_brief` | `pipelines/product-experience/01_brief/CONTEXT.md` | Frame the product problem |
| `02_system` | `pipelines/product-experience/02_system/CONTEXT.md` | Ask for taste, build the selection board and inventory the existing system |
| `03_flows` | `pipelines/product-experience/03_flows/CONTEXT.md` | Define flows, resolve direction and obtain approval |
| `04_motion` | `pipelines/product-experience/04_motion/CONTEXT.md` | Discover, select and approve interaction motion |
| `05_build` | `pipelines/product-experience/05_build/CONTEXT.md` | Build at checkpoints, then verify |

The pipeline router is `pipelines/product-experience/CONTEXT.md`. Read it first,
then the current stage's contract. Do not load every stage at once.

## What each stage must produce

1. **Brief** — users, jobs, primary task, flows with all states, data,
   permissions, constraints, explicit unknowns.
2. **Taste and system** — ask for visual and interaction preferences; preserve
   the user's words, selection board, anti-preferences, taste profile, real
   tokens/components/variants, component-ladder mapping and justified gaps.
3. **Flows and direction** — screen/flow/state specification, conflict
   resolutions, a concept frame, design-system version, implementation spec and
   explicit user approval before building.
4. **Motion** — specialist resolution, state feedback, frequency gate, separate
   motion approval, library-neutral motion plan and reduced-motion path.
5. **Build** — checkpointed implementation, captures for each screen and state,
   anti-slop review, fidelity report when a reference exists, flow and motion
   audit, and `check.md`.

## Non-negotiables

- **Inspect the project first.** Do not assume React, Tailwind, shadcn/ui or any
  library. Read `package.json` and the component directories.
- **Ask for taste, but do not re-ask.** Use the project and global profile.
- **Reuse before building.** Walk the component ladder for every component.
- **No invented states.** If a state is `unknown`, say so; do not fabricate a
  success, empty or error state.
- **No invented data.** Metrics, users and records must be real or clearly
  labelled as sample data.
- **No averaged direction.** Resolve conflicts explicitly and get approval.
- **No unsupported decoration or motion.** AS-01 to AS-20 and MAS-01 to MAS-09
  are checked before implementation and again before acceptance.
- **No inaccessible build.** Contrast, keyboard, focus, touch and reduced motion
  are part of the build.
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
- `_shared/references/visual-quality-policy.md`
- `_shared/references/implementation-spec-template.md`
- `_shared/references/anti-slop-rules.json`
- `_shared/references/image-composition-intelligence.md`
- `_shared/motion/README.md`
- `_shared/motion/motion-selection.md`
- `_shared/scripts/anti-slop-check.mjs`
- `_shared/scripts/fidelity-check.mjs`

## Stop conditions

Stop and report when the brief or project files are missing, a material decision
depends on an `unknown`, a component cannot be mapped without inventing a token,
the licence is unverified, direction or motion approval is absent, or a required
tool has not been verified.
