# Component System Architecture

## Pipeline

Source adapter -> Normalization -> Dependency resolution -> Provenance validation -> Preview -> Registry -> Project insertion.

## Component record

The component contract is `packages/models/src/components/index.ts`; the curated
official block records are in `packages/models/src/components/blocks.ts`.
Definitions record registry identity, import templates, preview source and
capability limits. Registry provenance is pinned; unknown licensing or
attribution must never be treated as permissive.

## Adapters

Implemented: `shadcn-ui`. Not implemented: 21st-dev, aceternity-ui, magic-ui, custom, local.

An adapter owns three things: the catalog of installable definitions, the CLI or file
operations that write into the user's project, and the provenance record it leaves
behind. The app does not vendor component source; it drives the component's own
official installation mechanism and then reads what landed on disk.

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

Blocks install from their direct JSON URL at the pinned commit, not by mutable
registry name. The CLI was exercised in a throwaway Vite fixture: the pinned
`calendar-01` and `dashboard-01` JSON installed their reusable source files and
registry dependencies. `registry:page` routes are not created by the CLI for a
Vite project, so Kumite inserts the block's verified component export instead.
The installed file is recorded in `.kumite/components.json`; existing files are
never overwritten. Variants that share a destination file cannot be installed
side-by-side without the user resolving that conflict.

### Library UI

The Components panel opens a searchable, categorized library with component and
block filters. Catalog browsing and official block previews work without an
active project. The detail view offers preview, copy-for-agent and use actions;
project writes remain explicit. 21st.dev and Magic UI use the same visible
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
  already exists reports "already installed" without invoking the CLI.

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

Installed components preview their actual project source in an isolated Vite
server on the first free port from 3310. Kumite creates its temporary entry files
exclusively, refuses to overwrite either fixed-name file if it already exists,
and cleans up the child process and owned files after a failed start or close.
Blocks with an official upstream preview use it before install; calendar and OTP
examples render the installed source in the local isolated Vite preview. Remote
previews show an offline message when the network is unavailable. Local previews
require Vite in the active project.

### Insertion

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
