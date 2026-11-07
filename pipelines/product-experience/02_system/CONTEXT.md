# 02_system — inventory the system

One job: inventory the project's real tokens, components and variants, and name
the gaps before designing anything new.

## Inputs

- Working (this run): `../01_brief/output/brief.md`
- Working (this run): the project's real files: `package.json`, component
  directories, styles and token files
- Reference (every run): `../../../_shared/references/visual-quality-policy.md`
- Reference (every run): `../../../_shared/references/implementation-spec-template.md`

Do NOT load: other stages' references, prior runs, the whole `_shared/` folder.

## Process

1. If the brief or the project files are missing, stop and name what is missing.
2. Read the real dependencies and component directories. Record what exists; do
   not assume a library.
3. Inventory tokens: colour, type, spacing, radius, shadow and layout.
4. Inventory components with their variants and states. Record the source file
   for each.
5. Map each component the brief needs to an existing primitive using the
   component ladder: project, installed library, shadcn/ui, accessible
   primitive, Hugeicons, custom.
6. Name every gap and its justification. A custom component needs a reason the
   existing options cannot satisfy.
7. Record what is `unknown`; do not invent a token or a variant.

## Outputs

- `output/system-inventory.md`
- `output/check.md`

## Check

A person confirms every needed component maps to an existing primitive or records
a justified gap, and no token or variant is invented. Write `pass` or
`fail: <why>` as the first line of `output/check.md`.
