# 01_brief — frame the product problem

One job: turn the request into a product brief that names users, jobs, flows,
states and constraints.

## Inputs

- Working (this run): `input/brief.md` — the user's request, placed here before
  the stage starts. If it is missing or empty, stop and say so.
- Reference (every run): `../../../_templates/product-brief.md`
- Reference (every run): `../../../_shared/references/evidence-and-confidence.md`

Do NOT load: other stages' references, prior runs, the whole `_shared/` folder.

## Process

1. If `input/brief.md` is missing or empty, stop and name the missing file.
2. Fill the product brief: users, jobs, the primary task, flows, data,
   permissions, constraints and success criteria.
3. For every flow, name the entry, success, empty, error, loading and
   permission states. If a state is unknown, say so.
4. List the project's existing stack and design system from real files. Do not
   assume React, Tailwind or a component library.
5. Mark every metric, testimonial, award or claim without a real source as
   `unknown` and remove it from the planned UI.

## Outputs

- `output/brief.md`
- `output/check.md`

## Check

A person confirms every flow has entry, success, empty, error and loading states
named, and that no metric, testimonial, award or claim is invented. Write `pass`
or `fail: <why>` as the first line of `output/check.md`.
