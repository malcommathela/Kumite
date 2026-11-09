# 04_motion — plan interaction motion

One job: specify purposeful feedback and transitions from evidence and write a
library-neutral plan.

## Inputs

- Working: `../03_flows/output/implementation-spec.md`
- Working: `../02_system/output/system-inventory.md`
- Reference: `../../../_shared/motion/README.md`
- Reference: `../../../_shared/references/evidence-and-confidence.md`

## Process

1. If an input is missing, stop and name it.
2. Separate observed behaviour, approved functional additions and unknowns.
3. Record state-transition feedback, trigger, purpose, start/end states, timing
   evidence, interruption and reduced-motion alternative.
4. Apply the frequency gate: high-frequency and keyboard-initiated actions
   should not be delayed by decorative motion.
5. Inspect the project's existing dependencies and choose the simplest suitable
   technology. Do not prescribe or add an animation library.
6. Review MAS-01 to MAS-09.

## Outputs

- `output/motion-spec.md`
- `output/check.md`

## Check

A person confirms state changes have appropriate feedback, keyboard-critical
actions are not delayed, reduced motion is respected and no unsupported
animation has been invented. Write `pass` or `fail: <why>`.
