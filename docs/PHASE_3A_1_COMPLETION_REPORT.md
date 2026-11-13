# Phase 3A.1 — Completion Report

Runtime phase: visual source editing, frame create/remove/select with persisted active
frame, and workspace-model resolution.

## Scope and environment

| Item | Value |
|---|---|
| Host | Windows, PowerShell, Node 24.14.0 |
| Kumite repository | `C:\Users\malco\OneDrive\Documentos\Vscode\Projects\kumite`, branch `master`, HEAD `dc39910` |
| Upstream working copy | `C:\Users\malco\AppData\Local\Temp\opencode\onlook-desktop-phase0`, base commit `a3685a49bdb9ace3708ee38464874b097e2485d3` |
| App | Onlook Studio production build (`dist/index.html` + `dist-electron/main/index.js`), rebuilt this phase |
| Launch | `npx electron dist-electron/main/index.js` via Playwright `_electron` |
| Fixture | `C:\Users\malco\AppData\Local\Temp\opencode\kumite-phase3a-fixture` (Next.js 14.2.15, app router, JS + plain CSS, **no Tailwind**) |
| Fixture routes | `/`, `/about`, `/contact`, shared `components/Nav.jsx` in the root layout |
| Fixture server | `resources/bun/bun.exe run dev`, port 3100 |
| Project store | `C:\Users\malco\AppData\Roaming\Electron\projects.json`, project `bm5y6awE69arHtB45KTHD` |
| Evidence | `...\Temp\opencode\p3a1\e2e-console3.txt`, `ab-console2.txt`, `visual-check.txt`, screenshots `01`–`11` plus `05-brand-selected.png`, `06-visual-edit.png` |

### Working tree preserved

- Kumite: no file modified except the three documents named at the end of this report;
  every pre-existing untracked file (`_shared/*`, tests, probes, project folders,
  earlier phase reports) is untouched.
- Upstream checkout: no branch, commit, push or PR. All edits below are uncommitted
  working-copy changes; the previous probe scripts are still present.

## 1. Changes and their reasons

All changes are in the isolated checkout and reuse Onlook's existing frame model.
No second canvas manager, store or persistence system was created.

| File | Change | Reason |
|---|---|---|
| `packages/models/src/projects/index.ts` | optional `activeFrameId` | persist which frame is active, inside `project.settings` |
| `src/lib/editor/engine/canvas/index.ts` | getter/setter, restore + validate, save, clear | single source of truth for the active frame |
| `src/lib/editor/engine/webview/index.ts` | persist on `select()`, honour restored id in `register()` | selecting a frame must survive relaunch |
| `src/lib/editor/engine/element/index.ts` | click sets active frame; `refreshSelectedElements` only for the owning webview and aborts when an element is transiently missing | stop a resize in frame B from re-anchoring selection/active frame to B |
| `src/lib/editor/engine/index.ts` | `selectFrame`, `createWindow(preset)`, active fallback on delete, select on duplicate | create/remove/select frames in the UI |
| `src/lib/sizePresets.ts` | per-preset `device`, Tablet 768×1024 | keep device metadata on created frames |
| `src/routes/editor/LayersPanel/WindowsTab/index.tsx` | always-visible frame list, New preset menu, Route, Duplicate/Delete, active highlight | frame management without an empty state |
| `src/routes/editor/WebviewArea/index.tsx` | `key={settings.id}` | deleting/reordering must not remount the wrong preview |
| `src/routes/editor/WebviewArea/ResizeHandles.tsx` | resize start selects the frame | resizing implies that frame is active |
| `electron/preload/webview/elements/index.ts` | `getDomElementByDomId` returns `null` instead of `document.body` | **root cause of failed visual editing**: a missing id silently retargeted style writes to `<body>` |
| `index.html`, `src/index.html` | title `Kumite` | identity |

### Root cause of the visual-edit failure

`getDomElementByDomId(domId)` did `elementFromDomId(domId) || document.body`, and
`refreshSelectedElements` re-fetched the selection from **any** resizing webview. The
editor queries `data-odid` (runtime id) while the source carries `data-oid`; whenever
the lookup missed, the selection became `<body>`, and a subsequent Fill wrote a
`bg-[#FF0000]`-style class to `app/layout.jsx`'s `<body>` instead of the selected
component. A/B probes reproduced this before the fix (`layout.jsx` gained the class,
`Nav.jsx` did not) and confirm the fix after it (`nav: true`, `layout: false`).

## 2. Runtime test results

Every row was measured in the running application, not inferred from source.

| Test | Result | Evidence |
|---|---|---|
| App launches from the built bundle with title Kumite | PASS | `startup.title = "Kumite"` |
| Three persisted frames load as three separate webviews | PASS | `startup.webviews` ids `Bw4h0WxqgG7qkC0v52Evz`, `HflWB40yVPAj1f_4uNFq1`, `ujbj8fciPN81aJp5cZn1e` at `/`, `/about`, `/contact` |
| RunManager injects `data-oid` into project source on Play | PASS | source lines `<nav … data-oid="r3k:z97">`, `<strong … data-oid="am:uok4">`; `page.jsx` and `layout.jsx` also injected |
| Injected markers reach the DOM after reload | PASS | 15 / 14 / 15 `[data-oid]` elements across the three frames |
| Stop removes injected markers | PASS | all three files lost `data-oid` after Stop |
| Visual Fill edit writes to the shared component's source | PASS | `Nav.jsx` gains `<strong className="brand bg-[#00FF00]" data-oid="am:uok4">`; `layout.jsx` and `page.jsx` unchanged |
| Visual edit does not retarget `<body>` | PASS | no `bg-[#00FF00]` in `layout.jsx`; panel reports `fillValue = "#00FF00"` on the selected element; A/B probe: `nav: true`, `layout: false` |
| Style value visible in the styles panel | PASS | `panelBefore.fillValue = ""`, `panelAfter.fillValue = "#00FF00"`, sections Position & Dimensions / Layout / Fill |
| Rendered colour persists in the target project | PARTIAL | The plain-CSS fixture has no Tailwind build, so the written class paints nothing after reload; the in-page preview does render `rgb(0, 255, 0)` during the edit, and every preview carries the class (`brand bg-[#00FF00]`), so the source/DOM propagation is correct but the rendered result depends on the project's Tailwind setup |
| Create frame from Laptop preset | PASS | 4 webviews; new frame `http://localhost:3100/contact 1280×832`; store updated; new row active |
| Created frame becomes the active frame | PASS | `afterCreate.activeFrameId = UNIiKWB_qz-mgNVrEyxGY`, row `/contact 1280×832` highlighted |
| Delete frame | PASS | back to 3 webviews; `diskCount = 3`; deleted id gone |
| Delete falls back to a surviving active frame | PASS | `afterDelete.diskActive = Bw4h0WxqgG7qkC0v52Evz`, `activeIsSurvivor = true`, home row highlighted |
| Select frame from the Windows list persists | PASS | `selectPersisted.diskActive` equals the home frame id after clicking its row |
| Active frame and scale restored after full restart | PASS | `afterRestart.disk.activeFrameId = Bw4h0WxqgG7qkC0v52Evz`, `scale = 0.5`, three frames, home row highlighted, zoom trigger `50%` |
| Per-frame route via preview navigation | PASS | clicking About in Preview mode changed the home frame to `http://localhost:3100/about` |
| Route restore through the Route input | PASS | route input accepted `/`; frame and store both returned to `http://localhost:3100/` |
| Design/Preview mode switch keeps three webviews | PASS | `backToDesignWebviews = 3` |
| Zoom 75 % / 100 % / 50 % with selection | PASS | stored scale `0.75` / `1` / `0.5`; trigger `75%` / `100%` / `50%`; clicking a card produced 2 `#onlook-rect` at each scale |
| Resize start selects the frame | NOT TESTED | code path added (`ResizeHandles.tsx`); no drag was driven in this run |
| Duplicate frame | NOT TESTED | button added and wired; not exercised at runtime |
| App-driven dev-server start (Play → app spawns server) | PARTIAL | `node-pty@1.1.0-beta30` is unbuilt in this checkout, so the app cannot spawn a terminal; Play reaches `running` and performs injection, but the Next server was started externally with the bundled Bun binary |

## 3. Verification commands

| Command | Result | Notes |
|---|---|---|
| `npx tsc --noEmit` (apps/studio) | PASS | clean |
| `npm run build` (apps/studio) | PASS | renderer + preload + main rebuilt |
| `node --test "tests/**/*.test.mjs"` (Kumite root) | FAIL | pre-existing, unrelated: `tests/architecture.test.mjs` expects `existing dependencies` but `04_motion` says `existing project dependencies`; file unmodified by this phase |
| `python _tools/links.py` (Kumite root) | FAIL | pre-existing, unrelated: `_shared/patterns/README.md` links `gsap/README.md`, which is absent in the repository |

Neither failure touches the canvas integration, and both files are tracked and
unmodified. They were left alone rather than edited as part of this phase.

## 4. Workspace-model duplication resolved

Decision, documented in `HYBRID_CANVAS_ARCHITECTURE.md`:

- `project.settings` (Onlook's own store) is the only persistence system.
- `activeFrameId` lives there, not in a Kumite-side store.
- `_shared/workspace-model.mjs` stays documentation/test only; it is not authoritative
  and nothing writes through it.

## 5. Known limits and unrelated gaps

1. **No Tailwind in the fixture.** Style edits are Tailwind class writes; a plain-CSS
   project records the class but cannot paint it. Verify visual rendering against a
   Tailwind-enabled project before judging the editing path.
2. **Unbuilt `node-pty`.** The app cannot spawn its terminal, so the dev server has to
   be started outside the app. This is a packaging state in the isolated checkout, not
   a canvas defect.
3. **`plugins/next` unused.** Building the Rust SWC plugin is not possible here (no
   cargo); the runtime Babel transform in `RunManager` is the authoritative injection
   path and was the one verified.
4. Renderer warnings around reload/injection (`Webview id not found`,
   `Failed to replaceElement: Node not found`) still appear; the app functions.
5. Frame drag/move and duplicate/delete of arbitrary user frames were not exercised.

## 6. Phase 3B readiness

**Gate result: PARTIAL — component work may start, with one fixture condition.**

| Gate | Result |
|---|---|
| Visual edit writes the correct source file and does not touch `<body>` | PASS |
| The written change reaches all three previews | PARTIAL — class present in all three, rendered only where Tailwind exists |
| A third frame can be created, selected and restored | PASS |
| Selection survives 50 % / 75 % / 100 % zoom | PASS |
| Active frame persists across restart | PASS |

Conditions for Phase 3B:

1. Use a Tailwind-enabled target project for any visual-rendering acceptance check.
2. Keep component adapters on `project.settings.frames` + `activeFrameId`; do not
   reintroduce `_shared/workspace-model.mjs` as a store.
3. Treat the unbuilt `node-pty` and the unused `plugins/next` as environment state,
   not as integration work.

## Unchanged-work statement

- No branch, commit, push, fork or PR.
- Kumite changes: this report, `HYBRID_CANVAS_ARCHITECTURE.md`, `UPSTREAM.md`.
- Upstream checkout: uncommitted integration edits listed in section 1; no other
  source touched. Disposable probe scripts are removed after this report.
- Fixture and app store were reset to the documented three-frame baseline; no user
  project (including Vaal) was opened or modified.
- Security posture is unchanged; no hardening was added or removed.
