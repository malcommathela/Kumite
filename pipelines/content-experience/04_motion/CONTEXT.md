# 04_motion — plan purposeful motion

One job: specify motion only when it is evidenced or needed by the approved
experience, then write a library-neutral implementation and audit plan.

## Inputs

- Working: `../03_composition/output/implementation-spec.md`
- Working: `../02_reference/output/reference-evidence.json`
- Reference: `../../../_shared/motion/README.md`
- Reference: `../../../_shared/references/evidence-and-confidence.md`

## Process

1. If an input is missing, stop and name it.
2. Separate observed behaviour, approved functional additions and unknowns.
3. If the reference is static, do not invent motion.
4. For each meaningful interaction, record trigger, purpose, states, timing
   evidence, responsive behaviour, reduced-motion alternative, interruption,
   cleanup and performance.
5. Inspect existing project dependencies and select the simplest suitable
   implementation. Do not prescribe or add an animation library.
6. Review motion accessibility and anti-slop indicators MAS-01 to MAS-09.

## Outputs

- `output/motion-spec.md`
- `output/check.md`

## Check

A person confirms every motion has a purpose and evidence or explicit approval,
keyboard and touch behaviour remain usable, reduced motion is respected, and
unknown behaviour has not been fabricated. Write `pass` or `fail: <why>`.
