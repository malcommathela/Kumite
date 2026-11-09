# Live-page inspection

Use when the user has selected a website reference that can be loaded in an
existing browser or browser automation environment.

## Procedure

1. Record the canonical URL, access status and inspection date.
2. Inspect the browser-delivered document/source and live DOM.
3. Read relevant stylesheets and computed styles at the viewport being studied.
4. Inspect loaded JavaScript resources and identify interaction or animation
   implementation details where accessible.
5. Trigger important navigation, hover, focus, selection and scroll interactions.
6. Observe motion directly; record timing only when it can be measured or is
   declared in accessible source.
7. Inspect responsive behaviour at available viewport sizes.
8. Record selectors, viewports, evidence, confidence and unavailable details.

## Boundaries

- Use browser capabilities already available to the host agent. Do not require
  SitePeel, a custom crawler, a custom runtime or another dedicated service.
- Browser access exposes delivered client-side resources, not private
  server-side code or inaccessible resources.
- A public page is not automatically licensed for reuse.
- A hover style does not prove the full interaction or timing.
- Screenshots may be used internally for visual verification when useful, but
  they are not part of reference discovery or user selection.

## Output

A concise evidence record of relevant structure, styles, assets, interactions,
responsive behaviour and unknowns. Record only what informs the implementation.
