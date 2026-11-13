# Kumite documentation

The desktop application source is at the repository root. This folder contains
Kumite's architecture, provenance, migration and phase verification records; the
former skill/pipeline framework is not part of the app repository.

## Architecture

- [`UPSTREAM.md`](UPSTREAM.md) — source provenance and integration boundary.
- [`HYBRID_CANVAS_ARCHITECTURE.md`](HYBRID_CANVAS_ARCHITECTURE.md) — canvas and
  frame model.
- [`COMPONENT_SYSTEM_ARCHITECTURE.md`](COMPONENT_SYSTEM_ARCHITECTURE.md) — the
  pinned shadcn adapter and component limits.
- [`PROJECT_EXPORT_ARCHITECTURE.md`](PROJECT_EXPORT_ARCHITECTURE.md) — project
  and component export design.

## Audits and verification

- `KUMITE_REBRAND_AUDIT.md` and `KUMITE_REBRAND_MIGRATION.md` — identity and
  existing-user-data migration.
- `PHASE_3D_BASELINE_AUDIT.md` — baseline, decisions and scope.
- `PHASE_*_COMPLETION_REPORT.md` — staged implementation and verification
  records, including the final `PHASE_3D_COMPLETION_REPORT.md`.
- Earlier phase reports are retained as historical records; their stated
  environments and results are snapshots, not current runtime claims.

## Licenses

- The desktop application and its upstream derivative code retain the root
  [`LICENSE.md`](../LICENSE.md) (Apache-2.0).
- [`LICENSE-KUMITE-MIT`](LICENSE-KUMITE-MIT) preserves the previous repository's
  MIT license for archived Kumite-authored records.
- [`THIRD-PARTY-NOTICES.md`](THIRD-PARTY-NOTICES.md) retains prior notices.

## Repository policies

- [`CONTRIBUTING.md`](CONTRIBUTING.md)
- [`CODE_OF_CONDUCT.md`](CODE_OF_CONDUCT.md)
- [`SECURITY.md`](SECURITY.md)
