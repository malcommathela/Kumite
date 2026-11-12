# 02_reference — discover taste and decompose selected references

One job: help the user choose references through a lightweight, link-only shortlist,
then inspect only the references they choose.

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

1. If references are supplied, preserve them. If none are supplied, use
   `kumite-design-discovery` to research four to six relevant websites and/or
   Figma resources using reviews, awards and credible community evidence.
2. Present each option as its name, one concise reason and direct links. No
   screenshots, previews, thumbnails or generated mockups. Let the user select
   one or multiple references, combine qualities, reject all or request another set.
3. Record the user's own words, selected/rejected links, qualities to borrow,
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
- `output/selection-board.json` (compact link and choice records only)
- `output/reference-evidence.json`
- `output/decomposition.md`
- `output/check.md`

## Check

A person confirms that the user was asked for taste, selected qualities and the
user's own words were preserved, every evidence entry has a source and honest
confidence, and conflicts are carried forward. Write `pass` or `fail: <why>`
as the first line of `output/check.md`.
