# Kumite Rebrand Migration

What the rename moved, what happens to an existing Onlook installation on first
launch, and what a developer has to do to this checkout before it builds.
Companion to `KUMITE_REBRAND_AUDIT.md`.

## 1. What moved

| Thing | Before | After |
|---|---|---|
| Electron `userData` directory | `%APPDATA%\Onlook` | `%APPDATA%\Kumite` |
| Package scope | `@onlook/*` | `@kumite/*` |
| CSS tokens | `*-onlook` | `*-kumite` |
| DOM attributes written by the editor | `data-onlook-*`, `onlook-toolbar` | `data-kumite-*`, `kumite-toolbar` |
| Move-key prefix written into project source | `olk-` | `kmk-` |
| Git display-name note | `refs/notes/onlook-display-name` | `refs/notes/kumite-display-name` |
| Default new-project folder | `Documents\Onlook\Projects` | `Documents\Kumite\Projects` |

Electron derives `userData` from the product name, so the rename alone made an
existing installation look empty and the first write created a fresh settings
file beside the old data. That is the problem §2 solves.

## 2. Storage migration

Files: `electron/main/storage/migration.ts` (pure), `migration.test.ts`
(7 tests), `migrate.ts` (Electron wiring).

`BasePersistentStorage` calls `ensureLegacyUserDataMigrated()` in its
constructor, before any read, and `images.ts` does the same. The runner resolves
the candidate legacy directories under the platform appData root, in order:

```
Onlook, @onlook/studio, onlook
```

The first one that exists is the source. Its files are copied into the current
`userData` directory through a staging directory (`.migration-staging`), then
moved into place, then a `migration.json` marker is written.

Guarantees, each covered by a test:

- **The source is never modified or deleted.** Migration copies.
- **Existing Kumite files are never overwritten.** A name collision is reported
  in `keptExisting` and the local file wins.
- **Unparseable JSON is skipped, not fatal.** It lands in `skippedInvalid`, the
  status becomes `partial`, and the originals stay where they were. Empty files
  are accepted: `clear()` writes them and the reader treats them as absent.
- **`auth-tokens-v1.json` is treated as opaque bytes.** It is `safeStorage`
  ciphertext, not JSON, so it is copied without parsing.
- **An interrupted run leaves no marker** (staging is removed on failure), so
  the next launch retries.
- **Idempotent.** A present marker with `completedAt` short-circuits to
  `already-migrated`.
- **No legacy directory is a no-op**, reported as `no-legacy-data`.

Statuses: `no-legacy-data`, `already-migrated`, `migrated`, `partial`, `failed`.
`migrated`/`partial` log once, `failed` logs an error; the app still starts.

### What is not migrated

- **Auth token decryption.** Electron's `safeStorage` key is bound to the
  application identity, so copied ciphertext may not decrypt under the new
  name. The bytes are preserved and the fallback is re-signing in. Inventing a
  token-transfer mechanism would mean touching the keychain; that is out of
  scope for a rename.
- **Project folders.** Project paths are stored absolute, so projects created
  under `Documents/Onlook/Projects` keep opening. Only the default folder for
  *new* projects changed.
- **Git notes.** New notes are written to `kumite-display-name`; the reader
  falls back to `onlook-display-name`, so existing notes resolve.
- **Move keys already inside project source.** Files written by an Onlook
  build carry `olk-` keys. `run/cleanup.ts` deletes both the current `kmk-` and
  the legacy `olk-` prefix (`LEGACY_MOVE_KEY_PREFIX`).

## 3. Developer migration for this checkout

The scope rename (`@onlook/*` → `@kumite/*`) is applied to source, package
names and every tsconfig/vite/tailwind reference. The lockfiles are **not**
hand-edited: rewriting hashes by hand is how a lockfile stops describing the
tree.

Before building from a clean clone:

```sh
bun install
```

That recreates the workspace links under `node_modules/@kumite/*`. In this
working copy those links were created manually as Windows junctions so the
tree keeps building without `bun`; a real install replaces them.

`plugins/babel` and `plugins/next` are intentionally outside the rename: their
published names are what user projects import, and `packages/foundation`
still emits those imports.

## 4. Rollback

Nothing in the rebrand deletes data, so rollback is a checkout operation:

1. Revert the working copy (`git stash`, or restore the durable backup at
   `C:\Users\malco\AppData\Local\Kumite\working-copy-backup\2026-11-12-phase3c`).
2. The migrated files remain in `%APPDATA%\Kumite`; the Onlook directory is
   untouched, so the old build still finds its own data.
3. Project source keeps working either way: `kmk-` keys are inert to the old
   build and the editor recomputes them.

The only one-way change is the default new-project folder name; it affects new
projects only.
