# Antigravity Adapter

This directory contains the configuration needed to run Kumite skills within
Google Antigravity (IDE and CLI).

## How it works

Antigravity discovers skills through its standard customization system:

1. **Workspace discovery** — skills in `.agents/skills/` at the project root.
2. **Global discovery** — skills in `~/.gemini/config/skills/`.
3. **Plugin packaging** — skills bundled in a `plugin.json` manifest.

## Development setup

During development, Kumite skills can be loaded into Antigravity by placing
them in a project's `.agents/skills/` directory:

```
your-project/
└── .agents/
    └── skills/
        ├── kumite-design-discovery/
        │   └── SKILL.md -> kumite/skills/design-discovery/SKILL.md
        ├── kumite-figma-integration/
        │   └── SKILL.md -> kumite/skills/figma-integration/SKILL.md
        ├── kumite-design-intelligence/
        │   └── SKILL.md -> kumite/skills/design-intelligence/SKILL.md
        ├── kumite-component-first/
        │   └── SKILL.md -> kumite/skills/component-first/SKILL.md
        ├── kumite-visual-assets/
        │   └── SKILL.md -> kumite/skills/visual-assets/SKILL.md
        ├── kumite-design-quality/
        │   └── SKILL.md -> kumite/skills/design-quality/SKILL.md
        └── kumite-motion-design/
            └── SKILL.md -> kumite/skills/motion-design/SKILL.md
```

Each skill is discovered by its frontmatter `name` and `description`, not by its
directory name. Seven skills are available: `kumite-design-discovery`,
`kumite-figma-integration`, `kumite-design-intelligence`,
`kumite-component-first`, `kumite-visual-assets`, `kumite-design-quality` and
`kumite-motion-design`. The descriptions are written to trigger on the tasks each
skill covers, so no platform-specific registration is required.

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

## Future: Plugin packaging

Once the skills are stable, Kumite will be packaged as an Antigravity plugin:

```
kumite-plugin/
├── plugin.json
├── skills/
│   ├── design-discovery/SKILL.md
│   ├── figma-integration/SKILL.md
│   ├── design-intelligence/SKILL.md
│   ├── component-first/SKILL.md
│   ├── visual-assets/SKILL.md
│   ├── design-quality/SKILL.md
│   └── motion-design/SKILL.md
├── rules/
│   └── AGENTS.md
└── README.md
```

This plugin can then be installed via:
- `agy plugin install` (Antigravity CLI)
- Plugin marketplace (Antigravity IDE)
- Manual placement in `~/.gemini/config/plugins/kumite/`

## Portability

Skill content is platform-neutral: standard Markdown, relative reference paths
from each skill directory, and no Antigravity-only tool assumptions. The same
`skills/` tree can be copied into another adapter without editing. Platform
capabilities — such as a connected Figma MCP — are checked at runtime and
reported, never assumed.

## Antigravity-specific considerations

- **Progressive disclosure** — Antigravity only loads skill names and
  descriptions by default. Full skill content is loaded on activation. Kumite
  skills are designed for this: concise descriptions, detailed procedures.
- **Rules budget** — Always-on rules share a 20,000-token budget. Kumite's
  AGENTS.md is kept short. Policy documents are in `references/` for on-demand
  reading.
- **Figma dependency** — The `kumite-figma-integration` skill requires the
  Figma plugin (`antigravity-plugins-partners/plugin/figma`) to be installed.
  It checks for availability before attempting operations.
- **Screenshot-only workflow** — `kumite-design-intelligence` works from
  screenshots, images and webpages without Figma. The plugin is only needed for
  structured node extraction; without it, values are measured or estimated and
  marked accordingly.
- **Static captures and motion** — screenshot-only references cannot evidence
  timing or easing. `kumite-motion-design` records motion as `static` or
  `unknown` and does not add animation to fill the gap.
- **Specialist skill fallback** — motion work requires the
  `design-motion-principles` specialist. Antigravity should check its configured
  skill directories first; GitHub retrieval is the documented fallback, not a
  reason to avoid installing the skill when a native mechanism exists.
