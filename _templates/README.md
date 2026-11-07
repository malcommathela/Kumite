# _templates - blank artifacts

Copy one into a pipeline stage's `output/`, a project's `input/` or its `taste/`
folder, then fill it. Templates are blank; they never contain a run's data.

| Template | Used by |
|---|---|
| `project-brief.md` | Either `01_brief` when a shared project brief is needed |
| `content-brief.md` | Content `01_brief` |
| `product-brief.md` | Product `01_brief` |
| `taste-profile.json` | `02_taste` |
| `selection-board.json` | `02_taste` |
| `reference-evidence.json` | `03_reference` / `03_system`, or any reference record |
| `direction-proposal.md` | `04_direction` |
| `design-system.md` | `04_direction` and the living system |
| `page-spec.md` | Content `04_direction` and `06_build` |
| `component-spec.md` | Component intelligence, adaptation and build |
| `motion-spec.md` | Both `05_motion` stages |
| `pattern.md` | A project-specific motion or interaction pattern |
| `implementation-checkpoint.md` | Both `06_build` stages |
| `review.md` | Final verification |
| `audit.md` | Short-form audit record |

The implementation specification template and the anti-slop review template live
in `_shared/references/` because they are policy-bearing, not blank forms. The
reference-intelligence templates and the curated GSAP patterns live in
`_shared/reference-intelligence/` and `_shared/patterns/gsap/`.
