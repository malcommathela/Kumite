# Selection board

The selection board is a lightweight, link-first decision list. It is not a
moodboard, gallery or screenshot viewer. Its job is to help the user choose
references without spending tokens or time rendering visual previews.

## Two entry paths

- **User supplied references:** preserve the supplied URLs and ask what qualities
  the user wants to borrow.
- **No reference supplied:** research relevant websites and/or Figma Community
  resources, then present a curated shortlist of four to six options.

A shortlist is a set of candidates, not an approved direction. Never decompose
or deeply inspect a candidate until the user selects it.

## Reference record

Use `_templates/selection-board.json` as the blank shape. Each reference
contains only:

| Field | Meaning |
|---|---|
| `id` | Stable option id |
| `title` | Website, design file or resource name |
| `source.type` | `website`, `figma`, `component`, or `user` |
| `source.url` | Canonical, clickable URL |
| `source.author` | Author or publisher when known |
| `source.licence` | Verified terms or `unknown` |
| `reason` | One concise reason it is relevant |
| `evidence` | Short, attributable award/review/community evidence; never invented |
| `selected` | `keep`, `reject`, or `undecided` |
| `qualities` | Qualities the user wants: composition, layout, typography, colour, identity, imagery, components, interaction, motion, responsive |
| `contribution` | The exact part to borrow |
| `notes` | The user's own words |

Do not add screenshot URLs, thumbnails, preview images, image prompts or
generated visual assets to a selection record.

## Discovery quality

When no reference is supplied:

1. Understand the project, audience, category, platform and constraints.
2. Search the open web for real, relevant websites and Figma Community files.
3. Prefer primary sources, recognised design-award publications, independent
   reviews and credible community discussion.
4. Evaluate relevance, visual craft, interaction quality, usability,
   accessibility and performance where evidence exists.
5. Distinguish verified awards/reviews from subjective assessment. Never invent
   ratings, traffic, popularity, awards or review consensus.
6. Present four to six candidates with short reasons and direct links. Include
   the evidence source when making a reputation claim.
7. For Figma references, provide the Community page and, when verified, the
   actual design-file URL. Do not use thumbnails as a substitute for access.

Useful discovery sources include Awwwards, CSS Design Awards, SiteInspire,
Godly, Land-book, Figma Community, open-source design systems and general web
search. These are sources to investigate, not mandatory integrations or a
ranking in themselves.

## User choice

- Let the user keep one or several references.
- Allow different references to contribute different qualities.
- Allow the user to reject all options and request another shortlist.
- Do not repeatedly ask for preferences already expressed.
- Ask one focused question at a time when a decision is missing.
- A user-provided reference takes priority; discover complementary options only
  when they would materially help or the user asks.

## After selection

Only inspect selected references in depth:

- Website: use available browser capabilities to inspect the delivered HTML,
  loaded DOM, CSS/computed styles, linked JavaScript resources and observed
  runtime interactions. Use existing browser automation if available. Do not
  build or require a dedicated inspection engine, MCP service or reverse-
  engineering subsystem.
- Figma: use the connected Figma MCP to inspect the selected file and targeted
  nodes. Community IDs, design-file keys and node ids are distinct identifiers.
  Do not query a Community ID as though it were a file key.
- Component: inspect the actual source and dependencies, not a gallery preview.

Record evidence and confidence in the project only when it affects
implementation. Screenshots may be used internally for verification when useful,
but never appear in the selection list.

## Presentation rules

1. Show four to six text options at a time, not image cards.
2. Every option has a name, one concise reason and a direct link.
3. Keep evidence/reputation notes short and attributable.
4. No screenshots, previews, thumbnails, image grids or generated mockups.
5. Figma references follow exactly the same link-first presentation.
6. Keep rejected options and reasons in the small JSON record only when useful
   to avoid repeating a decision.

## Acceptance

- Every candidate has a working canonical URL.
- Reputation claims have attributable evidence or are omitted.
- Reasons are relevant to the user's actual project.
- The user can select multiple options or request another set.
- No screenshot or preview asset is generated for the board.
- Only selected references proceed to deep inspection.
