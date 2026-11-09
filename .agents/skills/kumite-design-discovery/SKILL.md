---
name: kumite-design-discovery
description: >-
  Discover and evaluate real website and Figma design references when a user
  has no reference, or find complementary references when requested. Uses web
  research, credible reviews, awards and community evidence, then presents
  concise names, reasons and direct links for user selection. No screenshots,
  previews or dedicated discovery engine.
---

# Design Discovery

Help users discover strong, relevant design references. A user does not need
to arrive with a reference website or Figma file.

## When to use

- A new project has no visual reference.
- The user asks for inspiration, examples, templates, UI kits or design systems.
- Existing references are insufficient and the user wants alternatives.

## Two entry paths

1. **User supplied a reference:** preserve it. Do not replace it with a discovery
   exercise. Search for complementary examples only when requested or useful.
2. **No reference supplied:** research the project category and present a
   curated set of four to six real websites and/or Figma resources.

## Research procedure

1. Understand the project, audience, category, platform, required content and
   constraints. Ask only for essential missing information.
2. Search the web for real candidate websites, relevant Figma Community files,
   open-source design systems and component libraries.
3. Investigate evidence: recognised awards, independent expert reviews,
   credible community discussions, accessibility/performance reports and
   verifiable product quality. Use primary sources where possible.
4. Evaluate candidates for project relevance, visual craft, usability,
   interaction quality, accessibility and performance. Do not equate awards
   or popularity with suitability.
5. Distinguish independently verified facts from the agent's design judgement.
   Never invent ratings, traffic, awards, review consensus or user counts.
6. Select four to six diverse, relevant candidates. Avoid near-duplicates.
7. Present plain text only: name, one concise reason, evidence note where
   reputation is claimed, and a direct URL.
8. For Figma, provide the Community resource link and the actual design-file
   link when verified. Do not create image previews or screenshots.
9. Ask the user to select one or multiple candidates, combine qualities, reject
   all and request another set, or proceed with their original reference.

## Research sources

Investigate sources such as Awwwards, CSS Design Awards, SiteInspire, Godly,
Land-book, Figma Community, GitHub open-source design systems, independent
design publications and credible community discussions. These are discovery
sources, not required integrations or a predetermined ranking.

## Evaluation

| Dimension | Questions |
|---|---|
| Relevance | Does it solve a similar communication or product problem? |
| Visual craft | Are layout, typography, colour and imagery coherent? |
| Usability | Is navigation and content hierarchy understandable? |
| Interaction | Are states and interactions purposeful? |
| Accessibility | Is there evidence of keyboard, contrast and reduced-motion support? |
| Performance | Is there credible evidence of responsive and efficient delivery? |
| Reputation | Are awards/reviews independently verifiable and relevant? |

Do not fabricate a numeric score. Explain the trade-offs briefly.

## Figma identifier rules

- Community URL and numeric Community ID identify a discovery resource.
- `figma.com/design/:file_key` identifies an accessible design file.
- A node id identifies a specific frame or component inside a file.
- Never interchange or guess these identifiers.
- Do not inspect Figma contents before the user selects a candidate, unless the
  user explicitly requests research into its internals.

## Handoff

Write only the lightweight selection record needed by the current project.
The record includes title, source type, canonical URL, author/publisher when
known, licence status, concise reason, attributable evidence, selection status,
qualities to borrow and the user's notes.

Deep inspection happens only after selection, using the available browser,
repository or connected Figma capabilities. Discovery itself does not generate
screenshots, thumbnails, preview cards or mockups.
