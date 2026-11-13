# Phase 3D — Stage 5 Completion Report

Adapter layer: one chart adapter for the only editing semantics the generic
content model cannot express, and literal data cells the model can address and
write.

## Scope and environment

| Item | Value |
|---|---|
| Host | Windows, PowerShell, Node 24.14.0 |
| Kumite repository | `C:\Users\malco\OneDrive\Documentos\Vscode\Projects\kumite`, branch `master` |
| Upstream working copy | `C:\Users\malco\AppData\Local\Temp\opencode\onlook-desktop-phase0`, branch `main` |
| Stage 5 commit | `2ee527c6` — `feat(content): one chart adapter, and literal data cells the model can write` |
| Runtime | None. No Electron run is claimed. |

## 1. Why an adapter exists at all

The plan says "one shared engine, adapters only where editing semantics differ".
This stage is the test of that sentence. The generic model reads text children,
string attributes and a `.map()` array. A shadcn chart breaks all three
assumptions:

- its data lives in a `data` prop on a **recharts** primitive, not in a mapped
  array;
- its series labels live in a `config` object passed to `ChartContainer`;
- the elements that hold them (`BarChart`, `ChartTooltip`, …) are re-exports of
  the charting library, not shadcn parts, so the capability/ownership engine has
  nothing to say about them.

That is a real semantic difference, not a special case to bolt onto the generic
path. So it gets one adapter, and the generic path stays generic.

## 2. What landed

| File | Change |
|---|---|
| `code/intelligence/adapters.ts` | `ComponentAdapter`, `AdapterExtraction`, `AdapterRegion`, the `chart` adapter, `COMPONENT_ADAPTERS`, `adapterForElement` |
| `code/intelligence/content.ts` | `dataTableFromArray` / `findLocalConst` / `unwrapExpression` exported and shared; numeric cells; `NodeContent.adapter` |
| `code/intelligence/index.ts` | The facade passes `COMPONENT_ADAPTERS` into `extractContent` |
| `code/diff/content.ts` | Numeric literal indexing and writing |
| `code/intelligence/adapters.test.ts` | 7 tests |
| `code/intelligence/content.test.ts` | +2 (numeric cells, typed literal) |
| `code/diff/content.test.ts` | +2 (numeric replacement, refused non-numeric) |

## 3. The adapter contract

```ts
interface ComponentAdapter {
    registryName: string;                                  // 'chart'
    elements: readonly string[];                           // claimed element names
    extract(ast, element, filePath): AdapterExtraction;    // read-only
}

interface AdapterExtraction {
    registryName: string;
    fields: ContentField[];      // config.<series>.label
    data: DataTable | null;      // local array behind `data`
    regions: AdapterRegion[];    // series / tooltip / legend / config
    evidence: Evidence[];
    reason: string | null;       // why it could not be read
}
```

`extract` is read-only and returns the same `ContentField` shape the generic
model returns, so the write path does not need a second mechanism. A field from
an adapter is written by the same span-addressed `contentChanges` guard as a text
run or an attribute.

`adapterForElement(name)` is the only lookup. There is no map from component name
to behaviour anywhere else.

## 4. What the chart adapter proves, and refuses

| Input | Result |
|---|---|
| `config={chartConfig}` where `chartConfig` is a local object literal with string `label`s | `config.desktop.label` etc. as data fields |
| `config={chartConfig}` imported from another module | refused: "config is not a local object literal in this file." |
| `config` series with `label: labelFor('x')` | refused: "config.desktop.label is not a string literal." |
| `data={chartData}` where `chartData` is a local array literal | rows and cells as a `DataTable` |
| `data={getData()}` | refused: "data is not a local array literal in this file." |
| `<ChartContainer>` with a `BarChart`, `ChartTooltip`, `ChartLegend` child | regions `series`, `tooltip`, `legend` with spans |
| `<section>` | no adapter; the generic model answers |

The `config` object is read through `satisfies ChartConfig`, because the shadcn
chart demo writes exactly that. `unwrapExpression` handles `as`, `satisfies`,
`!` and parentheses.

## 5. Numeric cells

A chart cell is usually a number: `{ month: 'January', desktop: 186 }`. Stage 4
accepted string literals only, so the chart's data would have been invisible.

- The row rule is now "string or number literal". Anything else still refuses the
  whole table with the property named.
- `applyContentChanges` indexes `NumericLiteral` too. A numeric cell compares as
  its decimal text (`"186"`) and is written as a number.
- A non-numeric replacement for a numeric cell is refused (`"lots" is not a
  number, and this cell holds a number.`) rather than coerced. The cell is never
  turned into a string.

## 6. Verification

| Suite | Tests | Result |
|---|---:|---|
| chart adapter (`intelligence/adapters.test.ts`) | 7 | pass |
| content model (`intelligence/content.test.ts`, 12 → 14) | 14 | pass |
| content write-back (`diff/content.test.ts`, 5 → 7) | 7 | pass |
| engine | 36 | pass |
| ownership gate | 9 | pass |
| mapping identity | 3 | pass |
| Phase 3C acceptance (unchanged) | 30 | pass |

| Gate | Result |
|---|---|
| `npx tsc --noEmit` | exit 0 |
| `npx vite build` | exit 0 |

### A typecheck bug the stage caught

The first draft of the adapter test used `assert.equal(content.ok, true)` before
narrowing. `@types/node` types that as an assertion, so the refusal branch was
narrowed to `never` and `content.message` did not typecheck. The helper now
throws on `!content.ok` directly. The test was wrong, not the model.

## 7. Known limits

- **No chart-editing UI.** The adapter is exposed through
  `ComponentIntelligence.content(node).adapter` and written through
  `contentChanges`. No panel was invented for it, for the same reason as Stage 4:
  the audit forbids fabricated UI.
- **Same-file literals only.** A config or dataset imported from another module is
  refused. Cross-file extraction needs the imported file indexed, which the engine
  does not do yet.
- **Regions are direct children.** Nested chart parts are not walked; the adapter
  names what it can prove from one level.
- **One adapter, not a framework.** The interface is deliberately small. A second
  adapter (21st.dev, Magic UI) would be added when its semantics are measured, not
  pre-built.
- **No runtime claim.** Fixtures and the typecheck only. The 54-item matrix is
  Stage 6.

## Unchanged-work statement

- No tracked file in the Kumite repository was modified; this document is new.
- Stage 5 is one local commit in the upstream working copy. No push, PR or merge.
- The temporary `.p3d` bundles and the `@babel/traverse` interop shim were
  deleted after the run; neither is committed.
