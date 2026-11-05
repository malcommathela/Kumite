# Kumite

A portable, design-engineering skill system for AI coding agents.

Kumite makes coding agents produce professional, intentional and visually
polished frontend interfaces by discovering real design resources, extracting
structured design information, reusing established UI libraries and enforcing
consistent design standards.

## What Kumite is

- A collection of reusable **skills** that teach AI coding agents how to work
  with design systems, component libraries and visual assets.
- A **design intelligence pipeline** that turns a screenshot, image, webpage or
  Figma file into a validated Design Memory Map, an implementation specification
  and a region-based fidelity review.
- A set of **quality policies** that prevent common agent anti-patterns: fake
  metrics, decorative noise, invented UI elements.
- A **portable system** that works across agent platforms through adapters.

## What Kumite is not

- A standalone design application, website builder or image generator.
- A replacement for Figma, a component library or a design token pipeline.

## Status

**Early development.** The project structure, core skills, reference policies,
and Figma Community discovery and structured extraction methodology are
established. The Design Intelligence Engine — coordinating skill, Design Memory
Map, image composition policy, anti-slop rules, validation tooling and mandatory
motion integration — is established in this milestone. No integrations are
deployed to production yet, and the validation scripts are not published as a
package.

## Architecture

```
kumite/
├── skills/
│   ├── design-discovery/       # Web search & community identification
│   ├── figma-integration/      # Structured extraction via Figma MCP
│   ├── design-intelligence/    # Coordinating analysis, memory map & fidelity
│   ├── component-first/        # Component selection & reuse logic
│   ├── visual-assets/          # Authentic image sourcing & composition fit
│   ├── design-quality/         # Anti-slop enforcement, visual & motion QA
│   └── motion-design/          # Specialist motion resolution, Create & Audit
├── references/
│   ├── figma-community-discovery.md   # Community ID vs Design File Key & DashStack PoC
│   ├── design-memory-schema.json      # JSON Schema for the Design Memory Map
│   ├── design-memory-guide.md         # Categories A–E, evidence & confidence
│   ├── design-memory-example.json     # Complete worked memory map
│   ├── image-composition-intelligence.md  # Image roles, crops, overlays & QA
│   ├── implementation-spec-template.md    # Fill-in specification template
│   ├── anti-slop-rules.json           # 20 indicators AS-01 … AS-20
│   ├── anti-slop-review-template.md   # Review table & verdicts
│   ├── visual-quality-policy.md       # Prohibited patterns and permitted alternatives
│   └── licensing-policy.md            # Resource licensing terms and usage guidelines
├── scripts/
│   ├── validate-memory.mjs     # Design Memory Map validation CLI
│   ├── anti-slop-check.mjs     # Anti-slop review CLI
│   ├── fidelity-check.mjs      # Region-based fidelity CLI
│   └── capture-screenshots.mjs # Zero-dependency headless capture via CDP
├── tests/                      # Skill and workflow validation
├── examples/
│   └── design-intelligence-demo/  # End-to-end workflow demonstration
├── adapters/
│   └── antigravity/            # Antigravity IDE/CLI setup & configuration
├── AGENTS.md                   # Project-wide development instructions
├── README.md                   # Project overview & documentation
└── LICENSE                     # MIT
```

## Design Intelligence workflow

`kumite-design-intelligence` is mandatory whenever an agent implements UI from a
design reference. It coordinates the other six skills and defines the evidence
that passes between them. The pipeline runs in eleven stages:

| # | Stage | Outcome |
|---|-------|---------|
| 1 | Source acquisition | Identified source, access status, licence and evidence |
| 2 | Global design analysis | Page type, hierarchy, grid, density, palette, type roles |
| 3 | Screenshot decomposition | Region tree: full page, sections, components, fine detail, responsive |
| 4 | Component-level inspection | Component inventory with variants and states |
| 5 | Design Memory Map generation | Validated map that becomes the source of truth, including optional motion |
| 6 | Image Composition Intelligence | Role, focal point, crop, overlay plan per image |
| 7 | Motion analysis | Specialist motion skill resolved; motion identity, triggers, timing, reduced motion and evidence |
| 8 | Anti-AI-slop validation | Visual and motion indicator reviews with evidence and verdicts |
| 9 | Implementation specification | Source-grounded spec, including motion requirements |
| 10 | Implementation | Interface built from the spec with reused components and evidence-based motion |
| 11 | Visual and motion audit | Region-by-region discrepancy table, motion findings and verdict |

Motion analysis happens before implementation; motion auditing happens before
final acceptance. A static reference records the absence of motion and gains no
invented animation.

The full procedure, handoff table, evidence model and stop conditions are in
[`skills/design-intelligence/SKILL.md`](skills/design-intelligence/SKILL.md).

### Design Memory Map

The memory map records what the reference actually shows across six categories:

- **A. Source** — source type, identity, author, licence, access method and
  unavailable properties.
- **B. Foundations** — colour, typography, spacing, borders, radii, shadows,
  backgrounds, layout.
- **C. Components** — each component, its variants, states, source location and
  responsive changes.
- **D. Sections and imagery** — section order and layout; image role,
  composition, CSS layers, overlays and QA.
- **E. Evidence and confidence** — global evidence index, traced values,
  confidence rationale and unresolved questions.
- **F. Motion (optional)** — motion identity, animated components, triggers,
  states, duration, delay, easing, springs, stagger, enter/exit, scroll,
  hover/focus, loading, responsive differences, reduced-motion alternatives,
  performance, source support and intentional omissions.

Schema `1.1.0` adds the optional motion section; documents declaring `1.0.0`
remain valid. Every value carries a confidence marker — `exact`, `measured`, `estimated` or
`unknown` — and its evidence. Figma node data is authoritative for measurable
layout, variables and variants; screenshots are authoritative for rendered
appearance and verification only. A screenshot can suggest a gap; it cannot
prove one.

- Schema: [`references/design-memory-schema.json`](references/design-memory-schema.json)
- Guide: [`references/design-memory-guide.md`](references/design-memory-guide.md)
- Example: [`references/design-memory-example.json`](references/design-memory-example.json)

### Image Composition Intelligence

Images are classified by role before styling. Composition — focal point,
text-safe area, aspect ratio, crop and overlay — decides whether an image is
usable, not subject matter alone. Full-bleed sections use three independent
layers: image, gradient overlay, content. The overlay exists only where text
needs contrast; the whole photograph is never faded or blurred to darken one
region, and gradients are never arbitrary. AI-generated photographs are never
substituted for authentic ones.

The seven roles, composition-before-styling questions, crop rules and nine-point
image QA are in
[`references/image-composition-intelligence.md`](references/image-composition-intelligence.md).

### Anti-AI-slop policy

Kumite checks twenty indicators, `AS-01` to `AS-20`, before implementation and
again before delivery. The reference wins: a pattern is acceptable only when it
is source-supported, design-system-supported or a functional requirement;
otherwise it is removed. Every verdict requires evidence.

- Rules: [`references/anti-slop-rules.json`](references/anti-slop-rules.json)
- Review template: [`references/anti-slop-review-template.md`](references/anti-slop-review-template.md)
- Policy: [`references/visual-quality-policy.md`](references/visual-quality-policy.md)

### Motion Intelligence

`kumite-motion-design` makes motion analysis and auditing mandatory and resolves
the specialist `design-motion-principles` skill instead of duplicating it.

Resolution order:

1. **Discover** an installed `design-motion-principles` skill in the agent skill
   directories and verify its `SKILL.md` and required references.
2. **Use it** when complete: read the real files, follow its Create or Audit
   workflow, and leave the installed copy untouched.
3. **Fall back** to
   [`github.com/kylezantos/design-motion-principles`](https://github.com/kylezantos/design-motion-principles)
   when it is absent, recording the resolved commit and licence.
4. **Record** the method, skill name, source, version or commit, licence, loaded
   resources and limitations. Retrieval failure is reported, never hidden.

**Create mode** analyses reference motion, interaction triggers, timing, easing,
springs, stagger, enter/exit, scroll, hover/focus, loading and responsive
behaviour, then implements purposeful motion with a reduced-motion path.

**Audit mode** inspects existing motion, finds missing feedback and excess,
checks accessibility and performance, and reports actionable findings before
acceptance.

Motion anti-slop `MAS-01` to `MAS-09` prevents unnecessary pulsing, hover scaling
on everything, excessive stagger, unjustified bouncy springs, identical fade-ins,
page-load animation, excessive blur entrances, distracting decoration, and motion
that harms accessibility or performance. Static references stay static.

The workflow and policy are in
[`skills/motion-design/SKILL.md`](skills/motion-design/SKILL.md).

## Discovery and Extraction Architecture

Kumite couples **Web Search** for discovering public Figma Community files with
the **Figma Model Context Protocol (MCP)** for structured extraction:

1. **Web Search Discovery**: Locates free Figma Community UI kits and templates.
2. **Identifier Separation**: Distinguishes Community Resource IDs (`figma.com/community/file/:id`) from Design File Keys (`figma.com/design/:key`).
3. **Structured Extraction**: Reads component definitions, variants, variable tokens, auto-layout parameters and typography through Figma MCP.
4. **Drafts Duplication Boundary**: When API tokens lack access to public Community files (403), guides users to duplicate to personal Drafts without guessing from screenshots.

## Validation

Run from the repository root.

| Command | Validates |
|---------|-----------|
| `node --test "tests/**/*.test.mjs"` | Skill and workflow validation suite |
| `node scripts/validate-memory.mjs <file> [--json]` | Design Memory Map against the JSON Schema |
| `node scripts/anti-slop-check.mjs <review.json> [--rules <path>] [--json]` | Anti-slop review and verdicts |
| `node scripts/fidelity-check.mjs <memory.json> <implementation.json> [--json]` | Region-based fidelity comparison |

All three scripts print a human-readable result by default and a machine-readable
result with `--json`. Exit code `0` means pass; non-zero means a violation or an
input error. Each script's header lists its exact codes.

`examples/design-intelligence-demo/` is the end-to-end workflow demonstration:
reference captures, region crops and a fictional demonstration page built from
them, with its memory map, implementation spec, anti-slop review and discrepancy
report. Start at
[`examples/design-intelligence-demo/README.md`](examples/design-intelligence-demo/README.md).
It is a worked example, not a test result. The demonstration is built from static
captures, so its motion section records the absence of evidenced motion; no
animation was forced into it.

The Design Intelligence milestone was previously verified with 109 passing tests,
a valid memory map, an anti-slop pass and a fidelity pass. Those results are
historical. The motion integration is documentation, schema and policy work; it
does not rerun or replace that verification.

## Installation

> **Not yet packaged for distribution.** During early development, clone the
> repository and follow the adapter-specific instructions.

### Antigravity (development)

Skills can be loaded via workspace discovery by symlinking or copying the
`skills/` directory into your project's `.agents/skills/` directory, or by
using the native plugin structure once packaging is complete.

Antigravity discovers each skill by its frontmatter `name` and `description`, so
the seven skills — `kumite-design-discovery`, `kumite-figma-integration`,
`kumite-design-intelligence`, `kumite-component-first`, `kumite-visual-assets`,
`kumite-design-quality` and `kumite-motion-design` — can be placed individually.
See [`adapters/antigravity/README.md`](adapters/antigravity/README.md).

## Principles

- **Inspect before building** — read the codebase before introducing anything.
- **Component-first** — prefer shadcn/ui, established libraries, Hugeicons.
- **No visual fabrication** — no fake metrics, decorative noise, invented UI.
- **Authentic assets** — real photography, verified licences, composition fit.
- **Design fidelity** — preserve typography, spacing, colours, sizing, variants.
- **Evidence over assumption** — every value has a confidence and a source.
- **Motion is evidence-based** — analyse before implementing, audit before
  accepting, and leave static references static.
- **Never invent capabilities** — distinguish verified from planned.
- **Minimalism** — follow Ponytail's philosophy: shortest working solution.

## License

[MIT](LICENSE)
