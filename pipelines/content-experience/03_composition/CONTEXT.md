# 03_composition — resolve conflicts and approve the visual direction

One job: turn the selected reference evidence and the user's taste into a
coherent concept, living design system and approved implementation direction.

## Inputs

- Working (this run): `../02_reference/output/taste-profile.json`
- Working (this run): `../02_reference/output/selection-board.json`
- Working (this run): `../02_reference/output/reference-evidence.json`
- Working (this run): `../02_reference/output/decomposition.md`
- Working (this run): `../01_brief/output/brief.md`
- Reference (every run): `../../../_shared/foundations/conflict-resolution.md`
- Reference (every run): `../../../_shared/foundations/direction-approval.md`
- Reference (every run): `../../../_shared/foundations/design-system.md`
- Reference (every run): `../../../_shared/references/image-composition-intelligence.md`
- Reference (every run): `../../../_shared/references/implementation-spec-template.md`
- Reference (every run): `../../../_shared/references/visual-quality-policy.md`
- Reference (every run): `../../../_shared/references/anti-slop-rules.json`

Do NOT load motion patterns yet, other pipelines' references or prior runs.

## Process

1. If an input is missing or the user has not expressed a direction preference,
   stop and ask; do not silently choose taste on the user's behalf.
2. Resolve contradictions between selected references by dimension. Present the
   meaningful alternatives and obtain the user's decision; do not average them.
3. Propose a visual concept and initial design frame before implementation.
   Show how the selected qualities combine into one coherent direction.
4. Derive the living design system: tokens, typography, spacing, grid, imagery,
   component conventions, responsive behaviour and accessibility.
5. Fill the implementation spec and record unresolved questions. Every token
   must trace to evidence or an existing project/design-system decision.
6. Complete the pre-implementation anti-slop table for AS-01 to AS-20.
7. Present the concept, frame and spec for explicit user approval. Do not build
   until approval is recorded. Record changes and preserve unaffected decisions.

## Outputs

- `output/conflict-resolution.md`
- `output/direction-proposal.md` and `output/concept-frame.md`
- `output/design-system.md`
- `output/art-direction.md`
- `output/implementation-spec.md`
- `output/direction-approval.md`
- `output/check.md`

## Check

A person confirms conflicts were resolved by the user, the initial concept/frame
was presented before coding, the living design system and spec are evidence-based,
and explicit direction approval is recorded. Write `pass` or `fail: <why>` as
the first line of `output/check.md`.
