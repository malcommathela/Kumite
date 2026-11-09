# Antigravity Adapter

This directory contains notes for running Kumite skills within Google
Antigravity (IDE and CLI).

## How it works

Antigravity discovers skills through its standard customization system:

1. **Workspace discovery** — skills in `.agents/skills/` at the project root.
2. **Global discovery** — skills in `~/.gemini/config/skills/`.
3. **Plugin packaging** — skills bundled in a `plugin.json` manifest.

## Development setup

Kumite already keeps its skills in `.agents/skills/`, one directory per skill,
with the directory name equal to the frontmatter `name`. To use them in another
project, copy or symlink that directory:

```text
your-project/
└── .agents/
    └── skills/
        ├── kumite-content-experience/
        ├── kumite-product-experience/
        ├── kumite-design-intelligence/
        ├── kumite-design-discovery/
        ├── kumite-figma-integration/
        ├── kumite-component-first/
        ├── kumite-visual-assets/
        ├── kumite-design-quality/
        ├── kumite-motion-design/
```

Each skill is discovered by its frontmatter `name` and `description`. The
descriptions are written to trigger on the tasks each skill covers, so no
platform-specific registration is required.

## Pipeline routing

The two entry skills route work:

- `kumite-content-experience` → `pipelines/content-experience/`
- `kumite-product-experience` → `pipelines/product-experience/`

Each stage has a `CONTEXT.md` contract. The pipeline router is the folder's
`CONTEXT.md`. Read the router first, then only the current stage.

## Motion skill resolution

`kumite-motion-design` coordinates the specialist `design-motion-principles`
skill. Antigravity should discover that skill in its own global or workspace
skill directories — for example `~/.gemini/config/skills/`, `~/.agents/skills/`
or `.agents/skills/` — before any motion is created or audited.

If the specialist skill is not installed, `kumite-motion-design` retrieves it
from [`github.com/kylezantos/design-motion-principles`](https://github.com/kylezantos/design-motion-principles),
records the commit and licence, and uses the retrieved workflow. A failed
retrieval stops the motion stage; it is never reported as a successful load.
Kumite does not vendor or duplicate the specialist skill.


## Portability

Skill content is platform-neutral: standard Markdown, relative reference paths
from each skill directory, and no Antigravity-only tool assumptions. Platform
capabilities — such as a connected Figma MCP — are checked at runtime
and reported, never assumed.

## Antigravity-specific considerations

- **Progressive disclosure** — Antigravity loads skill names and descriptions by
  default; full content loads on activation. Kumite skills are written for this:
  concise descriptions, detailed procedures.
- **Rules budget** — always-on rules share a 20,000-token budget. Kumite's
  `AGENTS.md` is a short router; policy documents live in `_shared/references/`.
- **Figma dependency** — `kumite-figma-integration` requires the Figma MCP. It
  checks availability before attempting operations.
- **Screenshot-only workflow** — the screenshot adapter works without Figma.
  Values are `measured` or `estimated` and marked accordingly.
- **Static captures and motion** — screenshot-only references cannot evidence
  timing or easing. `kumite-motion-design` records `static` or `unknown` and does
  not add animation to fill the gap.
- **Specialist skill fallback** — motion work requires the
  `design-motion-principles` specialist. Check configured skill directories
  first; GitHub retrieval is the documented fallback.
