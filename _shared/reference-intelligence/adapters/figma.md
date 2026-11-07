# Figma adapter

Use when the reference is a Figma file, selection, frame or prototype and the
Figma MCP is connected.

## Prerequisites

1. Run `whoami` and record the account and seat type.
2. Confirm the identifier is a **design file key** (`figma.com/design/:key`), not
   a Community resource id (`figma.com/community/file/:id`). They are not
   interchangeable.
3. Create a file session for the target file before file tools, as the Figma MCP
   requires.
4. Confirm the frame is on the selection board and name the approved
   contribution. See
   [`../../foundations/selection-board.md`](../../foundations/selection-board.md).

## Procedure

1. **Structure first.** Use `get_metadata` to list pages, frames and component
   sets. Cache it; do not re-query per component.
2. **Tokens once.** Use `get_variable_defs` for colour, type, spacing, radii and
   theme modes. Record collection, mode, token name and resolved value.
3. **Target nodes.** Use `get_design_context` on the specific frame or component,
   never the root canvas of a complex file. Record auto-layout direction,
   alignment, gap, padding, sizing and constraints.
4. **Variants individually.** Record each component set's variant properties and
   values. Do not collapse a set to its default.
5. **Assets.** Export with `download_assets` in batches of at most 20 nodes.
   Save binaries locally; temporary URLs are not durable evidence.
6. **Code Connect.** Use `get_code_connect_map` where available to reuse project
   components.
7. **Prototype motion.** A Figma prototype can declare transitions, durations,
   easing and triggers. Record those as `exact` for the declared setting and
   `unknown` for the rendered result until it is played. A static frame proves no
   motion.

## Confidence

- Node-derived values are `exact`.
- Rendered appearance still needs a screenshot; node data can differ from the
  rendered result because of fonts, effects and rasterisation.
- A node that cannot be queried is `unknown`, with the access reason. Never
  reconstruct it from a preview image.

## Limits

- Community files may be inaccessible or non-duplicable.
- Rate limits depend on the account and seat.
- A prototype's settings may be visible while the real interaction is not.
- Ownership of a file is not permission to reuse its identity or assets.

## Output

Node ids and locations, variable collections, component variants, layout
properties, prototype transition settings, exported assets with local paths, and
an explicit unavailable list.
