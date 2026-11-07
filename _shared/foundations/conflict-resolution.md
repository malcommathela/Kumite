# Conflict detection and resolution

Multiple references rarely agree. A quiet editorial serif, a saturated product
dashboard and a bouncy playful site can all be liked for different reasons, but
they cannot all lead the same screen. Detect the conflict, name it, resolve it
with the user, and record the decision.

## Conflict types

| Type | Example |
|---|---|
| **Composition** | Full-bleed cinematic hero vs dense above-the-fold tool layout |
| **Density** | Generous editorial whitespace vs compact data table |
| **Typography** | High-contrast display serif vs neutral UI grotesk |
| **Colour** | Warm monochrome vs saturated multi-accent system |
| **Identity** | Expressive wordmark and illustration vs restrained product chrome |
| **Imagery** | Documentary photography vs abstract 3D renders |
| **Interaction** | Expressive hover and scroll storytelling vs immediate utility feedback |
| **Motion** | Long cinematic reveals vs near-instant state transitions |
| **Responsive** | Fixed art-directed composition vs fluid component grid |
| **Audience or tone** | Playful consumer voice vs regulated enterprise voice |

## Detection

Run the matrix after decomposition, before proposing a direction:

1. List every kept reference and its approved contributions.
2. Compare contributions within each of the ten qualities.
3. Mark a conflict when two contributions cannot coexist in the same screen
   without one defeating the other.
4. Separate a **real conflict** from a **deliberate contrast**. Contrast between
   a serif headline and a grotesk UI label can be intentional; two competing
   primary typefaces usually is not.
5. Check the brief and the design system before calling something a conflict.

## Resolution order

Apply the first rule that decides the conflict:

1. **Brief constraint.** A stated requirement wins over a preference.
2. **Accessibility and platform requirement.** Contrast, focus, target size,
   reduced motion and semantics are not negotiable.
3. **Approved project design system.** An existing token or component wins
   unless the user explicitly changes it.
4. **Explicit user decision.** Ask with two or three visual options, not an
   abstract question.
5. **Dimension precedence.** If the user selected different references for
   different qualities, keep each contribution inside its own dimension.
6. **Deliberate blend.** Combine only when the result is coherent and the user
   approves it. State which values came from which reference.
7. **Defer.** If the conflict does not affect the current screen, record it as
   open and continue. Do not invent a resolution.

Never silently average two directions. "A bit of both" without a named rule
produces a design with no point of view.

## Asking the user

Show the conflict, not a questionnaire:

> These two references disagree on density. A is spacious and editorial; B is a
> compact working surface. Which should lead the main screen, and should the
> other quality appear anywhere?

Offer concrete options:

- keep A for the marketing surface and B for the signed-in product;
- keep B's density but A's type and colour;
- choose one and drop the other;
- defer until the flow is clearer.

Record the answer in the taste profile, the selection board and the direction
proposal.

## Conflict record

```json
{
  "id": "conflict-01",
  "quality": "density",
  "references": ["ref-02", "ref-05"],
  "why": "ref-02 is an editorial landing page; ref-05 is a compact dashboard",
  "resolution": "ref-02 leads the public page; ref-05 leads the product shell",
  "decidedBy": "user",
  "date": "YYYY-MM-DD",
  "affects": ["03_direction", "06_build"]
}
```

## Acceptance

- Every real conflict is named with the references and quality involved.
- Every resolution has a rule or an explicit user decision.
- Unresolved conflicts are visible and block direction approval when they affect
  the current screen.
- The approved direction states which contribution won and why.
