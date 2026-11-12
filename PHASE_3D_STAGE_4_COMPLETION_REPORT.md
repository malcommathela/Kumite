# Phase 3D — Stage 4 Completion Report

Content intelligence: element text, string attributes and in-file data tables
read from the AST, and written back through the existing `CodeDiffRequest` path
with a span guard.

## Scope and environment

| Item | Value |
|---|---|
| Host | Windows, PowerShell, Node 24.14.0 |
| Kumite repository | `C:\Users\malco\OneDrive\Documentos\Vscode\Projects\kumite`, branch `master` |
| Upstream working copy | `C:\Users\malco\AppData\Local\Temp\opencode\onlook-desktop-phase0`, branch `main` |
| Stage 4 commit | `43a88401` — `feat(content): read and write element content from the source, not the DOM` |
| Runtime | None. No Electron run is claimed. |

## 1. What the model extracts

`code/intelligence/content.ts`, reached through
`ComponentIntelligence.content(node)`.

| Field | Editable when | Refused when |
|---|---|---|
| Text | exactly one plain `JSXText` run; or no children (text can be added) | `{expression}` child, element child, several text runs, `<img>` |
| Attribute | a string literal, excluding `className`, `key`, `ref`, `style` | expression value, spread, style-path attributes |
| Data | the element renders one `.map()` over a local `const` array of object literals with string values | imported array, inline array, holes, spreads, computed keys, non-string values |

Each field carries `label`, `value` (what a user reads), `raw` (the exact literal
at the span), `span` (Babel-native line/column), `editable` and, when refused,
the `reason`. The refusal reason is a sentence, not a code, because the UI shows
it directly.

This is the baseline-audit rule made executable: a component that arrived empty
has no data fields, and nothing is fabricated to make it look populated.

## 2. Write-back

`CodeDiffRequest.contentChanges` is additive and optional:

```ts
interface ContentChange {
    span: ContentSpan;   // Babel-native, as extracted
    expected: string;    // the literal the model read
    value: string;       // the replacement
}
```

`code/diff/content.ts` re-indexes every `JSXText` and `StringLiteral` in the
file by exact span, then applies each change only when the node is still there
and still says `expected`. Any mismatch refuses the batch with `stale-content`
and names the line. Changes are applied before class/structure transforms, so a
span cannot be moved by another edit in the same request.

`processGroup` now honours a failure's specific reason instead of flattening
every transform failure to `class-transform-unsupported`.

## 3. One rule, two consumers

`textContentField` is used by:

- `isChildTextEditable` — the gate behind `IS_CHILD_TEXT_EDITABLE`, so the UI
  and the write agree;
- `updateNodeTextContent` — the write guard.

Before this stage, the write replaced the first `JSXText` child without checking
what the other children were. An element whose text was `{title}` could have its
expression replaced by a string literal — the same class of data-loss bug as the
Phase 3B `cn()` case. The guard now refuses with `text-content-unsupported`.

## 4. Verification

| Suite | Tests | Result |
|---|---:|---|
| content model (`intelligence/content.test.ts`) | 12 | pass |
| content write-back (`diff/content.test.ts`) | 5 | pass |
| engine | 36 | pass |
| ownership gate | 9 | pass |
| mapping identity | 3 | pass |
| Phase 3C acceptance (unchanged) | 30 | pass |

| Gate | Result |
|---|---|
| `npx tsc --noEmit` | exit 0 |
| `npx vite build` | exit 0 |

Model cases: single text run, expression text, mixed children, empty element,
image, attribute filtering, local data table, imported data, computed key,
element-at-position, missing element, facade. Write cases: string literal, JSX
text, stale expected, missing span, batch failure.

## 5. Known limits

- **No data-editing UI.** Text and attribute editing keep their existing surface.
  The data model and write path exist and are tested; no panel was invented for
  them. That is deliberate: the audit forbids fabricated UI and data.
- **Same-file data only.** A table imported from another module is reported as
  not editable, because its rows are not in the mapped file. Cross-file
  extraction would need the file to be indexed, which the engine does not do
  for arbitrary imports yet.
- **`updateNodeProp` is unchanged.** Attribute writes through the existing
  `attributes` map still adds or replaces props; `contentChanges` is the guarded
  literal path. The two coexist by design.- **No runtime claim.** The text gate and guard are unit-tested; the channel
  wiring is covered by typecheck/build only.

## Unchanged-work statement

- No tracked file in the Kumite repository was modified; this document is new.
- Stage 4 is one local commit in the upstream working copy. No push, PR or merge.
- The temporary `.p3d` bundles and the `@babel/traverse` interop shim were
  deleted after the run; neither is committed.
