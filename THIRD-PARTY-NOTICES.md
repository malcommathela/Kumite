# Third-Party Notices

Kumite vendors or derives from the following upstream work. Each entry records
the exact source and licence. No upstream file is modified unless stated.

## Official GSAP skills

- **Source:** `https://github.com/greensock/gsap-skills`
- **Commit:** `aed9cfd3277740755f6bfc1155c7aa645403b760`
- **Files:** the eight `SKILL.md` files under `.agents/skills/gsap-*`, copied
  verbatim, plus `_shared/motion/gsap/LICENSE` and `llms.txt`.
- **Licence:** MIT, Copyright (c) 2026 GreenSock.
- **Local licence:** `_shared/motion/gsap/LICENSE`.

The skills are loaded on demand by `kumite-motion-design`; they are not edited
in place. Any Kumite-specific routing lives in `_shared/motion/README.md`.

## Lenis

- **Source:** `https://github.com/darkroomengineering/lenis`
- **Commit:** `e01eefb1f55cd08bc051521d74f5f8182b71ee9d`
- **Use:** optional smooth-scroll integration, loaded from a CDN at runtime. No
  Lenis source is vendored.
- **Licence:** MIT, Copyright (c) 2024 darkroom.engineering.
- **Integration:** `_shared/motion/README.md` records the official GSAP
  ScrollTrigger synchronization and reduced-motion behaviour.

## ICM Architect methodology

- **Source:** `https://github.com/Jake-Van-Clief/icm-architect`
- **Commit:** `8bc2f5610d3843b3ffa31a142effe6b6337fef3c`
- **Use:** the pipeline, contract and context-hierarchy conventions adapted for
  Kumite's two experience pipelines.
- **Licence:** MIT, Copyright (c) 2026 Jake Van Clief.

The upstream repository has no `references/reference-integrity.md` at this
commit; Kumite follows `SKILL.md`, `references/core.md` and the stage templates.

## design-motion-principles

- **Source:** `https://github.com/kylezantos/design-motion-principles`
- **Use:** resolved at runtime as an installed specialist skill, with the
  repository as a documented fallback. Kumite does not vendor it.
- **Licence:** declared by the installed copy or upstream repository at
  resolution time; record the resolved commit and licence in the run.

## External services

Figma MCP and SitePeel are external services accessed through the user's own
authenticated session. Kumite does not vendor their code, store credentials or
claim access it has not verified.
