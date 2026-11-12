# Phase 3D — Stage 0 Baseline Audit

Read-only audit. No application code was modified to produce this document.
Every number below was measured in this workspace on 2026-11-12 unless marked
otherwise.

## 0. Headline

Three facts change how the rest of the Phase 3D specification has to be read:

1. **The application is not in the Kumite repository.** Kumite is a
   methodology repository (pipelines, skills, shared references). The
   Onlook-derived application lives only in
   `C:\Users\malco\AppData\Local\Temp\opencode\onlook-desktop-phase0`, as
   **uncommitted working-copy edits on top of upstream `a3685a4`**. All Phase
   3B/3C code exists there and nowhere else.
2. **The "54 components" number is measurable and it belongs to `shadcn@3.7.0`,
   not to the CLI Kumite pins (`3.8.5`, which serves 57).** The two snapshots
   differ in 34 of the 54 component files, so the number, the CLI pin and the
   audited bytes cannot all stay as they are.
3. **The rebrand is roughly 40 % done, and the parts already changed already
   moved user storage.** `APP_NAME`/`APP_SCHEMA`/`productName`/`appId` are
   Kumite; the Electron `userData` directory is derived from the product name,
   so the moment `productName` changed, existing Onlook data stopped being
   found. No migration code exists.

The Phase 3B/3C work itself is intact and green (30/30 acceptance tests,
`tsc --noEmit` exit 0, current production build). That is the foundation the
spec asks us to extend, and it is sound.

## 1. Where the code lives

| Item | Value | Evidence |
|---|---|---|
| Kumite repository | `C:\Users\malco\OneDrive\Documentos\Vscode\Projects\kumite` | branch `master`, HEAD `dc39910`, in sync with `origin/master` |
| Kumite working tree | 12 untracked documents/artifacts, 0 tracked modifications | `git status --short --branch` |
| Application working copy | `C:\Users\malco\AppData\Local\Temp\opencode\onlook-desktop-phase0` | branch `main`, HEAD `a3685a49bdb9ace3708ee38464874b097e2485d3` (= upstream base) |
| Application working tree | **35 modified tracked files, 79 untracked paths** (65 are `probe*.mjs` in `apps/studio`) | `git status --porcelain` |
| Repository size | 1.4 GB (includes `node_modules`, `dist`, `dist-electron`) | measured |
| Toolchain | Node 24.14.0, npm 11.11.0, Electron 36.0.1, Python present, **`bun` absent** | measured |
| Build state | `apps/studio/dist` and `dist-electron` rebuilt 2026-11-12 01:31 (end of Phase 3C) | timestamps |
| No Onlook user data on this host | `%APPDATA%` has no `Onlook*` or `Kumite*` directory | measured |

Consequences that the specification does not anticipate:

- "Work in the existing local Kumite workspace" can only mean: **application
  code in the upstream checkout, Kumite documents in the Kumite repository.**
  That is the pattern every prior phase used.
- The checkout is in `%TEMP%`. A temp cleaner, a reboot policy, or a failed
  `git clean` destroys Phases 3B and 3C. This is the single largest risk in the
  project and it is not a code risk.
- The app is built and verified by direct Electron launch
  (`electron.launch` with `dist-electron/main/index.js`), not by the repo's
  `bun test` (no `bun`) or Playwright suite (needs a display). Runtime evidence
  in Phase 3D has to keep using that path.

## 2. Verified baseline

| Check | Command | Result |
|---|---|---|
| TypeScript | `npx tsc --noEmit` in `apps/studio` | **PASS**, exit 0, no output |
| Phase 3C acceptance suite | esbuild bundle of `phase3c.acceptance.test.ts` → `node --test` | **PASS**, 30 tests / 4 suites / 30 pass / 0 fail (~955 ms) |
| Kumite architecture tests | `node --test "tests/**/*.test.mjs"` | **99 pass, 5 fail** — pre-existing, same as Phase 3B/3C baseline |
| Kumite link check | `python _tools/links.py` | **1 broken** — `_shared/patterns/README.md` → `gsap/README.md` (pre-existing) |
| Studio unit tests | `bun test` | **NOT RUN** — `bun` is not installed |
| Studio e2e | `playwright test` | **NOT RUN** — needs a display |

The 5 Kumite failures are in `.agents` skill frontmatter assertions
(`tests/architecture.test.mjs`) and are unrelated to this work. They must not be
reported as Phase 3D regressions, and they should be fixed separately because
Stage 7 will otherwise keep inheriting a red baseline.

## 3. Existing architecture map

### 3.1 Identity chain (what actually links a click to a source node)

```
source JSX  --(run-start injects data-oid)-->  static oid per JSX element
   |                                               |
   |                                        runManager.mapping: oid -> TemplateNode
   |                                        { path, startTag, endTag, component,
   |                                          dynamicType, coreElementType }
   v
browser DOM  --(instrumentation sets data-oiid on the rendered component root)-->
             selection: { domId, oid, instanceId }
```

Measured facts:

- `EditorAttributes.DATA_ONLOOK_ID = 'data-oid'`; every JSX opening element in
  every scanned `.jsx/.tsx` file gets one (`run/setup.ts:addIdsToAst`).
- `DATA_ONLOOK_INSTANCE_ID = 'data-oiid'` is set at runtime by
  `updateElementInstance` and equals the **call-site** oid.
- `TemplateNode.component` is the nearest enclosing `FunctionDeclaration`,
  `ClassDeclaration` or `VariableDeclaration` name — a *lexical* answer, not a
  composition answer.
- The mapping is a flat `Map<oid, TemplateNode>`, rebuilt per file on every
  watcher event, cleared on run start/stop.

### 3.2 Edit-target contract (Phase 3C — must be preserved)

- `EditTarget` = `implementation-node { oid }` or `component-instance
  { callSiteOid, instanceId, implementationOid, componentName? }`
  (`packages/models/src/actions/target.ts`).
- `resolveEditTarget` (`electron/main/code/edit-target/`) is the single
  authority: oid → mapping → optional `sourcePath` check → instance identity
  equality → implementation mapping → `className` forwarding gate.
- Nine typed refusal reasons (`CodeDiffFailureReason`); the batch is refused
  atomically before any AST is touched (`diff/index.ts`); duplicate targets and
  multi-occurrence oids are refused.
- Class edits are fail-closed: static strings, static templates, and
  `cn/clsx/classNames/cx/twMerge` only; spreads, conditionals and dynamic
  templates refuse (`diff/class-expression.ts`, `diff/style.ts`).

### 3.3 Transforms available today

`code/diff/transform.ts` handles classes, attributes, text content, and the
structural actions `move`, `insert`, `remove`, `group`, `ungroup`,
`insert-image`, `remove-image`. Props edits go through `code/props.ts` and are
sent as `implementation-node` from the Props tab. Structural actions keep their
pre-3C contract (no explicit target) — documented as Phase 3C limit 5.

### 3.4 Component installation (Phase 3B)

- Catalog is **5 components** (`SHADCN_COMPONENTS`): button, card, input, badge,
  dialog. Each carries `insertCode` and `previewCode` demo JSX.
- `COMPONENT_CLI_VERSION = '3.8.5'`; installer shells out to the project's
  package manager and never passes `--overwrite`.
- Status detection, isolated Vite preview, oklch→HSL theme normalisation, and
  `.kumite/components.json` + `.kumite/THIRD-PARTY-NOTICES.md` provenance.
- Insertion writes through the same `CodeDiffRequest` pipeline with `imports`,
  so inserted JSX receives `data-oid` and stays editable.

### 3.5 What the specification asks for that does not exist

| Spec capability | Current state |
|---|---|
| Component definition model (exports, imports, wrappers) | **absent** — no registry of definitions; names come from the lexical stack |
| Composition graph (part/provider/consumer/wrapper) | **absent** — no relationship model at all |
| Component-parts vs instance vs definition identities | **partially** — oid and instanceId exist; definition/part ids do not |
| Capabilities per part | **absent** — `isComponent`/`instanceId` is the only capability signal |
| Content model (demo content, editable fields) | **absent** — only 5 hardcoded `insertCode` strings |
| Source fingerprints / incremental invalidation | **absent** — mapping is rebuilt wholesale, superseded entries are never evicted |
| Ownership confidence (`proven/inferred/ambiguous`) | **absent** — mapping is boolean: found or refused |
| Specialized adapters | **absent**; no adapter interface to extend |
| Compatibility matrix with evidence | **absent** |
| Any 21st.dev / Magic UI / custom adapter | **absent** by design (`COMPONENT_SYSTEM_ARCHITECTURE.md`) |

Two structural observations for Stage 2:

- The engine belongs in **one new main-process module** that the existing
  resolver consults. `runManager` is the natural owner of the mapping and is
  already the only source of `TemplateNode`; adding a second registry would
  duplicate it (the spec forbids that).
- `_shared/component-core.mjs` in the Kumite repository is a **documentation
  model**, not application code. It must not be imported by the app and must not
  become the runtime registry.

## 4. Identity audit (Stage 1 input)

### 4.1 Measured surface

Scope: 416 files of `git ls-files`, case-insensitive `onlook`, binary assets
excluded from line matching.

| Category | Occurrences | Files |
|---|---|---|
| `Onlook` / `onlook` total (line matches, case-insensitive) | 1 675 | 416 |
| Workspace package specifiers `@onlook/*` | 980 | 364 |
| CSS design tokens (`background-onlook`, `foreground-onlook`, `border-onlook`) | 129 | 61 |
| Runtime DOM attributes / `EditorAttributes` values (`data-onlook-*`, `onlook-toolbar`, `onlook-rect`, …) | 72 | 28 |
| External URLs (`onlook.com`, `onlook.live`, `onlook.dev`) | 53 | 32 |
| Upstream GitHub URLs (`github.com/onlook-dev`) | 37 | 18 |
| Email addresses (`@onlook.com`) | 22 | 20 |
| Mixpanel telemetry wiring | 23 | 5 |
| `IdeType.ONLOOK` | 9 | 4 |
| Logo components (`Icons.OnlookLogo`, `Icons.OnlookTextLogo`) | 5 | 4 |
| 11 workspace package names | 11 | 11 |

### 4.2 Already migrated (Phase 0–2 work, verified present)

| Surface | Current value |
|---|---|
| `APP_NAME` / `APP_SCHEMA` | `Kumite` / `kumite` |
| `apps/studio/package.json` `productName` | `Kumite` |
| electron-builder `appId` | `dev.kumite.studio` |
| Linux `executableName`, protocol scheme | `Kumite`, `kumite` |
| Publish target | `github/malcommathela/Kumite` |
| Window titles | `Kumite` (`index.html`, `src/index.html`) |
| Azure signing | removed |

### 4.3 Not migrated, by required treatment

| Classification | Finding | Treatment for Stage 1 |
|---|---|---|
| Product-facing strings | 11 `Onlook` strings per locale × 4 locales (welcome, about, plan names, watermark); logo components in TopBar/ProjectSelect | rename; plan/watermark strings also encode a **billing** product that Kumite does not have — decide copy, do not invent features |
| Workspace package scope | `@onlook/{ai,foundation,git,growth,models,supabase,types,ui,utility,studio,typescript}` | rename to `@kumite/*`; mechanical but touches 980 specifiers, root scripts (`bun --filter @onlook/...`), tsconfig paths, vite aliases, electron-builder `files` |
| Runtime attribute names | `data-onlook-*`, `onlook-toolbar`, `onlook-rect`, `onlook-stylesheet`, `onlook-drag-stub`, `olk-` move keys | rename in `EditorAttributes` **only if** all four consumers (main, preload, renderer, injected style) move together, and stale `data-onlook-*` attributes left in old projects are still cleaned on run stop |
| CSS tokens | `--background-onlook`, `--foreground-onlook`, `border-onlook` in `packages/ui` + Tailwind config + 61 usages | rename tokens and usages in one commit-group; verify both themes visually |
| IPC channel value | `view-code-in-onlook` | rename value; channel keys are internal enum names, values are not persisted |
| IDE integration | `IdeType.ONLOOK` / `IDE.ONLOOK` ("Onlook" external editor) | **Corrected in Stage 1:** this is the app's own internal viewer (`internal://`, Dev tab), not a third-party editor. It was renamed to `IdeType.KUMITE`; legacy `'Onlook'` is still accepted from persisted settings. See `KUMITE_REBRAND_AUDIT.md` §4. |
| Telemetry | Mixpanel client, no per-product token in source; event names are product-neutral | keep service, review event names; no identity leak found in event strings |
| External contracts | `HOSTING_DOMAIN = 'onlook.live'`, `REDIRECT_APP_URL = 'https://onlook.dev/redirect-app'`, `X-Onlook-Request-Type` header, Supabase/Stripe backends (env-driven) | **do not rename blindly.** These are Onlook-operated services. Kumite either operates its own endpoint or the feature is disabled with an honest message. Renaming the string alone would produce a working-looking button that 404s |
| Attribution | Apache-2.0 upstream, LICENSE, THIRD-PARTY-NOTICES, README provenance | **preserve.** Upstream copyright and the `onlook-dev/desktop` links that document provenance stay |

### 4.4 User data

- Storage is `app.getPath('userData')` + fixed filenames: `user-settings.json`,
  `app-state.json`, `user-metadata.json`, `auth-tokens-v1.json`,
  `projects.json`, `conversations-v1/`, `suggestions/`, `images/`.
- Electron derives `userData` from the app name, which now resolves to
  **Kumite** because `productName` was changed. Before the rebrand it was the
  Onlook name.
- **Nothing migrates.** A user who ran the Onlook build and then the Kumite
  build loses sight of projects, settings, tokens and conversations.
- `auth-tokens-v1.json` is `safeStorage`-encrypted, so a migration must copy
  bytes, not re-serialise them, and must not decrypt anything it does not need.
- No data exists on this host, so a migration can only be **tested against a
  synthetic Onlook user-data directory** (create one, migrate, assert).
- Required design (Stage 1): detect the legacy directory → copy to
  `<Kumite userData>/migration/<timestamp>/` → validate JSON readability and
  non-empty project list → write only the files Kumite does not already own →
  mark complete in a `migration.json` → idempotent on re-run → never delete the
  legacy directory → if source is corrupt, leave Kumite untouched and report.

## 5. shadcn compatibility target — reconciled

### 5.1 The two candidates

| Snapshot | Tag | Commit | `registry:ui` items | Registry index `sha256` |
|---|---|---|---|---|
| CLI currently pinned by Kumite | `shadcn@3.8.5` | `ad25490cf96e103901fb45c0cb99d112dabc9148` | **57** | `0EFCAC76…D80516` |
| Snapshot that matches "54" | `shadcn@3.7.0` | `1e9e337923aaede7db55b6091cb56a72a661b959` | **54** | `90B9A3D8…4E9585` |

`shadcn` 3.8.5 was published 2026-02-16T10:46:11Z; the tag dereferences through
tag object `991a0da8563424330452823630bd02130f08474b` to that commit.

3.8.5 adds exactly **`combobox`, `direction`, `native-select`** and removes
nothing. But it is not a superset in content: **34 of the 54 shared component
files changed** between the two tags (for example `accordion`, `button`,
`card` unchanged, `dialog`, `sheet`, `sidebar`, `tabs`, `tooltip` changed).
A 54-name manifest validated against 3.8.5 installs would therefore not match a
3.7.0-pinned manifest.

### 5.2 `toast` is legacy-only

`toast` is listed in the registry index but has **no `new-york-v4` item**
(`styles/new-york-v4/toast.json` → 404). The file exists only under the legacy
`default` and `new-york` styles. For a v4-style project `shadcn add toast`
cannot deliver the audited file. `toast` is superseded by `sonner` upstream.
Expected matrix status: **blocked with documented limitation**, unless a project
opts into a legacy style.

### 5.3 Demo content does not live in `registry:ui`

Measured: `chart`, `carousel`, `table`, `card`, `sidebar` registry items each
ship **one** file and no example data. Demo datasets live in separate
`registry:example` items (`chart-bar-demo`, `carousel-demo`, `table-demo`) and
`registry:internal` (`sidebar-demo`).

This is the decisive finding for Stage 4: the specification's "installed
components retain their example content" is **not true by default for
shadcn/ui**, because `add chart` installs a container component with no data.
Demo content reaches a project today only through the app's own `insertCode`
strings (5 components). Stage 4 therefore has to define demo content for
Kumite-owned insert templates and, where a project already contains demo data,
preserve and edit *that* — never fabricate data into a component that arrived
empty.

### 5.4 Manifest (54, `shadcn@3.7.0`, `new-york-v4`, file × content sha256 prefix)

| # | Item | File | sha256(12) |
|---|---|---|---|
| 1 | accordion | `ui/accordion.tsx` | `7251e973cc68` |
| 2 | alert | `ui/alert.tsx` | `49d8311589b8` |
| 3 | alert-dialog | `ui/alert-dialog.tsx` | `fc70cace4c21` |
| 4 | aspect-ratio | `ui/aspect-ratio.tsx` | `6a75117416aa` |
| 5 | avatar | `ui/avatar.tsx` | `e8672934f1c3` |
| 6 | badge | `ui/badge.tsx` | `e7455feb113b` |
| 7 | breadcrumb | `ui/breadcrumb.tsx` | `22f3f4c13ed1` |
| 8 | button | `ui/button.tsx` | `5a5c4b8b60a8` |
| 9 | button-group | `ui/button-group.tsx` | `be72c8268228` |
| 10 | calendar | `ui/calendar.tsx` | `eb83a94b4357` |
| 11 | card | `ui/card.tsx` | `2040cdff27cd` |
| 12 | carousel | `ui/carousel.tsx` | `cb48ae08c4de` |
| 13 | chart | `ui/chart.tsx` | `39a2fde54414` |
| 14 | checkbox | `ui/checkbox.tsx` | `a8292972a5b8` |
| 15 | collapsible | `ui/collapsible.tsx` | `c2c74dc3e994` |
| 16 | command | `ui/command.tsx` | `c8c59c99b817` |
| 17 | context-menu | `ui/context-menu.tsx` | `70e547a9bece` |
| 18 | dialog | `ui/dialog.tsx` | `bd07164f172a` |
| 19 | drawer | `ui/drawer.tsx` | `0c9464ed4f95` |
| 20 | dropdown-menu | `ui/dropdown-menu.tsx` | `e1564b091236` |
| 21 | empty | `ui/empty.tsx` | `584b491f9eb6` |
| 22 | field | `ui/field.tsx` | `93b9494bc196` |
| 23 | form | `ui/form.tsx` | `19188e7d0122` |
| 24 | hover-card | `ui/hover-card.tsx` | `031f6a309d87` |
| 25 | input | `ui/input.tsx` | `56b7fd30208a` |
| 26 | input-group | `ui/input-group.tsx` | `bfaddee2976d` |
| 27 | input-otp | `ui/input-otp.tsx` | `35d561c352fd` |
| 28 | item | `ui/item.tsx` | `a73ac2a0e6e2` |
| 29 | kbd | `ui/kbd.tsx` | `886e04c83aaa` |
| 30 | label | `ui/label.tsx` | `9ec42c8a57e8` |
| 31 | menubar | `ui/menubar.tsx` | `d3c5b6060323` |
| 32 | navigation-menu | `ui/navigation-menu.tsx` | `d71f57fe0f36` |
| 33 | pagination | `ui/pagination.tsx` | `0caeb5bd4504` |
| 34 | popover | `ui/popover.tsx` | `29a217781737` |
| 35 | progress | `ui/progress.tsx` | `e7a89220fb49` |
| 36 | radio-group | `ui/radio-group.tsx` | `b12ca5cef859` |
| 37 | resizable | `ui/resizable.tsx` | `41043c0f3dec` |
| 38 | scroll-area | `ui/scroll-area.tsx` | `1c5d0b242d05` |
| 39 | select | `ui/select.tsx` | `71459423cd65` |
| 40 | separator | `ui/separator.tsx` | `e9dddbd8dbbc` |
| 41 | sheet | `ui/sheet.tsx` | `3d6a560c635f` |
| 42 | sidebar | `ui/sidebar.tsx` | `011e6e6cf2f4` |
| 43 | skeleton | `ui/skeleton.tsx` | `f2aea81d8baf` |
| 44 | slider | `ui/slider.tsx` | `640996327017` |
| 45 | sonner | `ui/sonner.tsx` | `13ccc9b0fe42` |
| 46 | spinner | `ui/spinner.tsx` | `3e6e6e8d37fb` |
| 47 | switch | `ui/switch.tsx` | `17f2390d98e8` |
| 48 | table | `ui/table.tsx` | `7b8c7a952cf4` |
| 49 | tabs | `ui/tabs.tsx` | `e8469e599381` |
| 50 | textarea | `ui/textarea.tsx` | `de4e9fb0fd8e` |
| 51 | toast | *(no `new-york-v4` item)* | `—` (legacy style only) |
| 52 | toggle | `ui/toggle.tsx` | `b201563ea8cd` |
| 53 | toggle-group | `ui/toggle-group.tsx` | `b2aafb7dafd1` |
| 54 | tooltip | `ui/tooltip.tsx` | `cbc12f408644` |

### 5.5 Local corpus for discovery tests

`packages/ui/src/components` already contains **34 component files, 29 of them
shadcn-derived** (accordion, alert-dialog, button, card, checkbox, collapsible,
command, context-menu, dialog, dropdown-menu, input-group, input, kbd, label,
popover, progress, resizable, scroll-area, select, separator, skeleton, tabs,
textarea, toast, toaster, toggle-group, toggle, tooltip, plus `index.tsx`).
This is a real, offline, version-controlled shadcn corpus available for AST
discovery tests without network access.

## 6. Conflict register

| # | Specification | Reality | Resolution |
|---|---|---|---|
| C1 | "Work in the existing local Kumite workspace" | app is in a temp checkout with 114 uncommitted entries | implement in the checkout, documents in Kumite; **relocate or back up the checkout first** (decision D1) |
| C2 | 54 components | 54 = `shadcn@3.7.0`; pinned CLI 3.8.5 = 57 and 34 files differ | pin manifest + CLI to one snapshot (decision D2) |
| C3 | "Installed components retain their original example content" | `registry:ui` items ship no examples | content applies to insert templates and to data the project actually has; never fabricate |
| C4 | "Do not introduce a parallel component registry" | `runManager.mapping` is the only source of `TemplateNode` | the engine indexes into `runManager`; it does not re-scan independently or hold a second oid map |
| C5 | "Adapters only when semantics differ" | only Chart qualifies at present; portals/context work through the existing instance chain | build no provider/portal adapters |
| C6 | "Capabilities per part" | current `className` forwarding gate is per *component*, and is the only style capability proof | capabilities are derived from the same three proofs (forwarding, class-expression shape, call-site presence) — no new heuristics |
| C7 | "No Onlook identity in the user-facing app" | publishing, redirect, support email, plan names point to Onlook-operated services | rename what Kumite owns; disable or re-point what it does not; never fake an endpoint |
| C8 | Stage 7 green validation | Kumite baseline is 99/5 + 1 broken link; studio `bun test`/Playwright unavailable | fix the 5 pre-existing failures, document the two unavailable suites honestly |
| C9 | Rebrand acceptance: installer identifies as Kumite | `nsis: {}` has no shortcut/product metadata; icons still the Onlook marks | add installer metadata and replace icons; verify `electron-builder` output |

## 7. Implementation plan (smallest coherent units)

Ordered so every unit can be verified before the next one.

**Stage 1 — identity**
1. Backup/relocate the working copy. *(decision D1)*
2. Storage migration module + tests (synthetic legacy dir) — independent of
   renaming, so it lands first and is provable.
3. Product strings + locales + logo components.
4. External-service surface: redirect URL, hosting domain, support emails,
   watermark/plan copy — re-point or disable with an honest message.
5. Workspace scope `@onlook/*` → `@kumite/*` (package.json names, imports,
   tsconfig paths, vite aliases, root scripts) — one mechanical pass, verified by
   `tsc` + `vite build`.
6. Runtime attribute/token rename with a compatibility read for stale
   `data-onlook-*` attributes; verify selection and run-stop cleanup.
7. Packaging: icons, `nsis` metadata, protocol, `productName`; build installer.
8. Deliver `KUMITE_REBRAND_AUDIT.md` and `KUMITE_REBRAND_MIGRATION.md`.

**Stage 2 — engine foundation**
- One module, e.g. `electron/main/code/intelligence/`:
  `definitions.ts` (AST export/import discovery from the files already mapped
  by `runManager`), `composition.ts` (relationships with evidence + confidence),
  `capabilities.ts` (derived from forwarding/class-expression/call-site proofs),
  `fingerprints.ts` (file hash + per-node span hash, invalidation on watcher
  event), `index.ts` (facade).
- Extend `TemplateNode` with definition/part identity rather than adding a
  parallel map.
- Unit tests over `packages/ui/src/components` (offline corpus) + the five
  catalog components.

**Stage 3 — selection/editing integration**
- `resolveEditTarget` consults the engine for ownership confidence; proven →
  current behaviour, inferred/ambiguous → typed refusal (new reasons, additive).
- Re-run the 30 Phase 3C cases unchanged; add ownership/sibling-isolation cases.

**Stage 4 — content intelligence**
- Content model over AST array/object/string literals in the mapped files;
  editable-field extraction with source spans; write-back through the existing
  `CodeDiffRequest` path with per-node oid verification.

**Stage 5 — Chart adapter**
- Registry-name adapter interface (`chart` only); map chart regions to
  `ChartConfig`/data source nodes when provable, refuse otherwise.

**Stage 6 — 54-component matrix**
- Expand `SHADCN_COMPONENTS` from 5 to the pinned 54 with title/description/
  dependencies/insert template; generate matrix rows from tests, not prose.

**Stage 7/8 — regression + audit report.**

## 8. Risks

1. **Temp-checkout loss** — 35 modified + 79 untracked paths exist only in
   `%TEMP%`. Highest risk in the project.
2. **Registry drift** — if the manifest, the CLI pin and the audited bytes
   disagree, "54 validated" becomes unprovable.
3. **Attribute rename** — `data-onlook-*` appears in main, preload, renderer and
   injected styles; a partial rename silently breaks selection. There is also a
   cleanup path (`run/cleanup.ts`) that must still recognise old attributes in
   projects that were instrumented before the rename.
4. **`@onlook/*` rename breadth** — 980 specifiers across 364 files; a missed
   tsconfig path or vite alias still typechecks but fails at runtime.
5. **False demo content** — fabricating chart datasets or carousel slides would
   violate the no-fabrication rule and is the easiest way to make Stage 4 look
   green while breaking the product.
6. **Runtime verification cost** — every component needs a real Electron run;
   54 × (install, select, edit, reload) is the dominant schedule cost, not the
   code.
7. **`toast`** cannot be delivered on the v4 style at the pinned snapshot.

## 9. Open decisions

**D1 — working copy location.** Keep implementing in
`%TEMP%\opencode\onlook-desktop-phase0`, or copy it (working tree included) to a
durable path before Stage 1. The copy is not a git commit and does not violate
the no-commit rule.

**D2 — registry pin.** (a) pin CLI **and** manifest to `shadcn@3.7.0`
(`1e9e3379…`) → exactly 54, byte-exact, reproducible, but re-verifies Phase 3B
install behaviour at a slightly older CLI; (b) keep CLI `3.8.5` and define the
corpus as the 54 **names**, recording each installed file's fingerprint at
install time → keeps the Phase 3B-verified CLI, but the "pinned revision" is then
a name list, not a byte manifest; (c) cover all **57** at `3.8.5` → superset of
the target, supersedes the "54" figure.

Recommendation: **(a)** for reproducibility, with the three 3.8.5-only items
recorded as out of scope.

## Unchanged-work statement

- No tracked file in the Kumite repository was modified; this document is new.
- No application source was modified during Stage 0.
- No branch, commit, push, PR or merge was created in either repository.
- The temporary esbuild bundle used for the baseline test run was deleted.
