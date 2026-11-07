# Kumite

A portable design-engineering system for AI coding agents. Kumite turns a brief
or a design reference into an interface that is structurally faithful,
accessible and visually verifiable — without inventing what the source does not
show.

## What it is

- **Two experience pipelines.** Content Experience for marketing pages,
  editorial sites and portfolios. Product Experience for app screens,
  dashboards, tools and flows.
- **One shared factory.** Evidence rules, visual quality policy, image
  composition, anti-slop rules, fidelity tooling, motion guidance and reference
  intelligence are shared by both pipelines.
- **A discoverable skill layer.** `.agents/skills/` holds nine Kumite skills and
  the eight official GSAP skills, copied verbatim.
- **A worked example and a finished project.** `examples/design-intelligence-demo/`
  demonstrates the old reference workflow; `projects/coffee-brand/` is the
  current single-page validation build.

## What it is not

- A website builder, image generator or design application.
- A replacement for Figma, a component library or a design-token pipeline.
- A promise that a screenshot is structured data. It is not.

## Architecture

```text
kumite/
├── AGENTS.md                     # routing catalog
├── CONTEXT.md                    # system router
├── .agents/skills/               # discoverable skills
│   ├── kumite-content-experience/
│   ├── kumite-product-experience/
│   ├── kumite-design-intelligence/
│   ├── kumite-design-discovery/
│   ├── kumite-figma-integration/
│   ├── kumite-component-first/
│   ├── kumite-visual-assets/
│   ├── kumite-design-quality/
│   ├── kumite-motion-design/
│   └── gsap-core … gsap-frameworks  # eight official GSAP skills
├── pipelines/
│   ├── content-experience/       # brief → reference → composition → motion → build
│   └── product-experience/       # brief → system → flows → motion → build
├── _shared/
│   ├── references/               # policies, rules and evidence model
│   ├── scripts/                  # anti-slop, fidelity and capture CLIs
│   ├── motion/                   # motion contract, GSAP patterns, Lenis
│   └── reference-intelligence/   # screenshot, live-page and Figma adapters
├── _templates/                   # blank artifacts
├── _tools/                       # workspace utilities
├── projects/                     # finished, project-specific work
├── examples/                     # preserved historical example
├── _archive/design-memory-map/   # archived subsystem, read-only
└── adapters/                     # platform notes
```

The full routing table is in [`CONTEXT.md`](CONTEXT.md).

## Pipelines

Each stage is a folder with a `CONTEXT.md` contract: exact backticked inputs
split working/reference, a short numbered process, named outputs and exactly one
check. A stage is complete when `output/` holds its artifact and any `check.md`
says `pass`.

| Pipeline | 01 | 02 | 03 | 04 | 05 |
|---|---|---|---|---|---|
| Content Experience | Brief | Reference | Composition | Motion | Build |
| Product Experience | Brief | System | Flows | Motion | Build |

### Content Experience

Use when the work is a page or site whose job is to communicate, persuade or
present: landing pages, editorial features, portfolios, campaign pages. The
reference supplies composition and art direction; content must be real or
explicitly marked `unknown`.

Start at
[`pipelines/content-experience/CONTEXT.md`](pipelines/content-experience/CONTEXT.md).

### Product Experience

Use when the work is an application surface: dashboards, settings, onboarding,
multi-step flows, data tools. The project's design system and states come first;
a reference supplies visual language, not a screenshot to copy blindly.

Start at
[`pipelines/product-experience/CONTEXT.md`](pipelines/product-experience/CONTEXT.md).

## Shared foundations

- **Evidence and confidence** — `exact`, `measured`, `estimated`, `unknown`, with
  a traceable source. See
  [`_shared/references/evidence-and-confidence.md`](_shared/references/evidence-and-confidence.md).
- **Reference intelligence** — screenshot, live-page and Figma adapters, each
  with its own authority and limits. See
  [`_shared/reference-intelligence/README.md`](_shared/reference-intelligence/README.md).
- **Image composition** — seven roles, focal points, text-safe areas, layered
  overlays and nine-point QA. See
  [`_shared/references/image-composition-intelligence.md`](_shared/references/image-composition-intelligence.md).
- **Anti-slop** — twenty visual indicators and nine motion indicators, with
  evidence-based exceptions. See
  [`_shared/references/anti-slop-rules.json`](_shared/references/anti-slop-rules.json).
- **Motion** — specialist resolution, Create and Audit modes, the GSAP pattern
  library and optional Lenis. See [`_shared/motion/README.md`](_shared/motion/README.md).

## Skills

OpenCode and compatible agents discover skills at `.agents/skills/<name>/SKILL.md`
where the directory name equals the frontmatter `name`.

| Skill | Job |
|---|---|
| `kumite-content-experience` | Route content-led work into the Content pipeline |
| `kumite-product-experience` | Route product work into the Product pipeline |
| `kumite-design-intelligence` | Choose a pipeline and enforce evidence |
| `kumite-design-discovery` | Find and evaluate public design resources |
| `kumite-figma-integration` | Extract structured data through Figma MCP |
| `kumite-component-first` | Reuse components before writing new ones |
| `kumite-visual-assets` | Source authentic, composition-compatible imagery |
| `kumite-design-quality` | Anti-slop, fidelity and motion audit |
| `kumite-motion-design` | Resolve the specialist motion skill and run Create/Audit |
| `gsap-core` … `gsap-frameworks` | Official GSAP API, timeline, scroll, plugins, utils, performance, React and framework guidance |

The GSAP skills are vendored verbatim from
`greensock/gsap-skills` at commit
`aed9cfd3277740755f6bfc1155c7aa645403b760`. See
[`THIRD-PARTY-NOTICES.md`](THIRD-PARTY-NOTICES.md).

## Validation

Run from the repository root:

```sh
node --test "tests/**/*.test.mjs" "_archive/**/*.test.mjs"
```

Individual tools:

```sh
node _shared/scripts/anti-slop-check.mjs <review.json> [--json]
node _shared/scripts/fidelity-check.mjs <reference.json> <implementation.json> [--json]
node _shared/scripts/capture-screenshots.mjs --url <url> --out <file.png>
```

The archived Design Memory Map keeps its own validator and tests:

```sh
node _archive/design-memory-map/scripts/validate-memory.mjs <file> [--json]
```

## Installation

> Not yet packaged for distribution. Clone the repository and copy or symlink the
> skills you need into your agent's skill directory.

For OpenCode, the project-local `.agents/skills/` directory is discovered
automatically. For Antigravity, see
[`adapters/antigravity/README.md`](adapters/antigravity/README.md).

## SitePeel

SitePeel is configured as a global OpenCode MCP server at
`https://sitepeel.dev/mcp`. The endpoint uses OAuth; a one-time browser sign-in
is required before its tools are available. Kumite treats the connection as
unverified until that sign-in succeeds and a tool call returns.

## License

[MIT](LICENSE). Third-party components retain their own licences; see
[`THIRD-PARTY-NOTICES.md`](THIRD-PARTY-NOTICES.md).
