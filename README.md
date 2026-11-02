# Kumite

A portable, design-engineering skill system for AI coding agents.

Kumite makes coding agents produce professional, intentional and visually
polished frontend interfaces by discovering real design resources, extracting
structured design information, reusing established UI libraries and enforcing
consistent design standards.

## What Kumite is

- A collection of reusable **skills** that teach AI coding agents how to work
  with design systems, component libraries and visual assets.
- A set of **quality policies** that prevent common agent anti-patterns: fake
  metrics, decorative noise, invented UI elements.
- A **portable system** that works across agent platforms through adapters.

## What Kumite is not

- A standalone design application, website builder or image generator.
- A replacement for Figma, a component library or a design token pipeline.

## Status

**Early development.** The project structure, core skills, reference policies,
and Figma Community discovery & structured extraction methodology are established.
No integrations are deployed to production yet.

## Architecture

```
kumite/
├── skills/
│   ├── design-discovery/       # Web search & community identification
│   ├── figma-integration/      # Structured extraction via Figma MCP
│   ├── component-first/        # Component selection & reuse logic
│   ├── visual-assets/          # Authentic image sourcing (Pexels, Unsplash, Pixabay)
│   └── design-quality/         # Quality enforcement & verification
├── references/
│   ├── figma-community-discovery.md  # Community ID vs Design File Key, extraction & DashStack PoC
│   ├── visual-quality-policy.md       # Prohibited patterns and permitted alternatives
│   └── licensing-policy.md            # Resource licensing terms and usage guidelines
├── adapters/
│   └── antigravity/            # Antigravity IDE/CLI setup & configuration
├── tests/                      # Skill and workflow validation
├── AGENTS.md                   # Project-wide development instructions
├── README.md                   # Project overview & documentation
└── LICENSE                     # MIT
```

## Discovery and Extraction Architecture

Kumite couples **Web Search** for discovering public Figma Community files with
the **Figma Model Context Protocol (MCP)** for structured extraction:

1. **Web Search Discovery**: Locates free Figma Community UI kits and templates.
2. **Identifier Separation**: Distinguishes Community Resource IDs (`figma.com/community/file/:id`) from Design File Keys (`figma.com/design/:key`).
3. **Structured Extraction**: Reads component definitions, variants, variable tokens, auto-layout parameters and typography through Figma MCP.
4. **Drafts Duplication Boundary**: When API tokens lack access to public Community files (403), guides users to duplicate to personal Drafts without guessing from screenshots.

## Installation

> **Not yet packaged for distribution.** During early development, clone the
> repository and follow the adapter-specific instructions.

### Antigravity (development)

Skills can be loaded via workspace discovery by symlinking or copying the
`skills/` directory into your project's `.agents/skills/` directory, or by
using the native plugin structure once packaging is complete.

## Principles

- **Inspect before building** — read the codebase before introducing anything.
- **Component-first** — prefer shadcn/ui, established libraries, Hugeicons.
- **No visual fabrication** — no fake metrics, decorative noise, invented UI.
- **Authentic assets** — real photography, verified licences.
- **Design fidelity** — preserve typography, spacing, colours, sizing.
- **Never invent capabilities** — distinguish verified from planned.
- **Minimalism** — follow Ponytail's philosophy: shortest working solution.

## License

[MIT](LICENSE)
