# Direction approval

Implementation starts only after the user approves a direction. Approval is an
explicit decision, not silence, not a thumbs-up emoji on a different topic, and
not the agent deciding the direction is obvious.

## What the user approves

A direction proposal has three parts:

1. **Visual direction.** The concept in words and a small set of visual
   decisions: composition, type, colour, imagery, identity, component feel and
   density. Each decision names its source reference or design-system token.
2. **Concept frame.** A low-cost visual artefact: a wireframe, an annotated
   composition, a static HTML frame, a Figma frame or a generated comp. It is
   not the final implementation and must be labelled as a proposal.
3. **Open decisions and conflicts.** What is still unknown, what was deferred,
   and which alternative was rejected. Hidden uncertainty is not approval.

For motion, a separate approval is required. See
[`../motion/motion-selection.md`](../motion/motion-selection.md).

## Proposal format

Use [`_templates/direction-proposal.md`](../../_templates/direction-proposal.md).
The minimum record:

| Field | Content |
|---|---|
| Version | `v1`, `v2`, ... |
| Status | `proposed`, `approved`, `rejected`, `revising` |
| Concept | One paragraph in the user's language |
| Composition | Order, fold, density and hierarchy |
| Typography | Families, roles, scale and tracking |
| Colour | Surface, text and accent roles |
| Identity | Marks, graphic language and tone |
| Imagery | Role, art direction and crop plan |
| Components | Which primitives and variants |
| Responsive | What changes at each evidenced viewport |
| Motion | Reference to the separately approved motion direction |
| Conflicts | Resolved and open |
| Evidence | Reference ids, tokens and confidence |
| Approval | Who, when, and exactly what was approved |

## Approval gate

Before the build stage:

- [ ] The proposal is complete enough to implement without guessing.
- [ ] Every decision traces to a reference, a design-system token or the brief.
- [ ] Unresolved conflicts that affect the current screen are closed.
- [ ] The concept frame is visible to the user.
- [ ] The user approved the direction in their own words.
- [ ] The approval is recorded with a version and date.
- [ ] Motion has its own approval, or is explicitly `none` / `unknown`.

A build stage that starts without this record is a violation. A time-boxed
technical spike is allowed only when it is labelled a spike, uses disposable
markup and does not become the implementation.

## Revisions

A direction can change. When it does:

1. Create a new version; do not overwrite the approved record.
2. Name what changed and why.
3. Run the impact check in
   [`implementation-checkpoints.md`](implementation-checkpoints.md).
4. Preserve approved work that the change does not affect.
5. Ask for approval of the affected part only, not the whole project again.

## Anti-patterns

- "I will implement it and you can tell me if you like it." That is not approval.
- A concept frame that already contains unapproved motion.
- A proposal that hides a conflict inside "we will make it work".
- Re-asking every taste question because the agent did not keep the profile.
- Treating a reference as approval to copy its assets, copy or identity.
