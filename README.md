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
- **A discoverable skill layer.** `.agents/skills/` contains the Kumite design skills; animation technology is
  selected per project rather than prescribed by Kumite.
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
├── .agents/skills/               # Kumite design skills
├── pipelines/
│   ├── content-experience/       # brief → reference/taste → direction → motion → build
│   └── product-experience/       # brief → system/taste → flows/direction → motion → build
├── _shared/
│   ├── foundations/              # taste, link-based selection, decomposition, approval
│   ├── references/                # policies, evidence and quality rules
│   ├── scripts/                   # anti-slop and fidelity CLIs
│   ├── motion/                    # library-agnostic motion principles and approval
│   └── reference-intelligence/    # live-page, Figma and component-source guidance
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
   taste, and present concise link options for user selection.
2. **Direction** — inspect only selected references, resolve contradictions
   with the user, propose a visual concept/frame, derive the living design
   system, and obtain explicit approval. Motion is discovered and approved
   separately.
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
- **Reference intelligence** — browser-based live-page/source inspection,
  Figma MCP extraction and component-source research. No dedicated inspection
  service or engine is required. See
  [`_shared/reference-intelligence/README.md`](_shared/reference-intelligence/README.md).
- **Direction and design system** — conflict resolution, concept approval,
  living tokens and implementation checkpoints. See
  [`_shared/foundations/README.md`](_shared/foundations/README.md).
- **Evidence and quality** — exact, measured, estimated and unknown values,
  image composition, anti-slop and fidelity checks. See
  [`_shared/references/evidence-and-confidence.md`](_shared/references/evidence-and-confidence.md).
- **Motion** — evidence-based, library-neutral motion principles, approval and
  accessibility. See
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
| `kumite-motion-design` | Coordinate evidence-based, library-neutral motion design |
| `kumite-taste` | Maintain user and project taste profiles |
| `kumite-design-system` | Derive and maintain the living design system |
| `kumite-component-intelligence` | Discover, inspect and adapt component references |


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
```

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
