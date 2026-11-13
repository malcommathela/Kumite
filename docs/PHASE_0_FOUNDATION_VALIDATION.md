# Phase 0 — Foundation Validation of Onlook Desktop

## 1. Executive summary

Onlook Desktop (upstream `onlook-dev/desktop`, commit `a3685a49bdb9ace3708ee38464874b097e2485d3`) is a viable but imperfect foundation for Kumite. It is a real Electron + React + Vite desktop studio with a working build, typecheck, lint, most tests, and successful Windows launch. Its visual editing path is implemented around a webview preload (`electron/preload/webview`) plus main-process code diffing (`electron/main/code/diff`), and it preserves the imported React project as source of truth. However, several areas required for Kumite are absent or incomplete: unified component import adapters, full/component export, robust security hardening, and a true hybrid canvas with multiple independent frames. Security findings include exposing `process` to the renderer and broad webview/project-script execution capabilities. Recommendation: proceed with Onlook as upstream foundation, but treat Phase 1 as security and architecture-hardening work rather than product feature work.

## 2. Final recommendation

**Recommendation: REUSE as upstream foundation, with EXTEND/REPLACE for security, canvas, component ecosystem, and export.**

Confidence: Medium-High (build and launch verified; editing workflow inferred from source, not fully exercised end-to-end).

## 3. Exact upstream repository and commit SHA

- Repository: `https://github.com/onlook-dev/desktop`
- Local clone: `C:\Users\malco\AppData\Local\Temp\opencode\onlook-desktop-phase0`
- Commit SHA: `a3685a49bdb9ace3708ee38464874b097e2485d3`
- Commit date: 2025-07-17
- Application version: `0.2.31`
- License: Apache-2.0

## 4. Kumite baseline Git state

- Working directory: `C:\Users\malco\OneDrive\Documentos\Vscode\Projects\kumite`
- Branch: `master`
- Remote: `https://github.com/malcommathela/Kumite.git`
- Latest commit: `dc39910 Merge pull request #3 from malcommathela/feat/reference-first-discovery`
- Untracked files preserved: `_temp_audit.mjs`, `_temp_check_links.mjs`, `_temp_check_outside_refs.mjs`, `examples/vaal-landing-page/`, `projects/coffee-brand/kononenko-run/`, `projects/coffee-brand/reference/kononenko/`
- No branch, commit, push, fork, or PR created.

## 5. Repository architecture analysis

Monorepo using Bun workspaces (`package.json` lines 12-16):

- `apps/*`: `apps/studio` (Electron app)
- `packages/*`: `ai`, `foundation`, `git`, `growth`, `models`, `supabase`, `types`, `ui`, `utility`
- `tooling/*`: `typescript`
- `plugins/*`: `babel`, `next`

Studio is Electron + React + Vite (`apps/studio/package.json`). Main process entry: `electron/main/index.ts`. Preload entries: `electron/preload/browserview/index.ts` and `electron/preload/webview/index.ts` (`vite.config.ts` lines 63-78). Renderer entry: `src/main.tsx`.

## 6. Build and test results

### Dependencies

- Intended package manager: Bun (`bun.lock`, scripts use `bun`).
- Installed with Bun 1.4.4 via `npx`.
- `bun install` completed: "105 packages installed".
- Electron binary was missing after Bun install; installed with npm (`electron@36.0.1`). This is an environmental limitation, not a source failure.

### Typecheck

- Command: `bun run typecheck` in `apps/studio`
- Result: **PASS** (no output/errors) after `bun run build:foundation`.

### Lint

- Command: `bun run lint`
- Result: **PASS with warnings** — 0 errors, 121 warnings.

### Unit tests

- Command: `bun test` in `apps/studio`
- Result: 74 tests, 68 pass, 6 fail.
- Failures: all in `tests/bun.test.ts` (`replaceCommand`), caused by Windows command-prefix behavior (`& ` prepended). Platform-specific test mismatch, not a build failure.

### Build

- `bun run build:foundation`: **PASS**
- `bun run build:studio`: **PASS** (Vite production build + Electron main/preload build).

## 7. Desktop launch verification

- Command: `npx electron dist-electron/main/index.js`
- Result: **Launched successfully on Windows**; window title "Onlook".
- Runtime warnings/errors observed:
  - Mixpanel token missing → analytics disabled.
  - Supabase env vars missing → offline mode.
  - `is-user-signed-in` handler error: "No backend connected".
  - Update check skipped because app not packed.
- These are environment/credential limitations, not launch failures.

## 8. Visual editing workflow results

Verified by source inspection (not full interactive E2E in this milestone):

| Capability | Status | Evidence |
|---|---|---|
| Open existing React project | Implemented | `electron/main/events/project*`, `run/index.ts`, `create/*` |
| Framework/dependency detection | Partially implemented | Bun command parsing (`electron/main/bun/*`), tests in `tests/bun.test.ts` |
| Render project in app | Implemented | `src/routes/editor/WebviewArea/Frame.tsx` webview `src={settings.url}` |
| Visual element selection | Implemented | Preload DOM helpers (`electron/preload/webview/elements/*`) |
| Inspect properties/styles | Implemented | `getComputedStyleByDomId` (`electron/preload/webview/elements/style.ts`) |
| Modify styling visually | Implemented | style diff (`electron/main/code/diff/style.ts`) |
| Visual changes update source | Implemented | code diff module (`electron/main/code/diff/index.ts`) |
| Direct code changes update preview | Implemented | file watcher (`electron/main/code/fileWatcher.ts`) |
| Preserve project structure | Likely | operates on project files; no evidence of restructuring |
| Persist to disk | Implemented | storage module (`electron/main/storage/*`) |
| Preview refresh | Implemented | webview reload + file watcher |
| Unsupported deps/configs | Partially handled | Bun replacement logic; 6 test failures on Windows |

## 9. Hybrid canvas feasibility

Onlook's canvas is a React overlay (`src/routes/editor/Canvas`) with framed webviews (`Frame.tsx`). Frames have position, dimensions, resize handles, and size presets. This supports a hybrid model where website content remains real HTML/CSS inside webview frames while the outer canvas provides pan/zoom/layout of frames.

- Reusable: frame rendering, resize handles, size presets, gesture screen.
- Needs extension: infinite canvas pan/zoom, multiple independent page frames, responsive viewport management.
- Incompatible risk: if each frame becomes an absolutely positioned visual object internally; website layout must remain normal flow inside the frame.
- Smallest extension point: `Frame.tsx` + `WebviewArea` + canvas overlay; add frame transform container without changing webview internals.

## 10. Component ecosystem feasibility

No adapters for 21st.dev, shadcn/ui, Aceternity UI, or Magic UI exist. Component insertion is handled via code diff and file management, but there is no unified import pipeline.

- Component source formats: React/TSX components, multi-file possible via file management.
- Dependencies: Bun/npm command replacement and install flow.
- Tailwind/CSS variables: assets/style/font scanning exists.
- Recommended integration points: `electron/main/code/*`, `electron/main/storage/*`, `packages/foundation`.
- Work required: adapters, normalization, dependency resolution, provenance/license validation, isolated preview, local registry, insertion, export.

## 11. Full project export feasibility

Onlook operates directly on project files; there is no separate export module. Export would need to package the project directory while excluding secrets, temp artifacts, and internal metadata. Existing file scanning and storage can be reused; packaging/exclusion logic must be built.

## 12. Individual component export feasibility

No dedicated component export exists. Would need to collect component source, hooks, utils, styles, assets, dependencies, usage example, and attribution. Reuse code/file scanning; build packaging and dependency graph.

## 13. Security audit

| Finding | Evidence | Severity | Impact | Mitigation | Blocks architecture? |
|---|---|---|---|---|---|
| `process` exposed to renderer | `electron/preload/browserview/index.ts:66` | High | Renderer can access Node process object | Remove exposure; use contextBridge-only APIs | Yes, must fix before distribution |
| Broad IPC bridge | `electron/preload/browserview/index.ts:32-61` | Medium | Renderer can invoke many channels | Validate/allowlist channels; auth checks | Partial |
| Webview preload exposes DOM mutation APIs | `electron/preload/webview/api.ts:28-73` | Medium | Imported project code runs with preload capabilities | Ensure contextIsolation; restrict API surface | Partial |
| `webviewTag: true` + `allowpopups` | `electron/main/index.ts:70`, `Frame.tsx:422` | Medium | Guest content can open popups | Restrict popups; validate origins | Partial |
| Project script execution | `electron/main/run/*`, `terminal.ts` | High | Untrusted project scripts can run on host | Consent, sandbox, no auto-run | Yes for trust model |
| Package install via Bun | `electron/main/bun/*`, `create/install.ts` | Medium | Dependency install can execute scripts | Lockfile review, offline mode, consent | Partial |
| No explicit security prefs in BrowserWindow | `electron/main/index.ts:68-71` | Medium | Relies on Electron defaults | Explicitly set contextIsolation, sandbox, nodeIntegration false | No |
| Auto-updater tied to Onlook identity | `builder-config/base.ts:76-81` | Low (security-ish) | Update channel impersonation risk | Replace before release | No |
| Missing env/credentials | runtime logs | Low | Offline mode | Document required env | No |

No security changes were made during Phase 0.

## 14. Windows packaging audit

`builder-config/base.ts` contains Onlook-specific identity and signing:

- `appId`: `dev.onlook.studio` (line 7)
- Product name from package: `Onlook` (apps/studio/package.json line 2)
- Windows target: NSIS x64 (lines 36-43)
- Azure signing: publisher `On Off, Inc`, profile `public-trust-onlook`, account `trusted-onlook`, endpoint `https://eus.codesigning.azure.net` (lines 44-51)
- Protocols: `onlook` scheme (lines 68-73)
- Publish: GitHub `onlook-dev/onlook` (lines 76-81)
- Executable name: `Onlook` (line 66)

All of these must be replaced before Kumite distribution. No release or signing was performed.

## 15. Reuse/extend/replace/build matrix

| Subsystem | Classification | Evidence |
|---|---|---|
| Electron application shell | REUSE | `electron/main/index.ts` |
| Main/preload architecture | EXTEND | `electron/main/*`, `electron/preload/*` |
| Renderer | REUSE | `src/App.tsx`, `src/main.tsx` |
| Project management | REUSE/EXTEND | `electron/main/events/project*`, storage |
| Preview runtime | EXTEND | webview in `Frame.tsx`, preload webview |
| Visual editing engine | REUSE | `electron/preload/webview/elements/*`, `code/diff/*` |
| Code editor | REUSE | Monaco/CodeMirror deps, DevTab |
| Canvas | EXTEND | `src/routes/editor/Canvas/*`, `Frame.tsx` |
| Component registry | BUILD | no registry found |
| Component adapters | BUILD | no adapters found |
| Dependency resolver | EXTEND | `electron/main/bun/*` |
| Provenance system | BUILD | no license/attribution pipeline |
| Project export | BUILD | no export module |
| Component export | BUILD | no export module |
| Windows packaging | EXTEND | `builder-config/base.ts` |
| Testing | EXTEND | 6 failing platform tests |

## 16. Proposed Kumite architecture

Preserve React source as authoritative. Avoid parallel visual document model.

```
apps/
  studio/
packages/
  workspace/
  canvas/
  component-core/
  component-adapters/
    21st-dev/
    shadcn/
    aceternity/
    magic-ui/
    custom/
    local/
  dependency-resolver/
  provenance/
  component-export/
  project-export/
  preview-runtime/
  validation/
```

- `studio`: Electron shell + renderer.
- `workspace`: project open/state.
- `canvas`: frame transforms only, no component-tree duplication.
- `component-core`: normalized component model.
- Adapters: source-specific import.
- `dependency-resolver`: package/config compatibility.
- `provenance`: licenses/attribution.
- `preview-runtime`: webview isolation.
- `validation`: tests and checks.

Visual changes translate to source edits through the existing diff engine; React source remains authoritative.

## 17. Upstream maintenance strategy

- Keep `onlook-dev/desktop` as upstream remote.
- Kumite remote remains `malcommathela/Kumite`.
- Base commit: `a3685a49bdb9ace3708ee38464874b097e2485d3`.
- Isolate Kumite-specific additions in new files/packages; minimize core edits.
- Track modified upstream files in `UPSTREAM.md`.
- Review upstream updates via diff before merge; expect conflicts in `electron/main/index.ts`, `Frame.tsx`, `builder-config/base.ts`, IPC events.
- Apache-2.0 obligations: preserve copyright, license, notices, and attribution for modified files; document changes.

Recommended `UPSTREAM.md` sections: base commit, remotes, modified files, conflict hotspots, merge procedure, licensing notes.

## 18. Known limitations and unresolved questions

- Editing workflow not fully exercised interactively due to offline auth and missing credentials.
- Electron binary installation required npm fallback.
- 6 unit test failures on Windows.
- IPC authorization not fully audited.
- Component import/export not implemented upstream.
- Canvas pan/zoom not verified.

## 19. Risks and blockers

- Security: `process` exposure and project script execution.
- Architecture: temptation to duplicate React tree in canvas.
- Maintenance: large upstream codebase with many warnings.
- Platform: Windows-specific test failures.
- Credentials: Supabase/Mixpanel not configured.

## 20. Recommended Phase 1 implementation plan

1. Add `UPSTREAM.md` and record base commit.
2. Security hardening: remove `process` exposure, explicit webPreferences, channel allowlist, consent for script execution.
3. Add basic E2E smoke test for launch and project open.
4. Define normalized component model and provenance schema.
5. Design hybrid canvas extension without modifying webview internals.
6. Replace Onlook identity/signing/publishing settings.
7. Fix Windows `replaceCommand` test behavior.

## 21. Acceptance criteria for Phase 1

- App launches on Windows without credential-dependent crashes.
- No `process` exposure in renderer.
- Project open/render/edit smoke test passes.
- Upstream base commit documented.
- Identity/signing settings replaced.
- Canvas extension design approved.

## Evidence and confidence notes

Verified facts: build, typecheck, lint, tests, launch. Inferred from source: editing workflow details, canvas behavior, security defaults. Confidence for inferred items: Medium.
path">
C:\Users\malco\OneDrive\Documentos\Vscode\Projects\kumite\PHASE_0_FOUNDATION_VALIDATION.md