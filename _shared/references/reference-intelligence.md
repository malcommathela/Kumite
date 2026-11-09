# Reference intelligence

Use the strongest source already available to the host agent. Kumite does not
require a dedicated website-inspection service or engine.

## Source authority

| Source | Authoritative for | Limits |
|---|---|---|
| Delivered website source and DOM | Client-side markup, loaded resources, DOM structure | Private server-side code and inaccessible resources |
| Computed styles | Measured styles at the inspected viewport | Other breakpoints and design intent |
| Figma node data | Node identity, layout, variables, variants and component properties | Rendered appearance may differ |
| Figma prototype settings and observed playback | Declared transitions and observed interaction | Unavailable or unplayed states |
| Video/recording | Observed sequence and approximate timing | Values hidden by compression |
| Component source | Markup, dependencies, states and accessibility | Whether the component fits the approved design direction |
| Written brief | Intent, audience and constraints | Visual detail |

## Website inspection

After the user selects a website, use existing browser and source-reading
capabilities to inspect the browser-delivered HTML, loaded DOM, stylesheets,
computed styles, JavaScript resources and observable interactions. Use existing
browser automation where available. This is a skill workflow, not a standalone
Kumite engine.

Record URL, date, viewport, selectors and evidence. Mark inaccessible or
server-side implementation details as unknown. Do not invent what cannot be
observed.

## Figma inspection

Present Figma Community/design links first. Deeply inspect only resources the
user selects, using the connected Figma MCP. Community IDs, file keys and node
IDs are distinct and must never be guessed or interchanged.

## Evidence rules

- Separate observed facts, inference and unknowns.
- Every material value has a traceable source and confidence.
- A screenshot may support internal visual verification but is not structural
  data and is never required for a reference shortlist.
- Do not generate screenshots, thumbnails or previews for selection.
- Do not copy proprietary code, branding, copy or assets wholesale.
- Inspect only selected candidates in depth.
