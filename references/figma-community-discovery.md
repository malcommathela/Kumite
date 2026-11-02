# Figma Community Discovery and Structured Extraction Guide

This reference document outlines Kumite's architectural methodology for discovering public Figma Community resources, distinguishing identifiers, resolving design file keys, handling access boundaries, and extracting structured design information via the Figma Model Context Protocol (MCP).

---

## 1. Architectural Philosophy

1. **No official search API**: Figma provides no official REST endpoint to query or search Figma Community marketplace files programmatically.
2. **Web search as discovery engine**: Web search is used to locate free Figma Community files, UI kits, templates, and design systems.
3. **Structured extraction over screenshots**: Screenshots are only supplementary visual checks. Kumite strictly forbids treating screenshots as structured design definitions or guessing UI specifications from pixels.
4. **Zero credential storage**: Authentication is delegated entirely to the user's connected Figma MCP session.
5. **Direct access first, assisted duplication on fallback**: Test direct MCP extraction against the design file key first. Only trigger duplication when direct access is denied and permitted by the creator.
6. **Incremental extraction & caching**: Large files must be extracted incrementally at the node and component level using targeted tools to respect MCP rate limits, payload constraints, and token budgets.

---

## 2. Identifier Distinction: Community ID vs. Design File Key

Never confuse or interchange Community marketplace identifiers with Design file keys:

| Concept | URL Pattern | Identifier Type | Sample Format | MCP Compatible? |
| :--- | :--- | :--- | :--- | :---: |
| **Community Resource** | `https://www.figma.com/community/file/:id/:slug` | 19-digit numeric ID | `1324762163080748317` | **NO** |
| **Design File** | `https://www.figma.com/design/:file_key/:title` | 22-character Base62 string | `s5ovdLYnQHqRd4et0M4eNW` | **YES** |
| **Legacy File URL** | `https://www.figma.com/file/:file_key/:title` | 22-character Base62 string | `s5ovdLYnQHqRd4et0M4eNW` | **YES** |
| **Node Selection** | `.../?node-id=:node_id` (or `node-id=0-1`) | Node identifier string | `0:1` or `124:450` | **YES** |

### Regex Patterns

```javascript
// Community URL & Resource ID
const COMMUNITY_URL_REGEX = /figma\.com\/community\/file\/([0-9]{15,25})/;

// Design URL & File Key
const DESIGN_URL_REGEX = /figma\.com\/(?:design|file)\/([a-zA-Z0-9]{20,24})/;

// Node ID Parameter
const NODE_ID_REGEX = /[?&]node-id=([0-9]+(?:[-:][0-9]+)?)/;
```

---

## 3. Official Figma Rate Limits: MCP Server vs. REST API

Figma maintains distinct rate-limiting systems for its REST API and its MCP Server. Kumite implementations must never conflate them.

### A. Official Figma MCP Server Rate Limits (Host-Plan and Seat Rules)

MCP rate limits apply based on the authenticated user's seat type (Full/Dev vs View/Collab) and the host-plan tier where their session is connected:

| Host Plan & Seat Type | Monthly Quota | Daily Quota | Per-Minute Burst Limit |
| :--- | :---: | :---: | :---: |
| **Starter Plan** (All users / Drafts) | Up to 20 / month | — | — |
| **View / Collab Seats** (Any paid plan) | Up to 20 / month | — | — |
| **Professional Plan** (Full or Dev Seat) | — | Up to 200 / day | 10 / minute |
| **Education Plan** (Full or Dev Seat)* | — | Up to 200 / day | 10 / minute |
| **Organization Plan** (Full or Dev Seat) | — | Up to 200 / day | 15 / minute |
| **Enterprise Plan** (Full or Dev Seat) | — | Up to 600 / day | 20 / minute |

*\*Note: Education accounts share Professional Full/Dev allowances once assigned a Dev/Full seat by the administrator.*

#### Key MCP Rate Limit Rules (Official Documentation):
1. **Diagnostic & Write Tools**: Account validation (`whoami`) and canvas write tools (`create_new_file`) are explicitly exempt from standard MCP read quotas.
2. **`download_assets` Rate Limit Classification**: `download_assets` is classified by Figma as a read tool. Because Figma's official exemption list does not explicitly include it, it may be subject to normal MCP read limits unless Figma explicitly confirms otherwise.
3. **AI Credits vs. MCP Limits**: Standard MCP tool calls do not consume Figma AI credits. Only tools explicitly invoking generative AI models (such as `generate_image` or `send_prompt`) draw from the account's AI credit balance.

### B. Official Figma REST API Rate Limits (Endpoint Tiers)

The REST API enforces limits based on endpoint computational tier, seat type, and plan:

| Tier | Endpoints Included | View / Collab (All plans) | Full / Dev Starter | Full / Dev Professional | Full / Dev Organization | Full / Dev Enterprise |
| :--- | :--- | :---: | :---: | :---: | :---: | :---: |
| **Tier 1 (Heavy)** | `GET /v1/files`, `GET /v1/images` | Up to 20 / month | Unavailable | 10 / min | 15 / min | 20 / min |
| **Tier 2 (Medium)** | `GET /v1/files/:key/comments`, variables | 5 / min | 25 / min | 50 / min | 100 / min | 100 / min |
| **Tier 3 (Metadata)** | Styles, component lists | 10 / min | 50 / min | 100 / min | 150 / min | 150 / min |

- Throttled requests return `HTTP 429 Too Many Requests` with a `Retry-After` header.

---

## 4. Figma Duplication Models & Creator Permission Controls

### A. Figma UI Community Duplication (Assisted Baseline)
- **Mechanism**: The user opens the Community URL and clicks **"Open in Figma"** or **"Duplicate to drafts"**.
- **Plan Requirement**: Supported across all plans when permitted by the author.
- **Creator Permission Setting (Non-Universal)**: Duplication is **not universally guaranteed**. A creator or team on a paid plan can uncheck *"Viewers can copy, save, and export from this file"* in the file's advanced sharing settings. When disabled, the duplicate button is hidden/inactive, and neither users nor agents can copy the file.

### B. REST API `POST /v1/files/:file_key/duplicate` (Enterprise Only)
- **Mechanism**: Programmatic file cloning endpoint.
- **Plan Requirement**: **Enterprise Plan Only** via private OAuth applications with `file_duplicate:write` scope.
- **Limitation**: Not available to Free, Starter, or Professional users (returns `403 Forbidden`). Cannot clone from a Community ID.

### C. Figma MCP Server
- **Limitation**: The Figma MCP server **does not expose a duplication tool**. It operates strictly on files the authenticated user can already read.

---

## 5. Automated Browser Duplication Assessment

| Action Step | Automated Feasibility | User Interaction / Approval | Technical Obstacle |
| :--- | :---: | :---: | :--- |
| **Open Community URL** | Supported | No | Agent can launch URL in default browser. |
| **Authenticated Session** | Blocked | **User Session Required** | Headless browsers do not share session cookies; Figma enforces 2FA and CloudFront bot challenges. |
| **Select "Open in Figma"** | Blocked | **User Action Required** | CloudFront WAF blocks headless clicks; mutating cloud storage requires explicit user consent. |
| **Retrieve Design URL** | Supported | User Paste | User copies Design URL or frame selection link. |
| **Pass URL to Figma MCP** | Supported | No | Fully automated once Design URL is provided. |

**Conclusion**: Fully unassisted browser duplication is neither viable nor secure. Kumite uses an **assisted workflow**: the user initiates the 1-click duplication in their authenticated session, and Kumite takes over all downstream extraction.

---

## 6. Access Workflow (Priority Order)

To maximize efficiency and avoid unnecessary duplication:

```
[1. Resolve Actual Figma Design URL]
         │
         ▼
[2. Test Direct MCP Access] ──(whoami & get_metadata)
         │
         ├──► Success? ──► [3. Extract Directly from Design URL]
         │                 (Do NOT require duplication!)
         │
         └──► Access Denied (403)?
                     │
                     ▼
         [4. Explain Permission Issue to User]
                     │
                     ▼
         [5. Check Community Permissions]
                     │
                     ├──► Duplication Allowed?
                     │           │
                     │           ▼
                     │   [Offer Assisted UI Duplication to Drafts]
                     │           │
                     │           ▼
                     │   [6. Retry Extraction with Duplicated URL]
                     │
                     └──► Duplication Disabled by Author?
                                 │
                                 ▼
                         [7. Skip Resource Gracefully]
                         (Document reason & select library baseline)
```

---

## 7. Extraction Strategy and Toolchain

Kumite coordinates the full Figma MCP tool suite incrementally:

### Tool Responsibilities

| Tool | Purpose | Cache Strategy | Rate Limit Impact |
| :--- | :--- | :--- | :---: |
| **`whoami`** | Verify user identity, plan, seat type, and available capabilities | Run once per session | Exempt |
| **`get_metadata`** | Retrieve document structure, page names, and component sets | Cached per fileKey | Counts toward MCP quota |
| **`get_variable_defs`** | Extract semantic color variables (light/dark), typography scales, spacing, radii | Cached per fileKey | Counts toward MCP quota |
| **`get_design_context`** | Extract layout (Auto Layout), flex constraints, padding, gap, and variant props | Targeted by nodeId | Counts toward MCP quota |
| **`download_assets`** | Retrieve original image fills and rendered layer exports (SVG, PNG, JPG, PDF) | Saved to project disk | May count toward MCP read quota |
| **`get_code_connect_map`** | Extract existing mappings between Figma nodes and codebase components | Cached per fileKey | Counts toward MCP quota |

### `download_assets` Capabilities and Limits

- **What it does**:
  1. **Original Source Images**: Fetches original uploaded bitmap fills (PNG, JPEG, WebP) directly without re-rendering.
  2. **Rendered Asset Exports**: Exports vector layers, icons, or frames into PNG, JPG, SVG, or PDF using existing export presets or fallback `defaultFormat` and `defaultScale` (0.01x to 4x).
- **Per-Call Limit**: **Maximum 20 nodes per single call**. Larger batches must be split into sequential calls.
- **Resolution Limit**: Unconfigured renders at 1x scale are capped at ~4,096 pixels on the longest edge.
- **Temporary URLs**: Returned download URLs are **temporary and expire after an unspecified period**. Kumite recommends downloading required assets locally promptly rather than relying on temporary URLs.
- **Rate-Limit Status**: `download_assets` is categorized by Figma as a read tool. Because Figma's official exemption list does not explicitly include it, it may be subject to normal MCP read limits unless Figma confirms otherwise.

### Clarifications on Payload Constraints

- **Universal 20 KB limit**: **Removed / Qualified.** There is no universal 20 KB response ceiling across Figma MCP. Constraints stem from client context window ceilings and payload processing overhead on very large node trees.
- **Three-level nesting override limit**: **Removed / Qualified.** This is an empirical parser performance bottleneck observed on deeply nested component slot overrides, not a hard platform limit.
- **Incremental Rule**: Always query targeted nodes via `get_design_context(fileKey, nodeId)`. Never pass root `0:1` on complex multi-page files.

---

## 8. Separation of Knowledge: DashStack Baseline

Preserving baseline identifiers:
- **Community Resource ID**: `1324762163080748317`
- **Design File Key**: `s5ovdLYnQHqRd4et0M4eNW`
- **Initial Node ID**: `0:1`

| Category | Statements & Scope |
| :--- | :--- |
| **Empirical DashStack Observations** | 1. Web search query `"DashStack" figma community dashboard` returned canonical Community URL on rank #1.<br>2. Direct unauthenticated HTTP requests to Community URL failed with HTTP 403 Forbidden (CloudFront WAF).<br>3. Search engines returned 0 results for `"s5ovdLYnQHqRd4et0M4eNW"`.<br>4. Node `0:1` in DashStack represents the entire canvas across multiple dashboard pages. |
| **Official Figma Platform Documentation** | 1. MCP read limits: Starter/Viewers (20/mo), Pro/Edu/Org (200/day), Enterprise (600/day).<br>2. REST API limits: Tier 1, 2, and 3 differentiated by plan and seat type.<br>3. `download_assets` max 20 nodes per call, generates temporary download URLs, and may be subject to normal read limits.<br>4. `whoami` provides identity and plan verification.<br>5. `POST /v1/files/:file_key/duplicate` requires Enterprise plan and `file_duplicate:write` scope.<br>6. Authors can restrict viewer duplication/copying on Community files. |
| **Kumite Architectural Recommendations** | 1. Always attempt direct MCP extraction on the resolved Design URL before requesting duplication.<br>2. Inspect `whoami` and `get_metadata` before extracting deep nodes.<br>3. Use `download_assets` for raw bitmaps/exports and save them locally promptly.<br>4. Map UI primitives to shadcn/ui and icons to Hugeicons.<br>5. Never guess or hallucinate component structures from screenshots when access fails. |
| **Unverified Assumptions** | 1. Whether third-party community mirrors or scraping proxies can bypass CloudFront reliably without IP bans (unverified, discouraged).<br>2. Exact performance threshold where `get_design_context` hangs on deeply nested component slots across varying model token contexts. |
