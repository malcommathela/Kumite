# Component System Architecture

## Pipeline

Canonical target: `ImplementationRequest -> provider adapter -> validated
ImplementationArtifact -> isolated preview or project-specific preparation ->
approved materialization`.

The provider-neutral resolver, immutable artifact store, demo inventory and
read-only insertion preparation are implemented foundations. Catalog preview now
consumes artifacts; project insertion still uses the legacy template flow.

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
content-addressed SHA-256 identity. A separate reference index supports preview,
project, and editor consumers; callers must register durable consumers before
garbage collection. Garbage collection only removes the two store-owned files
from an unreferenced artifact directory and never recursively removes unknown
content. `implementationWorkspaceIdentity` derives a stable workspace key from
provider, logical artifact id, and source/artifact hashes without machine paths.
The store keeps the upstream snapshot separate from any future transformed
working tree; structured user-edit tracking is not wired yet.

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
avoid collisions. It never writes files or invokes a package manager. The
write/approval UI and transactional project publication are not wired to this
preparation API yet.

Consequently, the current “Use” action still inserts the legacy `insertCode`
template; it does not yet publish the prepared artifact source tree. Approved
dependency installation, scoped lockfile updates, user-facing conflict choices,
atomic publication/rollback, and artifact references from project/editor
consumers remain deferred. The preparation API reports files, versions,
conflicts, and AST alias transforms but is not completed insertion parity.

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

The library resolves only visible catalog requests to pinned artifacts.
`artifact-preview.ts` validates and stores each immutable snapshot, materializes
its source/assets under a deterministic workspace identity, and merges verified
source files into the private Vite workspace without overwriting a differing
file. Runtime wrappers import the real artifact entry/export; generated session
files live separately under `__kumite_preview/`. A shared
`PreviewRuntimeManager` serves all sessions from one process on the lifecycle
port manager, with per-consumer session ids and reference-counted runtime
cleanup. Active preview owners hold persistent artifact references; releasing an
owner aborts pending resolution/materialization and releases its sessions.
Materialized artifacts and the shared Vite workspace remain cached after the
last session closes; age-based workspace garbage collection is not implemented.
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

The following describes the currently wired legacy behavior, not the canonical
artifact path. Artifact-backed preparation is available through
`prepareImplementationInsertion`, but approval, publication, and the renderer
flow remain to be integrated.

`apps/studio/src/lib/components/index.ts` builds an element tree and a
`CodeDiffRequest` that carries required `imports`. Component imports are remapped
to the active project's `components.json` UI alias. Block imports use the
configured components alias and the block's verified named/default export; a
block is appended to the selected element rather than replacing a route. Blocks
are page-level compositions, so their insert code wraps the export in a
full-width `div`; without it they collapse inside a centred flex parent.
Card-shaped blocks (authentication, login, signup, otp) instead wrap in
`mx-auto w-full max-w-sm` so an inserted login form renders as the centred card
its upstream page shows rather than stretching across the frame.

A block is never appended to a text element. `resolveBlockInsertTarget` walks up
from the selection until `isBlockInsertContainer` accepts the tag (layout
elements, or anything laying out as `block`/`flex`/`grid`), so selecting an `h1`,
`p`, or `span` places the block in its nearest container instead of producing
`<h1>…<div class="max-w-sm"><LoginForm /></div></h1>`. When no container is
found, insertion refuses with "Select a layout element…" rather than guessing.
The resolved container also owns the `CodeDiffRequest`, so the write and the
insertion location address the same node.

Use and install actions run through MobX state: `installing` covers the CLI
install and `using` covers the code write, and the library's Use button renders an
`Icons.Shadow` spinner with `Installing…` / `Adding…` and stays disabled for the
whole flow.
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

- `form` installs but is not statically inserted or previewed: it needs a
  react-hook-form controller that a template cannot invent.
- `sonner` installs and inserts, but preview is unavailable because a toaster
  renders nothing without a toast trigger.
- `toast` has no installable item in the pinned v4 registry snapshot.
- The matrix proves template shape and export/import consistency, not that 54
  components were installed or rendered in Electron. See
  `PHASE_3D_STAGE_6_COMPLETION_REPORT.md`.

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
