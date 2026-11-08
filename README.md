# Kumite

A portable, taste-led design-engineering system for AI coding agents. Kumite
helps users discover and select the design references they like, turns those
choices into an approved visual and motion direction, then engineers the
experience with evidence-based specialist skills.

## What it is

- **Two experience pipelines.** Content Experience for marketing pages,
  editorial sites and portfolios. Product Experience for app screens,
  dashboards, tools and flows.
- **A collaborative taste system.** Users can browse references independently
  or choose through guided conversation, select multiple sources and specify
  exactly which qualities they want to combine.
- **One shared factory.** Evidence rules, reference decomposition, conflict
  resolution, design-system foundations, visual quality, motion and reference
  intelligence are shared by both pipelines.
- **A discoverable skill layer.** `.agents/skills/` contains twelve Kumite
  skills and eight official GSAP skills.
- **Worked examples.** `examples/design-intelligence-demo/` keeps a compact,
  runnable page demonstration; `projects/coffee-brand/` preserves a complete
  validation project and proof of work.

## What it is not

- A website builder, image generator or design application.
- A replacement for Figma, a component library or a design-token pipeline.
- A promise that a screenshot is structured data. It is not.

## Architecture

```text
kumite/
├── AGENTS.md                     # concise agent routing and non-negotiables
├── CONTEXT.md                    # system router
├── .agents/skills/               # 12 Kumite + 8 GSAP skills
├── pipelines/
│   ├── content-experience/       # brief → reference/taste → direction → motion → build
│   └── product-experience/       # brief → system/taste → flows/direction → motion → build
├── _shared/
│   ├── foundations/              # taste, selection, decomposition, approval, design system
│   ├── references/                # policies, evidence and quality rules
│   ├── scripts/                   # anti-slop, fidelity and capture CLIs
│   ├── motion/                    # motion contract, GSAP patterns, optional Lenis
│   ├── patterns/gsap/             # curated implementation patterns
│   └── reference-intelligence/    # screenshot, live-page, Figma, SitePeel, 21st.dev
├── _templates/                    # project, reference, taste, direction and review artifacts
├── _tools/                        # validation and selection-board utilities
├── projects/                      # project-specific work and evidence
├── examples/                      # preserved worked example
└── adapters/                      # platform integration notes
```

The full routing table is in [`CONTEXT.md`](CONTEXT.md).

## The workflow

Kumite has three connected systems:

1. **Discovery** — understand the brief, find references, ask for the user's
   taste, and use the interactive selection board to choose and annotate sources.
2. **Direction** — decompose references, resolve contradictions with the user,
   propose a visual concept/frame, derive the living design system, and obtain
   explicit approval. Motion is discovered and approved separately.
3. **Engineering** — build from the approved specifications, show meaningful
   checkpoints, incorporate feedback and direction changes, then verify quality.

Taste discovery is mandatory in both pipelines. The Content pipeline captures it
in the reference stage; the Product pipeline captures it alongside the system
inventory. Both pipelines obtain direction approval before implementation.

### Content Experience

Use when the work is a page or site whose job is to communicate, persuade or
present: landing pages, editorial features, portfolios and campaign pages.

Start at
[`pipelines/content-experience/CONTEXT.md`](pipelines/content-experience/CONTEXT.md).

### Product Experience

Use when the work is an application surface: dashboards, settings, onboarding,
multi-step flows and data tools. The project's real design system and states
come first.

Start at
[`pipelines/product-experience/CONTEXT.md`](pipelines/product-experience/CONTEXT.md).

## Shared foundations

- **Taste and selection** — project profiles, multi-reference boards and
  user-authored preferences. See
  [`_shared/foundations/selection-board.md`](_shared/foundations/selection-board.md).
- **Reference intelligence** — screenshot, live-page, Figma, SitePeel and
  component-source adapters, each with defined evidence authority. See
  [`_shared/reference-intelligence/README.md`](_shared/reference-intelligence/README.md).
- **Direction and design system** — conflict resolution, concept approval,
  living tokens and implementation checkpoints. See
  [`_shared/foundations/README.md`](_shared/foundations/README.md).
- **Evidence and quality** — exact, measured, estimated and unknown values,
  image composition, anti-slop and fidelity checks. See
  [`_shared/references/evidence-and-confidence.md`](_shared/references/evidence-and-confidence.md).
- **Motion** — specialist resolution, Create and Audit modes, curated GSAP
  patterns and optional Lenis. See
  [`_shared/motion/README.md`](_shared/motion/README.md).

## Skills

Agents discover skills at `.agents/skills/<name>/SKILL.md`; each directory
matches its frontmatter `name`.

| Skill | Job |
|---|---|
| `kumite-content-experience` | Route content-led work |
| `kumite-product-experience` | Route product work |
| `kumite-design-intelligence` | Coordinate discovery, direction and engineering |
| `kumite-design-discovery` | Find and evaluate public design resources |
| `kumite-figma-integration` | Extract structured data through Figma MCP |
| `kumite-component-first` | Reuse components before writing new ones |
| `kumite-visual-assets` | Source authentic, composition-compatible imagery |
| `kumite-design-quality` | Anti-slop, fidelity and motion audit |
| `kumite-motion-design` | Resolve the specialist motion skill and run Create/Audit |
| `kumite-taste` | Maintain user and project taste profiles |
| `kumite-design-system` | Derive and maintain the living design system |
| `kumite-component-intelligence` | Discover, inspect and adapt component references |
| `gsap-core` … `gsap-frameworks` | Official GSAP API, timeline, scroll, plugins, utils, performance, React and framework guidance |

The GSAP skills are vendored verbatim from
[`greensock/gsap-skills`](https://github.com/greensock/gsap-skills) at commit
`aed9cfd3277740755f6bfc1155c7aa645403b760`. See
[`THIRD-PARTY-NOTICES.md`](THIRD-PARTY-NOTICES.md).

## Validation

Run from the repository root:

```sh
node --test "tests/**/*.test.mjs"
python _tools/links.py
```

Individual tools:

```sh
node _shared/scripts/anti-slop-check.mjs <review.json> [--json]
node _shared/scripts/fidelity-check.mjs <reference.json> <implementation.json> [--json]
node _shared/scripts/capture-screenshots.mjs --url <url> --out <file.png>
node _tools/taste-board.mjs <selection-board.json> [--out <selection-board.html>]
```

## SitePeel

SitePeel is configured as a global OpenCode MCP server at
[`https://sitepeel.dev/mcp`](https://sitepeel.dev/mcp). The endpoint uses OAuth;
a browser sign-in is required before its tools are available. Kumite treats the
connection as unverified until sign-in succeeds and a tool call returns.

## Project evidence

Project-specific evidence belongs with its project. Kumite has no mandatory
repository-wide design-memory file or schema; current decisions live in the
approved brief, reference evidence, taste profile, direction, design system and
implementation specification.


## Installation

Not yet packaged for distribution. Clone the repository and use the
project-local `.agents/skills/` directory. For Antigravity, see
[`adapters/antigravity/README.md`](adapters/antigravity/README.md).

## License

[MIT](LICENSE). Third-party components retain their own licences; see
[`THIRD-PARTY-NOTICES.md`](THIRD-PARTY-NOTICES.md).
