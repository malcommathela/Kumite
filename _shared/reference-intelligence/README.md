# Reference intelligence

Reference intelligence is a workflow performed by the design agent using
capabilities already available in its environment. Kumite does not ship,
configure or require an independent website-inspection engine or dedicated
reference-analysis MCP service.

## Source handling

| Source | How to inspect | What it can establish |
|---|---|---|
| Live website | Existing browser, page source/view-source, DOM and computed styles; browser automation when available | Delivered markup, loaded resources, measured styles and observed interactions at inspected states/viewports |
| Figma file | Connected Figma MCP | Node structure, variables, variants, auto-layout, component properties and prototype settings |
| Component/source repository | Existing code browser or repository tools | Actual markup, dependencies, APIs, states and accessibility behaviour |
| User-provided image or recording | Existing file/image/video inspection capability | Visible appearance or recorded sequence only |

Choose only the source guidance needed for the selected reference. Do not load
every adapter or invent a missing tool.

## Website inspection

When a user selects a website, inspect its browser-delivered implementation
using whatever browser capabilities are already available:

1. Inspect the rendered page and its URL.
2. Read the delivered document/source and loaded DOM.
3. Inspect relevant stylesheets and computed styles.
4. Inspect loaded JavaScript resources and identify animation or interaction
   implementations where accessible.
5. Trigger and observe relevant interactions; use recordings or repeated
   observations when timing matters.
6. Inspect responsive states at available viewports.
7. Record what is directly observed, inferred or unavailable.

This is an agent workflow, not a new Kumite engine. Do not require a vendor-specific inspection MCP, custom crawler, custom browser
runtime or dedicated reverse-engineering service. Server-side code and inaccessible resources remain
out of scope.

## Figma inspection

Do not inspect every discovered Figma file. Present Community/design links first
and wait for the user's selection. Then use the connected Figma MCP to verify
access and extract only the relevant pages, frames, variables, components,
variants and prototype settings.

Community resource IDs, file keys and node IDs are different identifiers.
Never guess or interchange them. If direct access is unavailable, report that
clearly and offer the official duplication route only when the creator permits
it.

## Evidence rules

- Separate observed facts from inference and unknowns.
- Record source URL, access date and relevant viewport or node identifier.
- Do not invent measurements, ratings, awards, licences, source files or motion.
- A screenshot can help internal visual verification but is not structural data.
- Do not generate or attach screenshots to the user's reference shortlist.
- Do not copy proprietary source code, branding or assets wholesale.
- Inspect only selected candidates in depth; discovery results remain links and
  concise evidence notes until selected.

See `../references/evidence-and-confidence.md` and
`../references/licensing-policy.md`.
