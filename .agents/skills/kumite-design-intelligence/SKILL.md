---
name: kumite-design-intelligence
description: >-
  Route frontend design work through Kumite's Content or Product Experience
  pipeline. Supports both user-supplied references and agent-discovered
  references, enforces user selection, evidence, approval, component reuse and
  verification. Uses existing browser and Figma capabilities without requiring
  dedicated inspection engines or framework-specific animation tools.
---

# Design Intelligence

Kumite is a design agent, not a website inspection platform or IDE. It uses
capabilities already available in the host agent environment. It does not
require SitePeel, GSAP, a custom crawler, a custom browser runtime or a
dedicated reverse-engineering subsystem.

## Choose the pipeline

| Work | Pipeline |
|---|---|
| Marketing page, landing page, editorial feature, portfolio, campaign or brand site | `pipelines/content-experience/CONTEXT.md` |
| App screen, dashboard, settings, tool, onboarding or multi-step flow | `pipelines/product-experience/CONTEXT.md` |

## Reference entry paths

- **User has references:** use the supplied URLs/files as the starting point.
- **User has no references:** run `kumite-design-discovery` to research websites
  and Figma resources, then present four to six concise link options.
- **User has partial references:** preserve them and discover complementary
  options only when useful or requested.

Never make screenshots, image previews or visual boards a prerequisite for
selection. Present names, short reasons and direct links. The user may select
multiple references or combine qualities across them.

## Workflow

1. Frame the brief and identify Content or Product Experience.
2. Establish whether references were supplied. If not, research candidates.
3. Let the user select references before deep inspection.
4. Inspect only selected sources using available capabilities:
   - Websites: browser-delivered source, DOM, CSS/computed styles, loaded
     resources and observed runtime interactions where accessible.
   - Figma: connected Figma MCP, targeted nodes and variables.
   - Components: actual source and dependencies, not a gallery thumbnail.
5. Record only implementation-relevant evidence with source and confidence.
6. Resolve design conflicts with the user, propose a direction and obtain
   approval before implementation.
7. Analyse motion only where relevant and supported by live behaviour,
   prototype settings, recordings or source. Use existing specialist skills
   and the project's chosen animation technology; do not prescribe GSAP.
8. Build with existing project components and libraries.
9. Verify the implementation against the approved direction and functional
   requirements. Screenshots may be used internally when useful, never as
   selection-board content.

## Evidence rules

- Separate observed facts, inference and unknowns.
- Every material value has a traceable source and confidence:
  `exact`, `measured`, `estimated` or `unknown`.
- Browser access exposes delivered client-side resources, not private
  server-side code or inaccessible resources.
- Figma Community IDs, design-file keys and node IDs are distinct.
- A still image does not prove motion behaviour.
- Do not copy proprietary code, branding, copy or assets wholesale.
- Do not invent measurements, ratings, awards, licences or tool capabilities.

## Handoffs

| Stage | Responsibility |
|---|---|
| Brief | Audience, purpose, content, constraints and unknowns |
| Discovery and selection | `kumite-design-discovery`, `kumite-taste` |
| Reference/system inspection | `kumite-figma-integration`, available browser/source capabilities, `kumite-design-system` |
| Direction | `kumite-taste`, `kumite-design-system`, `kumite-component-intelligence` |
| Motion | `kumite-motion-design` and any installed specialist motion skill |
| Build | `kumite-component-first`, `kumite-visual-assets` |
| Verify | `kumite-design-quality` |

## Stop conditions

Stop and explain when a source is inaccessible, a material decision depends on
unknown evidence, licensing is unclear, or the user has not approved the
direction. Never fill evidence gaps by guessing.
