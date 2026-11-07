# Reference intelligence adapters

Reference intelligence is the practice of reading a design source through the
right adapter, keeping each source's authority separate, and recording what it
can and cannot prove.

Pick the adapter that matches the source. Read only the adapter you picked.

| Source | Adapter | Use it when |
|---|---|---|
| Screenshot, crop, image, design board | [`adapters/screenshot.md`](adapters/screenshot.md) | You have pixels and no structured file |
| Live or archived webpage | [`adapters/live-page.md`](adapters/live-page.md) | The page can be loaded and inspected |
| Figma file, page, frame or prototype | [`adapters/figma.md`](adapters/figma.md) | You have a design file key and MCP access |
| Video, screen recording or prototype capture | [`adapters/video.md`](adapters/video.md) | Motion or interaction must be evidenced |
| Component or source code | [`adapters/component-source.md`](adapters/component-source.md) | A component is being discovered, inspected or adapted |
| 21st.dev component registry | [`adapters/21st-dev.md`](adapters/21st-dev.md) | You need component discovery, preview or multi-selection |
| GSAP Showcase | [`showcase/gsap.md`](showcase/gsap.md) | You need motion or interaction research, not a site to copy |
| SitePeel MCP | [`adapters/sitepeel.md`](adapters/sitepeel.md) | Rendered design intelligence is needed and the service is connected |

## Rules common to every adapter

1. Record the source identity, access status, date and licence before extraction.
2. Mark every value `exact`, `measured`, `estimated` or `unknown`.
3. Keep the rendered view and the structural view separate.
4. Do not infer motion from a still image.
5. Do not copy a source's assets, copy, identity or code wholesale.
6. Stop and report when the source is inaccessible.

The evidence model is in
[`../references/evidence-and-confidence.md`](../references/evidence-and-confidence.md).
The combination rules are in
[`../references/reference-intelligence.md`](../references/reference-intelligence.md).

## Connection status

- **Figma MCP:** connected and verified on 2026-11-07 through the official
  `whoami` tool.
- **SitePeel MCP:** configured globally and exercised on 2026-11-07 with a free
  `sitepeel_check_allowance` call. It returned a live quota (15 measurements per
  hour, 40 per day, 0 used) and cost no measurement. The call does not report an
  account identity, so authentication is inferred from the quota response, not
  displayed. Re-check at the start of a run rather than assuming it is still
  connected.

A configured endpoint is not a verified connection. Report the actual tool result,
and never describe a service's capabilities from documentation alone.
