# UPSTREAM.md

## Upstream repository

- URL: https://github.com/onlook-dev/desktop
- Validated base commit: `a3685a49bdb9ace3708ee38464874b097e2485d3`
- Kumite remote: https://github.com/malcommathela/Kumite.git

## Relationship

Kumite uses Onlook Desktop as its upstream foundation. Kumite is not a clean fork in Git history; the validated upstream code lives in an isolated working copy. Kumite's own repository remains separate.

## Review and integration

1. Review upstream changes as diffs against the recorded base commit.
2. Test in isolated clone before touching Kumite.
3. Port only necessary changes.
4. Document modified files and reasons.

## Modified upstream files

No upstream files are modified inside Kumite's own repository yet. Modifications in the isolated working copy include:

- `packages/models/src/constants/editor.ts`: APP_NAME/APP_SCHEMA changed to Kumite/kumite.
- `apps/studio/package.json`: productName changed to Kumite.
- `apps/studio/builder-config/base.ts`: appId, executable name, protocols, publish target, removed Azure signing.
- `apps/studio/index.html`, `apps/studio/src/index.html`: window title "Kumite".
- `packages/models/src/projects/index.ts`: optional `activeFrameId` on `ProjectSettings`.
- `apps/studio/src/lib/editor/engine/canvas/index.ts`: active-frame persistence/restore/validation, preset `device` values.
- `apps/studio/src/lib/editor/engine/webview/index.ts`: selecting a frame persists it; registration honours the restored active frame.
- `apps/studio/src/lib/editor/engine/element/index.ts`: clicking an element sets the active frame; refresh is scoped to the owning webview.
- `apps/studio/src/lib/editor/engine/index.ts`: `selectFrame`, `createWindow(preset)`, active fallback on delete, select on duplicate.
- `apps/studio/src/lib/sizePresets.ts`: `device` per preset, Tablet 768×1024.
- `apps/studio/src/routes/editor/LayersPanel/WindowsTab/index.tsx`: always-visible frame list with create/preset/route/duplicate/delete.
- `apps/studio/src/routes/editor/WebviewArea/index.tsx`: key frames by settings id.
- `apps/studio/src/routes/editor/WebviewArea/ResizeHandles.tsx`: resize start selects the frame.
- `apps/studio/electron/preload/webview/elements/index.ts`: `getDomElementByDomId` no longer falls back to `document.body`.

- `apps/studio/electron/main/components/` (new): `index.ts` service facade,
  `inspect.ts` project/status detection, `cli.ts` shadcn CLI wrapper,
  `preview.ts` isolated Vite preview, `theme.ts` oklch-to-HSL token
  normalization, `provenance.ts` manifest and notices.
- `apps/studio/electron/main/events/components.ts` (new) and
  `electron/main/events/index.ts`: `COMPONENTS_GET_STATUS`,
  `COMPONENTS_INITIALIZE`, `COMPONENTS_INSTALL`, `COMPONENTS_PREVIEW_START`,
  `COMPONENTS_PREVIEW_STOP`.
- `apps/studio/electron/main/code/diff/transform.ts`: merges requested imports
  into an existing import declaration instead of appending a duplicate.
- `apps/studio/src/lib/components/index.ts` (new): renderer `ComponentsManager`,
  exposed as `editorEngine.components`.
- `apps/studio/src/routes/editor/LayersPanel/ComponentsTab.tsx`: catalog, install
  status, install/insert actions, preview dialog with iframe.
- `apps/studio/src/routes/editor/LayersPanel/index.tsx`: Components tab
  registration.
- `packages/models/src/components/index.ts` (new): catalog, install/status/preview
  types, `COMPONENT_CLI_VERSION`.
- `packages/models/src/code/index.ts`, `packages/models/src/actions/action.ts`:
  optional `imports` on `CodeDiffRequest` / `InsertElementAction`.
- `packages/models/src/constants/ipc.ts`: component IPC channels.
- `packages/models/src/index.ts`: re-export the component model.

### Phase 3C — explicit edit targets and non-destructive class edits

- `packages/models/src/actions/target.ts`: `EditTarget` union
  (`implementation-node` | `component-instance` with call-site, instance and
  implementation oids).
- `packages/models/src/code/index.ts`: `CodeDiffRequest.editTarget` and
  `sourcePath`; `CodeDiffFailureReason`; `CodeDiffResult`.
- `apps/studio/electron/main/code/edit-target/` (new): `index.ts`
  (`resolveEditTarget`), `ast.ts` (`checkClassNameForwarding` incl.
  `forwardRef`/`memo` unwrapping, `countOidOccurrences`).
- `apps/studio/electron/main/code/diff/index.ts`: per-request target
  resolution, duplicate-target detection, exactly-one-oid check, atomic batch
  preflight, `CodeDiffResult` return type.
- `apps/studio/electron/main/code/diff/style.ts`,
  `apps/studio/electron/main/code/diff/class-expression.ts` (new): fail-closed
  class transforms (static strings/templates, `cn`/`clsx`/`classNames`/`cx`/
  `twMerge` only; spreads, conditionals and dynamic templates refused).
- `apps/studio/electron/main/code/diff/transform.ts`: transforms consume the
  resolved target and report their result.
- `apps/studio/electron/main/code/templateNode.ts`,
  `apps/studio/electron/main/code/classes.ts`: structured results instead of
  nullable success.
- `apps/studio/electron/main/code/templateNode-lookup.ts`,
  `apps/studio/electron/main/code/jsx-walk.ts` (new): source-order call-site
  lookup by component name and index; hand-written JSX walker, no
  `@babel/traverse`.
- `apps/studio/electron/main/events/code.ts`: IPC returns `CodeDiffResult`;
  failed writes surface as `source-write-failure`.
- `apps/studio/electron/main/code/phase3c.acceptance.test.ts` (new): 30-case
  acceptance suite.
- `apps/studio/src/lib/editor/engine/code/target.ts` (new),
  `engine/code/helpers.ts`, `engine/code/index.ts`: explicit instance/root
  targets, refusal toast and analytics.
- `apps/studio/src/lib/editor/engine/style/index.ts`,
  `engine/ast/index.ts`, `engine/element/index.ts`: target-aware class lookups;
  a changed runtime identity clears the selection.
- `apps/studio/src/routes/editor/EditPanel/StylesTab/single/TailwindInput/index.tsx`,
  `src/routes/editor/EditPanel/PropsTab/index.tsx`: explicit scope on every
  commit; no oid fallback.

### Phase 3D — component intelligence

- `electron/main/code/intelligence/` (new): definitions, composition,
  capabilities, fingerprints and one AST content engine over mapped source.
- `electron/main/code/edit-target/ownership.ts` and `code/diff/`: containment
  and export-ownership checks, typed refusals, atomic preflight, and guarded
  span-addressed text/data writes. No silent instance/root fallback.
- One `chart` adapter for local Recharts configuration and data literals; no
  per-component implementations or fabricated demo data.
- The pinned catalog has 54 audited names, registry-derived exports/dependencies
  and a generated matrix. `toast` is a recorded 404; `form` and `sonner` carry
  explicit capability limits.

## Decisions recorded against upstream

- shadcn CLI and catalog pinned to `3.7.0`, commit
  `1e9e337923aaede7db55b6091cb56a72a661b959` (see
  `COMPONENT_SYSTEM_ARCHITECTURE.md` and `PHASE_3D_STAGE_6_COMPLETION_REPORT.md`).
- The `@onlook/babel-plugin-react` `data-onlook-id` injector is not used; element
  source mapping relies on the `data-oid` attributes written by the real
  `run-start` flow.
- Phase 3C treats `CodeDiffRequest.editTarget` as the only target contract. An
  absent field is read as an `implementation-node` request for backward
  compatibility, never promoted to an instance target. Instance edits write the
  call site only; root edits write the implementation node only; there is no
  fallback between scopes.

## Kumite documents describing the integration

- `HYBRID_CANVAS_ARCHITECTURE.md`: implemented integration and persistence model.
- `COMPONENT_SYSTEM_ARCHITECTURE.md`: shadcn/ui adapter, preview, provenance.
- `PHASE_3A_1_COMPLETION_REPORT.md`: Phase 3A.1 runtime evidence.
- `PHASE_3B_COMPLETION_REPORT.md`: Phase 3B runtime evidence and gate.
- `PHASE_3C_COMPLETION_REPORT.md`: Phase 3C runtime evidence and gate.
- `PHASE_3D_BASELINE_AUDIT.md` and `PHASE_3D_*_COMPLETION_REPORT.md`: engine,
  content, adapter and 54-item catalog records.

The Kumite repository stores these records and its documentation-only shared
models. It does not contain or build the desktop app source.


## Merge hotspots

- `electron/main/index.ts`
- `src/routes/editor/WebviewArea/Frame.tsx`
- `builder-config/base.ts`
- IPC event registration

## Licensing

Upstream is Apache-2.0. Preserve copyright, license, notices, and attribution. Document modifications. Do not remove upstream notices.
