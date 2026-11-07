# 05_build — build, then audit

One job: implement the spec, then prove the result against the reference and the
quality rules.

## Inputs

- Working (this run): `../03_composition/output/implementation-spec.md`
- Working (this run): `../03_composition/output/art-direction.md`
- Working (this run): `../04_motion/output/motion-spec.md`
- Working (this run): `../02_reference/output/reference-evidence.json`
- Working (this run): the project folder named in the spec
- Reference (every run): `../../../_shared/references/anti-slop-rules.json`
- Reference (every run): `../../../_shared/references/visual-quality-policy.md`
- Reference (every run): `../../../_shared/references/image-composition-intelligence.md`
- Reference (every run): `../../../_shared/scripts/fidelity-check.mjs`
- Reference (every run): `../../../_shared/scripts/anti-slop-check.mjs`
- Reference (every run): `../../../_shared/scripts/capture-screenshots.mjs`

Do NOT load: other pipelines' references, prior runs, the whole `_shared/`
folder.

## Process

1. If an input is missing or empty, stop and name it.
2. Inspect the project before adding files or dependencies. Reuse what exists.
3. Implement the spec: structure, tokens, components, responsive behaviour and
   accessibility. Use authentic images with the recorded composition.
4. Implement the motion spec. Load the GSAP skill the task needs; add Lenis only
   if the spec says so. Ship `prefers-reduced-motion` in the same change.
5. Capture the rendered page at each evidenced viewport into the project's
   `capture/` folder.
6. Run the anti-slop review and write `output/anti-slop-review.json`; run
   `node ../../../_shared/scripts/anti-slop-check.mjs output/anti-slop-review.json`.
7. Run the fidelity comparison against the reference record:
   `node ../../../_shared/scripts/fidelity-check.mjs ../02_reference/output/reference-evidence.json output/implementation-manifest.json`.
   If there is no reference, record `not applicable` and why.
8. Audit region by region and motion by motion. Fix blocking and major findings,
   re-capture and re-compare. Write `output/audit.md`.

## Outputs

- implementation files in the project folder
- `capture/` screenshots at each evidenced viewport
- `output/implementation-manifest.json`
- `output/anti-slop-review.json`
- `output/fidelity-report.md`
- `output/audit.md`
- `output/check.md`

## Check

A person opens `output/audit.md` and confirms the anti-slop verdict is `pass`,
the fidelity verdict is `pass` or a justified `not applicable`, and no blocking
or major finding is open. Write `pass` or `fail: <why>` as the first line of
`output/check.md`.
