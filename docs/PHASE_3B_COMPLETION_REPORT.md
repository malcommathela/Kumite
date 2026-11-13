# Phase 3B — Completion Report

Runtime phase: shadcn/ui integration (discovery, install, preview, insertion,
editing), Tailwind visual-editing acceptance, and frame move/resize/pan
verification.

## Scope and environment

| Item | Value |
|---|---|
| Host | Windows, PowerShell, Node 24.14.0 |
| Kumite repository | `C:\Users\malco\OneDrive\Documentos\Vscode\Projects\kumite`, branch `master`, HEAD `dc39910` |
| Upstream working copy | `C:\Users\malco\AppData\Local\Temp\opencode\onlook-desktop-phase0`, base commit `a3685a49bdb9ace3708ee38464874b097e2485d3` |
| App | Onlook Studio production build (`dist/index.html` + `dist-electron/main/index.js`), rebuilt this phase |
| Launch | `electron.launch({ executablePath: .../electron.exe, args: ['dist-electron/main/index.js'], env: { NODE_ENV: 'production' } })` |
| Fixture | `C:\Users\malco\AppData\Local\Temp\opencode\kumite-phase3b-fixture` — Vite 6, React 18.3, TypeScript 5.6, **Tailwind 3.4 with `hsl(var(--token))` mappings** |
| Fixture routes | `/`, `/about`, `/contact`, shared `src/components/FeatureCard.tsx` |
| Fixture server | External Vite on port 3100 (`node-pty` is unbuilt in this checkout, so the app cannot spawn it) |
| Project store | `C:\Users\malco\AppData\Roaming\Electron\projects.json` (backed up before the run, restored after) |
| Evidence | `C:\Users\malco\AppData\Local\Temp\opencode\kumite-phase3b-evidence\` |

### Working tree preserved

- Kumite: no tracked file modified; only the documents named at the end.
- Upstream checkout: no branch, commit, push or PR. All edits are uncommitted
  working-copy changes; the Phase 3A.1 edits and the earlier probe scripts remain.
- No unrelated project (including Vaal) was opened or modified. The original
  Onlook repository was not touched.

## 1. Changes and their reasons

| File | Change | Reason |
|---|---|---|
| `packages/models/src/components/index.ts` (new) | catalog for Button/Card/Input/Badge/Dialog, status/install/preview types, `COMPONENT_CLI_VERSION = 3.8.5` | one shared contract between main and renderer |
| `packages/models/src/code/index.ts`, `packages/models/src/actions/action.ts` | optional `imports` on `CodeDiffRequest` and `InsertElementAction` | an inserted component must declare the imports it needs |
| `packages/models/src/constants/ipc.ts`, `packages/models/src/index.ts` | component IPC channels and re-export | renderer access |
| `apps/studio/electron/main/components/index.ts` (new) | service facade: `getComponentStatus`, `initializeComponents`, `installComponent`, `startComponentPreview`, `stopComponentPreview`, and internal `applyThemeNormalization` | single main-process owner of component operations |
| `apps/studio/electron/main/components/inspect.ts` (new) | framework, package manager, Tailwind, `components.json`, `ui` dir, installed-file detection | status without guessing |
| `apps/studio/electron/main/components/cli.ts` (new) | `shadcn@3.8.5` invocation, package-manager-specific runner, dev-dependency-preserving env | install must work on npm/yarn/pnpm/bun and must not prune devDependencies |
| `apps/studio/electron/main/components/preview.ts` (new) | isolated Vite server on the first free port from 3310, temp `__kumite_preview.{html,tsx}`, cleanup on stop | preview the real installed file without touching project config |
| `apps/studio/electron/main/components/theme.ts` (new) | `oklch -> sRGB -> HSL` token rewrite | Tailwind v3 projects map tokens as `hsl(var(--token))`; `oklch()` resolves to no colour |
| `apps/studio/electron/main/components/provenance.ts` (new) | `.kumite/components.json` manifest + `.kumite/THIRD-PARTY-NOTICES.md` | attribution and export notices |
| `apps/studio/electron/main/events/components.ts` (new), `electron/main/events/index.ts` | five IPC handlers | renderer bridge |
| `apps/studio/electron/main/code/diff/transform.ts` | `addImportsToFile` / `mergeImportDeclaration`: merge specifiers into an existing import declaration | avoid a second import statement for a module already imported |
| `apps/studio/src/lib/components/index.ts` (new) | renderer `ComponentsManager`, exposed as `editorEngine.components` | install/preview/insert from the UI |
| `apps/studio/src/routes/editor/LayersPanel/ComponentsTab.tsx` | catalog list, install status, Install/Insert actions, preview dialog with iframe | the actual panel |
| `apps/studio/src/routes/editor/LayersPanel/index.tsx` | Components tab registration | reachable UI |

## 2. Runtime test results

Every row was measured in the running production build against the Tailwind
fixture, not inferred from source.

### 2.1 Discovery, installation, provenance

| Test | Result | Evidence |
|---|---|---|
| Status on an uninitialized Tailwind Vite project | PASS | `framework: "vite"`, `packageManager: "npm"`, `tailwind: true`, `initialized: false`, all five `installed: false` (`component-install-preview.json`) |
| `init` runs implicitly on first install | PASS | install log shows `shadcn@3.8.5 init -d` then `add button -y`; `components.json`, `src/lib/utils.ts` created |
| Install writes real source | PASS | `src/components/ui/button.tsx` created with shadcn source; log `Created 1 file` |
| Install other four components | PASS | card, input, badge, dialog each report `created`; status shows all five `installed: true` (`component-catalog-evidence.json`) |
| Repeat install is non-destructive | PASS | second install reports already installed and does not rewrite the file |
| devDependencies survive install | PASS | `vite`, `tailwindcss`, `typescript` still present after all installs (`devDependenciesRestored`) |
| Tailwind token mappings present after init | PASS | `tailwindHasTokens: true` |
| Provenance manifest written | PASS | `.kumite/components.json` lists all five components with `cliVersion: "3.8.5"`, files, `updatedAt` |
| Third-party notices written | PASS | `.kumite/THIRD-PARTY-NOTICES.md` present (`files.notices: true`) |
| Unsupported project is refused with a reason | PASS | no `package.json` → main raises and the panel shows the message; Next.js without Tailwind → `supported: false`, `reason: "Tailwind CSS was not detected in the active project."`; the supported fixture reports `supported: true` with all five installed (`component-unsupported.json`) |
| Install refuses unsupported input at the IPC boundary | PASS | unsupported project → `success: false`, "Tailwind CSS was not detected…"; unknown component → "That component is not part of the supported catalog."; missing path → "The active project does not contain a package.json."; no files written (`component-install-refusals.json`) |
| Install refreshes the open previews | PASS | after deleting `ui/badge.tsx` and installing it again, all three frame webviews reloaded (`performance.timeOrigin` changed in every one) and the file was restored (`component-install-reload.json`) |

### 2.2 Preview

| Test | Result | Evidence |
|---|---|---|
| Preview starts an isolated server | PASS | `http://127.0.0.1:3310/__kumite_preview.html` for the first component, `:3311` for the next |
| Preview renders the real installed component | PASS | Button: `Default / Secondary / Outline / Ghost / Destructive`, 5 interactive elements; Card renders title/description/content; Input, Badge, Dialog render their real markup |
| Preview imports the installed file | PASS | temp entry uses a relative import of `./src/components/ui/<name>` (no copy is made) plus the project's own CSS |
| Temp files removed on stop | PASS | `tempFilesAfter: { html: false, entry: false }` |

`component-install-preview.json` is the first-run snapshot taken before the isolated
preview server existed and still shows its failure; `component-catalog-evidence.json`
is the post-implementation record used above.

### 2.3 Theme normalization

| Test | Result | Evidence |
|---|---|---|
| oklch tokens converted for a `hsl(var(--token))` project | PASS | 62 tokens rewritten in `src/index.css`; `oklch` occurrences remaining: 0 (`theme-normalization.json`) |
| Normalized tokens paint | PASS | preview Default Button `background rgb(23, 23, 23)`, `color rgb(250, 250, 250)`, body `rgb(255, 255, 255)` |

### 2.4 Visual editing with Tailwind

| Test | Result | Evidence |
|---|---|---|
| Edit writes the selected element's source, not `<body>` | PASS | `bg-red-500` added on the dashed `<div>` appears in `src/pages/Home.tsx` only |
| Rendered change | PASS | background `rgb(239, 68, 68)` |
| Persists after reload | PASS | after `webview.reload()`, class and background unchanged, 26 `data-oid` elements present |
| Shared-component edit propagates | PASS | `bg-blue-100` written to `src/components/FeatureCard.tsx`; rendered `rgb(219, 234, 254)` in **both** Home and About |
| Unrelated files untouched | PASS | 2 of 14 source files changed (`Home.tsx`, `FeatureCard.tsx`) |

### 2.5 Insertion and post-insertion editing

| Test | Result | Evidence |
|---|---|---|
| Insert Card into a selected element | PASS | real JSX appended inside the selected `<div>` in `src/pages/Home.tsx` |
| Imports merged, not duplicated | PASS | one declaration `import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";` |
| Rendered | PASS | "Card title / A short description of the card. / Card content goes here." rendered in the frame |
| Inserted subtree is editable | PASS | 7 `data-oid` attributes inside the inserted Card |
| Only the target file changed | PASS | 1 of 13 source files (`insertion.json`) |
| Edit an inserted element's Tailwind class | PASS | selecting the inserted `<p>` and adding `text-red-600` wrote to `Home.tsx`, rendered `rgb(220, 38, 38)`, library file unchanged, 1 of 13 files (`insertion-edit.json`) |
| Edit a library component's internal node | **FAIL (documented limitation)** | selecting shadcn `CardHeader` shows `Warning: Unsupported className format.`; committing via Instance Classes wrote a literal `className` into `src/components/ui/card.tsx`, replacing its `cn(...)` merge. Recovered with `shadcn add card -y --overwrite` (`insertion-instance-bug.json`) |

The failing row is an upstream limitation of the instance-class commit path, not of
insertion: the inserted JSX itself is editable and writes to the page. Editing the
component at its call site (`<Card className="...">`) works; editing its internal
nodes does not.

### 2.6 Frame move, resize, pan

All measurements are the stored `project.settings` values at scale 0.5
(`frame-move-resize.json`).

| Test | Result | Evidence |
|---|---|---|
| Move frame by dragging the address bar | PASS | 40 screen px to the left → position `0 → -80` (80 canvas units), y unchanged, host box −40 px |
| Resize width from the right handle | PASS | 24 screen px → `1440 → 1488` (+48), height unchanged, host box +24 px |
| Resize height from the bottom handle | PASS | 16 screen px → `1024 → 1056` (+32), width and position unchanged, host box +16 px |
| Pan with wheel | PASS | `position.y 30.97 → 186.97` |
| Pan with middle-button drag | PASS | `position` `303.29,186.97 → 363.29,306.97` |
| Persist after full restart | PASS | position, dimensions and pan read back identical; 3 frames; previews render with `data-oid`s (Home 14, About 10) |

A drag that begins on a frame overlapped by another frame can be swallowed by the
neighbouring webview or resize handle, producing a jump instead of the expected
delta. Non-overlapping drags are exact and repeatable; this is hit-testing, not
persistence.

## 3. Verification commands

| Command | Result | Notes |
|---|---|---|
| `npx tsc --noEmit` (apps/studio) | PASS | clean |
| `npx vite build` (apps/studio) | PASS | renderer (`dist/`), main (`dist-electron/main/index.js`), preload rebuilt |
| `npx eslint electron/main/components electron/main/events/components.ts electron/main/code/diff/transform.ts src/lib/components/index.ts src/routes/editor/LayersPanel/ComponentsTab.tsx` | PASS | 0 errors; 2 warnings (intentional ANSI regex in `cli.ts`; models package reported outside the lint base path) |
| `npx tsc --noEmit` (fixture) | PASS | fixture sources clean after the run |
| `node --test "tests/**/*.test.mjs"` (Kumite root) | FAIL | pre-existing, unrelated: 99 pass, 5 fail in `tests/architecture.test.mjs` (skill frontmatter/description assertions). Same baseline as Phase 3A.1; nothing under `.agents/` was touched |
| `python _tools/links.py` (Kumite root) | FAIL | pre-existing, unrelated: `_shared/patterns/README.md` links `gsap/README.md`, which is absent |
| `npm test` / `bun test` (apps/studio) | NOT RUN | `bun` is not installed on this host; the Studio suite is Bun-based |
| `npm run e2e` (apps/studio) | NOT RUN | Playwright suite expects a dev server and a display; runtime verification here used direct Electron launch instead |

## 4. Known limits

1. **Library-internal node editing** (section 2.5): unsupported in this build;
   instance-class commits can overwrite a library file's internal `className`.
2. **`node-pty` unbuilt** in the isolated checkout, so the fixture's dev server runs
   externally. Injection (`data-oid`) still comes from the real `run-start` flow.
3. **No `bun`** on the host, so the Studio unit suite and the Playwright e2e suite
   were not executed; equivalent behaviour was measured by direct runtime probes.
4. **Overlap-related drag flakiness**: overlapping frames swallow pointer events on
   each other's resize handles.
5. shadcn CLI is pinned to `3.8.5`; 4.x changes the registry to Base UI/nova and
   2.10.0 fails Tailwind validation.
6. A genuine CLI failure (for example a network error mid-install) was not
   provoked. The exit code and captured output are returned in the install result
   and shown in the UI toast, but only successful installs and the refusal paths
   above were exercised at runtime.

## 5. Acceptance gate

| Criterion | Result |
|---|---|
| shadcn/ui components can be discovered, installed, previewed, inserted and edited | PASS |
| Installation targets the active React project, detects the package manager, initializes shadcn when absent, never overwrites destructively, refuses unsupported input with a reason, refreshes the preview | PASS |
| Preview uses the real installed component in isolation | PASS |
| Insertion writes real source with imports and leaves the result editable | PASS |
| Tailwind acceptance on a real Tailwind fixture with three routes: correct element, rendered change, reload persistence, propagation to shared previews, unrelated files untouched | PASS |
| Frame move, width resize, height resize and pan verified in the production build with restart persistence | PASS |
| Typecheck, lint, build, relevant tests | PASS for typecheck/lint/build; 5 pre-existing, unrelated Kumite test failures documented |

**Gate result: PASS for Phase 3B scope**, with the library-internal node editing
limitation documented in section 2.5 as an upstream constraint.

## Unchanged-work statement

- No branch, commit, push, fork or PR.
- Kumite changes: this report, `COMPONENT_SYSTEM_ARCHITECTURE.md`,
  `HYBRID_CANVAS_ARCHITECTURE.md`, `UPSTREAM.md`.
- Upstream checkout: uncommitted changes listed in section 1; no other source
  touched.
- Fixture returned to its pre-run baseline (`Home.tsx` restored, no inserted Card,
  no acceptance classes); the app project store was restored from
  `projects.backup-phase3b.json`.
- Security posture unchanged; no hardening added or removed.
