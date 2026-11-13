# Kumite repository migration

## Result

The repository now contains the Kumite desktop application source, rather than
the former skill/pipeline framework. The app occupies the repository root; the
Kumite architecture, provenance and phase records are centralized in `docs/`.
No `.agents/skills`, pipeline framework, project templates or framework tests
remain in the tracked tree.

## Source and boundary

- Upstream: `https://github.com/onlook-dev/desktop`, validated base
  `a3685a49bdb9ace3708ee38464874b097e2485d3`.
- Imported committed source snapshot: `65e3662a` from the isolated working
  copy. The upstream clone and remote were not modified by this migration.
- The upstream Git history was not merged into Kumite history. Root source was
  copied from the committed tree; `.git`, `node_modules`, build outputs, release
  installers, disposable probes and the large Bun executable were excluded.
- App and package READMEs remain beside their code. Kumite-specific architecture,
  migration and verification records are in this folder.

## Removed from the tracked tree

The old `.agents/skills`, `pipelines`, `_shared`, `_templates`, `_tools`,
adapters, skill-framework tests, and the old worked-example/coffee-project tree
were removed because they belonged to the previous non-app repository. Existing
local untracked Vaal and Coffee work plus temporary audit scripts were left in
the working directory and were not staged or pushed.

## Licenses and bootstrap

- The app retains the upstream Apache-2.0 `LICENSE.md` and attribution.
- The previous repository's MIT license is preserved as `LICENSE-KUMITE-MIT`
  for the archived Kumite-authored records.
- Run `bun install`, then `bun run download_bun` before launching or packaging.
  The platform Bun executable is ignored by Git because the Windows binary is
  larger than GitHub's normal per-file limit.
- `node-pty` remains a dependency, but the Bun install trust allowlist excludes
  its native build script. The app has a PowerShell child-process fallback when
  the PTY addon is unavailable; terminal resizing is unavailable in that
  fallback.

## Validation on the migration host

- `bun run build:studio`: pass (foundation, renderer, Electron main and preload).
- `bun run download_bun`: pass; the local ignored Windows Bun runtime was already
  present. It is not included in Git.
- `bun run test`: attempted, but not green with Bun 1.2.5 on this Windows host:
  68 pass, 15 fail, 9 errors. Six command-string assertions expect POSIX output
  instead of the implementation's Windows PowerShell prefix; nine Node test
  suites use `node:test`, which this Bun version does not implement. No tests
  were silently skipped or reported as passing.
- The app package build exposed a FlexSearch type change (`doc` can be null); the
  source now types the indexed record and filters missing documents before
  conversion. The Studio build passes after this correction.

No Electron installer or clean-machine runtime test was performed as part of this
repository migration.
