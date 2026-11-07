---
name: kumite-figma-integration
description: >-
  Extract structured design information from Figma files using the user's
  connected Figma MCP. Retrieves component definitions, variants, variables,
  typography scales, auto-layout parameters, design tokens and assets. Follows a
  direct-access-first protocol, with assisted drafts duplication on fallback.
  Uses whoami, get_metadata, get_variable_defs, get_design_context and
  download_assets incrementally to respect MCP rate and payload limits.
---

# Figma Integration

Extract structured, code-oriented design information from Figma files through the
connected Figma Model Context Protocol (MCP) server.

## When to use

- A user provides a Figma design URL or selection to implement in code.
- Extracting design tokens, colour variables, typography and variants.
- Verifying auto-layout dimensions, padding, gap and alignment.
- Downloading original image assets and vector exports into the project.

## Prerequisites

This skill requires the **Figma MCP** to be installed and connected.

### 1. Account and seat verification (`whoami`)

Before heavy operations, invoke `whoami` and record:

- authenticated user and workspace identity;
- account plan (Starter, Professional, Education, Organization, Enterprise);
- seat type (Full/Dev versus View/Collab) to anticipate rate limits.

### 2. Identifier verification

Figma MCP operates on **design file keys**, not Community IDs:

```text
❌ Community URL: https://www.figma.com/community/file/1324762163080748317/...
   → Community resource ID, not queryable by MCP.

✅ Design URL:    https://www.figma.com/design/s5ovdLYnQHqRd4et0M4eNW/...
   → Design file key, the target format.

✅ Node selection: https://www.figma.com/design/s5ovdLYnQHqRd4et0M4eNW/Title?node-id=124-450
   → Node id "124:450".
```

## Access workflow

```text
1. Resolve the design URL (figma.com/design/:file_key)
2. Test direct MCP access with the authenticated account
   ├── Accessible? ──► 3. Extract directly (do NOT require duplication)
   └── Denied (403)? ──► 4. Explain the permission issue
                            └── 5. Check Community permissions:
                                  ├── Duplication permitted? ──► assisted duplication to drafts
                                  │                              └── 6. Retry with the duplicated URL
                                  └── Duplication disabled?  ──► 7. Skip gracefully
```

Rules:

- Do not require duplication when direct access succeeds.
- Duplication is author-controlled. If disabled, skip cleanly without guessing
  from screenshots.
- The REST duplication endpoint is Enterprise-only. Never attempt it unless an
  Enterprise private OAuth app is verified.

## Incremental extraction protocol

Figma MCP enforces rate limits. Execute incrementally:

### Step 1 — structure (`get_metadata`)

- Query `get_metadata(fileKey)` for pages, frame ids and component sets.
- Cache the response. Identify the target node id.

### Step 2 — tokens (`get_variable_defs`)

- Query once per file for colour, type, spacing and radii variables.
- Record theme modes and collections.
- Cache for the session.

### Step 3 — targeted node layout (`get_design_context`)

- Call on the specific frame or component node, never the root canvas of a
  complex multi-page file.
- Extract auto-layout direction, alignment, gap, padding, sizing and
  constraints.
- Extract variant properties and values.

### Step 4 — assets (`download_assets`)

- Batch at most 20 nodes per call.
- Save binaries locally promptly; download URLs are temporary.
- Record the local path, format and intrinsic dimensions.

### Step 5 — Code Connect (`get_code_connect_map`)

- Where available, check for mappings to existing codebase components.

## Output contract: reference evidence

Extraction is not finished until its results are written into the pipeline's
reference record. The project keeps only the evidence it needs; there is no
mandatory global schema. Every entry must include:

| Field | Content |
|---|---|
| Node id and location | `fileKey`, node id, page, parent frame, layer path |
| Variable collections | Collection, mode, token name, resolved value |
| Component sets and variants | Set id, variant properties and values |
| Layout properties | Direction, alignment, gap, padding, sizing, constraints |
| Assets | Node id, format, local path, intrinsic dimensions |
| Confidence | `exact` for node-derived values |
| Unavailable | Fields the file or plan does not expose |

Rules:

- Record `exact` only for values returned by node data, variables or tokens.
- A node that cannot be queried is `unknown` with the access reason; never
  reconstruct it from a preview image.
- Record variants individually; do not collapse a component set.
- Screenshots support rendered appearance and verification only.
- Asset exports are saved locally and referenced by path.

## Translation to code

Follow `kumite-component-first`:

1. **Map to established primitives** — cards to shadcn/ui `<Card>`, modals to
   Radix/shadcn, icons to Hugeicons or the downloaded SVG.
2. **Bind CSS custom properties** — map variable collections to CSS variables or
   Tailwind theme tokens.
3. **Preserve auto layout** — use utilities or values matching the extracted
   padding and gap.

## Reference integration: DashStack

For testing and baseline validation:

- Community resource ID: `1324762163080748317`
- Baseline design file key: `s5ovdLYnQHqRd4et0M4eNW`
- Root node: `0:1` (contains all dashboard screens; inspect via `get_metadata` to
  target child frames).
- Full technical guide:
  [`_shared/references/figma-community-discovery.md`](../../../_shared/references/figma-community-discovery.md).
