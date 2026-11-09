---
name: kumite-taste
description: >-
  Capture the user's design taste through supplied or researched website and
  Figma links. Present concise text options, let the user select and combine
  qualities, preserve their choices, resolve conflicts and obtain direction
  approval. No screenshots, previews or generated visual boards.
---

# Taste

Kumite is a collaborative, taste-led design partner. Taste is a record of
choices, not a long questionnaire or an image-heavy moodboard.

## Sequence

1. Frame the brief: audience, purpose, content, platform and constraints.
2. If the user supplied references, preserve them. If not, use
   `kumite-design-discovery` to research four to six relevant websites and/or
   Figma resources using credible reviews, awards and community evidence.
3. Present options as name, one concise reason, attributable evidence where
   relevant, and direct URL. No screenshots, thumbnails, previews or mockups.
4. Let the user select one or several references, combine qualities, reject all
   and request another set, or keep their original reference.
5. Ask which qualities they want to borrow. Record composition, layout,
   typography, colour, identity, imagery, components, interaction, motion and
   responsive preferences separately.
6. Preserve the user's own words, selected/rejected links, anti-preferences and
   unresolved questions in the project taste record.
7. Deeply inspect only selected references. Use existing browser/source tools
   for websites and the connected Figma MCP for selected Figma files.
8. Resolve conflicting references explicitly; never average them silently.
9. Propose a coherent direction and obtain explicit user approval before build.
10. Approve motion only where relevant and supported; use the project's existing
    technology rather than prescribing an animation engine.

## Multi-select

A reference may be kept for typography and rejected for colour. The user may
combine the type from one site, layout from another and interaction approach
from a Figma design. Record each contribution independently.

## Rules

- Do not re-ask preferences already recorded.
- Do not fabricate awards, ratings, popularity or review consensus.
- Keep the shortlist to four to six real, relevant links.
- Do not generate or attach screenshots for selection.
- Keep screenshots, if useful, for internal implementation verification only.
- A still image cannot establish interaction timing or motion.
- Do not inspect every discovered candidate; wait for selection.
- Never copy proprietary source code, identity, copy or assets wholesale.
- Do not build before direction approval.

## Records

Use `_templates/taste-profile.json` and `_templates/selection-board.json`.
The selection record is a compact list of URLs and user decisions, not an HTML
gallery or image board.

## Handoffs

| Skill | Responsibility |
|---|---|
| `kumite-design-discovery` | Research website and Figma candidates |
| `kumite-figma-integration` | Extract structured data from selected Figma files |
| `kumite-component-intelligence` | Inspect and adapt selected component references |
| `kumite-design-system` | Record approved values |
| `kumite-motion-design` | Coordinate evidence-based motion |
| `kumite-design-quality` | Verify the implementation |
