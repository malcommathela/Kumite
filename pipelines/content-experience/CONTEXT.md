# Content Experience — the pipeline

The flow in one line: frame the content, discover taste and decompose selected
references, approve a visual direction, approve motion, then build and audit.

| Stage | Job |
|---|---|
| `01_brief` | Frame the content brief |
| `02_reference` | Ask for taste, build the selection board and decompose selected references |
| `03_composition` | Resolve conflicts, present the concept frame and approve the visual direction |
| `04_motion` | Plan the motion |
| `05_build` | Build, then audit |

Each stage's own `CONTEXT.md` holds its inputs, outputs and check.

Factory (stable, every run): `../../_shared/references/`,
`../../_shared/motion/`, `../../_shared/scripts/`,
`../../_shared/reference-intelligence/`.

Product (new each run): each stage's `output/`, plus the implementation in the
project folder. Status is whatever exists: a stage is complete when its
`output/` holds its artifact and `output/check.md` says `pass`.

## When this pipeline is the right one

Use Content Experience when the work's job is to communicate, persuade or
present: marketing pages, landing pages, editorial features, portfolios,
campaign pages, brand sites. The reference supplies composition and art
direction. Content must be real or explicitly `unknown`.

Use Product Experience instead when the work is an application surface:
dashboards, settings, onboarding, data tools, multi-step flows.

## The evidence rule

Every value carries `exact`, `measured`, `estimated` or `unknown` and a
traceable source. A screenshot proves rendered appearance, not structure. A
static reference proves no motion. The full rule set is in
`../../_shared/references/evidence-and-confidence.md`.

## Project output

Implementation files live in the project, for example
`../../projects/<project-name>/`. Keep the run's evidence, specs, captures and
audit inside that project; never write them into `_shared/`.

## Run layout

A run copies the stage shape into the project, so the factory stays clean:

```
projects/<project-name>/
  input/brief.md                 the user's request
  reference/                     source captures and assets
  pipeline/01_brief/output/      brief.md, check.md
  pipeline/02_reference/output/  taste-profile.json, selection-board.json, reference-evidence.json, decomposition.md, check.md
  pipeline/03_composition/output/ conflict-resolution.md, direction-proposal.md, concept-frame.md, design-system.md, implementation-spec.md, direction-approval.md, check.md
  pipeline/04_motion/output/     motion-spec.md, check.md
  pipeline/05_build/output/      implementation-manifest.json, anti-slop-review.json, fidelity-report.md, audit.md, check.md
  site/                          implementation
  capture/                       rendered screenshots
```

Each stage contract's relative paths (`../01_brief/output/brief.md`) resolve
inside `pipeline/`. Repository paths in a contract (`../../../_shared/...`) are
relative to the contract's own factory folder; when working in a project, resolve
them from the repository root instead.
