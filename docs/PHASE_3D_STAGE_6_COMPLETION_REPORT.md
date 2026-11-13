# Phase 3D — Stage 6 Completion Report

Catalog: the audited 54 shadcn/ui items, generated from a pinned registry
snapshot, plus one matrix that proves every entry is structurally sound.

## Scope and environment

| Item | Value |
|---|---|
| Host | Windows, PowerShell, Node 24.14.0 |
| Kumite repository | `C:\Users\malco\OneDrive\Documentos\Vscode\Projects\kumite`, branch `master` |
| Upstream working copy | `C:\Users\malco\AppData\Local\Temp\opencode\onlook-desktop-phase0`, branch `main` |
| Stage 6 commit | `1decf45a` — `feat(catalog): 54 pinned shadcn items, and a matrix that proves them` |
| Pinned snapshot | `shadcn@3.7.0`, commit `1e9e337923aaede7db55b6091cb56a72a661b959` |
| Runtime | None. No Electron run is claimed. |

## 1. What "54 components" means here

The count is the audit's manifest (§5.4), not a number chosen to look
comprehensive. The 54 names were fixed before this stage; what changed is that
the catalog now carries all of them with measured provenance instead of five
hand-written entries.

Measured while collecting the data (each value is a request against the pinned
commit):

| Probe | Result |
|---|---|
| `new-york-v4/<name>.json` for the 54 audited names | 53 items, `toast` → **404** |
| `new-york-v4/toast.json` | 404 |
| `new-york-v4/native-select.json` | **200** — but `native-select` is not in the audited manifest (it is a 3.8.x item), so it is excluded and this report says so rather than silently adding it |
| `new-york-v4/combobox.json`, `direction.json` | 404 — not registry items at this snapshot |
| docs frontmatter for all 54 names | 54 pages with `title` and `description` |

So the catalog is 53 installable items plus one documented refusal. The refusal
is a row, not an omission: dropping `toast` would make the catalog disagree with
the manifest and hide the fact that the pinned snapshot cannot install it.

## 2. How the catalog is built

Only one thing in the catalog is authored: the JSX template for each item. Every
other field is measured from the pinned snapshot.

| Field | Source |
|---|---|
| `title`, `description` | the matching docs page frontmatter at the pinned commit |
| `dependencies` | the registry item's `dependencies`, with version specifiers stripped (`recharts@3.8.0` → `recharts`, `react-day-picker@latest` → `react-day-picker`) |
| `registryDependencies` | the registry item's own list |
| `parts` | the names the pinned `ui/<name>.tsx` file actually exports |
| `imports` | derived from the JSX identifiers the template uses, resolved against `parts` |
| `insertCode`, `previewCode` | authored; `previewCode` defaults to `insertCode` |
| `installable`, `insertable`, `previewable`, `limitation` | optional, present only where a capability is missing |

Three decisions are worth naming:

- **Imports cannot name a part the pinned file does not export.** The generator
  collects `<Identifier>` from both templates, looks each one up in the export
  list, and fails the build if a name belongs to no item or to two. The only
  verbatim imports are for names that are not registry exports, and only when
  the package is a recorded dependency — which today means the recharts
  primitives for `chart`.
- **Dependencies are bare names** because the install path checks them against
  `package.json` keys. Leaving `recharts@3.8.0` in place would have produced a
  lookup that always reports a missing package.
- **`parts` includes non-component exports** (`buttonVariants`, `badgeVariants`,
  `useFormField`). That is deliberate: it is the file's export list, and it is
  what an import is checked against. It is not a claim that every entry is a JSX
  component.

## 3. The three items that cannot do everything

| Item | install | insert | preview | Measured reason |
|---|---|---|---|---|
| `toast` | no | no | no | no item at this snapshot (`toast.json` 404); the legacy toast exists only in the deprecated style |
| `form` | yes | no | no | a wrapper over react-hook-form; a static template would need a `FormField` controller instance the catalog does not generate |
| `sonner` | yes | yes | no | the toaster renders nothing until `toast()` is pushed, and the isolated preview has no trigger to push one |

Each flag is paired with the sentence that explains it, and the product surface
refuses before doing work: install returns the reason, insert returns the reason,
preview returns the reason before it writes a file.

## 4. The matrix

`apps/studio/electron/main/code/component-matrix.test.ts` builds one row per
catalog item and prints it. The columns are: parts exported by the pinned file,
imports as `item:count`, insert and preview verdicts, the className proof for
items whose source exists in this repository, and the recorded limitation.

| Item | Parts | Imports | Insert | Preview | className (local) | Note |
|---|---:|---|---|---|---|---|
| accordion | 4 | accordion:4 | ok | ok | ambiguous |  |
| alert | 3 | alert:3 | ok | ok | — |  |
| alert-dialog | 11 | alert-dialog:9 button:1 | ok | ok | ambiguous |  |
| aspect-ratio | 1 | aspect-ratio:1 | ok | ok | — |  |
| avatar | 3 | avatar:2 | ok | ok | — |  |
| badge | 2 | badge:1 | ok | ok | — |  |
| breadcrumb | 7 | breadcrumb:6 | ok | ok | — |  |
| button | 2 | button:1 | ok | ok | proven-root |  |
| button-group | 4 | button:1 button-group:1 | ok | ok | — |  |
| calendar | 2 | calendar:1 | ok | ok | — |  |
| card | 7 | card:5 | ok | ok | proven-root |  |
| carousel | 6 | card:2 carousel:5 | ok | ok | — |  |
| chart | 6 | chart:3 recharts:4 | ok | ok | — |  |
| checkbox | 1 | checkbox:1 label:1 | ok | ok | proven-root |  |
| collapsible | 3 | button:1 collapsible:3 | ok | ok | ambiguous |  |
| command | 9 | command:6 | ok | ok | proven-root |  |
| context-menu | 15 | context-menu:5 | ok | ok | proven-root |  |
| dialog | 10 | button:1 dialog:7 | ok | ok | ambiguous |  |
| drawer | 10 | button:1 drawer:7 | ok | ok | — |  |
| dropdown-menu | 15 | button:1 dropdown-menu:6 | ok | ok | ambiguous |  |
| empty | 6 | button:1 empty:5 | ok | ok | — |  |
| field | 10 | field:4 input:1 | ok | ok | — |  |
| form | 8 |  | blocked | blocked | — | Form is a wrapper over react-hook-form |
| hover-card | 3 | button:1 hover-card:3 | ok | ok | — |  |
| input | 1 | input:1 | ok | ok | proven-root |  |
| input-group | 6 | input-group:4 | ok | ok | proven-root |  |
| input-otp | 4 | input-otp:4 | ok | ok | — |  |
| item | 10 | button:1 item:6 | ok | ok | — |  |
| kbd | 2 | kbd:2 | ok | ok | proven-root |  |
| label | 1 | input:1 label:1 | ok | ok | proven-root |  |
| menubar | 16 | menubar:6 | ok | ok | — |  |
| navigation-menu | 9 | navigation-menu:6 | ok | ok | — |  |
| pagination | 7 | pagination:6 | ok | ok | — |  |
| popover | 4 | button:1 popover:3 | ok | ok | ambiguous |  |
| progress | 1 | progress:1 | ok | ok | proven-root |  |
| radio-group | 2 | label:1 radio-group:2 | ok | ok | — |  |
| resizable | 3 | resizable:3 | ok | ok | proven-root |  |
| scroll-area | 2 | scroll-area:1 | ok | ok | proven-root |  |
| select | 10 | select:7 | ok | ok | ambiguous |  |
| separator | 1 | separator:1 | ok | ok | proven-root |  |
| sheet | 8 | button:1 sheet:6 | ok | ok | — |  |
| sidebar | 24 | sidebar:9 | ok | ok | — |  |
| skeleton | 1 | skeleton:1 | ok | ok | proven-root |  |
| slider | 1 | slider:1 | ok | ok | — |  |
| sonner | 1 | sonner:1 | ok | blocked | — | The toaster renders nothing until a toast is pushed, and the isolated preview has no trigger to push one |
| spinner | 1 | spinner:1 | ok | ok | — |  |
| switch | 1 | label:1 switch:1 | ok | ok | — |  |
| table | 8 | table:7 | ok | ok | — |  |
| tabs | 4 | tabs:4 | ok | ok | ambiguous |  |
| textarea | 1 | textarea:1 | ok | ok | proven-root |  |
| toast | 0 |  | blocked | blocked | not-exported | The pinned new-york-v4 snapshot has no toast item (the registry request returns 404) |
| toggle | 2 | toggle:1 | ok | ok | proven-root |  |
| toggle-group | 2 | toggle-group:2 | ok | ok | proven-root |  |
| tooltip | 4 | button:1 tooltip:4 | ok | ok | ambiguous |  |

Measured on this run: insertable 52, previewable 51, local source 27, measurable 26.

The assertions behind that table:

1. **One root.** `insertCode` and `previewCode` parse as a single JSX element or
   fragment. `(a, b)` parses as a sequence expression and `(a)(b)` as a call, so
   requiring the initializer to be JSX is the proof, not a statement count.
2. **Nothing renders unimported.** Every capitalised identifier in either
   template is covered by the entry's own imports.
3. **Nothing imports outside the pinned export list.** A `@/components/ui/<item>`
   import must name a catalog item and only names that item exports. A bare
   package import must appear in the entry's `dependencies`.
4. **Dependencies are bare names.** No empty string, no `@version`.
5. **Blocked items are empty and explained.** `form`, `sonner`, `toast` have no
   code where they are blocked, and every one of them carries a limitation.

Coverage is stated honestly rather than implied: 27 catalog items have a local
source in this repository (`packages/ui/src/components`), 26 of those are
measurable by the engine, and `toast` is the 27th — present as a file, but with
no pinned part list to measure against. The other 27 catalog items are validated
structurally against the pinned export lists and are not claimed to be rendered.

## 5. The product surface

| Surface | Change |
|---|---|
| `electron/main/components/index.ts` | install refuses `installable === false` and returns the recorded reason |
| `src/lib/components/index.ts` | insert refuses `insertable === false` |
| `electron/main/components/preview.ts` | preview refuses `previewable === false` before writing any file |
| `ComponentsTab` | search over name / title / description; "Unavailable" badge; Insert and Preview hidden when the catalog says the item cannot do it; the recorded limitation shown under the row |

The preview's import builder also changed: a registry import (`@/…`) is resolved
to the installed file, and any other specifier is emitted verbatim. Without that,
the chart template could not be previewed at all, because `recharts` is not a
file in the ui directory.

## 6. Verification

| Suite | Tests | Result |
|---|---:|---|
| component matrix (`code/component-matrix.test.ts`, new) | 4 | pass |
| engine (`code/intelligence.test.ts`, 36 → 35) | 35 | pass |
| ownership gate | 9 | pass |
| mapping identity | 3 | pass |
| Phase 3C acceptance | 30 | pass |
| content model | 14 | pass |
| content write-back | 7 | pass |
| chart adapter | 7 | pass |

The engine suite lost one test because the stale "five catalog components" block
was replaced: four assertions became three (the audited name list, the blocked
items, the corpus coverage). The template-parsing assertions moved to the matrix,
where they cover all 54 instead of five.

| Gate | Result |
|---|---|
| `npx tsc --noEmit` | exit 0 |
| `npx vite build` | exit 0 |

## 7. Known limits

- **No runtime claim.** The matrix, the typecheck and the build are what ran. No
  Electron process was started, so no install, insert or preview was observed
  end to end.
- **27 items are not measurable here.** Their templates are proven to parse, to
  have one root, and to import only exported names. Nothing is claimed about how
  they render.
- **Templates are authored, not upstream demos.** The JSX is written for this
  catalog: one root, project-agnostic props, no data invented into empty
  components. It is not a copy of each docs example.
- **Theme variables are the project's.** `chart` uses `var(--chart-1)` and
  `sidebar` uses `--sidebar-*`; a project whose theme does not define them will
  render the right structure with the wrong colours. The preview does not
  inject a theme.
- **`native-select` is deliberately absent** from a 54-item catalog even though
  the pinned registry directory serves it (200). It is not in the audited
  manifest, which is pinned to `shadcn@3.7.0`.
- **`toast` has no parts**, so its row cannot be measured and its imports are
  empty. That is the recorded state of the snapshot, not an oversight.
- **One adapter only.** The chart adapter from Stage 5 is the only semantic
  special case in the catalog. No other item needed one, and none was invented.

## Unchanged-work statement

- No tracked file in the Kumite repository was modified; this document is new.
- Stage 6 is one local commit in the upstream working copy. No push, PR or merge.
- The `.p3d` data-collection scripts, the generated registry snapshot and the
  test bundles are not committed; the catalog and the matrix test are.
