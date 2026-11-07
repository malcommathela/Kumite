---
name: kumite-component-intelligence
description: >-
  Discover, evaluate and adapt UI components from the project, shadcn/ui,
  accessible primitives, Hugeicons and 21st.dev, then write a component spec with
  variants, states, tokens, accessibility and provenance. Use when choosing a
  component, adapting a reference component, evaluating 21st.dev results, or
  deciding whether to reuse, compose or build custom.
---

# Component Intelligence

Component intelligence is the step between a design direction and an
implementation. It answers three questions: what already exists, what can be
reused or adapted, and what is genuinely missing.

It is broader than component-first. Component-first decides **whether** to reuse.
Component intelligence decides **which** component, from which source, with which
variants and states, and records the adaptation.

## Component ladder

Stop at the first rung that holds:

1. **This project.** Existing components, tokens, utilities and patterns.
2. **An installed library.** The project's current dependency.
3. **shadcn/ui.** For React with Tailwind: accessible, composable, locally owned
   source. Prefer it over a new runtime dependency.
4. **An accessible primitive.** Radix UI, Headless UI, React Aria or the
   framework equivalent, styled to the approved direction.
5. **21st.dev or another curated registry.** A candidate source, not an
   automatic choice. Inspect the code, licence, dependencies and accessibility.
6. **Hugeicons.** For interface icons, unless the project already uses another
   set.
7. **Custom.** Only with a stated requirement the existing options cannot meet.

## Procedure

1. **Inventory before searching.** Read `package.json`, component directories,
   styles, token files and existing usage. Record what exists.
2. **Map every needed component.** For each entry in the approved composition or
   flow, record the rung, the chosen primitive and the reason.
3. **Inspect a registry candidate properly.** Read its source, not its preview.
   Check dependencies, licence, keyboard behaviour, focus management, ARIA,
   responsive behaviour and dark-mode or theme support.
4. **Prefer composition over replacement.** Extend an existing component with
   props, slots or wrapper styles before writing a parallel implementation.
5. **Preserve the reference's variants.** Primary, secondary, outline and ghost
   are four visual variants even when one component expresses them through props.
6. **Name states explicitly.** `default`, `hover`, `focus-visible`, `pressed`,
   `selected`, `disabled`, `loading`, `empty`, `error`. Motion is a state
   treatment, not a new visual variant.
7. **Bind to tokens.** Use semantic tokens from the living design system. Do not
   hardcode a colour, radius or duration that belongs in a token.
8. **Write the component spec.** Use `_templates/component-spec.md`.
9. **Record the licence and provenance.** A component copied from a registry
   keeps its upstream licence and attribution.
10. **Hand off to motion and build.** The component spec names the states; the
    motion spec names how state changes animate.

## 21st.dev

21st.dev is an optional component registry and community. It is useful for
discovery and for comparing implementation approaches. It is not a design system
and not an authority on the approved direction.

| Access | Endpoint or command |
|---|---|
| Registry | `https://21st.dev` |
| MCP | `https://21st.dev/api/mcp` |
| Setup | `https://21st.dev/mcp` |
| OpenAPI | `https://21st.dev/openapi.json` |
| CLI | `npx @21st-dev/cli@latest init --client <cursor\|claude\|codex\|vscode\|devin>` |

Rules:

- Configure it only with the user's consent; it is not enabled globally by
  default in Kumite.
- Treat a registry result as a candidate. Inspect the real code before adopting.
- Check the licence and attribution requirements of each component.
- Do not let a registry component override an approved token, layout or identity.
- Do not install a dependency the project does not need.
- Record the registry URL, component name, author and licence in the project.

Full adapter: [`_shared/reference-intelligence/adapters/21st-dev.md`](../../_shared/reference-intelligence/adapters/21st-dev.md).

## Component source adapter

When the source is code rather than an image, use
[`_shared/reference-intelligence/adapters/component-source.md`](../../_shared/reference-intelligence/adapters/component-source.md).
It separates what the source proves (markup, dependencies, states, accessibility)
from what it does not (the visual direction it should serve).

## Component spec

Every non-trivial component records:

| Field | Content |
|---|---|
| Identity | Name, role, source and rung |
| Anatomy | Parts, slots and composition |
| Variants | Named visual variants |
| States | Every interactive state, including empty, loading and error |
| Tokens | Semantic tokens consumed |
| Responsive | Behaviour at each evidenced breakpoint |
| Accessibility | Role, name, keyboard, focus, announcements, target size |
| Motion | State transitions, or `none` |
| Licence | Upstream licence and attribution |
| Known gaps | What the source did not prove |

## Adaptation rules

- **Never copy wholesale.** Extract the mechanism and rebuild it with the
  project's tokens and conventions.
- **Never infer accessibility from appearance.** Check the real markup.
- **Never hide a missing state.** Record it as `unknown` or implement it
  explicitly.
- **Never add motion because a component is interactive.** The motion direction
  decides.
- **Never introduce a second icon library** without a stated reason.
- **Never bind a component to a raw value** when a semantic token exists.

## Handoffs

| Skill | Responsibility |
|---|---|
| `kumite-taste` | Supplies the approved contributions and the component feel |
| `kumite-design-system` | Owns tokens, variants and provenance |
| `kumite-figma-integration` | Supplies node-derived component structure |
| `kumite-component-first` | Enforces the reuse ladder |
| `kumite-motion-design` | Owns state-change motion |
| `kumite-design-quality` | Verifies visual and accessibility behaviour |

## Stop conditions

- The component cannot be mapped without inventing a token or state.
- The licence is missing or restricts the intended use.
- The registry result depends on an unapproved framework or design system.
- The candidate is inaccessible and no accessible primitive covers the need.
- A custom component is requested without a requirement the ladder cannot meet.
