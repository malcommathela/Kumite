# 01_brief — frame the content brief

One job: turn the request into a content brief that names the audience, the one
primary action, the real content and the constraints.

## Inputs

- Working (this run): `input/brief.md` — the user's request, placed here before
  the stage starts. If it is missing or empty, stop and say so.
- Reference (every run): `../../../_templates/content-brief.md`
- Reference (every run): `../../../_shared/references/evidence-and-confidence.md`

Do NOT load: other stages' references, prior runs, the whole `_shared/` folder.

## Process

1. If `input/brief.md` is missing or empty, stop and name the missing file.
2. Fill the brief template: audience, page job, one primary action, section
   order, real content per section, constraints, and what is explicitly unknown.
3. Mark every claim, metric, testimonial, award or statistic that has no real
   source as `unknown` and remove it from the planned copy.
4. List the references the user supplied, with their access status and licence.
   If none exist, say so; do not invent one.
5. Keep the brief to one page. Constraints belong here; visual detail belongs to
   `03_composition`.

## Outputs

- `output/brief.md`
- `output/check.md`

## Check

A person confirms every content block has a real source or is marked `unknown`,
and that no metric, testimonial, award or claim is invented. Write `pass` or
`fail: <why>` as the first line of `output/check.md`.
