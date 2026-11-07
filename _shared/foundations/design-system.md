# Living design system

The design system is not a one-time token dump. It is the project's living record
of what has been approved, what each value means, where it came from and what
changes when a decision changes.

## Layers

| Layer | Examples | Rule |
|---|---|---|
| **Primitive** | `colour.neutral.900`, `space.4`, `font.serif`, `duration.fast` | Raw values; no product meaning |
| **Semantic** | `surface.canvas`, `text.muted`, `action.primary`, `focus.ring`, `motion.enter` | Named by role; the layer components consume |
| **Component** | `button.height.md`, `card.padding.md`, `table.row.height` | Local overrides only when the semantic layer cannot express the case |
| **State** | `hover`, `focus-visible`, `pressed`, `selected`, `disabled`, `loading`, `empty`, `error` | Every interactive component names its states |

Both pipelines use the same three layers. Product Experience usually starts from
an existing system; Content Experience usually derives one from the approved
references and the composition.

## Provenance

Every token and component records:

- value and confidence (`exact`, `measured`, `estimated`, `unknown`);
- evidence id, reference id or design-system source;
- the approved direction version that introduced it;
- the date and, when relevant, the owner;
- whether it is `active`, `deprecated` or `proposed`.

A token without provenance is a guess. A component without states is incomplete.

## Deriving the system

1. Inventory what exists before adding anything. Reuse project tokens,
   components and libraries first.
2. Extract repeated visual decisions from the approved references: type roles,
   surface roles, spacing rhythm, radii, borders, shadows, motion tokens.
3. Name by role, not by appearance. `surface.raised` survives a palette change;
   `grey-2` does not.
4. Map each needed component to the component ladder: project, installed
   library, shadcn/ui, accessible primitive, Hugeicons, custom.
5. Record variants and states. Motion is a state treatment, not a new variant.
6. Add only what the approved direction needs. A design system is not a
   speculative catalogue.

## Change propagation

When a token or component changes:

1. Create a new system version.
2. List every page, component and state that consumes it.
3. Classify the change as `additive`, `visual`, `structural` or `breaking`.
4. Re-render the affected checkpoints; preserve unaffected approved work.
5. Update the direction record and the implementation spec.
6. Re-run the relevant visual, responsive, accessibility and motion checks.

Never change a global token to fix one local screen. Add a semantic token or a
component override, and record why.

## Relationship to motion

Motion tokens live in the same system: duration, easing, distance, stagger and
spring. They are approved with the motion direction and audited with the
interface. See [`../motion/README.md`](../motion/README.md).

## Acceptance

- [ ] Every primitive, semantic and component token has provenance.
- [ ] Every interactive component names hover, focus-visible, pressed, disabled
      and loading where applicable.
- [ ] The system is derived from approved references or the existing project,
      not invented.
- [ ] Deprecated values are marked, not silently deleted.
- [ ] A change has an impact list and a re-verification record.
