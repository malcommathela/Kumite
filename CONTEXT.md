# Kumite — the system

Kumite is an umbrella workspace: two experience pipelines run on one shared
factory, and a small catalog of discoverable skills routes work into them.

## Where to go

| Need | Read |
|---|---|
| Build a content-led page or site | `pipelines/content-experience/CONTEXT.md` |
| Build a product screen, dashboard or flow | `pipelines/product-experience/CONTEXT.md` |
| Shared rules, scripts, motion and reference intelligence | `_shared/CONTEXT.md` |
| Blank artifacts | `_templates/` |
| Workspace scripts | `_tools/` |
| A finished example | `projects/coffee-brand/README.md` |

## Two pipelines

| Pipeline | Use it for | Stages |
|---|---|---|
| Content Experience | Marketing pages, editorial sites, portfolios, campaign pages | brief → reference → composition → motion → build |
| Product Experience | App screens, dashboards, tools, onboarding and multi-step flows | brief → system → flows → motion → build |

Each stage is a folder with its own `CONTEXT.md`. That contract is the control
point: exact inputs, a numbered process, named outputs and exactly one check.
A stage is complete when `output/` holds its artifact and any `check.md` says
`pass`. A placeholder folder is not progress.

## The shared factory

`_shared/` holds what both pipelines use and neither owns:

- `references/` — anti-slop rules, visual quality, image composition, licensing,
  implementation spec, evidence and confidence, reference intelligence.
- `scripts/` — anti-slop, fidelity and screenshot CLIs plus their libraries.
- `motion/` — the motion contract, the GSAP pattern library, Lenis guidance and
  the eight vendored official GSAP skills.
- `reference-intelligence/` — screenshot, live-page and Figma adapters.

The factory is stable and versioned with the repository. A project's evidence,
specifications, captures and audits live inside that project, never in
`_shared/`.

## Skills

`.agents/skills/` contains the discoverable layer. Each directory name equals
its frontmatter `name`. The seven Kumite skills coordinate the pipelines and
quality gates; `kumite-content-experience` and `kumite-product-experience` are
the entry points; the eight `gsap-*` skills are vendored verbatim from GreenSock.

## Evidence model

There is no mandatory global design schema. A project records only what it
needs, in its own `output/` or `reference/` folder, using four confidence
labels: `exact`, `measured`, `estimated`, `unknown`. Screenshots prove rendered
appearance; node data proves structure; neither proves the other. The full rule
set is in `_shared/references/evidence-and-confidence.md`.

## Status

A pipeline run is complete when its final stage has an implementation, a
region-based fidelity report where a reference exists, an anti-slop verdict, a
motion audit and a `check.md` that says `pass`.
