# Selection board

The selection board is the interactive surface where references become choices.
It supports two modes that share one record:

- **Guided conversation.** The agent presents a small, curated set and asks
  about specific qualities.
- **Independent browsing.** The user opens the board, selects and annotates at
  their own pace, then hands the result back.

The board is not a mood board of unexamined screenshots. Every card has a
source, a licence status, a preview and a reason it is on the board.

## What the board holds

Use [`_templates/selection-board.json`](../../_templates/selection-board.json)
as the blank shape.

| Field | Meaning |
|---|---|
| `id` | Stable card id |
| `source.type` | `url`, `figma`, `screenshot`, `image`, `video`, `component`, `asset`, `generated` |
| `source.identity` | Exact URL, file key and node id, file path, or component registry URL |
| `source.licence` | Verified licence, or `unknown` |
| `preview` | Project-local preview path or remote preview URL |
| `selected` | `keep`, `reject`, `undecided` |
| `qualities` | What the user wants from this card: composition, layout, typography, colour, identity, imagery, components, interaction, motion, responsive |
| `contribution` | One sentence naming the part to borrow, e.g. "type scale and caption treatment only" |
| `notes` | The user's own words |
| `confidence` | `exact`, `measured`, `estimated`, `unknown` |
| `conflictsWith` | Card ids that contradict this card, with the dimension |

A card may be selected for one quality and rejected for another. That is normal;
record it instead of forcing a single verdict.

## Collection

Accept every source type the user has: a URL, a live site, a Figma file, page or
frame, a screenshot, an image, a video or recording, a component from 21st.dev,
a font file, an icon set or an asset. Keep the original and a local capture in
the project's `reference/` folder; never hotlink a source into the implementation.

Use [`../reference-intelligence/README.md`](../reference-intelligence/README.md)
to choose the adapter. A source that cannot be opened is recorded as
`inaccessible`, not reconstructed from memory.

## Discovery

Agent-assisted discovery is optional but expected when the user has few
references. Search by the decision, not by a generic aesthetic word:

- composition and layout: editorial, bento, split, full-bleed, dense dashboard;
- typography: display serif, grotesk, monospace, mixed editorial;
- colour and identity: warm monochrome, high-contrast, saturated accent;
- imagery: documentary, product, abstract, collage;
- components and interaction: data table, command palette, filter rail;
- motion: reveal, scroll-linked, state feedback, intentionally still.

Record the search source, query and date. A discovered reference is a candidate,
not an approved direction.

## Presentation rules

1. Show three to six cards at a time. More is a catalogue, not a choice.
2. Put the decision on the table: "Which composition should lead?"
3. Pair each card with a crop that shows the relevant quality, not only the hero.
4. Ask which quality the user wants, not whether the whole site is "good".
5. Never repeat a question the taste profile already answers.
6. Offer a combination explicitly: "type from A, grid from B, motion from C".
7. Keep rejected cards visible with the reason. They prevent re-litigating the
   same choice.
8. Record the selection in `selection-board.json` before decomposing anything.

## The board tool

`_tools/taste-board.mjs` renders the JSON into one self-contained HTML file:

```sh
node _tools/taste-board.mjs projects/<project>/taste/selection-board.json \
  --out projects/<project>/taste/selection-board.html
```

The page supports keyboard selection, quality checkboxes, notes and a JSON
export. It has no network dependency and no animation beyond a short,
reduced-motion-safe state change. The JSON remains the source of truth; the HTML
is a view.

## Acceptance

- Every card has a source identity and licence status.
- Every kept card names the quality or qualities wanted.
- Rejected cards say why.
- The user's own words are recorded, not paraphrased into agent language.
- The board and the taste profile agree.
- Conflicts are listed for resolution, not hidden.
