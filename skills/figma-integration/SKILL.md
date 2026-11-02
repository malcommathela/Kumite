---
name: kumite-figma-integration
description: >-
  Extract structured design information from Figma files using the user's
  connected Figma MCP. Retrieves component definitions, variants, variables,
  typography scales, auto-layout parameters, design tokens and assets. Follows
  a direct-access-first protocol, with assisted drafts duplication on fallback.
  Uses whoami, get_metadata, get_variable_defs, get_design_context, and
  download_assets incrementally to respect MCP rate and payload limits.
---

# Figma Integration

Extract structured, code-oriented design information from Figma files through the
connected Figma Model Context Protocol (MCP) server.

## When to use

- A user provides a Figma design URL or selection link to implement in code.
- Extracting design tokens, color variables, typography, and component variants.
- Verifying auto-layout dimensions, padding, gap, and alignment parameters.
- Downloading original image assets and vector exports directly into the project.

---

## Prerequisites

This skill requires the **Figma MCP plugin** to be installed and connected in
the agent's environment (e.g. `antigravity-plugins-partners/plugin/figma`).

### 1. Account & Seat Verification (`whoami`)
Before performing heavy operations, invoke `whoami` to verify:
- Authenticated user email and workspace identity.
- Account host plan (Starter, Professional, Education, Organization, Enterprise).
- Seat type (Full / Dev vs View / Collab) to anticipate rate-limit ceilings.

### 2. Identifier Verification: Community URL vs Design File Key
The Figma MCP API operates exclusively on **Design File Keys**, not Community IDs:

```text
❌ Community URL: https://www.figma.com/community/file/1324762163080748317/...
   → Contains a Community Resource ID ("1324762163080748317").
   → MCP will fail if given this URL directly.

✅ Design URL:    https://www.figma.com/design/s5ovdLYnQHqRd4et0M4eNW/...
   → Contains a Design File Key ("s5ovdLYnQHqRd4et0M4eNW").
   → Target format required for Figma MCP.

✅ Node Selection: https://www.figma.com/design/s5ovdLYnQHqRd4et0M4eNW/Title?node-id=124-450
   → Targets a specific frame or component ("124:450").
```

---

## Access Workflow (Priority Order)

Always follow this 7-step sequence:

```
1. Resolve Actual Figma Design URL (figma.com/design/:file_key)
2. Test Direct MCP Access using authenticated account
   ├── Accessible? ──► 3. Extract Directly (Do NOT require duplication!)
   └── Denied (403)? ──► 4. Explain Permission Issue
                             └── 5. Check Community Permissions:
                                   ├── Duplication Permitted? ──► Offer Assisted UI Duplication to Drafts
                                   │                              └── 6. Retry Extraction with Duplicated URL
                                   └── Duplication Disabled?  ──► 7. Skip Resource Gracefully
```

### Important Access Rules
- **Do not require duplication when direct access succeeds**: If the user or team already has view access to the design file key, extract immediately.
- **Duplication is author-controlled**: Creators on paid tiers can uncheck *"Viewers can copy, save, and export from this file"*. If duplication is disabled, the resource cannot be copied; skip it cleanly without guessing from screenshots.
- **REST duplication endpoint is Enterprise-only**: Never attempt programmatic duplication via `POST /v1/files/:file_key/duplicate` unless an Enterprise private OAuth app is verified.

---

## Incremental Extraction Protocol & Toolchain

Figma MCP enforces rate limits (Starter/Viewers: 20/month; Pro/Edu/Org Full/Dev: 200/day; Enterprise Full/Dev: 600/day). To ensure reliability and stay within token budgets, execute extraction incrementally:

### Step 1: Document Structure Discovery (`get_metadata`)
- Query `get_metadata(fileKey)` to retrieve top-level pages, frame IDs, and component sets.
- Cache the metadata response. Identify the specific node ID for the target UI component or screen.

### Step 2: Extract Global Tokens (`get_variable_defs`)
- Query `get_variable_defs(fileKey)` once per file to extract:
  - **Colors**: Semantic tokens for background, foreground, border, muted, primary, destructive.
  - **Theme modes**: Light and dark mode variable collections.
  - **Radii & Spacing**: Corner radii and global spacing scales.
- Cache token definitions for the entire implementation session.

### Step 3: Targeted Node Layout (`get_design_context`)
- Call `get_design_context(fileKey, nodeId)` on the **specific frame or component node ID** (e.g. `node-id=124:450`).
- **Rule**: Never pass root canvas node `0:1` on complex multi-page files.
- Extract:
  - Auto Layout direction (`HORIZONTAL` → `flex-row`, `VERTICAL` → `flex-col`).
  - Alignment: `primaryAxisAlignItems` and `counterAxisAlignItems`.
  - Spacing: `itemSpacing` (gap), padding (`paddingTop`, `paddingBottom`, `paddingLeft`, `paddingRight`).
  - Component variant properties (e.g. `Type: Primary`, `State: Hover`).

### Step 4: Asset Extraction (`download_assets`)
- For icons, image fills, and vector illustrations within the extracted frame:
  - Call `download_assets(nodes: [nodeId1, nodeId2, ...], defaultFormat: "SVG"|"PNG")`.
  - **Per-call limit**: Maximum **20 nodes per call**. Split larger sets into batches.
  - **Rate limits**: `download_assets` is categorized by Figma as a read tool and may be subject to standard MCP read limits unless Figma confirms otherwise.
  - **Persistence**: Save downloaded binaries locally promptly (download URLs are temporary and expire after an unspecified period).

### Step 5: Code Connect Inspection (`get_code_connect_map`)
- Where available, check for existing mappings between Figma nodes and codebase components to reuse existing project implementations.

---

## Translation to Code

Follow `kumite-component-first` principles:
1. **Map to established primitives**:
   - Card containers → shadcn/ui `<Card>`, `<CardHeader>`, `<CardContent>`.
   - Modals and popovers → accessible Radix UI / shadcn primitives.
   - Icons → map to **Hugeicons** equivalents when available; use downloaded SVGs for custom graphics.
2. **Bind CSS custom properties**:
   - Map Figma variable collections directly to CSS variables or Tailwind theme tokens.
3. **Preserve exact Auto Layout**:
   - Use Tailwind utility classes matching extracted pixel values (e.g. `p-6`, `gap-4`).

---

## Reference Integration: DashStack

For testing and baseline validation:
- Community Resource ID: `1324762163080748317`
- Baseline Design File Key: `s5ovdLYnQHqRd4et0M4eNW`
- Root Node: `0:1` (contains all dashboard screens; inspect via `get_metadata` to target specific child frames).
- Full technical guide: [`references/figma-community-discovery.md`](../../references/figma-community-discovery.md)
