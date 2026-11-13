# Phase 3A — Hybrid Canvas Runtime Verification Report

## Scope

Verification of the existing Onlook-based hybrid canvas in the real Windows desktop
application, run against the isolated upstream working copy
`C:\Users\malco\AppData\Local\Temp\opencode\onlook-desktop-phase0`
(upstream commit `a3685a49bdb9ace3708ee38464874b097e2485d3`).

No branch, commit, push, fork or PR was created. The upstream checkout was used only
as a launch target; no source file in it was modified as part of this verification
(probe scripts were added to `apps/studio/` as disposable evidence files). The
fixture project is separate from all user projects and from Vaal.

## 1. Executive summary

The hybrid canvas is **partially verified**.

What is solid, measured at runtime:

- Two independent `<webview>` previews run simultaneously, each as its own
  Electron `webContents` process, with independent URL and independent viewport.
- Each preview exposes a working DOM-selection API; selecting the same element in
  two previews produced different `domId`s and correct computed styles.
- Frame geometry, viewport preset, route, canvas pan and canvas zoom persist to
  disk and survive a full application shutdown and relaunch.
- Canvas pan does not scroll a preview, and scrolling a preview does not move the
  canvas.
- A change written to project source propagated to both previews without a manual
  refresh.

What is not working or not verified:

- **Visual style editing does not write to project source.** Editing Fill in the
  styles panel changed nothing in `app/page.js` or `app/globals.css`. The likely
  cause is the missing Onlook Next plugin / `data-oid` source markers in the
  fixture, not a canvas defect — but it is the editing path Kumite depends on, so
  it is a blocker until proven otherwise.
- **A third frame cannot be created through the UI.** The canvas manager only
  creates a Desktop + Mobile pair at project creation; no add/remove frame control
  exists in the Webview area.
- **Frame selection from the canvas was not achieved.** The Windows panel kept its
  empty state ("Select a window to edit its settings") in every probe.
- Frame drag/resize, per-frame editing-context switching, and website interaction
  in Preview mode were not demonstrated.

Recommendation: do **not** treat the canvas as a fully verified production
foundation yet. It is usable for read-only composition and layout persistence, but
the source-writing path must be proven before component integration starts.

## Test environment

| Item | Value |
|---|---|
| Host | Windows, PowerShell, Node 24.14.0 |
| App | Onlook Studio, production build (`dist/index.html` + `dist-electron/main/index.js`) |
| Launch | `npx electron dist-electron/main/index.js`, automated through Playwright `_electron` |
| Electron | 36.0.1 (installed locally; no Electron binary shipped in the checkout) |
| Fixture | `C:\Users\malco\AppData\Local\Temp\opencode\kumite-phase3a-fixture` (Next.js 14.2.15, app router, JS + CSS, no Tailwind) |
| Fixture routes | `/`, `/about`, `/contact`, shared `components/Nav.js` in the root layout |
| Fixture server | `next dev -p 3100`, verified `200` on `/` and `/about` |
| Project store | `C:\Users\malco\AppData\Roaming\Electron\projects.json` |
| Project ID | `bm5y6awE69arHtB45KTHD` |
| Evidence scripts | `apps/studio/probe*.mjs` (disposable), screenshots in `...\Temp\opencode\onlook-e2e\` |

The fixture uses CSS Grid on `/`, Flexbox on `/about` and on the shared nav, and a
media query that collapses the grid to one column below 700 px. No absolute
positioning is used to fake a layout.

### Environment limitations

1. **Import fails its dependency step.** The bundled `resources/bun/bun.exe` is
   absent in this checkout, so "Installing required packages…" always errors and
   the user must click "Continue anyway". No functional impact observed on the
   canvas, but it obscures real failures.
2. **TypeScript fixture could not start.** Next 14 auto-installs TypeScript on
   first run and crashed on Node 24 (`require-hook.js … endsWith`). The fixture was
   rewritten as plain JS. This is a fixture issue, not an app issue.
3. **Import dialog is native.** Folder selection was stubbed with
   `dialog.showOpenDialog` via Playwright `app.evaluate`, since a native picker
   cannot be driven from the test harness.
4. **Window title is still "Onlook".** Source identity work from Phase 1 was not
   rebuilt into the renderer bundle. Cosmetic only.
5. **Zoom input.** A real Ctrl+wheel gesture through Playwright did not zoom (it
   panned). Zoom was exercised by dispatching a `wheel` event with `ctrlKey` on the
   canvas container. The canvas zoom code path is verified; the hardware-gesture
   binding is not.
6. **Design mode intercepts clicks.** In Design mode an overlay
   (`div.absolute.inset-0` inside the gesture screen) sits over each webview, so
   Playwright clicks on a `<webview>` land on the overlay. That is intended
   behaviour (it is how selection works), but it means website clicking requires
   Preview mode, which was not exercised.

## 2. Test results

| Test | Result | Evidence | Limitations |
|---|---|---|---|
| Multiple previews | PARTIAL | 2 simultaneous `<webview>` webContents (ids 2 and 3), separate renderer processes, distinct viewport (1440×1024 vs 320×568), both loading live Next pages; navigating one to `/about` left the other on `/` | Only 2 frames exist and no UI creates a third; closing a frame and re-adding it were not tested; memory measured but not profiled |
| Independent contexts | PARTIAL | Per-webview `window.api.processDom()` + `getElementAtLoc(20,20)` returned the nav in both, with distinct `domId`s (`odid-4c73…` vs `odid-a5a0…`), `display:flex`, `background:rgb(17,17,17)`; routes and widths stayed independent after restart | Frame selection from canvas not achieved, so switching editing context between frames could not be verified; `component` identity from the API was `undefined` |
| Editing synchronization | PARTIAL | Direct source write to `components/Nav.js` reached both previews within ~4 s and both showed the new brand text; source restored afterwards | Visual style edit (Fill → `#FF0000`) left `app/page.js` and `app/globals.css` byte-identical: FAIL for visual→source; unique-element edit not testable for the same reason |
| Persistence | PASS | After full shutdown/relaunch the store restored frame count (2), frame IDs, frame positions (0,0 / 1540,0), dimensions (1440×1024 / 320×568), device presets (Desktop / Mobile), routes (`/` and `/about`), canvas scale (persisted at `3` in one run) and pan (`-700,-1344.8` in the same run) | Active frame is not persisted; only 2 frames could be exercised; project source files are persisted separately by the file system, not by this store |
| Pan/zoom/interactions | PARTIAL | Wheel over the canvas moved pan from `y:-108` to `y:-316` while both previews stayed at `scrollY:0`; synthetic Ctrl+wheel changed scale `0.7 → 1.96 → 3`; scrolling a preview to `scrollY:400` left canvas pan at `-316`; site scroll and canvas scroll are clearly separate | Frame move and resize via drag not achieved; website click/drag in Preview mode not exercised; real trackpad gestures not exercised |
| Coordinate mapping | PARTIAL | Selection is resolved inside the preview document (`elementFromPoint` in webview coordinates, `getComputedStyleByDomId`), never from workspace coordinates; selection still worked at the restored scale of `0.7` and after restart | Not re-tested immediately after a zoom or a frame move; no evidence that the overlay's workspace→frame offset is applied consistently at non-default zoom |

Result labels used: PASS / PARTIAL / FAIL / NOT TESTED only.

## 3. Verified architecture

Reusable as-is, with evidence:

- **Frame identity and process isolation.** `apps/studio/src/routes/editor/WebviewArea/Frame.tsx`
  renders one `<webview>` per `FrameSettings`; each gets its own `webContents`,
  its own preload and its own `window.api`. Two ran side by side with independent
  URLs and sizes.
- **Frame settings persistence.** `src/lib/editor/engine/canvas/index.ts`
  (`saveFrame`, `saveFrames`, restore from `project.settings.frames`) writes through
  to `projects.json`. Restart preserved every stored field.
- **Canvas transform.** `src/routes/editor/Canvas/index.tsx` applies a single
  `translate(...) scale(...)` with `transformOrigin: 0 0`, keeps pan/zoom in project
  settings, and does not touch preview scroll.
- **DOM selection API.** `electron/preload/webview/api.ts` exposes
  `processDom`, `getElementAtLoc`, `getComputedStyleByDomId`; both previews returned
  correct, distinct element records.
- **Dev-server integration.** The app points each frame at the project URL and picks
  up Next HMR changes; a source edit refreshed both previews without user action.
- **Route-per-frame.** Assigning `http://localhost:3100/about` to one frame produced
  an About preview while the other stayed on Home, including after restart.

Reusable with caveats:

- **Onlook Next plugin (`plugins/next`)** is the missing piece for DOM→source
  mapping. The plugin exists in the checkout but was not installed into the
  fixture, so `data-oid` attributes were never injected.
- **`_shared/workspace-model.mjs`** (Kumite, Phase 2) is a parallel description of
  the same concepts; the running app does not use it. Two models exist today.

## 4. Problems discovered

### Existing upstream limitations

1. No add/remove frame control. `CanvasManager` creates exactly two default frames
   (`desktop` + `mobile`) on project creation and nothing else creates frames.
2. No persisted active frame. The Windows panel is empty on launch until a frame is
   selected, and there is no stored "selected frame" field.
3. Visual style writes depend on Onlook's Next transform plugin. Without
   `data-oid` markers in the DOM, the editor can select elements but has no
   source anchor; changes are not written anywhere.
4. Frame selection is not reachable through obvious canvas interaction in this
   build: repeated clicks at frame-header coordinates only produced layer-count
   overlays, never a selected frame.
5. Import path hard-codes `resources/bun/bun.exe`; if the binary is absent the
   import reports a failure even when the project is usable.

### Kumite-specific problems

1. Phase 1 identity edits are not reflected in the built renderer (title still
   "Onlook"), because the app was launched from a pre-built `dist/`.
2. `_shared/workspace-model.mjs` duplicates what the app already persists. Nothing
   bridges the two, so any Kumite-side change to frame semantics would silently
   diverge from what the canvas stores.

### Environment-related problems

1. Electron is not vendored; it had to be installed into `apps/studio`.
2. Node 24 breaks Next's automatic TypeScript setup, forcing a JS fixture.
3. Native folder picker cannot be scripted without stubbing.
4. Installed fixture `next@14.2.15` carries known advisories; acceptable for a
   disposable fixture, not for a shipped project.

### Unverified assumptions

1. That visual editing would work if the Next plugin were installed. Plausible from
   source inspection (`getCodeDiffs`, `writeCode`, component map), **not proven**.
2. That three or more previews behave like two. Only two existed; no evidence about
   frame count scaling, memory or GPU behaviour beyond two.
3. That zoom/pan preserve correct selection targeting. Selection was verified at
   `scale 0.7` only.
4. That Preview mode yields normal website interaction (links, scrolling, dragging).
   The overlay logic implies it; it was not exercised.
5. That frame drag/resize updates layout and persists. Resize handles exist in
   `ResizeHandles.tsx`; not exercised.

## 5. Recommended fixes

Smallest changes that unblock the next milestone, in order:

1. **Make source mapping provable (blocker).** Install the Onlook Next plugin into
   the fixture (or into the import step) and re-run the visual-edit test. If Fill
   then writes to source, the editing path is real; if not, treat visual editing as
   unavailable and design Kumite around direct source edits. Do not build UI on top
   of it before this is settled.
2. **Ship or resolve `bun.exe` (small).** Either vendor the binary or make the
   install step optional and non-blocking, so import success is not masked by an
   environmental error.
3. **Add frame creation and selected-frame state (small, scoped).** One action that
   appends a frame from a viewport preset plus persisted `activeFrameId`. Without
   this, three-frame behaviour, context switching and active-frame persistence
   cannot be tested at all.
4. **Rebuild the renderer** after identity changes so the app presents as Kumite.
5. **Resolve the two-model situation.** Either wire `_shared/workspace-model.mjs`
   to a real adapter over `project.settings`, or mark it as documentation-only in
   `HYBRID_CANVAS_ARCHITECTURE.md` and stop treating it as the source of truth.
6. **Investigate frame selection hit-testing** once (2 to 3 clicks with a debug log
   on the selected-frame store) before writing any new interaction code.

No architectural change is recommended at this point. Items 1 and 3 are the only
ones that gate real work; the rest are hygiene.

## 6. Phase 3B readiness

**Not ready to start shadcn/ui component integration as planned.**

Reasoning:

- Component integration assumes "select a component in a frame → edit it → source
  changes". That path failed at runtime. Starting adapters now would build on an
  unverified assumption.
- The multi-frame workflow Kumite intends (3+ frames, per-frame route and viewport,
  frame selection) cannot be produced in the app today: the third frame does not
  exist and the active frame is neither selectable through the canvas nor persisted.

Suggested gate for Phase 3B:

1. Visual edit writes to the correct source file and reaches all previews.
2. A third frame can be created, selected and restored.
3. Selection survives pan and zoom at a non-default scale.

All three are narrow, testable slices. Once they pass, component adapters can rely
on the canvas instead of working around it.

## Automated tests (Part 4)

Added two cases to `tests/workspace-model.test.mjs` (framework: `node:test`):

- `frames keep independent route, viewport and position state` — guards frame
  identity and per-frame route/viewport/position independence.
- `workspace zoom bounds` — guards the accepted zoom range, including the values
  reached during runtime zoom testing (`0.7`–`3`).

Results:

- `node --test tests/workspace-model.test.mjs tests/component-core.test.mjs` → 7 pass, 0 fail.
- `node --test "tests/**/*.test.mjs"` → exits non-zero because of a **pre-existing**
  failure in `tests/architecture.test.mjs` (`04_motion` skill text expects
  "existing dependencies", actual text says "existing project dependencies"). That
  file is tracked and unmodified by Phase 3A; the failure is unrelated and was left
  alone.

Explicit limitation: no automated test can reproduce Electron `<webview>`
behaviour. Frame lifecycle, per-webview selection isolation, real pan/zoom gesture
handling and editing context synchronization all require the manual/scripted
runtime probes described above. The `_shared` model tests describe intended
invariants only; they do not prove the application implements them.

## Unchanged-work statement

- No branch, commit, push, fork or PR.
- Upstream Onlook checkout untouched apart from disposable `probe*.mjs` evidence
  scripts; no upstream library code was edited.
- Kumite changes in this phase: this report and two added test cases in
  `tests/workspace-model.test.mjs`. All prior Phase 0–2 files and unrelated
  untracked work remain as they were.
- The fixture project lives outside the repository and was only ever opened as a
  disposable project. Vaal and other user projects were not touched.
- Security hardening remains deferred per Phase 0.
