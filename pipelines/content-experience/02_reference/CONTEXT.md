# 02_reference — decompose the reference

One job: read the reference region by region and record evidence with honest
confidence labels.

## Inputs

- Working (this run): `../01_brief/output/brief.md`
- Working (this run): the reference files the brief names, kept in the project's
  `reference/` folder
- Reference (every run): `../../../_shared/references/reference-intelligence.md`
- Reference (every run): `../../../_shared/reference-intelligence/README.md`
- Reference (every run): exactly one adapter named in that README, chosen by
  source type
- Reference (every run): `../../../_shared/references/evidence-and-confidence.md`

Do NOT load: every adapter at once, other stages' references, prior runs.

## Process

1. If the brief or the reference is missing or empty, stop and name it.
2. Record the source: type, identity, access status, date and licence.
3. Run the chosen adapter's procedure. Decompose in five passes: page
   composition, sections, components, detail, responsive.
4. Write the region tree with crop coordinates or node ids, and the viewport for
   every measurement.
5. Write the evidence record: values, confidence and evidence ids. Use
   `reference-evidence.json` only if it helps; there is no mandatory schema.
6. Record motion as `static`, `partial` or `unknown` unless a recording or
   prototype actually evidences it.
7. List what the source cannot prove.

## Outputs

- `output/reference-evidence.json` (or an equivalent Markdown record)
- `output/decomposition.md`
- `output/check.md`

## Check

A person compares each evidence entry to its crop or node and confirms its
confidence label; any value without a source is downgraded to `unknown`. Write
`pass` or `fail: <why>` as the first line of `output/check.md`.
