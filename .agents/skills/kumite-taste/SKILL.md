---
name: kumite-taste
description: >-
  Run Kumite's taste-led discovery: collect references, present an interactive
  selection board, ask for multi-select qualities rather than verdicts, decompose
  the chosen references into ten qualities, detect and resolve conflicts, and
  obtain explicit direction approval before implementation. Use at the start of
  any visual project, when the user supplies references, when a direction feels
  generic, or when a mid-course change needs an impact check.
---

# Taste

Kumite is a collaborative, taste-led design partner. Taste is not a mood board and
not a questionnaire; it is a recorded set of choices with evidence, connected to a
direction the user has approved.

## When to use

- A visual project starts and no approved direction exists.
- The user supplies links, screenshots, Figma files, videos, components or assets.
- The user asks for "something like this" without naming what part.
- Two references disagree and the agent is about to average them silently.
- A mid-course change alters composition, identity, type, colour, imagery or
  motion.

The pipeline stages `02_taste` and `04_direction` are the primary homes for this
skill. `05_motion` owns motion taste separately.

## The sequence

1. **Frame the brief.** Audience, job, primary action, real content and
   constraints. Do not ask a taste question the brief already answers.
2. **Collect references.** Accept URLs, screenshots, Figma frames, videos,
   components, fonts and assets. Keep the original and a local capture in the
   project's `reference/` folder. Record identity, access and licence.
3. **Show a small board.** Three to six cards at a time, grouped by the decision
   they help make. Use `_tools/taste-board.mjs` to render the JSON as a
   self-contained HTML page.
4. **Ask for qualities, not verdicts.** "Which part of this do you want?" The
   answer may be composition from A, type from B and motion from C. Record each
   contribution.
5. **Record the profile.** Write `taste/profile.json` and
   `taste/selection-board.json`. The chat is not the record.
6. **Decompose only the kept cards.** Ten qualities per reference:
   composition, layout, typography, colour, identity, imagery, components,
   interaction, motion, responsive.
7. **Detect conflicts.** Compare contributions within each quality. A real
   conflict is resolved by the brief, accessibility, the design system, an
   explicit user decision or a named blend. Never average silently.
8. **Propose the direction.** A written concept plus a low-cost concept frame and
   an honest list of open decisions.
9. **Obtain approval.** The user approves the direction in their own words. Record
   the version, date, scope and conditions.
10. **Approve motion separately.** A visual approval is not a motion approval.

## Multi-select, not one winner

A card can be kept for typography and rejected for colour. Record:

```json
{
  "id": "ref-02",
  "selected": "keep",
  "qualities": ["typography", "colour"],
  "contribution": "display serif and warm neutral palette only",
  "notes": "the user's own words"
}
```

Never collapse the board to a single favourite. The point is a coherent
combination, not a ranking.

## The ten qualities

| # | Quality | Capture | Do not infer |
|---|---|---|---|
| 1 | Composition | Section order, fold, density, hierarchy, foreground/background | That a crop continues beyond the frame |
| 2 | Layout | Grid, container, columns, gutters, alignment, breakpoints | Exact spacing from a compressed image |
| 3 | Typography | Families, roles, scale, weight, tracking, leading, measure | A font family from a look-alike |
| 4 | Colour | Palette, surface roles, accent, contrast, gradients | An exact token from an antialiased pixel |
| 5 | Identity | Logo, wordmark, marks, graphic language, tone | Ownership or permission to reuse |
| 6 | Imagery | Role, subject, crop, focal point, text-safe area, treatment | A licence from visibility |
| 7 | Components | Primitives, variants, states, density, borders, radii, icons | That a control is accessible or functional |
| 8 | Interaction | Hover, focus, press, selection, disclosure, navigation feedback | Timing from a still |
| 9 | Motion | Transitions, reveals, scroll, springs, stagger, loading | Any timing or easing from a static image |
| 10 | Responsive | Reflow, stacking, order, navigation and crop changes | Another breakpoint from one viewport |

Full detail: [`_shared/foundations/reference-decomposition.md`](../../_shared/foundations/reference-decomposition.md).

## Conflict resolution order

Apply the first rule that decides:

1. Brief constraint.
2. Accessibility and platform requirement.
3. Approved project design system.
4. Explicit user decision, shown with two or three visual options.
5. Dimension precedence: each contribution stays inside its own quality.
6. An approved deliberate blend, with values attributed to their sources.
7. Defer only when the conflict does not affect the current screen.

Record the conflict, the references, the resolution, who decided and the date.
See [`_shared/foundations/conflict-resolution.md`](../../_shared/foundations/conflict-resolution.md).

## Direction approval gate

Implementation starts only when:

- [ ] The proposal can be implemented without guessing.
- [ ] Every decision traces to a reference, a design-system token or the brief.
- [ ] Conflicts that affect the current screen are closed.
- [ ] The concept frame is visible to the user.
- [ ] The user approved in their own words.
- [ ] The approval has a version and date.
- [ ] Motion has a separate approval, or is explicitly `none` / `unknown`.

A build that starts without this record is a violation. See
[`_shared/foundations/direction-approval.md`](../../_shared/foundations/direction-approval.md).

## Mid-course change

A change request is normal; a full rebuild usually is not.

1. Write the request in the user's words and name the affected part.
2. Locate the token, component, direction section or reference contribution that
   owns the decision.
3. Build the impact list: pages, components, states, motion, captures, tests, and
   what is unaffected.
4. Classify the change as `local`, `systemic` or `directional`.
5. Preserve approved work the change does not affect.
6. Re-approve only the changed part.
7. Update the direction, design-system, spec and checkpoint records.
8. Re-capture and re-run the relevant gates.

## Tools and records

| Need | Path |
|---|---|
| Taste profile template | `_templates/taste-profile.json` |
| Selection board template | `_templates/selection-board.json` |
| Board renderer | `_tools/taste-board.mjs` |
| Direction proposal | `_templates/direction-proposal.md` |
| Checkpoint | `_templates/implementation-checkpoint.md` |

```sh
node _tools/taste-board.mjs projects/<project>/taste/selection-board.json \
  --out projects/<project>/taste/selection-board.html
```

## Stop conditions

- No reference and no brief: ask for one; do not invent a direction.
- A source is inaccessible: record it, downgrade confidence, do not reconstruct.
- A licence is unverified: mark it `unknown` and do not ship the asset.
- A material decision depends on an `unknown`: ask, or record the open decision.
- The user has not approved: do not build.

## Handoffs

| Skill | Responsibility |
|---|---|
| `kumite-design-discovery` | Find candidate references |
| `kumite-figma-integration` | Extract structured Figma evidence |
| `kumite-component-intelligence` | Turn a chosen component direction into reusable primitives |
| `kumite-design-system` | Record approved values as a living system |
| `kumite-motion-design` | Discover and approve motion separately |
| `kumite-design-quality` | Verify the built result against the approved direction |
