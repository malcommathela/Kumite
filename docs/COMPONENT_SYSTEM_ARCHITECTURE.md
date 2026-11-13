# Component System Architecture

## Pipeline

Source adapter -> Normalization -> Dependency resolution -> Provenance validation -> Preview -> Registry -> Project insertion.

## Component record

The application contract is `packages/models/src/components/index.ts`. Each
definition records registry name, dependencies, exports, imports, templates and
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

### Installation

- Pinned CLI: `shadcn@3.7.0`. `init -d` for a project without `components.json`,
  then `add <name> -y`.
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
- Installs never pass `--overwrite`. Re-running an install for a component whose
  file already exists reports "already installed" instead of rewriting it.

### Status detection

`apps/studio/electron/main/components/inspect.ts` reports framework, package manager, Tailwind presence, whether
`components.json` exists, the resolved `ui` directory, and which catalog items
already have files. A project without a `package.json` is rejected and the panel
surfaces the message; a project with no React dependency or no
Tailwind returns `supported: false` with a reason and install is disabled. No
install is attempted for an unsupported project.

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

Each preview runs in an isolated Vite server rooted at the project, started on the
first free port from 3310. It writes a temporary `__kumite_preview.html` and
`__kumite_preview.tsx` at the project root that import the real installed file by
relative path, renders it in a Dialog iframe, and deletes both temp files when the
preview stops. Previews therefore show the actual installed source, not a copy.

### Insertion

`apps/studio/src/lib/components/index.ts` builds an element tree and a
`CodeDiffRequest` that carries required `imports`.
`apps/studio/electron/main/code/diff/transform.ts` merges those
imports into the file's existing `import { ... } from "..."` declaration instead of
appending a second one, then the write goes through the same code-diff pipeline
used for manual edits. The webview reloads after the write.

Inserted JSX keeps generated `data-oid` attributes, so it stays selectable and
editable like hand-written JSX, including Tailwind class edits written back to the
user's source file.

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
