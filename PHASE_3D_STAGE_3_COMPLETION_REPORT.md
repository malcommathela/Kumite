# Phase 3D — Stage 3 Completion Report

Selection/editing integration: `resolveEditTarget` consults the component engine
before it allows a write, and refuses with typed reasons instead of trusting the
mapping's claim.

## Scope and environment

| Item | Value |
|---|---|
| Host | Windows, PowerShell, Node 24.14.0 |
| Kumite repository | `C:\Users\malco\OneDrive\Documentos\Vscode\Projects\kumite`, branch `master` |
| Upstream working copy | `C:\Users\malco\AppData\Local\Temp\opencode\onlook-desktop-phase0`, branch `main` |
| Stage 3 commit | `08b88e7a` — `feat(edit-target): gate every edit on proven component ownership` |
| Runtime | None. No Electron run is claimed in this stage. |

## 1. What changed

| File | Change |
|---|---|
| `code/intelligence/composition.ts` | `verifyContainment` — re-derives the declarations containing an element from its start tag |
| `code/edit-target/ownership.ts` | `checkOwnership` — the Stage 3 policy over the engine |
| `code/edit-target/index.ts` | `resolveEditTarget` gates the request node and the instance's implementation node |
| `packages/models/src/code/index.ts` | Two additive `CodeDiffFailureReason` values |
| `code/edit-target/ownership.test.ts` | 9 tests over real `createMappingFromContent` output |
| `code/intelligence.test.ts` | 2 containment tests (engine suite 34 → 36) |

## 2. The policy

Two proofs, in order.

**Containment** — the AST's innermost declaration at the element's start tag must
be the component the mapping recorded. The chain is re-derived from the same
declaration kinds the mapping stacks (function declaration, class declaration,
variable declaration by first declarator), so:

- `export function Card() { return <section/> }` → chain `[Card]`;
- `const Part = () => <div/>` inside `Card` → chain `[Part, Card]`;
- a nested `function Inner()` inside `Card` → chain `[Inner, Card]`.

A mapping that points at a sibling, or at a file revision that has since moved,
fails here. This is the sibling-isolation proof the Phase 3C contract did not
have: before this stage, the mapping's `component` string was never checked
against the AST position it claimed to describe.

**Ownership** — the recorded definition must be the nearest exported ancestor,
and when a part is recorded, that part must still be declared inside it. The
engine already proved this in Stage 2; Stage 3 is the policy that consumes it.

## 3. Refusals

Additive to the Phase 3C set; no existing reason changed meaning.

| Reason | When | Message tells the user |
|---|---|---|
| `unverified-component-ownership` | The mapping has no recorded identity, so the claim cannot be proven | Restart the project run |
| `ambiguous-component-ownership` | Recorded identity disagrees with the source: sibling owns the element, definition vanished or was un-exported, part removed, file unreadable | Re-select the element |

Both are typed values, not exceptions, and they flow through the existing
all-or-nothing batch: `getCodeDiffs` resolves every request before touching an
AST, so one refused target refuses the whole batch.

## 4. One deliberate scope decision

An element inside a component with **no importable ancestor** (a file that
exports nothing) is allowed when containment is proven. The plan sketched
"inferred or ambiguous → refusal"; this case is neither. Containment is proven
from the AST, the owner is a local component, and a DOM-level class edit does not
need its owner to be importable. `part` still records the local name so callers
can tell.

The alternative — refusing every element in an unexported component — would
block legitimate edits in files that never export anything, which is a product
regression rather than a safety win.

## 5. Verification

```powershell
npx esbuild apps/studio/electron/main/code/edit-target/ownership.test.ts --bundle `
  --platform=node --format=cjs --outfile=.p3d/ownership.cjs `
  --external:@babel/parser --external:@babel/generator --external:@babel/types `
  --external:@babel/traverse --external:prettier `
  --alias:@babel/traverse=./.p3d/traverse-shim.cjs
node --test .p3d/ownership.cjs
```

| Suite | Tests | Result |
|---|---:|---|
| ownership gate | 9 | pass |
| engine (`intelligence.test.ts`, 34 → 36) | 36 | pass |
| mapping identity | 3 | pass |
| Phase 3C acceptance (unchanged) | 30 | pass |

| Gate | Result |
|---|---|
| `npx tsc --noEmit` | exit 0 |
| `npx vite build` | exit 0 |

### Ownership cases covered

1. Element owned by an exported definition.
2. Element inside a recorded part.
3. Mapping that predates identity recording → refused.
4. Element that now starts inside a sibling component → refused.
5. Nested local component resolves to its exported ancestor + part.
6. File with no exports → allowed, owner `null`, part recorded.
7. Recorded owner no longer exported → refused.
8. Recorded part no longer declared → refused.
9. Two sibling elements keep independent targets.

## 6. Known limits

- **No runtime claim.** `resolveEditTarget` reaches Electron through `runManager`
  and `mainWindow`, so it cannot be imported in `node:test` without a harness.
  The gate is proven at the `checkOwnership` seam and by typecheck/build. A real
  Electron run needs a display, which this checkout does not have.
- **Containment is name-based.** Two declarations with the same name in one file
  (illegal at top level, possible in nested scopes) resolve by innermost span;
  the mapping's stack has the same ambiguity, so the check agrees with it.
- **The engine is rebuilt per edit.** One file, already parsed by
  `readParsedFile`; the cost is the export/import scan, not a second disk read.
- **Stage 4+ not started.** Content intelligence, the Chart adapter and the
  54-item matrix remain.

## Unchanged-work statement

- No tracked file in the Kumite repository was modified; this document is new.
- Stage 3 is one local commit in the upstream working copy. No push, PR or merge.
- The temporary `.p3d` bundles and the `@babel/traverse` interop shim were
  deleted after the run; neither is committed.
