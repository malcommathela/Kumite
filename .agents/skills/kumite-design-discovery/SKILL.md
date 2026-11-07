---
name: kumite-design-discovery
description: >-
  Search publicly accessible design resources for free templates, UI kits and
  design systems. Discovers Figma Community files via web search, extracts
  Community resource IDs, resolves actual Design URLs and file keys, and verifies
  licensing, permissions and structured-data accessibility. Prioritizes direct
  MCP extraction before assisted duplication. Use when a user needs to find design
  inspiration, reference implementations or reusable design resources for a
  frontend project.
---

# Design Discovery

Search for, identify and evaluate publicly accessible design resources before
implementing a frontend interface.

## When to use

- The user asks for design inspiration, UI kits, templates or design systems.
- A new frontend project needs a design reference or foundation.
- Finding free, legitimate public design files (Figma Community, open-source
  kits).

## Discovery architecture

Figma does not offer a public REST API for general Community marketplace search.
Kumite bridges this with a dual-engine approach:

1. **Web search** for discovery and Community resource URLs.
2. **Direct access first** — attempt MCP extraction against the resolved design
   URL.
3. **Assisted duplication on fallback** — when direct access is denied (403) and
   the creator permits it, guide the user through a one-click duplication to
   personal drafts.
4. **Figma MCP** for structured extraction from the resolved design URL.

## Discovery sources

| Source | Use it for | Adapter |
|---|---|---|
| User links, images and files | The strongest evidence of intent | The matching adapter |
| Figma Community and public files | Structured kits, systems and components | `kumite-figma-integration` |
| 21st.dev | Component and interaction candidates | `_shared/reference-intelligence/adapters/21st-dev.md` |
| SitePeel | Rendered fonts, colours, stack, assets and screenshots from a live site | `_shared/reference-intelligence/adapters/sitepeel.md` |
| GSAP Showcase and demos | Motion and interaction mechanisms | `_shared/reference-intelligence/showcase/gsap.md` |
| Design galleries | Visual direction only, never structured data | Screenshot adapter |

A discovered source is a candidate. Put it on the selection board, record the
search source, query and date, and let the user choose qualities. Do not decompose
a card the user has not kept.

## Procedure

### 1. Understand the requirement

Clarify what the user is building:

- Application type (admin dashboard, e-commerce, SaaS landing, mobile UI).
- Target platform and stack (React + Tailwind, Next.js, plain HTML).
- Visual style and density (clean, minimal, data-dense, light or dark).
- Existing design system or brand guidelines.

### 2. Search public design resources

```text
site:figma.com/community "<keyword>" "free"
"Figma Community" "<topic>" "UI kit" free
"<name>" figma community dashboard template
```

Prioritise:

1. **Figma Community** (`figma.com/community/file/...`) — structured component
   kits.
2. **Open-source design systems** on GitHub with explicit tokens and component
   specs.
3. **Reference galleries** (Dribbble, Behance) — visual inspiration only, never
   structured data.

### 3. Extract and distinguish identifiers

Never interchange Community URLs with design URLs:

- **Community URL** — `https://www.figma.com/community/file/1324762163080748317/...`
  - Identifier: **Community resource ID** (e.g. `1324762163080748317`).
  - Cannot be queried directly by Figma MCP.
- **Design URL** — `https://www.figma.com/design/s5ovdLYnQHqRd4et0M4eNW/...`
  - Identifier: **design file key** (22-character string).
  - Optional node id: `?node-id=0-1` or `0:1`.
  - Target format required for Figma MCP.

### 4. Access workflow and resolution

1. Resolve the design URL (`figma.com/design/:file_key`).
2. Test direct MCP access with the authenticated session.
3. Extract directly when access succeeds. Do not require duplication.
4. On 403, check whether the creator permits duplication. If permitted, guide
   the user to **Open in Figma** / **Duplicate to drafts** and provide the
   resulting draft URL.
5. If duplication is disabled or restricted, skip the resource.

### 5. Evaluate the resource

- [ ] **Licence** — CC BY 4.0, MIT or a permissive free Community licence?
- [ ] **Attribution** — what credit or link back is required?
- [ ] **Structured accessibility** — can the data be accessed directly or
  duplicated to drafts?
- [ ] **Component quality** — auto layout, named layers, variants, variable
  tokens?

### 6. Skip inaccessible or non-structured resources

- Do not treat screenshots, thumbnails or raster previews as structured data.
- If a Community resource cannot be accessed and duplication is unavailable,
  skip it.
- Never guess component structure or CSS from a preview image.

### 7. Report findings

- Resource name and author.
- Community URL and Community ID.
- Resolved design URL and file key.
- Direct access status.
- Licence terms and required attribution.
- Handoff instructions for `kumite-figma-integration`.

### 8. Hand off to the pipeline

Hand the discovery record to the chosen pipeline's `02_taste` stage. The user
selects the references and the qualities they want before anything is decomposed.
Then hand the kept cards to `03_reference` (Content) or `03_system` (Product).
The record must contain:

| Field | Required content |
|---|---|
| Source identity | Resource name, author, canonical URL |
| Community URL / ID | Exact URL and numeric id |
| Resolved design URL / file key | `figma.com/design/:key` and the 22-character key, if resolved |
| Author / licence | Licence name, attribution, commercial use |
| Accessibility status | Direct, requires duplication, or inaccessible |
| Extraction method | Direct MCP, duplicated draft, structured export, or none |
| Evidence | What was verified and where |
| Explicitly unavailable | Anything not obtained, stated as unavailable |

The receiving stage decides whether to proceed, downgrade confidence or stop.

## Source-identity separation

Community IDs, design file keys, node ids and screenshot paths are different
identifiers and are never interchangeable:

- A **Community ID** cannot be queried by Figma MCP.
- A **file key** identifies a file, not a node or a screen.
- A **node id** identifies one frame or component inside that file.
- A **screenshot** identifies no structured node at all.

Never derive a file key or node id from a URL pattern you have not verified. A
screenshot is still not structured data, even when it came from an accepted
resource.

## Detailed reference

For regular expressions, URL formats, official rate limits, duplication models
and the DashStack benchmark, see
[`_shared/references/figma-community-discovery.md`](../../../_shared/references/figma-community-discovery.md).
