# 02_system — discover taste and inventory the system

One job: establish design taste using supplied or researched link references,
then inventory the project's real tokens, components and variants.

## Inputs

- Working (this run): `../01_brief/output/brief.md`
- Working (this run): the project's real files: `package.json`, component
  directories, styles and token files
- Reference (every run): `../../../_templates/selection-board.json`
- Reference (every run): `../../../_templates/taste-profile.json`
- Reference (every run): `../../../_shared/foundations/selection-board.md`
- Reference (every run): `../../../_shared/foundations/taste-profile.md`
- Reference (every run): `../../../_shared/references/visual-quality-policy.md`
- Reference (every run): `../../../_shared/references/implementation-spec-template.md`

Do NOT load other stages' references, prior runs or the whole `_shared/` folder.

## Process

1. If the brief or project files are missing, stop and name what is missing.
2. If the user has no references, use `kumite-design-discovery` to find four to six
   relevant websites and/or Figma resources. Present names, short reasons and
   direct links only; no screenshots or previews. Let the user choose one or
   more references or request another shortlist.
3. Preserve selected/rejected cards, chosen qualities, anti-preferences and the
   user's own words in project-local taste artifacts.
4. Read real dependencies and component directories. Record what exists; do not
   assume a library.
5. Inventory tokens: colour, type, spacing, radius, shadow and layout.
6. Inventory components with their variants and states. Record the source file
   for each.
7. Map each required component to an existing primitive using the component
   ladder: project, installed library, shadcn/ui, accessible primitive,
   Hugeicons, custom. Name and justify every gap; record unknowns.

## Outputs

- `output/taste-profile.json`
- `output/selection-board.json` (compact link and choice records only)
- `output/system-inventory.md`
- `output/check.md`

## Check

A person confirms the user was asked for taste and their choices were preserved,
every needed component maps to an existing primitive or a justified gap, and no
token or variant is invented. Write `pass` or `fail: <why>` as the first line
of `output/check.md`.
