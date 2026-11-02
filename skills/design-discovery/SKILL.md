---
name: kumite-design-discovery
description: >-
  Search publicly accessible design resources for free templates, UI kits and
  design systems. Discovers Figma Community files via web search, extracts
  Community resource IDs, resolves actual Design URLs and file keys, and verifies
  licensing, permissions and structured-data accessibility. Prioritizes direct
  MCP extraction before assisted duplication. Use when a user needs to find design
  inspiration, reference implementations, or reusable design resources for a frontend project.
---

# Design Discovery

Search for, identify and evaluate publicly accessible design resources before
implementing a frontend interface.

## When to use

- The user asks for design inspiration, UI kits, templates or design systems.
- A new frontend project needs a design reference or foundation.
- Finding free, legitimate public design files (e.g. Figma Community, open-source kits).

## Discovery Architecture

Figma does not offer a public REST API for general Community marketplace search.
Kumite bridges this via a dual-engine approach:
1. **Web Search** for discovery and locating Community resource URLs.
2. **Direct Access First**: Attempt direct MCP extraction against the resolved Design URL.
3. **Assisted Duplication on Fallback**: When direct access is denied (403) and permitted by the creator, guide the user through 1-click duplication to personal Drafts.
4. **Figma MCP** for extracting structured design information from resolved Design URLs.

---

## Procedure

### 1. Understand the requirement

Clarify what the user is building:
- Application type (e.g. Admin Dashboard, E-commerce, SaaS Landing, Mobile UI).
- Target platform & tech stack (e.g. React + Tailwind CSS, Next.js).
- Visual style & density (e.g. clean, minimal, data-dense, light/dark mode).
- Existing design system or brand guidelines.

### 2. Search public design resources

Query web search engines using targeted search syntax:

```text
site:figma.com/community "<keyword>" "free"
"Figma Community" "<topic>" "UI kit" free
"<name>" figma community dashboard template
```

Prioritize resources in this order:
1. **Figma Community** (`figma.com/community/file/...`) — primary target for structured component kits.
2. **Open-source Design Systems** on GitHub (with explicit design tokens and component specs).
3. **Reference galleries** (Dribbble/Behance) — visual inspiration only; **never** treated as structured data.

### 3. Extract and distinguish identifiers

Never interchange Community URLs with Design URLs:

* **Community URL**: `https://www.figma.com/community/file/1324762163080748317/...`
  - Identifier: **Community Resource ID** (e.g. `1324762163080748317`).
  - *Cannot be queried directly by Figma MCP.*
* **Design URL**: `https://www.figma.com/design/s5ovdLYnQHqRd4et0M4eNW/...`
  - Identifier: **Design File Key** (22-character string, e.g. `s5ovdLYnQHqRd4et0M4eNW`).
  - Optional Node ID: `?node-id=0-1` (or `0:1`).
  - *Target format required for Figma MCP.*

### 4. Access Workflow & Resolution (Priority Order)

Follow this priority when handling discovered files:
1. **Resolve Design URL**: Obtain the actual Design URL (`figma.com/design/:file_key`).
2. **Test Direct MCP Access**: Check if the authenticated session already has view access.
3. **Extract Directly**: If accessible, proceed immediately with extraction. **Do not require duplication when direct access succeeds.**
4. **Handle 403 Forbidden**: If access is denied:
   - Check if Community duplication is permitted by the author.
   - If permitted, guide the user to click **"Open in Figma"** / **"Duplicate to drafts"** in their browser and provide the resulting Draft URL.
   - If duplication is disabled by the creator (*"Viewers can copy, save, and export"* unchecked) or restricted, skip the resource.

### 5. Evaluate the resource

Before passing to implementation, check:

- [ ] **Licence**: Is the resource published under CC BY 4.0, MIT, or a permissive free Community licence?
- [ ] **Attribution**: What credit or link back is required?
- [ ] **Structured Accessibility**: Can the design data be accessed directly or duplicated to personal Drafts?
- [ ] **Component Quality**: Does it use Auto Layout, named layers, defined component variants, and variable tokens?

### 6. Skip inaccessible or non-structured resources

- **Strict Rule**: Do not treat screenshots, thumbnail previews, or raster images as structured design resources.
- If a Community resource cannot be accessed directly and duplication is disabled or unavailable, skip it.
- Never guess component structure or CSS parameters from preview images.

### 7. Report findings

Present evaluated recommendations:
- Resource Name and Author.
- Community URL and Community ID.
- Resolved Design URL / File Key.
- Direct access status (Accessible directly vs Requires duplication).
- Licence terms and required attribution.
- Handoff instructions for the `kumite-figma-integration` skill.

---

## Detailed Reference

For regular expressions, URL formats, official rate limits, duplication models, and the DashStack benchmark proof of concept, see:
[`references/figma-community-discovery.md`](../../references/figma-community-discovery.md)
