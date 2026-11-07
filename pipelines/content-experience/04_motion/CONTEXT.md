# 04_motion — plan the motion

One job: design purposeful motion from evidence and write a spec that can be
implemented and audited.

## Inputs

- Working (this run): `../03_composition/output/implementation-spec.md`
- Working (this run): `../02_reference/output/reference-evidence.json`
- Reference (every run): `../../../_shared/motion/README.md`
- Reference (every run): `../../../_shared/motion/gsap-patterns.md`
- Reference (every run): `../../../_shared/references/evidence-and-confidence.md`
- Reference (every run): the official GSAP skill that matches the task, under
  `.agents/skills/gsap-*`

Do NOT load: all eight GSAP skills at once, other stages' references, prior runs.

## Process

1. If an input is missing or empty, stop and name it.
2. Resolve the specialist `design-motion-principles` skill as `../../../_shared/motion/README.md`
   describes. Record method, source, commit or version, licence, loaded
   resources and limitations.
3. Separate observed motion, source-supported motion, functional additions and
   intentionally omitted motion. If the reference is static, stop adding motion.
4. For each animated element, record trigger, purpose, states, duration, delay,
   easing, spring, stagger, enter/exit, scroll, hover/focus, loading, responsive
   behaviour, reduced-motion alternative and performance notes.
5. Load only the GSAP skill the task needs; plan the implementation against it.
6. State whether Lenis is used and why. If not, say so.
7. Review MAS-01 to MAS-09 before implementation.

## Outputs

- `output/motion-spec.md`
- `output/check.md`

## Check

A person confirms every animation has a trigger, a purpose, a timing source and a
reduced-motion alternative, and that a static reference has no invented motion.
Write `pass` or `fail: <why>` as the first line of `output/check.md`.
