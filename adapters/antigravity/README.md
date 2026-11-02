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
        ├── kumite-component-first/
        │   └── SKILL.md -> kumite/skills/component-first/SKILL.md
        ├── kumite-visual-assets/
        │   └── SKILL.md -> kumite/skills/visual-assets/SKILL.md
        └── kumite-design-quality/
            └── SKILL.md -> kumite/skills/design-quality/SKILL.md
```

## Future: Plugin packaging

Once the skills are stable, Kumite will be packaged as an Antigravity plugin:

```
kumite-plugin/
├── plugin.json
├── skills/
│   ├── design-discovery/SKILL.md
│   ├── figma-integration/SKILL.md
│   ├── component-first/SKILL.md
│   ├── visual-assets/SKILL.md
│   └── design-quality/SKILL.md
├── rules/
│   └── AGENTS.md
└── README.md
```

This plugin can then be installed via:
- `agy plugin install` (Antigravity CLI)
- Plugin marketplace (Antigravity IDE)
- Manual placement in `~/.gemini/config/plugins/kumite/`

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
