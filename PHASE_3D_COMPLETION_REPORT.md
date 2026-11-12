# Phase 3D — Stages 7/8 Regression and Completion Report

Kumite is derived from Onlook, with its rebrand, storage migration, packaging and
Component Intelligence Engine implemented in the upstream working copy. The 54
shadcn/ui items are catalogued and structurally proven by one shared engine and
one chart adapter; this is not a runtime claim over 54 installed components.

## 1. Scope and provenance

| Item | Recorded value |
|---|---|
| Date of final regression | 2026-11-13 |
| Host | Windows, PowerShell, Node `v24.14.0` |
| Application working copy | `C:\Users\malco\AppData\Local\Temp\opencode\onlook-desktop-phase0`, branch `main` |
| Application base | upstream `a3685a4` |
| Final application commit | `1decf45a` — `feat(catalog): 54 pinned shadcn items, and a matrix that proves them` |
| Kumite documentation repository | `C:\Users\malco\OneDrive\Documentos\Vscode\Projects\kumite`, branch `master` |
| Registry pin | `shadcn@3.7.0`, `new-york-v4`, `1e9e337923aaede7db55b6091cb56a72a661b959` |
| Publication state | Local commits only. No push, PR or merge. |

The application working copy has no modified tracked files at `1decf45a`.
Temporary probes, evidence scripts and generated artifacts were deliberately not
committed, as decided in the baseline plan.

## 2. Delivered scope

| Requirement | Delivered state |
|---|---|
| Kumite identity | Product and window name, `@kumite/*` workspace, locale copy, CSS/DOM identity, git notes and installer metadata renamed. Real third-party service and package identifiers remain under their upstream names where changing them would break integration. |
| Storage migration | `%APPDATA%\Onlook` candidates are copied before the first read into `%APPDATA%\Kumite`. Existing Kumite files win, legacy files are preserved, invalid JSON is reported rather than fatal, and migration is idempotent. |
| Packaging | `Kumite.exe`, `Kumite-setup.exe`, icons and update/package metadata were built in Stage 1 after fixing native rebuild and icon signing resolution. See §6 for the important artifact limits. |
| Component Intelligence | One AST definitions/composition/capabilities/fingerprint/content engine. Stage 2 identity lives on `TemplateNode`; there is no second identity map. |
| Editing guarantees | Explicit `implementation-node` and `component-instance` targeting, ownership proof, typed refusals, fail-closed writes and atomic batch preflight preserved. |
| Content and demo data | The original component demo content remains. Content reads literals from mapped source and writes them through `CodeDiffRequest`; string, numeric and JSX text edits are guarded by source spans and expected values. |
| Component selection | 54 canonical shadcn items, with measured registry metadata, authored insert/preview templates and capability flags. These come from one shared engine, not 54 bespoke implementations; demo content was not fabricated into empty components. |
| Chart support | One `ComponentAdapter` handles `ChartConfig`/data semantics through recharts primitives, and declines unresolved or nonliteral values. |
| Licence | `LICENSE.md` has no diff against upstream (`git diff --quiet a3685a4..HEAD -- LICENSE.md`, exit 0); the upstream Apache-2.0 attribution and notices remain. |
| Repository baseline | Five pre-existing Kumite architecture failures and one broken motion-pattern link were fixed and revalidated. |

The complete detailed records are in `KUMITE_REBRAND_AUDIT.md`,
`KUMITE_REBRAND_MIGRATION.md`, and
`PHASE_3D_STAGE_{2,3,4,5,6}_COMPLETION_REPORT.md`.

## 3. Committed application work

| Stage | Local commits |
|---|---|
| 1 — rebrand, storage and packaging | `fee72024`, `21ba25cb`, `f8238e9a`, `1011bec7`, `4a5973a6`, `c15d5cf2`, `50841428`, `4e76dfc0` |
| 2 — intelligence foundation | `39d4a61d` |
| 3 — ownership gate | `08b88e7a` |
| 4 — content extraction/write-back | `43a88401` |
| 5 — chart adapter and numeric cells | `2ee527c6` |
| 6 — 54-item catalog and matrix | `1decf45a` |

Kumite's committed records are `a4e9ca6`, `f2b9ee3`, `94e372a`, `45388fd`,
`a5e0ea4`, `7cfa628` and the validation repair `ad8c33b`; this report is the
closing record for Stages 7/8.

## 4. Final application regression

All nine suites were rebundled with esbuild and run with `node --test` against
`1decf45a`.

| Suite | Tests | Failures |
|---|---:|---:|
| Engine (`code/intelligence.test.ts`) | 35 | 0 |
| 54-component matrix (`code/component-matrix.test.ts`) | 4 | 0 |
| Ownership gate | 9 | 0 |
| Mapping identity | 3 | 0 |
| Phase 3C acceptance, unchanged | 30 | 0 |
| Content model | 14 | 0 |
| Content write-back | 7 | 0 |
| Chart adapter | 7 | 0 |
| Legacy storage migration | 7 | 0 |
| **Total** | **116** | **0** |

| Gate | Result |
|---|---|
| `npx tsc --noEmit` in `apps/studio` | exit 0; explicitly re-checked after the final tests |
| `npx vite build` in `apps/studio` | exit 0; renderer, main and preload builds completed |
| `git diff HEAD` for tracked application files | no diff |

The large pre-existing Vite chunks and the workspace `.npmrc` warning are not
treated as new failures.

## 5. Catalog evidence, not fabricated capability claims

The Stage 6 matrix generated one evidence row per registry item: exported parts,
import counts, single-root insert/preview results and local className capability
where a source file exists.

| Metric | Result |
|---|---:|
| Catalog names | 54 unique audited names |
| Registry items installable | 53 (`toast` is a documented 404 at the pinned snapshot) |
| Insertable templates | 52 (`form` and `toast` blocked) |
| Previewable templates | 51 (`form`, `sonner` and `toast` blocked) |
| Items with local component source | 27 |
| Locally measurable items | 26; the other is `toast`, which has no pinned part list |

The tests prove that every usable template parses to one JSX root, imports every
capitalised name it renders, stays inside the pinned export lists, uses bare
package dependency names, and records reasons for blocked capabilities. They do
**not** prove that all 54 components were installed, rendered or edited in
Electron.

`native-select` was not added: it was not in the audited 3.7.0 name set, while its
registry JSON does exist. `form` needs a react-hook-form controller; `sonner` has
no isolated trigger; `toast` has no item in the pinned new-york-v4 registry. These
are declared limitations, not suppressed failures.

## 6. Packaging verification boundary

The Stage 1 artifact directory contains:

- `apps/studio/release/0.2.31/win-unpacked/Kumite.exe`;
- `apps/studio/release/0.2.31/Kumite-setup.exe` (180,352,774 bytes);
- `Kumite-setup.exe.blockmap`, `latest.yml` and `builder-debug.yml`.

The packaging fix used `npmRebuild: false` and an `electron-builder`/`node-abi`
chain that understands Electron 36. Authenticode-signing validation was not
carried out with a trusted certificate, and no clean-machine install/uninstall or
uninstall-settings preservation test was performed. These limits are unchanged.

**The installer predates Stages 2–6 and was not rebuilt here.** It therefore must
not be described as an installer for the final `1decf45a` source. The final
source typechecks and builds, but a later package step is required before
publishing an installer containing the engine and catalog work.

## 7. Skipped and runtime-limited work

| Item | Actual status |
|---|---|
| `bun --version` | Not found (`bun: The term 'bun' is not recognized as a name...`); Bun-based application tests were skipped rather than substituted with claims of equivalent runtime coverage |
| Studio `bun test` and Playwright/e2e | Not run: Bun is absent and the configured Playwright flow needs a display |
| Runtime component lifecycle | No 54 × install/select/edit/reload Electron run |
| Final Electron runtime smoke | Not run in this closing regression; recorded only in the earlier phase where it was actually performed |
| Component capability measurement beyond this repository | Not performed; the 27 non-local items are validated structurally only |
| Clean-machine installer validation and Authenticode with a trusted certificate | Not run; no certificate was available here |
| Push, PR and merge | Not authorized and not performed |

The test execution recipe was esbuild to temporary CommonJS bundles, then Node's
own test runner with the required Babel dependencies external and a CJS traverse
interop shim. No Electron windows or display-dependent tests are represented as
passing.

## 8. Product and data limits inherited by this release

- Auth-token migration preserves ciphertext, but secure-storage identity may
  require signing in again. No keychain work was invented.
- `onlook.live`, published `@onlook/*` project plugins, the starter template and
  inherited update/publishing routes remain third-party contracts; Kumite does
  not pretend to own those services. Contact destinations remain clearly marked
  repository placeholders.
- `bun.lock` and `package-lock.json` were not hand-edited after the workspace
  rename. A clean checkout requires `bun install` to regenerate workspace links;
  manually created local junctions are not a source-distribution mechanism.
  Verified-on-clean-clone readiness therefore remains unestablished.
- Chart and sidebar templates rely on the target project's theme variables. The
  preview isolates structure, not an invented theme.
- Content from another module, expression-generated content and nonliteral chart
  data are declined rather than inferred. The content editor writes only what
  the source can prove and guards with `CodeDiffRequest`.
- The current application source is committed only inside the `%TEMP%` working
  copy. The documented durable backup predates the later stages, so remote or
  durable-current-copy publication remains an explicit subsequent operation, not
  something silently claimed here.

## 9. Working-tree accounting

The Stage 6 report and this closing report in Kumite are new documents; the
validation repair changed only its test parser and stale/mismatching motion and
reference contracts. No unrelated untracked project, example or large evidence
artifact was staged or committed.

The exact Kumite validation command includes the pre-existing untracked
`tests/component-core.test.mjs` and `tests/workspace-model.test.mjs`. They were
neither added nor modified by this work; the reported totals distinguish what
ran in the working tree from what was committed.

## 10. Kumite repository validation

| Command | Result |
|---|---|
| Before repair: `node --test "tests/**/*.test.mjs"` | 99 pass / 5 fail out of 104 |
| After repair: same command | **104 pass / 0 fail** |
| Before repair: `python _tools/links.py` | 1 broken link |
| After repair: same command | 106 files, 89 links and inputs checked, 0 broken |
| Final check including this report: same command | **107 files, 89 links and inputs checked, 0 broken** |

The failures were repaired by supporting folded YAML frontmatter descriptions in
the test reader, normalising the motion-stage input labels, aligning compact
reference-choice wording and its library-selection wording, and replacing the
dead GSAP pattern destination with the existing library-neutral motion guidance.
No application behavior was changed by this repair.

## 11. Closing conclusion

Phase 3D is complete **as a local, evidence-backed implementation**: rebranding,
data migration, component intelligence, guarded content editing, the chart
adapter, the 54-item catalog and the regressions are committed, and the final
source checks pass (`116/116` application tests, successful Studio typecheck/build,
`104/104` Kumite validation tests and a clean link check).

The release claim remains deliberately narrower: no full Electron/runtime validation,
no 54-component runtime validation, no signed or clean-install-tested installer,
and no source-distribution readiness from a clean clone. Those remain explicit
follow-up checks before publishing, rather than requirements silently marked done.
