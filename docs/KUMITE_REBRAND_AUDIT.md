# Kumite Rebrand Audit

Stage 1 of Phase 3D. Records every surface that was renamed, every string that
was deliberately kept, and every placeholder that still needs a real
destination. Measured in the working copy on 2026-11-12.

Scope: `C:\Users\malco\AppData\Local\Temp\opencode\onlook-desktop-phase0`,
branch `main`, upstream base `a3685a49`. No commits were made.

## 0. Headline

The application is renamed end to end — product name, window identity, package
scope, CSS tokens, DOM attributes, git notes, installer metadata and icon
artwork — and existing user data still loads through a migration that runs
before the first storage read. Three things remain open and are listed honestly
in §5 and §6:

1. Contact destinations are placeholders until Kumite has real ones (user
   decision D3: keep them visible, clearly marked).
2. Publishing and auto-update still talk to upstream Onlook infrastructure.
   Kumite has no backend of its own, so those features are documented as
   inherited rather than claimed as Kumite services.
3. App packaging cannot be completed on this host. `electron-builder` needs the
   `winCodeSign` cache, whose extraction requires a symlink privilege this
   Windows account does not hold. The packaging configuration and icon assets
   are verified statically; the installer is not.

## 1. Identity surfaces

| Surface | Before | After | Where |
|---|---|---|---|
| Product name / window | `Onlook` | `Kumite` | `apps/studio/package.json`, `APP_NAME` in `packages/models/src/constants/editor.ts` |
| `appId` | `dev.onlook.studio` | `dev.kumite.studio` | `apps/studio/builder-config/base.ts` |
| Locale strings | `Onlook` in 4 locales | `Kumite` in `en`, `ja`, `ko`, `zh` | `apps/studio/src/locales/*/translation.json` |
| Locale key | `reloadOnlook` | `reloadKumite` (key + 2 call sites) | locales, `src/components/*` |
| Wordmark artwork | Onlook logo paths | `KumiteWordmark`, upstream artwork removed from the icon set | `packages/ui/src/components/icons/index.tsx` + 3 call sites |
| IDE enum | `IdeType.ONLOOK` / `IDE.ONLOOK` | `IdeType.KUMITE` / `IDE.KUMITE`, legacy `'Onlook'` still accepted by `fromType` | `packages/models`, `apps/studio/common/ide.ts` |
| Code-view channel | `VIEW_CODE_IN_ONLOOK` | `VIEW_CODE_IN_KUMITE` (`'view-code-in-kumite'`) | `MainChannels`, 5 studio files |
| CSS tokens | `background-onlook`, `foreground-onlook`, `border-onlook` | `background-kumite`, `foreground-kumite`, `border-kumite`; keys added to the Tailwind config | `apps/studio/src`, `tailwind.config.ts` |
| DOM attributes | `EditorAttributes.*` with `onlook-*` values | `kumite-toolbar`, `kumite-rect`, `kumite-stylesheet`, `kumite-drag-stub`, `kumite-default-stylesheet`, `data-kumite-*`, move-key prefix `kmk-` | `packages/models/src/constants/editor.ts` |
| ID attribute members | `DATA_ONLOOK_*` | `DATA_KUMITE_*`; wire values (`data-oid`, `data-oiid`, `data-odid`, `data-ocname`) unchanged | same |
| Package scope | `@onlook/*` | `@kumite/*` across workspace packages, imports, tsconfig/vite/tailwind references | 355 tracked + 9 untracked files |
| Git author / display name | Onlook | `Kumite <git@kumite.local>` placeholder; notes ref `kumite-display-name`, falls back to reading `onlook-display-name` | `packages/git` |
| AI system prompt | "Onlook AI Assistant System Prompt", Onlook website | Kumite identity, repository link; Pro-plan and "built with" badge claims removed | `packages/ai/src/prompt/kumite.ts`, `prompt/base.ts`, `tools/index.ts` |
| New-project default path | `Documents/Onlook/Projects` | `Documents/Kumite/Projects` | `electron/main/create/helpers.ts` |
| App icons | Onlook artwork | Generated K monogram (`build/generate-icon.py` → `icon.png`, `icon.ico`, `icon.icns`) | `apps/studio/build/` |
| Favicon | Onlook `favicon.ico` (179 KB) | Same mark, 21 KB | `apps/studio/public/favicon.ico` |
| Installer | Upstream metadata | `shortcutName: Kumite`, installer/uninstaller/header icons, `deleteAppDataOnUninstall: false` | `builder-config/base.ts` |
| Growth surfaces | Announcement banner/modal, badge injection into published sites, `addBadge`/`removeBadge` | Removed (banner and modal unmounted, their components deleted, badge script injection removed; `PublishOptions.skipBadge` kept and documented inert) | `electron/main/hosting/index.ts`, `src/components/Announcement*` |
| Root documentation | Upstream Onlook README | Fork README with derivation, Apache-2.0 attribution and honest status | `README.md` |

Measured leftovers in source: `background-kumite` 63, `foreground-kumite` 63,
`border-kumite` 3, across 61 files; `background-onlook`, `foreground-onlook`,
`border-onlook` = 0. In the built bundles: `data-onlook-` = 0,
`data-kumite-` present.

## 2. Kept on purpose

These strings still say "onlook". Each one is a real external contract, not a
missed rename.

| Item | Why it stays |
|---|---|
| `@onlook/nextjs`, `@onlook/react`, `@onlook/babel-plugin-react` (`packages/foundation/src/constants.ts`, `plugins/babel`, `plugins/next`) | Published npm packages injected into **user projects**. Renaming them locally would emit imports of packages that do not exist. |
| `data-onlook-id` in `plugins/babel` | Emitted into user source by the published Babel plugin; changing it without republishing breaks the identity chain for existing projects. |
| `HOSTING_DOMAIN = 'onlook.live'` | The publishing service's own domain. |
| `REDIRECT_APP_URL`, `REQUEST_TYPE_HEADER = 'X-Onlook-Request-Type'`, `HOSTING_ROUTES`, `ApiRoutes` | Upstream service contracts; renaming only produces broken URLs. Comment added in `packages/models/src/constants/api.ts`. |
| `github.com/onlook-dev/starter` template zip (`create/install.ts`) | The template that actually downloads. There is no Kumite template yet. |
| `onlook-apply-set` TrainLoop set name | Server-side dataset key. |
| `onlook-display-name` git notes namespace | Read-only fallback so existing notes are found. |
| Legacy storage directory names `['Onlook', '@onlook/studio', 'onlook']` | Migration source. Deleting them deletes the user's data path. |
| `github.com/onlook-dev/*` provenance links | Attribution of upstream work. |
| `LICENSE.md`, `CODE_OF_CONDUCT.md`, `CONTRIBUTING.md`, `SECURITY.md` | Upstream legal/community documents; the licence must not be relicensed. |
| `packages/growth` | Unused since the badge script was unhooked, but it is upstream code and deleting it is the user's call. Documented in §5. |
| `plugins/next/Cargo.toml.bak`, `transform/Cargo.toml.bak` | Committed upstream files. Left untouched. |
| `src/assets/new-yt-thumbnail.png` | Unreferenced upstream asset. Not deleted. |
| `packages/ai/test/prompt/data/response.txt` | Recorded LLM fixture containing an old path; changing it would edit test evidence rather than code. |

## 3. Placeholders

User decision D3: keep Onlook's contact destinations visible but clearly
marked, pointed at the Kumite repository, recorded here as TODO.

| Destination | Now points to | Appears in | Remove when |
|---|---|---|---|
| Discord invite → `Links.DISCORD` | `https://github.com/malcommathela/Kumite` | `AppBar/HelpButton.tsx`, `LayersPanel/HelpDropdown.tsx`, MCP sample URL | A Kumite community invite exists |
| Website / docs → `Links.USAGE_DOCS`, `Links.WIKI` | Repo README | Help menus, About | A Kumite site or wiki exists |
| Support mailboxes (`support@`, `contact@`) | Repo issues | project-setup screens, sign-in privacy/ToS | Real Kumite mailboxes exist |
| Git author email | `git@kumite.local` | `packages/git` | A real domain exists |

`Links` carries a `TODO(kumite)` comment pointing back to this document.

## 4. Correction to the Stage 0 baseline

`PHASE_3D_BASELINE_AUDIT.md` line 201 describes `IdeType.ONLOOK` as a
third-party editor. That is wrong: `ONLOOK` is the application's **own internal
viewer** (`internal://`, Dev tab), not an external IDE. The rename to
`IdeType.KUMITE` is therefore correct and not a compatibility break; only
persisted settings needed the legacy `'Onlook'` branch in `fromType`.

## 5. Documented gaps (not fixed here)

| Gap | Detail | Owner decision needed |
|---|---|---|
| Packaging | `electron-builder` fails on this host: `winCodeSign` cache extraction needs a symlink privilege (`EPERM`), and `node-abi` cannot resolve Electron 36.0.1 for the native rebuild. The unpacked app is produced (`release/0.2.31/win-unpacked/Kumite.exe`, `app.asar`, `resources/bun`) but exe branding and the NSIS installer are not. Run `bun run package` on a machine or CI with symlink rights. | Yes — no code change will fix a privilege. |
| Auto-update feed | `apps/studio/dev-app-update.yml` still points at `onlook-dev/onlook`; commented as intentional until Kumite publishes releases. | No |
| Root script `build:cli` | Removed during the app import; this repository has no CLI workspace. | No |
| `packages/growth` | No longer imported by the app; kept in the tree. | Yes |
| `plugins/*` metadata | `plugins/babel` and `plugins/next` keep their `@onlook/*` names, `author: onlook` and `onlook.com` homepage, because they are published packages that user projects install. | Yes — only when they are republished under Kumite |
| Lockfiles | `bun.lock` and `package-lock.json` were **not** hand-edited after the scope rename. `bun install` must be re-run before building from a clean clone; today the tree works through `node_modules/@kumite/*` junctions. | No |
| Studio `bun test` / Playwright | Not run: `bun` is absent, Playwright needs a display. All runtime evidence comes from `tsc`, `vite build`, esbuild+`node --test` suites and direct Electron launch. | No |

## 6. Verification

Re-run after the copy and icon changes:

| Check | Command | Result |
|---|---|---|
| TypeScript | `npx tsc --noEmit` in `apps/studio` | PASS, exit 0 |
| Renderer/main/preload build | `npx vite build` | PASS |
| Phase 3C acceptance | esbuild bundle → `node --test` | PASS, 30/30 |
| Storage migration unit tests | esbuild bundle → `node --test` | PASS, 7/7 |
| Collapsed-file check | every changed file compared against `HEAD` line count | 0 suspects after repair (§7) |
| Kumite architecture tests | `node --test "tests/**/*.test.mjs"` | 99 pass / 5 fail — same pre-existing failures as the Stage 0 baseline |
| Kumite link check | `python _tools/links.py` | 1 broken (`_shared/patterns/README.md` → `gsap/README.md`), pre-existing |
| Packaging | `electron-builder --win --dir` | BLOCKED (privilege), see §5 |

## 7. Incident record

One scripted edit (`Set-Content -NoNewline` over `Get-Content`) collapsed three
files onto a single line: `electron/main/code/index.ts`,
`electron/preload/webview/api.ts`, `src/routes/editor/EditPanel/index.tsx`.

They were rebuilt from `HEAD` by re-applying the exact rename set and verified
by comparing whitespace-stripped text against the damaged copies (byte-for-byte
equal modulo whitespace) before being written back. `git diff` for those three
files is now 31 insertions / 31 deletions of rename-only lines. A sweep of all
405 modified files found no other collapsed file.

Lesson for later stages: do multi-file replacements in Node, not with
PowerShell string pipelines.
