# Hybrid Canvas Architecture

## Workspace model

The workspace is an infinite canvas containing frames. Workspace state (pan, zoom, frame positions) is separate from website source.

## Page frame model

Each frame wraps a real browser preview (webview) and has position, dimensions, page route, and viewport preset.

## Viewport model

Viewport presets control frame dimensions and device emulation. They do not alter website source layout logic.

## Coordinate systems

- Workspace coordinates: canvas pan/zoom transforms.
- Website coordinates: normal browser layout inside the frame.

## Pan and zoom

Implemented at frame container level, not inside the document.

## Page-to-project relationship

Frames reference routes/pages in one React project. Multiple frames can represent different pages without duplicating project state.

## Editing and selection

Selection occurs in webview coordinates, then mapped to source. Canvas transforms must be inverted for hit-testing.

## Responsive preview

Frame resize triggers real browser layout (Grid/Flexbox), not absolute positioning.

## State persistence

Persist workspace layout separately from website source. In the running app, workspace
state is stored in the app's `project.settings` (`scale`, `position`, `frames`,
`activeFrameId`); there is no second store.

## Implemented foundation (Phase 2)

The app inherits its pan/zoom canvas (`apps/studio/src/routes/editor/Canvas/index.tsx`), frame model (`CanvasManager`), viewport presets, and editing integration from Onlook. Kumite extends that implementation without introducing a second runtime canvas store.

## Implemented integration (Phase 3A.1)

Verified at runtime in the isolated checkout; all of this reuses Onlook's frame model.

- **Active frame.** `CanvasManager.activeFrameId` is persisted in
  `project.settings.activeFrameId`, restored on launch, validated against the stored
  frame list (falling back to the first frame), and cleared with the project. Frame
  selection, webview focus, resize start, create and duplicate all set it; deleting
  the active frame falls back to a surviving frame.
- **Frame lifecycle.** `EditorEngine.createWindow(preset)` appends a frame from a
  viewport preset at `last.x + last.width + 100`, reusing the last frame's URL, and
  selects it. `deleteWindow` keeps its "cannot delete the last frame" guard.
  The Windows panel lists every frame with route, dimensions, device, and
  Duplicate/Delete actions, always visible (no empty state).
- **Presets.** `SIZE_PRESETS` carries a `device` string per preset
  (`Desktop:Desktop`, `Laptop:MacBook Air`, `Tablet:iPad Mini 5`,
  `Phone:iPhone SE`; 768×1024 Tablet) so stored frames keep device metadata.
- **Frame identity.** `WebviewArea` keys each `Frame` by `settings.id` rather than
  array index, so reordering or deleting frames does not remount the wrong webview.
- **Selection targeting.** `getDomElementByDomId` returns `null` when an id is
  missing instead of falling back to `document.body`, and
  `refreshSelectedElements` only refreshes when the resizing webview owns the
  selection. Without this, a resize of one frame re-anchored the selection (and the
  active frame) and silently retargeted style writes to `<body>`.
- **Edit format.** Style writes are Tailwind class changes (`bg-[#00FF00]`) written
  into the shared component's source. They are only rendered by projects with a
  Tailwind build; the plain-CSS fixture records the class but does not paint it.

## Verified runtime integration (Phase 3B)

Both behaviours below were measured in the production Windows build against a real
Tailwind v3 + Vite fixture with three frames (`/`, `/about`, `/contact`). Source
writes survive a reload; frame geometry survives an app restart.

### Tailwind visual editing

- Selecting a plain `<div>` in a frame and adding `bg-red-500` wrote the class to
  the *page* source (`src/pages/Home.tsx`), rendered `rgb(239, 68, 68)`, and
  persisted across a webview reload. One file changed of fourteen.
- Selecting the root of a shared component (`FeatureCard.tsx`, imported by both
  Home and About) and adding `bg-blue-100` wrote to the component source and
  rendered in both frames. Two files changed of fourteen.
- A write only reaches the element that owns the selected `data-oid`; no write
  retargets `body`.

### Frame move, resize, and pan

- Move: dragging the frame address bar by 40 screen px moved the stored position by
  80 canvas units at scale 0.5 and the host box by 40 px.
- Width: dragging the right handle by 24 screen px set width `1440 -> 1488`
  (+48), height unchanged, host box +24 px.
- Height: dragging the bottom handle by 16 screen px set height `1024 -> 1056`
  (+32), width and position unchanged, host box +16 px.
- Pan: wheel and middle-button drag both pan and persist.
- All of the above read back unchanged from `project.settings` after restart, with
  three frames and rendered previews restored.

A drag that starts on a frame overlapped by another frame can be swallowed by the
neighbouring webview or resize handle, producing a jump instead of a clean delta.
This is a hit-testing consequence of overlapping frames, not a persistence bug:
non-overlapping drags are exact and repeatable.

### Workspace model status

The app store (`project.settings`) is authoritative; no parallel workspace model
is used at runtime.
