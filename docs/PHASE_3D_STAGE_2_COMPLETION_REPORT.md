# Phase 3D — Stage 2 Completion Report

Engine foundation: one read-only component intelligence layer over the files the
run manager already maps, plus definition identity on `TemplateNode`.

This stage adds no writing. It answers three questions from the AST alone — what
a node belongs to, what a JSX element renders, and what a definition's editable
surface is — and it refuses instead of guessing when the source does not settle
the question.

## Scope and environment

| Item | Value |
|---|---|
| Host | Windows, PowerShell, Node 24.14.0 |
| Kumite repository | `C:\Users\malco\OneDrive\Documentos\Vscode\Projects\kumite`, branch `master`, HEAD `a4e9ca6` |
| Upstream working copy | `C:\Users\malco\AppData\Local\Temp\opencode\onlook-desktop-phase0`, branch `main`, base commit `a3685a4` |
| Stage 2 commit | `39d4a61d` — `feat(engine): component intelligence foundation over the mapped source` |
| Offline corpus | `packages/ui/src/components/*.tsx` (the shadcn components vendored in this checkout) |
| Catalog corpus | The five components in `packages/models/src/components/index.ts` |
| Runtime | None. This stage is a library plus unit tests; no Electron run is claimed. |

### Working tree

- Kumite: no tracked file modified; this document is new.
- Upstream checkout: Stage 2 is committed locally as `39d4a61d`. No push, PR or
  merge in either repository.

## 1. What landed

| Module | Lines | Responsibility |
|---|---:|---|
| `code/intelligence/types.ts` | 52 | `Confidence`, `Evidence`, `ResolutionFailure`, `Lookup<T>` |
| `code/intelligence/definitions.ts` | 316 | Top-level declarations, export kinds, imports, alias/path resolution |
| `code/intelligence/composition.ts` | 408 | Ownership re-verification and JSX call-site resolution |
| `code/intelligence/capabilities.ts` | 580 | className reach, spread safety, class expression, children forwarding |
| `code/intelligence/fingerprints.ts` | 231 | File hash + per-node span hash, watcher invalidation |
| `code/intelligence/index.ts` | 96 | `ComponentIntelligence` facade |
| `code/intelligence.test.ts` | 634 | 34 unit tests over the two corpora and refusal fixtures |
| `run/definition-identity.test.ts` | 67 | 3 tests proving mapping records the identity the engine re-verifies |

Supporting edits:

- `packages/models/src/element/templateNode.ts` — `TemplateNode` gains optional
  `definition` (`{ name, exportKind }`) and `part` (`{ name }`). Optional so that
  mappings recorded before this change still parse.
- `electron/main/run/setup.ts` — `createMappingFromContent` fills both fields from
  the export proof of the mapped file.
- `electron/main/run/helpers.ts` — `getTemplateNode` + `resolveIdentity` read them
  back for the engine.
- `electron/main/code/edit-target/ast.ts` — `findComponentDeclaration` and its
  return type are exported so the engine reuses the Phase 3C declaration walk
  instead of writing a second one.

There is no per-component table anywhere in this stage. A shadcn component added
tomorrow is measured by the same rules as `Button`.

## 2. Why identity is on the node

A parallel oid → definition map would be a second source of truth that can drift
from the mapping it describes. Putting `definition` and `part` on `TemplateNode`
means:

- the mapping writes the identity and the engine re-derives it from the same file,
  so a disagreement is detectable (`resolveOwnership`);
- a node serialised before this stage stays valid, because both fields are
  optional;
- a component that is never exported stays unowned rather than borrowing a name.

`part` exists because the owner is not always the element an edit reaches:
`Button` renders `Comp` (`Comp = Primitive.button`) and the class expression lives
on `Comp`, not on the exported `Button`. Recording both keeps the export proof and
the local alias distinct.

## 3. Evidence and confidence rules

Every claim carries `Evidence[]` naming the file and the exact proof. Confidence
is deliberately coarse:

- **proven** — follows from the AST of the indexed files alone.
- **inferred** — a recorded identity or a unique suffix match was re-checked but
  not re-derived. Imported alias resolution (`@/components/ui/button`) is inferred,
  never proven.
- **ambiguous** — more than one reading is possible. Callers must refuse.

Failures are values (`Lookup<T>` with `file-not-indexed`,
`component-not-found`, `ambiguous-definition`, `import-not-resolved`,
`external-module`, `not-exported`), not exceptions and not fallbacks.

## 4. Verification

Commands run from the upstream working copy. Tests are bundled with esbuild
because this checkout has no `bun`, then run with `node --test`.

```powershell
npx esbuild apps/studio/electron/main/code/intelligence.test.ts --bundle `
  --platform=node --format=cjs --outfile=.p3d/intelligence.cjs `
  --external:@babel/parser --external:@babel/generator --external:@babel/types
node --test .p3d/intelligence.cjs
```

| Suite | Tests | Result |
|---|---:|---|
| definition discovery | 3 | pass |
| import resolution | 4 | pass |
| composition | 6 | pass |
| ownership | 5 | pass |
| capabilities over the corpus | 8 | pass |
| the five catalog components | 4 | pass |
| fingerprints | 4 | pass |
| **intelligence total** | **34** | **34 pass, 0 fail** |

| Other suite | Tests | Result |
|---|---:|---|
| `run/definition-identity.test.ts` | 3 | pass |
| `code/phase3c.acceptance.test.ts` (unchanged) | 30 | pass |

| Build gate | Result |
|---|---|
| `npx tsc --noEmit` (apps/studio) | exit 0 |
| `npx vite build` (apps/studio) | exit 0 |

### Bugs the tests caught during the stage

1. **Non-exported declarations were marked exported.** `export function X` and a
   bare `function X` both produced `named`. Fixed by reading the export kind from
   the program body, not from the declaration.
2. **Type-only imports were treated as values.** `import type { Button }` created
   a binding that could resolve to a component. Fixed at both the declaration
   level (`importKind === 'type'`) and the specifier level.
3. **Default imports resolved to nothing.** `import Panel from './panel'` looked up
   a named `default` export. Fixed with `defaultDefinition`, and the evidence now
   says "the default export" rather than naming a symbol that does not exist.
4. **`DialogHeader`/`DialogTitle` children expectations were wrong.** The first
   corpus assertions assumed direct `children` forwarding; the actual components
   forward through a spread. The assertions were corrected to the source, not the
   source to the assertions.

## 5. Known limits

- **`DialogContent` is nested by design.** It forwards `className` to
  `DialogPrimitive.Content` inside a portal, so capabilities report
  `proven-nested` while `classNameEditable` stays false. This matches the Phase 3C
  root-only gate; it is a recorded limitation, not a passing test.
- **Alias resolution is suffix-based.** `@/…` resolves only when exactly one
  indexed file matches the suffix. A tie is `unresolved`, never a guess.
- **The corpus is offline.** Nothing was fetched from the registry in this stage;
  the pinned 54-item matrix belongs to Stage 6.
- **No runtime claim.** Selection, editing and reload behaviour were not exercised
  in this stage. Stage 3 is where the engine first meets `resolveEditTarget`.
- **`badge.tsx` is not in `packages/ui/src/components`.** The catalog test
  validates the catalog's code string but does not invent a local file for it.

## 6. What Stage 3 consumes

`ComponentIntelligence.ownership(node)` returns the re-verified definition/part
plus confidence. Stage 3 turns that into policy: proven ownership keeps today's
behaviour; inferred or ambiguous ownership produces a new, additive typed refusal
alongside the existing Phase 3C reasons. The 30 Phase 3C cases are the regression
floor and are expected to stay green unchanged.

## Unchanged-work statement

- No tracked file in the Kumite repository was modified; this document is new.
- Stage 2 is one local commit in the upstream working copy. No branch, push, PR or
  merge was created in either repository.
- The temporary `.p3d` esbuild bundle and its `@babel/traverse` interop shim were
  deleted after the test run; neither is committed.
