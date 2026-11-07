# 05_build — build, then audit

One job: implement the spec, then prove the result against the system, the
states and the quality rules.

## Inputs

- Working (this run): `../03_flows/output/implementation-spec.md`
- Working (this run): `../02_system/output/system-inventory.md`
- Working (this run): `../04_motion/output/motion-spec.md`
- Working (this run): the project folder named in the spec
- Reference (every run): `../../../_shared/references/anti-slop-rules.json`
- Reference (every run): `../../../_shared/references/visual-quality-policy.md`
- Reference (every run): `../../../_shared/scripts/anti-slop-check.mjs`
- Reference (every run): `../../../_shared/scripts/capture-screenshots.mjs`
- Reference (every run): `../../../_shared/scripts/fidelity-check.mjs` when a
  reference record exists

Do NOT load: other pipelines' references, prior runs, the whole `_shared/`
folder.

## Process

1. If an input is missing or empty, stop and name it.
2. Inspect the project before adding files or dependencies. Reuse the system
   inventory's components and tokens.
3. Implement the spec: structure, flows, states, responsive behaviour and
   accessibility. Do not invent a state that the spec marks `unknown`.
4. Implement the motion spec. Load the GSAP skill the task needs; add Lenis only
   if the spec says so. Ship `prefers-reduced-motion` in the same change.
5. Capture each screen and state at the evidenced viewports into the project's
   `capture/` folder.
6. Run the anti-slop review and write `output/anti-slop-review.json`; run
   `node ../../../_shared/scripts/anti-slop-check.mjs output/anti-slop-review.json`.
7. If a reference record exists, run
   `node ../../../_shared/scripts/fidelity-check.mjs <reference.json> output/implementation-manifest.json`.
   Otherwise record `not applicable` and why.
8. Audit every flow and state, then audit the motion. Fix blocking and major
   findings, re-capture and re-compare. Write `output/audit.md`.

## Outputs

- implementation files in the project folder
- `capture/` screenshots for each screen and state
- `output/implementation-manifest.json`
- `output/anti-slop-review.json`
- `output/fidelity-report.md`
- `output/audit.md`
- `output/check.md`

## Check

A person opens `output/audit.md` and confirms every flow and state is covered,
the anti-slop verdict is `pass`, and no blocking or major finding is open. Write
`pass` or `fail: <why>` as the first line of `output/check.md`.
