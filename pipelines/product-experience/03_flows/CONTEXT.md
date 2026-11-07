# 03_flows — design flows and states

One job: turn the brief and the system inventory into a screen and state
specification that can be implemented and audited.

## Inputs

- Working (this run): `../01_brief/output/brief.md`
- Working (this run): `../02_system/output/system-inventory.md`
- Reference (every run): `../../../_shared/references/implementation-spec-template.md`
- Reference (every run): `../../../_shared/references/evidence-and-confidence.md`
- Reference (every run): `../../../_shared/references/visual-quality-policy.md`
- Reference (every run): `../../../_shared/references/anti-slop-rules.json`

Do NOT load: motion patterns yet, other pipelines' references, prior runs.

## Process

1. If an input is missing or empty, stop and name it.
2. Define the screen structure and the flow between screens or regions.
3. For every flow, specify entry, success, empty, error, loading and permission
   states, with real content and real data shapes.
4. Specify responsive behaviour, keyboard order, focus management, labels and
   error messaging.
5. Fill the implementation spec: tokens, components, variants, layout, states,
   accessibility and unresolved questions.
6. Complete the pre-implementation anti-slop table for AS-01 to AS-20.
7. Mark every value without evidence as `unknown`; do not fill gaps.

## Outputs

- `output/implementation-spec.md`
- `output/check.md`

## Check

A person walks each flow and confirms every state has a designed treatment and
every component maps to the system inventory. Write `pass` or `fail: <why>` as
the first line of `output/check.md`.
