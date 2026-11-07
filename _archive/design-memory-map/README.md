# Design Memory Map — archived

This folder preserves the Design Memory Map subsystem. It is **read-only
history**, not a required artifact and not part of either pipeline.

## Why it was archived

The old `kumite-design-intelligence` pipeline made a validated Design Memory Map
the mandatory source of truth for every reference-based build. That created a
large central schema that most projects did not need, and it encouraged agents to
fill fields they could not evidence.

The current system keeps the useful parts — evidence, confidence, source
authority, region decomposition — in
[`_shared/references/evidence-and-confidence.md`](../../_shared/references/evidence-and-confidence.md)
and the pipeline's own `output/` records. There is no replacement global schema.

## What is here

| Path | Contents |
|---|---|
| `references/design-memory-schema.json` | The old JSON Schema |
| `references/design-memory-guide.md` | The old category guide |
| `references/design-memory-example.json` | The old worked example |
| `scripts/validate-memory.mjs` | The old validation CLI |
| `scripts/lib/design-memory.mjs` | The old semantic validator |
| `scripts/lib/schema.mjs` | The old JSON-Schema validator |
| `tests/design-memory.test.mjs` | The old test suite |
| `tests/fixtures/design-memory/` | The old fixtures |

## Running the archive

From the repository root:

```sh
node _archive/design-memory-map/scripts/validate-memory.mjs _archive/design-memory-map/references/design-memory-example.json
node --test "_archive/design-memory-map/tests/*.test.mjs"
```

The archive is self-contained: its scripts and tests resolve inside this folder.

## Using it

Do not require it in new work. If an existing project already has a valid memory
map, it may be read as one source of evidence, but it is not mandatory and it does
not override the pipeline's reference record. Do not extend the schema; add a
small, project-specific record instead.

## Provenance

The schema, guide, example, validator, tests and fixtures were moved here during
the ICM Umbrella restructure. Their content is unchanged except for CLI usage
strings that now point at the archive path.
