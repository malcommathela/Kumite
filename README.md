<a id="readme-top"></a>

<div align="center">
<h3 align="center">Kumite</h3>
  <p align="center">
    A design-engineering studio for React apps
    <br />
    <br />
    <a href="https://github.com/malcommathela/Kumite/issues/new">Report an Issue</a>
    ·
    <a href="https://github.com/malcommathela/Kumite/issues">Request a Feature</a>
  </p>
</div>

<!-- TABLE OF CONTENTS -->
<details>
  <summary>Table of Contents</summary>
  <ol>
    <li><a href="#about">About</a></li>
    <li><a href="#status">Status</a></li>
    <li><a href="#getting-started">Getting Started</a></li>
    <li><a href="#repository-layout">Repository Layout</a></li>
    <li><a href="#contributing">Contributing</a></li>
    <li><a href="#acknowledgments">Acknowledgments</a></li>
    <li><a href="#license">License</a></li>
  </ol>
</details>

## About

Kumite is a desktop studio for React + Tailwind projects. It runs your app in a
window on an infinite canvas, lets you edit the rendered DOM directly, and writes
those edits back into your source files without giving up control of the codebase.

Kumite is a fork of [Onlook Desktop](https://github.com/onlook-dev/desktop), the
open-source "Cursor for Designers". The design canvas, editor, write-to-code
pipeline, AI chat and Electron shell come from that project; this fork rebrands
the application and adds its own tooling on top.

### Built With

React · Electron · Tailwind CSS · Vite · TypeScript

## Status

Kumite is under active development and is **not** a released product yet. There
is no download; build it from source (see below).

What this fork changes relative to upstream:

-   **Identity and storage.** The app, its window titles, menus, assets, CSS
    tokens, DOM attributes and package scope (`@kumite/*`) are renamed. Existing
    local data is migrated from the legacy application directories on first
    launch, including project metadata and images.
-   **No growth surfaces.** The upstream announcement campaign, the "built with"
    badge injected into published sites, and the badge-removal plan benefit are
    removed. Kumite does not monetize or upsell through the editor.
-   **Contacts are placeholders.** Help-menu and about links point at this
    repository. The upstream Discord invite, website and support addresses are
    intentionally left as clearly-marked placeholders until Kumite has its own
    destinations.
-   **Component intelligence.** The Components panel installs pinned shadcn/ui
    definitions. A shared AST engine proves source ownership and supports guarded
    text/data edits; one adapter handles local Recharts data. The 54-item catalog
    is structurally validated, not claimed as 54 Electron runtime tests.

Known limitations inherited from upstream, and still present here:

-   Publishing deploys through the upstream Onlook hosting service. Kumite has no
    first-party hosting backend, so publishing, custom domains and any related
    account limits depend on that upstream service. See
    `docs/KUMITE_REBRAND_AUDIT.md` for the full list.
-   The auto-updater configuration and several service endpoints still reference
    upstream infrastructure.
-   If the native `node-pty` addon cannot be built, the app uses a PowerShell
    fallback for project commands. It streams output and stops the process tree,
    but terminal resizing is unavailable.

## Getting Started

### Prerequisites

-   [Bun](https://bun.sh) (package manager and test runner)
-   Node.js 20 or newer
-   Git

### Build from source

```sh
bun install
bun run download_bun
cd apps/studio
bun run dev
```

To produce a distributable:

```sh
cd apps/studio
bun run package
```

`bun install` must be run before building. `bun run download_bun` fetches the
platform runtime into the ignored `apps/studio/resources/bun/` directory used by
the desktop app and installer. The binary is intentionally not stored in Git.

### Usage

Kumite runs on any React + Tailwind project: bring your own, or create a new one
from the template. Use the chat or the style panel to change the app, right-click
an element to jump to its source, and choose your preferred IDE from the top bar
to open the code where the element lives.

## Repository Layout

-   `apps/studio` — the Electron application (main, preload, renderer).
-   `packages` — shared models, AI, git, storage and UI packages.
-   `plugins/babel`, `plugins/next` — build plugins injected into user projects.
    These keep their published `@onlook/*` package names, because projects
    reference them by that name.

## Contributing

Issues and pull requests are welcome at
[github.com/malcommathela/Kumite](https://github.com/malcommathela/Kumite).
See [docs/CONTRIBUTING.md](docs/CONTRIBUTING.md) for the contribution process and
[docs/CODE_OF_CONDUCT.md](docs/CODE_OF_CONDUCT.md) for community expectations.

Kumite-specific integration and phase records are collected in [`docs/`](docs/).

## Acknowledgments

Kumite would not exist without [Onlook](https://github.com/onlook-dev/desktop) and
the projects it builds on:

-   [Visbug](https://github.com/GoogleChromeLabs/ProjectVisBug)
-   [Responsively](https://github.com/responsively-org/responsively-app)
-   [Supabase](https://github.com/supabase/supabase)
-   [shadcn/ui](https://github.com/shadcn-ui/ui)
-   [hymhub/css-to-tailwind](https://github.com/hymhub/css-to-tailwind)

## License

Distributed under the Apache 2.0 License. See [LICENSE.md](LICENSE.md) for the
full text. The original copyright notice and upstream attribution are retained.
