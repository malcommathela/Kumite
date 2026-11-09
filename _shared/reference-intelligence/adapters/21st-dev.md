# 21st.dev component intelligence

21st.dev is a community registry of React, Tailwind and shadcn/ui-compatible
components, templates, themes and libraries. Use it for **discovery and
adaptation**, not as an approved design system.

- Registry: `https://21st.dev/community/components`
- Libraries: `https://21st.dev/community/libraries`
- Templates: `https://21st.dev/community/templates`
- Themes: `https://21st.dev/community/themes`
- MCP and CLI: `https://21st.dev/mcp`
- Agent documentation: `https://21st.dev/llms.txt`
- OpenAPI: `https://21st.dev/openapi.json`

## Discovery

1. Search by the component's job and the project's stack, not by a generic
   aesthetic word.
2. Preview the live component and read its full source.
3. Record the component URL, author, library, licence and retrieval date.
4. Put three to five candidates on the selection board. Do not present a whole
   category.
5. Ask which qualities the user wants: anatomy, density, type, colour, motion,
   interaction or responsive behaviour.

## Multi-selection

A user may select one component for its structure, another for its states and a
third for its motion. Record each contribution separately in
`selection-board.json`. Do not treat a selected component as a visual direction.

## Implementation inspection

- Read the real TSX, not only the preview.
- Identify dependencies: React, Tailwind, shadcn/ui primitives, icon libraries,
  animation libraries, chart libraries.
- Identify the animation technology. An animated card may use CSS, Framer
  Motion, an installed animation library or a canvas library. Use the technology the approved direction and
  the project need, not the one the component happens to ship.
- Check accessibility: semantics, keyboard, focus, labels, contrast and reduced
  motion.
- Check responsive assumptions and container requirements.
- Check licence and attribution before copying.

## Integration options

| Method | Use when | Notes |
|---|---|---|
| Copy the source | The project can own and adapt it | Preserve licence and attribution |
| shadcn CLI | The component is published in the shadcn registry format | Inspect the install diff; do not overwrite project primitives |
| 21st MCP | The agent host is configured with a 21st API key | Search is free; code retrieval may be paid |
| 21st CLI | Setup or publishing outside an MCP host | `npx @21st-dev/cli@latest init --client <client>` |

Kumite does **not** configure the 21st MCP globally by default. Adding it is a
project or user decision because it requires an API key. The workflow above works
without it through the public registry.

## Adaptation

1. Map the component to the project's design system and component ladder.
2. Replace foreign colour, type, spacing, radius, shadow and motion tokens.
3. Re-implement the interaction with the approved technology.
4. Preserve the accessible contract; add what the source is missing.
5. Add the component to the living design system with provenance.
6. Validate: keyboard, focus, responsive, states, reduced motion and performance.

## Stop conditions

- Licence unclear or incompatible: do not copy.
- The component needs a dependency that duplicates an existing one: adapt or
  reject.
- The component is a visual clone of a protected brand: do not use its identity.
- The preview works but the source is unavailable: do not reconstruct it from
  the preview.
