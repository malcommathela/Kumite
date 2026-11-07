# _shared — the factory

Everything both pipelines use and neither owns. The factory is stable; a run's
evidence, specs and captures live in that project, never here.

## What is here

| Folder | Holds | Read when |
|---|---|---|
| `references/` | Policies, rules, evidence model, image composition, licensing, spec template, Figma discovery | A stage names the file |
| `scripts/` | `anti-slop-check`, `fidelity-check`, `capture-screenshots` and their libraries | A stage names the command |
| `motion/` | Motion contract, GSAP pattern library, Lenis guidance, vendored GSAP licence | Motion is analysed, planned or audited |
| `reference-intelligence/` | Screenshot, live-page and Figma adapters | A reference must be decomposed |

## Reading rule

Read only the file a stage contract names. Do not load the whole factory, other
pipelines' references, or prior runs. If a stage needs a rule that is not in its
input list, add the path to that contract rather than guessing.

## Files

- `references/evidence-and-confidence.md` — the four confidence labels, source
  authority and the rule that a screenshot is not node data.
- `references/reference-intelligence.md` — how the adapters combine, and what
  each one can and cannot prove.
- `references/anti-slop-rules.json` — AS-01 to AS-20.
- `references/anti-slop-review-template.md` — fill-in review.
- `references/visual-quality-policy.md` — prohibited patterns, permitted
  alternatives, fidelity method.
- `references/image-composition-intelligence.md` — seven image roles and QA.
- `references/implementation-spec-template.md` — the bridge from evidence to
  code.
- `references/figma-community-discovery.md` — Community IDs versus file keys.
- `references/licensing-policy.md` — what may be used and how it is credited.
- `motion/README.md` — motion contract, specialist resolution, GSAP routing,
  Lenis.
- `motion/gsap-patterns.md` — reusable, reduced-motion-safe patterns.
- `reference-intelligence/README.md` — adapter selection.
- `reference-intelligence/adapters/*.md` — per-source procedure and limits.

## Commands

```sh
node _shared/scripts/anti-slop-check.mjs <review.json> [--rules <path>] [--json]
node _shared/scripts/fidelity-check.mjs <reference.json> <implementation.json> [--json]
node _shared/scripts/capture-screenshots.mjs --url <url> --out <file.png> [--width 1440] [--height 900] [--full-page] [--mobile]
```

Exit `0` means pass; non-zero means a violation or an input error. Each script's
header lists its exact codes.
