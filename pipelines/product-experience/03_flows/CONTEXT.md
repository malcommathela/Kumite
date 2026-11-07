# 03_flows — design flows and approve the product direction

One job: turn the brief, taste profile and system inventory into an approved
screen/state specification and coherent product design direction.

## Inputs

- Working (this run): `../01_brief/output/brief.md`
- Working (this run): `../02_system/output/taste-profile.json`
- Working (this run): `../02_system/output/selection-board.json`
- Working (this run): `../02_system/output/system-inventory.md`
- Reference (every run): `../../../_shared/foundations/conflict-resolution.md`
- Reference (every run): `../../../_shared/foundations/direction-approval.md`
- Reference (every run): `../../../_shared/foundations/design-system.md`
- Reference (every run): `../../../_shared/references/implementation-spec-template.md`
- Reference (every run): `../../../_shared/references/evidence-and-confidence.md`
- Reference (every run): `../../../_shared/references/visual-quality-policy.md`
- Reference (every run): `../../../_shared/references/anti-slop-rules.json`

Do NOT load motion patterns yet, other pipelines' references or prior runs.

## Process

1. If an input is missing, or the user's direction preferences are unresolved,
   stop and name what is needed.
2. Define the screen structure and flows between screens or regions.
3. Resolve conflicts between selected references and existing product conventions
   with the user; do not average contradictory directions.
4. Propose an initial concept/frame and explain how it fits the product's actual
   system and the user's selected qualities.
5. For every flow, specify entry, success, empty, error, loading and permission
   states, with real content and real data shapes.
6. Specify responsive behaviour, keyboard order, focus management, labels and
   error messaging. Extend the living design system only where justified.
7. Fill the implementation spec and complete the pre-implementation anti-slop
   table for AS-01 to AS-20. Mark unsupported values as `unknown`.
8. Present the direction, concept/frame and spec for explicit user approval
   before implementation. Record mid-project changes and their impact.

## Outputs

- `output/conflict-resolution.md`
- `output/direction-proposal.md` and `output/concept-frame.md`
- `output/design-system.md`
- `output/implementation-spec.md`
- `output/direction-approval.md`
- `output/check.md`

## Check

A person confirms the direction is coherent with the product system and user
choices, every flow has a designed state treatment, every component maps to the
system inventory, and explicit approval is recorded before building. Write
`pass` or `fail: <why>` as the first line of `output/check.md`.
