# 02_reference — discover taste and decompose selected references

One job: help the user express taste through an interactive selection board,
then decompose the references they choose into evidence.

## Inputs

- Working (this run): `../01_brief/output/brief.md`
- Working (this run): reference files named in the brief, kept in the project's
  `reference/` folder
- Reference (every run): `../../../_templates/selection-board.json`
- Reference (every run): `../../../_templates/taste-profile.json`
- Reference (every run): `../../../_shared/foundations/selection-board.md`
- Reference (every run): `../../../_shared/foundations/taste-profile.md`
- Reference (every run): `../../../_shared/references/reference-intelligence.md`
- Reference (every run): exactly one adapter named in that README, chosen by
  source type
- Reference (every run): `../../../_shared/references/evidence-and-confidence.md`

Do NOT load every adapter at once, other stages' references or prior runs.

## Process

1. If the brief or all usable references are missing, stop and name what is
   missing. If the user has no references, offer a small curated discovery set.
2. Ask the user about taste using visual examples and the selection board; support
   guided conversation and independent browsing. Do not repeat answered questions.
3. Record the user's own words, selected and rejected cards, qualities to borrow,
   anti-preferences and unresolved questions in project-local taste artifacts.
4. Record each source's type, identity, access status, date and licence.
5. Run the appropriate adapter. Decompose selected references into composition,
   layout, typography, colour, identity, imagery, components, interaction,
   motion and responsive behaviour.
6. Record region crops or Figma node ids, evidence, confidence and what each
   source cannot prove. A still image cannot establish motion timing or behaviour.
7. List conflicts between selected references for the next stage to resolve.

## Outputs

- `output/taste-profile.json`
- `output/selection-board.json` and, when useful, a rendered HTML board
- `output/reference-evidence.json`
- `output/decomposition.md`
- `output/check.md`

## Check

A person confirms that the user was asked for taste, selected qualities and the
user's own words were preserved, every evidence entry has a source and honest
confidence, and conflicts are carried forward. Write `pass` or `fail: <why>`
as the first line of `output/check.md`.
