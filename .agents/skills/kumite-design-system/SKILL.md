---
name: kumite-design-system
description: >-
  Build and maintain the living design system: three-layer tokens with
  provenance, component and state contracts, motion tokens, versioning, change
  propagation and checkpoint re-verification. Use when deriving tokens from an
  approved direction, recording components and states, changing a token, or
  keeping a build consistent with the approved references.
---

# Design System

The design system is the project's living record of what has been approved, what
each value means, where it came from and what changes when a decision changes. It
is not a one-time token dump and not a speculative catalogue.

## When to use

- A direction is approved and its visual decisions must become implementable.
- A component, variant or state is added or changed.
- A token changes and the impact must be traced.
- Product Experience needs to inventory or extend an existing system.
- Content Experience needs to derive a system from approved references.

## The layers

| Layer | Examples | Rule |
|---|---|---|
| Primitive | `colour.neutral.900`, `space.4`, `font.serif`, `duration.fast` | Raw values; no product meaning |
| Semantic | `surface.canvas`, `text.muted`, `action.primary`, `focus.ring`, `motion.enter` | Named by role; the layer components consume |
| Component | `button.height.md`, `card.padding.md`, `table.row.height` | Local override only when the semantic layer cannot express the case |
| State | `hover`, `focus-visible`, `pressed`, `selected`, `disabled`, `loading`, `empty`, `error` | Every interactive component names its states |

Both pipelines use the same layers. Product usually starts from an existing
system; Content usually derives one from approved references and composition.

## Provenance

Every token and component records:

- value and confidence (`exact`, `measured`, `estimated`, `unknown`);
- evidence id, reference id or design-system source;
- the approved direction version that introduced it;
- the date, and the owner when relevant;
- status: `active`, `deprecated` or `proposed`.

A token without provenance is a guess. A component without states is incomplete.

## Derivation

1. **Inventory first.** Reuse project tokens, components and libraries before
   adding anything.
2. **Extract repeated decisions.** Type roles, surface roles, spacing rhythm,
   radii, borders, shadows and motion tokens from the approved references.
3. **Name by role.** `surface.raised` survives a palette change; `grey-2` does
   not.
4. **Map components through the ladder.** Project, installed library, shadcn/ui,
   accessible primitive, 21st.dev candidate, Hugeicons, custom.
5. **Record variants and states.** Motion is a state treatment, not a variant.
6. **Add only what the approved direction needs.** A design system is not a
   catalogue of everything that might be useful later.

## Motion tokens

Motion is part of the same system:

| Token | Example | Rule |
|---|---|---|
| Duration | `motion.duration.fast` | Short for state feedback, longer for orientation |
| Easing | `motion.ease.standard` | Named by feel, not by curve shape |
| Distance | `motion.distance.sm` | Transform distance for reveals |
| Stagger | `motion.stagger.list` | Interval and cap |
| Spring | `motion.spring.settle` | Only when a spring is justified |
| Reduced motion | `motion.reduced` | The alternative, not an absence of content |

Motion tokens are approved with the motion direction and audited with the
interface. See [`_shared/motion/README.md`](../../_shared/motion/README.md).

## Change propagation

When a token or component changes:

1. Create a new system version.
2. List every page, component and state that consumes it.
3. Classify the change: `additive`, `visual`, `structural` or `breaking`.
4. Re-render the affected checkpoints; preserve unaffected approved work.
5. Update the direction record and the implementation spec.
6. Re-run the relevant visual, responsive, accessibility and motion checks.

Never change a global token to fix one local screen. Add a semantic token or a
component override, and record why.

## Versioning

Use a simple, human-readable version: `ds-1`, `ds-2`, or a date plus a short
reason. Record what changed, what it affects and what was re-verified. Do not
overwrite an approved version; add a new one and mark the old one `deprecated`.

## Checkpoints

A design-system change is verified at the checkpoints in
[`_shared/foundations/implementation-checkpoints.md`](../../_shared/foundations/implementation-checkpoints.md):
structure, type and colour, imagery, components, motion, responsive and
accessibility, final. A token change is not "done" until the affected checkpoint
has been re-rendered.

## Records

| Need | Path |
|---|---|
| System template | `_templates/design-system.md` |
| Component spec | `_templates/component-spec.md` |
| Direction proposal | `_templates/direction-proposal.md` |
| Checkpoint | `_templates/implementation-checkpoint.md` |

## Acceptance

- [ ] Every primitive, semantic and component token has provenance.
- [ ] Every interactive component names its states.
- [ ] The system is derived from approved references or the existing project.
- [ ] Deprecated values are marked, not silently deleted.
- [ ] A change has an impact list and a re-verification record.
- [ ] Motion tokens have a reduced-motion alternative.

## Handoffs

| Skill | Responsibility |
|---|---|
| `kumite-taste` | Supplies the approved direction and contributions |
| `kumite-component-intelligence` | Selects and adapts components |
| `kumite-figma-integration` | Supplies node-derived tokens and variants |
| `kumite-motion-design` | Owns motion tokens and their approval |
| `kumite-design-quality` | Verifies the rendered system against the tokens |
