# Implementation checkpoints

Implementation is not one silent block followed by a reveal. It has checkpoints:
small, visible moments where the user can see the approved direction becoming
real and correct it before more work is built on top.

## Checkpoints

| # | Checkpoint | Show | Compare against |
|---|---|---|---|
| 1 | **Structure** | Section order, grid, container and hierarchy with placeholder content | Approved concept frame and composition evidence |
| 2 | **Type and colour** | Real type scale, colour roles, spacing rhythm and surfaces | Direction proposal and tokens |
| 3 | **Imagery** | Real or approved assets, crops, focal points, text-safe areas and overlays | Image composition plan |
| 4 | **Components** | Reused or adapted components with variants and states | Design system and system inventory |
| 5 | **Motion** | The approved motion, reduced-motion branch and interruption behaviour | Motion spec and motion approval |
| 6 | **Responsive and accessibility** | Each evidenced viewport, keyboard path, focus, contrast and touch | Responsive and accessibility foundation |
| 7 | **Final** | Complete interface and capture set | Reference, direction, system and quality gates |

Each checkpoint records: capture path, viewport, what was compared, what
changed, the user's decision and the next action. Use
[`_templates/implementation-checkpoint.md`](../../_templates/implementation-checkpoint.md).

Do not proceed past a checkpoint with an open blocking or major finding. Minor
findings may be batched only when they do not change the approved direction.

## Mid-implementation direction change

A change request is normal. A full rebuild is usually not.

1. **Write the request down.** What should change, in the user's words, and which
   part of the screen it affects.
2. **Locate the decision.** Find the token, component, direction section or
   reference contribution that owns it.
3. **Build the impact list.** List affected pages, components, states, motion,
   captures and tests. List what is unaffected.
4. **Classify the change.** `local` (one component), `systemic` (a token or
   pattern) or `directional` (composition, identity or motion direction).
5. **Preserve unaffected work.** Do not rewrite approved sections to satisfy a
   local change.
6. **Re-approve only what changed.** Show the affected checkpoint before
   propagating it.
7. **Update the records.** Direction version, design-system version,
   implementation spec, motion spec and checklists.
8. **Re-verify.** Re-capture affected regions and re-run the relevant gates.

A directional change may legitimately require more rework; say so and show the
cost. It still does not justify deleting approved work that remains valid.

## Final verification

Before the build stage can pass:

- [ ] Visual fidelity is checked region by region at equivalent viewports.
- [ ] Responsive behaviour is checked at every evidenced breakpoint; unknown
      breakpoints stay marked `unknown`.
- [ ] Accessibility is checked: semantics, keyboard order, visible focus,
      contrast, labels, error messaging and touch targets.
- [ ] Reduced motion is implemented and tested.
- [ ] Motion is checked for purpose, interruption, cleanup and performance.
- [ ] Functional paths and states work: success, empty, error, loading,
      permission and disabled.
- [ ] Console and network errors are absent.
- [ ] No content, metric, testimonial, award or capability is invented.
- [ ] The final captures and the audit are in the project, not `_shared/`.
