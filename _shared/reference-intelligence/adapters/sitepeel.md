# SitePeel adapter

SitePeel measures public web pages in a real browser and returns rendered-design
intelligence. Use it as an **observation source**, not as a substitute for source
code, a Figma file or an official design system.

- Endpoint: `https://sitepeel.dev/mcp`
- Setup: `https://sitepeel.dev/setup.md`
- Configured in: the global OpenCode MCP configuration, not only the Kumite
  project.
- Licence and terms: SitePeel's own; Kumite does not vendor its code.
- Credited output: use the returned `source` link and credit line.

## Verified status

SitePeel is configured as a remote MCP server in the global OpenCode
configuration (`~/.config/opencode/opencode.jsonc`). On 2026-11-07, OpenCode
`1.18.35` lists `sitepeel` as an OAuth-capable server reporting `needs authentication`.
Testing the endpoint directly confirms the OAuth challenge (`HTTP 401 Unauthorized`
with `WWW-Authenticate: Bearer`). Interactive sign-in requires the human user
to run `opencode mcp auth sitepeel` and approve access in the browser.

Because browser approval is an external user action, SitePeel tools remain
unauthenticated until that sign-in completes. Kumite honestly records this status:
the server is registered and verified as OAuth-ready, but unauthenticated. Never
claim active connectivity or quota until a real tool call succeeds.

At the start of a run:

1. Confirm the server is listed in the global config.
2. Make the smallest free call that proves the connection.
3. If it is unavailable, record that and use another adapter. Do not describe
   SitePeel capabilities from documentation alone.
4. Never claim a measurement you did not run.

## Capabilities and evidence authority

| Capability | Authoritative for | Not authoritative for |
|---|---|---|
| Screenshot and responsive check | Rendered appearance at measured viewports, layout problems | Design intent, source structure |
| Fonts and colour palette | Rendered families, sizes, roles and palette values | Licence to reuse a font or brand palette |
| Tech stack and theme detection | Observed libraries, platform and theme signals | The project's chosen stack |
| Asset and SVG lists | Files the page actually loads | Licence to reuse the asset |
| AI-slop check | A heuristic external opinion | Your own evidence-based quality gate |
| DESIGN.md library | A starting description of a brand's look | The brand's official design system |
| Clone prompt / HTML | A reconstruction aid | Permission to copy a protected site |

## Workflow

1. Record the URL, the tool, the date and the exact options.
2. Run only the tool the decision needs. A page measurement costs allowance.
3. Save the result and the source link in the project's `reference/` or
   `output/` folder.
4. Decompose it with
   [`../foundations/reference-decomposition.md`](../../foundations/reference-decomposition.md)
   and label every value.
5. Compare with the live page, Figma or source code when more authority is
   needed.
6. Record disagreements; do not promote SitePeel data to `exact`.

## Limits

- Public pages only. No page behind a login.
- A measurement is one moment and one set of viewports.
- A detected font or colour is not a licence.
- A clone prompt is not a faithful implementation.
- The free allowance is finite; show the cost and ask before a batch of
  measurements.

## Stop conditions

- The call is unauthenticated, rate-limited or returns an error: record it and
  stop using it for that run.
- The page is a login wall or a blocked region: mark it inaccessible.
- The tool output disagrees with the source code: record both.
