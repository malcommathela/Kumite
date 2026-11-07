# 04_motion — plan interaction motion

One job: design feedback and transition motion from evidence and write a spec
that can be implemented and audited.

## Inputs

- Working (this run): `../03_flows/output/implementation-spec.md`
- Working (this run): `../02_system/output/system-inventory.md`
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
   intentionally omitted motion. If the reference is static, add no invented
   motion.
4. For each state transition, record trigger, purpose, start and end states,
   duration, delay, easing, interruption, reduced-motion alternative and
   performance notes.
5. Apply the frequency gate: high-frequency and keyboard-initiated actions should
   not animate unless the motion is the feedback itself.
6. Load only the GSAP skill the task needs. State whether Lenis is used and why.
7. Review MAS-01 to MAS-09 before implementation.

## Outputs

- `output/motion-spec.md`
- `output/check.md`

## Check

A person confirms every state transition has feedback, no keyboard-critical
action is delayed by animation, and every motion has a reduced-motion
alternative. Write `pass` or `fail: <why>` as the first line of
`output/check.md`.
