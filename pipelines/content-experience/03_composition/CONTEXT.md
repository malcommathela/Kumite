# 03_composition — compose the visual system

One job: turn the evidence into an art direction and a source-grounded
implementation specification.

## Inputs

- Working (this run): `../02_reference/output/reference-evidence.json`
- Working (this run): `../02_reference/output/decomposition.md`
- Working (this run): `../01_brief/output/brief.md`
- Reference (every run): `../../../_shared/references/image-composition-intelligence.md`
- Reference (every run): `../../../_shared/references/implementation-spec-template.md`
- Reference (every run): `../../../_shared/references/visual-quality-policy.md`
- Reference (every run): `../../../_shared/references/anti-slop-rules.json`

Do NOT load: motion patterns yet, other pipelines' references, prior runs.

## Process

1. If an input is missing or empty, stop and name it.
2. Decide the composition before styling: page type, hierarchy, grid, density,
   palette structure, type roles and imagery role.
3. For every image, record role, focal point, text-safe area, aspect ratio, crop
   and overlay plan. Full-bleed images use separate image, overlay and content
   layers.
4. Fill the implementation spec: tokens, components and variants, section
   structure, responsive behaviour, accessibility and unresolved questions.
5. Complete the pre-implementation anti-slop table for AS-01 to AS-20. Mark each
   device source-supported, design-system-supported, functional or unsupported.
6. Mark every value without evidence as `unknown`; do not fill gaps.

## Outputs

- `output/art-direction.md`
- `output/implementation-spec.md`
- `output/check.md`

## Check

A person confirms every image has a role, focal point, text-safe area, crop and
overlay plan, and every token traces to evidence or the design system. Write
`pass` or `fail: <why>` as the first line of `output/check.md`.
