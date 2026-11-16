# Component System Architecture

## Pipeline

Canonical flow: `ImplementationRequest -> provider adapter -> validated,
content-addressed ImplementationArtifact -> upstream-example preview or
project-specific preparation -> exact-plan approval -> transactional publication
and editor insertion`.

The pinned shadcn resolver, immutable artifact store, demo inventory,
artifact-backed catalog previews, plan review, transactional publication, and
the editor's Use action all consume canonical artifacts. Other providers remain
explicitly unsupported.

## Component record

The component contract is `packages/models/src/components/index.ts`; the curated
official block records are in `packages/models/src/components/blocks.ts`.
Definitions record registry identity, legacy import/JSX templates and capability
limits. Templates remain only for compatibility consumers; artifact provenance
is pinned and unknown licensing or attribution is never treated as permissive.

## Adapters

Implemented: `shadcn-ui`. Not implemented: 21st-dev, aceternity-ui, magic-ui, custom, local.

Source adapters own provider discovery, artifact resolution, and source
provenance. Explicit shadcn installation remains a separate CLI action; preview
resolution does not invoke the CLI or write into the active project.

## shadcn/ui adapter (Phase 3B / 3D)

Catalog: the audited 54-name `new-york-v4` manifest at `shadcn@3.7.0`, commit
`1e9e337923aaede7db55b6091cb56a72a661b959`. It has 53 installable registry
items; `toast` is retained as an explicitly unavailable item because its pinned
registry request is 404. Catalog source lives in this repository at
`packages/models/src/components/index.ts`.

The same pinned commit has 64 official blocks. Kumite catalogs all 64 with
measured descriptions, categories, npm dependencies, registry dependencies,
verified reusable exports and preview sources (official live pages where
published; project-local preview for calendar and OTP examples).
The block manifest is in `packages/models/src/components/blocks.ts`.

### Source resolution artifact (Phase 2)

`packages/models/src/components/implementation.ts` defines the validated,
serializable `ImplementationArtifact`. `electron/main/components/source-resolver.ts`
resolves pinned shadcn components, examples, and blocks through
`resolveShadcnImplementation` / `createShadcnSourceResolver`.

The resolver reads the exact pinned registry JSON from
`apps/v4/public/r/styles/new-york-v4`, follows every registry dependency, and
recursively resolves local TypeScript/JavaScript, JSON, stylesheet, and asset
references from the pinned repository. Entry-point selection is kind-aware:
blocks prefer a page file, examples prefer an example file, and components
prefer UI/component files, with deterministic path ordering. Registry metadata,
source paths, file roles, providers, cycles, and SHA-256 provenance are retained
in the artifact. Dependencies record whether they came from registry metadata
or source imports; only explicit registry versions are recorded as versions.
Conflicting explicit versions fail resolution.

Local binary assets are stored by content hash in Kumite's cache directory, but
machine-local cache paths are not serialized into new artifacts. The exported
materializeImplementationAsset API derives the cache path from the content
hash, verifies an existing cache entry, or downloads from the pinned upstream
source and verifies both SHA-256 and byte size before storing. External URLs
remain external references and are never silently downloaded.

Demo metadata is conservative: available and preserved are derived from identified
example/page/data files and their content hashes. editable remains false until a
structured demo-data editor exists; ordinary JSX/source editing is not reported
as structured demo-data editing. Sass @use and @forward references are followed
recursively, including underscore partials. sass: built-ins are ignored as
dependencies; ambiguous bare Sass load paths fail explicitly rather than being
guessed as local files or npm packages.

The source resolver intentionally reads raw registry JSON rather than treating
the shadcn CLI's project writes as source retrieval. A pinned block item can
contain `registry:page` and `registry:file` entries (for example,
`dashboard-01` has its page and 68-row `data.json`); these are source inputs
needed by an artifact even when the CLI does not materialize a page in a Vite
project. The CLI remains the project's installation mechanism. This phase does
not yet change preview or insertion, which still use the existing templates.

Resolver tests use compressed, deterministic response fixtures captured from
the pinned upstream commit. The dashboard fixture includes the full registry
dependency closure, original source files, the separate data file, and its
referenced avatar.

### Artifact materialization (Phase 3A)

`electron/main/components/implementation-materializer.ts` exports
`materializeImplementationArtifact(artifact, destinationDirectory, options)`.
It accepts a Phase 2 artifact without an active project or renderer and returns
the absolute materialization directory and entry point, materialized file/asset
paths, external asset references, a dependency/configuration plan, and a
deterministic relative-path manifest.

The artifact's source paths are retained under the materialization root so
relative imports remain relative. The manifest records the shadcn source alias
mappings for `@/registry/new-york-v4`, `@/components/ui`, `@/components`,
`@/assets`, `@/hooks`, and `@/lib`; it does not rewrite upstream source. Public
assets referenced from `/...` are written below `public/`, while imported
registry assets keep their registry-relative paths. HTTP(S), `data:`, and
`blob:` assets stay external references and are never downloaded.

Before writing, the materializer validates the artifact schema, canonical
source/artifact hashes, every source-file hash, entry-point membership, registry
file membership, local asset metadata, and safe relative paths. Asset bytes are
fetched via `materializeImplementationAsset`, checked against SHA-256 and byte
size, and placed at their relationship-preserving paths. Serialized
`cachePath` values are ignored. The generated
`.kumite-implementation.json` manifest omits timestamps and machine-local paths;
it retains file roles, registry targets, source provenance, integrity values,
dependency versions/origins, provider/configuration requirements, and external
asset references.

Materialization refuses an existing destination, stages in a sibling temporary
directory, and publishes only after successful validation and writes. Failures
and cancellation clean up the staging directory. Dependency requirements are
reported, including whether dependency provenance is complete; packages are
not installed and project configuration is not modified. Public and relative
asset paths, collisions, cancellation, integrity failures, and preservation of
the dashboard demo data are covered by deterministic unit tests.

Phase 3A does not wire this directory into preview or insertion. Preview
integration is Phase 3B; project installation, conflict resolution, and
project-specific import/configuration transformations are Phase 3C.

### Provider-neutral resolution service (Phase 3B foundation)

`electron/main/components/implementation-service.ts` defines the adapter
contract and the single resolution orchestration API. An adapter identifies its
provider, discovers catalog entries, and resolves a typed component, example,
or block request. The service validates the artifact schema, identity, kind,
source hash, and artifact hash before returning an inventory of sources, assets,
dependencies, demo files, requirements, and provenance. It reports progress and
accepts cancellation.

Only the pinned `shadcn` adapter is registered. It rejects requested versions
and commits other than the audited `3.7.0` snapshot and commit. The current
catalog discovery lists components and blocks; examples can still be resolved
by exact name, but are not enumerated. `21st-dev` and `magic-ui` remain
unsupported and return an explicit error without trying another provider.
The pinned shadcn source records the repository's verified MIT license and
attribution URL. Other adapters must provide independently verified license
metadata; the service does not infer a license from provider identity.

### Immutable artifact storage (Phase 3D foundation)

`implementation-store.ts` persists validated artifact snapshots under a
content-addressed SHA-256 identity. Creation, reference acquisition/removal, and
GC use the same artifact-level lock; preview acquisition stores and adds its
lease atomically. GC verifies there are no consumers and atomically renames the
whole known artifact directory to a tombstone before deletion. A later pass
finishes interrupted tombstones. Startup reconciliation removes stale `preview:`
leases while preserving durable consumer identities. The upstream snapshot
remains separate from project materializations.

Resolved artifacts also carry a demo inventory (path, format, inbound source
references, and a conservative top-level JSON shape when available). JSON row
counts and all original file contents are retained; every inventory item remains
`editable: false` until a structured editor is implemented. The dashboard
fixture asserts its original 68-row data file remains in that inventory.

### Project insertion preparation (Phase 3C foundation)

`prepareImplementationInsertion(artifact, projectRoot)` is a read-only project
adapter. It validates artifact integrity, inspects React/Vite or Next project
metadata, `components.json`, JS/TS aliases, Tailwind and stylesheet paths, and
the package-manager lockfile. It returns the complete source-file and asset
inventory, identical-file reuse candidates, conflicts, installed/missing
dependencies with version provenance, entry-point export semantics, required
configuration, warnings, unsupported requirements, and deterministic AST-based
import-alias transformations. It records original and transformed hashes
separately and places source under an artifact-specific project namespace to
avoid collisions. It never writes files or invokes a package manager.

The editor's **Use** action resolves the same canonical artifact (or its
verified upstream example), displays source/assets, conflicts, providers,
configuration, risks and exact dependency versions, then requires approval in
the renderer and a main-process native dialog. Approval is bound to a short-lived
plan id and SHA-256 plan hash. Apply re-reads project configuration and refuses
to continue if the plan changed or any destination became occupied.

After approval, `artifact-insertion.ts` stages and validates source and local
assets, installs only missing pinned versions with lifecycle scripts disabled,
and publishes files using exclusive same-volume hard links (never overwriting a
destination). The operation journal records artifact/provenance identity,
approved plan hash, original/transformed hashes, dependencies, package-manager
backups, created files, progress, and rollback state. The renderer inserts the
artifact export through the existing `CodeDiffRequest` pipeline, preserving
`data-oid`, source mapping, undo/history and visual editing. The journal commits
only after the editor write succeeds; editor failure triggers rollback.

On restart, recoverable interrupted writes are rolled back only when file
ownership is verified by hashes. If a crash occurs between atomic publication
and recording completion, or while a package manager mutates lockfiles, the
journal preserves uncertain content and reports manual recovery instead of
deleting or restoring a file that may contain user work. Operations that reached
`awaiting-editor` are preserved because the editor write may already have
succeeded; the user is warned to inspect before retrying. Direct artifact
dependencies and exact selected versions appear in the approval plan;
transitive resolution is captured by the project's lockfile. Package lifecycle
scripts are not run.

Explicit shadcn CLI installation uses block direct JSON URLs at the pinned commit, not by mutable
registry name. The CLI was exercised in a throwaway Vite fixture: the pinned
`calendar-01` and `dashboard-01` JSON installed their reusable source files and
registry dependencies. `registry:page` routes are not created by the CLI for a
Vite project. The still-wired legacy insertion path inserts a component export;
the artifact preparation API instead selects the full page entry point.
The installed file is recorded in `.kumite/components.json`; existing files are
never overwritten. Variants that share a destination file cannot be installed
side-by-side without the user resolving that conflict.

### Library UI

The Components panel opens a searchable, categorized library with component and
block filters. Artifact-backed catalog previews work without an active project;
official URLs remain external reference links. The detail view offers preview,
copy-for-agent and use actions; project writes remain explicit. 21st.dev and Magic UI use the same visible
provider slot but remain unavailable until their catalogs, installation paths,
preview sources and provenance are verified.

### Installation

- Pinned CLI: `shadcn@3.7.0`. `init -d` for a project without `components.json`,
  then add catalog primitives by name and blocks by their pinned direct JSON URL.
- Package manager detection from the lockfile: npm and yarn use
  `npx --yes shadcn@3.7.0`, pnpm uses `pnpm dlx`, and Bun uses the desktop app's
  bundled Bun executable. Its directory is added to the child-process `PATH`
  because shadcn invokes Bun again to add package dependencies.
- The CLI runs with `NODE_ENV=development`, `CI=1`, `NO_COLOR=1`,
  `npm_config_yes=true`, `npm_config_production=false`, `npm_config_omit=''`.
  Without the last two npm prunes the project's `devDependencies` (Vite,
  TypeScript, Tailwind), which breaks the preview after install.
- Not pinned to latest on purpose: 4.x moves the registry to Base UI/nova
  components, and 2.10.0 fails with `Validation failed: - tailwind: Required`.
- The pinned CLI has no "skip existing files" flag: an existing destination file
  opens an interactive overwrite prompt even with `-y` and `CI=1`, which stalls
  forever without a TTY. Kumite snapshots the UI, components and `app` directories
  before `shadcn add ... --overwrite`, then restores every file that existed
  beforehand. Files the install created are kept, so installs still never
  overwrite project files. Re-running an install for a catalog item whose file
  already exists skips the CLI and only adds the packages the project still
  cannot resolve. The project stylesheet is excluded from the snapshot: the CLI
  only adds the item's design tokens to it (the `--sidebar-*` palette), and
  restoring it would drop them. Zero-byte files are excluded for the same
  reason: a component file truncated by an interrupted install imports as
  `undefined` and crashes every page that uses it, so an install treats it as
  missing and refills it.
- Blocks are inserted as the page renders them. The sidebar blocks and
  `dashboard-01` are page fragments whose page wraps them in `SidebarProvider`,
  so their insert and preview markup includes that provider; the export alone
  throws `useSidebar must be used within a SidebarProvider`.
- Dependencies are verified against the item's full closure (its own packages
  plus every catalog registry item it pulls in). Whatever the project cannot
  resolve yet is installed with the project's package manager after the CLI run,
  and the same check repairs an already-installed item. This is what keeps a
  block such as `sidebar-01` from landing without `lucide-react`, which the CLI
  resolves only transitively.

### Status detection

`apps/studio/electron/main/components/inspect.ts` reports framework, package
manager, Tailwind presence, whether `components.json` exists, resolved component
directories and aliases, local Vite preview availability, and installed
catalog items. A project without a `package.json` is rejected and the panel
surfaces the message; a project with no React dependency or no Tailwind returns
`supported: false` with a reason and install/use is disabled. Vite preview
availability is reported separately, so Next/React projects without local Vite
can still use components and blocks without a misleading preview action.

### Failures

CLI exit code plus captured stdout/stderr are returned in the result and shown in
the UI toast. A failed install leaves whatever the CLI wrote and reports it; no
rollback is attempted.

### Theme normalization

shadcn writes `oklch(...)` CSS variables. Projects on Tailwind v3 map tokens with
`hsl(var(--token))`, where an `oklch()` value is invalid and silently resolves to
no color. `apps/studio/electron/main/components/theme.ts` converts each color token `oklch -> sRGB -> HSL triplet`,
composites alpha over the block's `--background`, and forces hue to 0 when
saturation is near zero. The rewrite is limited to color declarations and is
idempotent.

### Provenance

- `.kumite/components.json`: manifest of installed components with source, CLI
  version, files, license, and attribution.
- `.kumite/THIRD-PARTY-NOTICES.md`: human-readable notices for export.

Both are additive; the project's own `components.json` and `ui/` files stay as the
CLI wrote them.

### Preview

The installed-project preview below remains a compatibility flow that reads an
already-installed project source. Catalog previews are artifact-backed.

Installed components preview their actual project source in an isolated Vite
server on the first free port from 3310. Kumite creates its temporary entry files
exclusively, refuses to overwrite either fixed-name file if it already exists,
and cleans up the child process and owned files after a failed start or close.
This is a compatibility API for already-installed source. The catalog UI does
not use it, does not require the active project's Vite, and never falls back to
an official remote preview after an artifact preview fails.

Catalog components render upstream `registry:example` compositions rather than
bare component elements. The audited v4 examples follow the
`<component-name>-demo` naming pattern; Chart uses the verified
`chart-bar-demo`. Their original JSX, demo data, dependencies, and local assets
remain in the artifact. Blocks render their complete upstream page entry.
Components without a resolvable example or safe provider composition show an
explicit error; preview code never falls back to `previewCode` or generated
approximations. Runtime export discovery skips type-only declarations and uses
verified catalog export metadata where available.

The library resolves only visible catalog requests to pinned artifacts.
`artifact-preview.ts` validates and stores each immutable snapshot, materializes
its source/assets under a deterministic workspace identity, and merges verified
source files into the private Vite workspace without overwriting a differing
file. Runtime wrappers import the real artifact entry/export; generated session
files live separately under `__kumite_preview/`. A shared
`PreviewRuntimeManager` serves all sessions from one process on the lifecycle
port manager, with per-consumer session ids and reference-counted runtime
cleanup. Active preview owners hold persistent artifact references; releasing an
owner aborts pending resolution/materialization and releases its sessions. The
shared Vite process and port stop when the final runtime session closes.
Materialized source remains cached in the shared workspace; age-bounded cleanup
of merged source files is not implemented.
`catalog.ts` prepares only the React/Vite/Tailwind workspace; it no longer runs
`shadcn add` for catalog cards. The active project is not used or modified.

Dependencies already present in that private workspace are reused. Artifact
versions are honored; missing unspecified versions are resolved to the exact
version from npm's `latest` dist-tag and recorded in
`.kumite-artifact-preview-dependencies.json` and the workspace lockfile. Exact
explicit version conflicts fail instead of downgrading. This policy applies only
to Kumite's preview workspace; no packages are installed into the active project.
Each item reports local artifact-preview errors instead of silently falling back
to the official remote preview. Official preview URLs remain external references.

### Insertion

The following describes the wired artifact path. Legacy `insertCode` and
`previewCode` fields remain only for compatibility/copy-for-agent surfaces; the
Use and catalog-preview paths do not use them.

`apps/studio/src/lib/components/index.ts` builds a `CodeDiffRequest` from the
approved artifact entry import. Source is imported from its artifact-specific
project namespace, not from the legacy `ui/` or block template path. When a
component has a verified upstream example, Use inserts that complete example
composition (including its demo data and context) rather than hand-authored JSX.
Blocks likewise use their full upstream page entry.

A block is never appended to a text element. `resolveBlockInsertTarget` walks up
from the selection until `isBlockInsertContainer` accepts the tag (layout
elements, or anything laying out as `block`/`flex`/`grid`), so selecting an `h1`,
`p`, or `span` places the block in its nearest container instead of producing
`<h1>…<div class="max-w-sm"><LoginForm /></div></h1>`. When no container is
found, insertion refuses with "Select a layout element…" rather than guessing.
The resolved container also owns the `CodeDiffRequest`, so the write and the
insertion location address the same node.

Use actions run through MobX state and stay disabled while preparing, reviewing,
publishing, and inserting. The artifact path does not invoke `shadcn add`.
`apps/studio/electron/main/code/diff/transform.ts` merges those
imports into the file's existing `import { ... } from "..."` declaration instead of
appending a second one, then the write goes through the same code-diff pipeline
used for manual edits. The webview reloads after the write.

Inserted JSX keeps generated `data-oid` attributes, so it stays selectable and
editable like hand-written JSX, including Tailwind class edits written back to the
user's source file.

Editing a component root such as
`className={cn("flex flex-col gap-6", className)} {...props}` replaces only the
literal class arguments and keeps the forwarded `className` and other dynamic
arguments. A spread therefore no longer makes the element read-only; it only
blocks the edit when there is no `className` value to extend, because there is no
safe place to put the class.

Installed components must keep their upstream look. shadcn relies on a `@layer
base` rule (`@apply border-border …`) to turn Tailwind's `border` utility into the
`--border` token; without it every border falls back to `currentColor`, which is
the hard black outline seen on imported cards. `ensureShadcnBaseLayer` adds the
canonical rule on init and after each install when it is missing, is idempotent,
and refuses to write an `@apply` whose token mapping does not exist so it cannot
break the project's build. It also collapses duplicated `@apply` declarations.

### Explicit limits

- `form` is unsupported for Use/preview because it needs a react-hook-form
  controller not supplied by an upstream example.
- `sonner` is unsupported for standalone preview because the toaster depends on
  the consuming application's trigger/provider.
- `sidebar` is unsupported as a standalone component; use an upstream sidebar
  block that includes its `SidebarProvider` composition.
- `toast` has no installable item in the pinned v4 registry snapshot.
- `21st-dev` and `magic-ui` remain unsupported; no catalog, source resolver,
  provenance, or artifact workflow is implemented for them.
- Automated insertion integration uses a disposable Vite project and verifies
  actual published-source rendering, AST import generation, and `data-oid`.
  It does not yet automate the Electron native approval dialog, a real package
  installation failure, or browser interaction in the Kumite canvas. The
  pinned `chart-bar-demo` was resolved from upstream during implementation, but
  it is not yet a repeatable network-backed preview-runtime test.
- Package-manager rollback and ambiguous crash states are journaled; ambiguous
  package/lockfile mutations are deliberately preserved for manual recovery.
  Operation cancellation and age-based cleanup of merged preview source are not
  implemented.

### Known limitation: library-internal nodes

A component's internal nodes are not safely editable. `CardHeader`, for example,
renders `className={cn("flex flex-col space-y-1.5 p-6", className)}`. The Styles
panel shows `Warning: Unsupported className format. Open the code to edit.`, and
committing through the instance-class field writes a literal
`className="..."` into the library file, replacing its `cn(...)` merge. Recovery is
`shadcn add <component> -y --overwrite`. Editing the component's own JSX at the call
site (the `<Card className="...">` in the page) works normally.

## Licensing

Preserve license and attribution for export and third-party notices. Unknown licenses must not be treated as permissive.
