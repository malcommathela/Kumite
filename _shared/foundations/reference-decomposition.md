# Reference decomposition

A selected reference is decomposed into ten qualities. Decomposition happens
after selection, not before: there is no point measuring a card the user does not
want. Each quality records what the source proves, what it does not prove, and
which approved contribution it belongs to.

## The ten qualities

| # | Quality | Capture | Do not infer |
|---|---|---|---|
| 1 | **Composition** | Section order, fold, density, rhythm, hierarchy, foreground/background relationship | That a crop continues beyond the frame |
| 2 | **Layout** | Grid, container width, columns, gutters, alignment, breakpoint structure | Exact spacing from a compressed screenshot |
| 3 | **Typography** | Families, roles, scale, weights, tracking, leading, case, measure | A font family from a look-alike |
| 4 | **Colour** | Palette, surface roles, accent, contrast, gradients, imagery colour | An exact token from an antialiased pixel |
| 5 | **Identity** | Logo treatment, wordmark, brand marks, graphic language, tone | Ownership or permission to reuse a mark |
| 6 | **Imagery** | Role, subject, crop, focal point, text-safe area, treatment, art direction | A licence from the fact that an image is visible |
| 7 | **Components** | Primitives, variants, states, density, borders, radii, shadows, icons | That a visual control is accessible or functional |
| 8 | **Interaction** | Hover, focus, press, selection, disclosure, navigation feedback | Timing from a still |
| 9 | **Motion** | Transitions, reveals, scroll behaviour, springs, stagger, loading | Any timing, easing or trigger from a static image |
| 10 | **Responsive** | Reflow, stacking, hiding, order, navigation change, crop change | Another breakpoint from one viewport |

## Per-reference record

For each selected card, record:

```json
{
  "referenceId": "ref-01",
  "contribution": "layout and type only",
  "qualities": {
    "composition": { "observation": "asymmetric editorial split", "confidence": "measured", "evidence": ["ev-01"] },
    "typography": { "observation": "display serif, tight leading", "confidence": "measured", "evidence": ["ev-02"] },
    "motion": { "observation": "not evidenced", "confidence": "unknown", "evidence": [] }
  },
  "limits": ["one desktop viewport only", "no recording", "licence for imagery unknown"]
}
```

The record is project-local, usually `pipeline/03_reference/output/` for Content
Experience or `pipeline/03_system/output/` for Product Experience. There is no
global schema; the ten qualities are the checklist, not a mandatory file format.

## Source authority

Use the adapter that matches the source and keep the authorities separate:

| Source | Strong for | Weak for |
|---|---|---|
| Figma node data | Structure, variables, variants, constraints, exports | Final rendered appearance |
| Screenshot or image | Rendered appearance, crop, type rendering, overlay | Node identity, exact spacing, motion |
| Live DOM and computed styles | Measured values at one viewport | Design intent, other breakpoints |
| Video or recording | Motion timing, easing, sequence, pointer feedback | Values hidden by compression |
| Component source | Real markup, dependencies, states, accessibility | The visual direction it should serve |
| Written brief | Intent, audience, constraints | Visual detail |

When two sources disagree, record both, name the viewport, and state which one
the implementation follows.

## From decomposition to direction

Decomposition produces evidence, not a decision. The direction stage combines
the approved contributions, detects conflicts and proposes one coherent concept.
Do not let a strong reference silently take over a quality the user selected
from another reference.

## Stop conditions

- The source is inaccessible: record the failure and downgrade confidence.
- Only one viewport exists: mark the others `unknown`.
- Motion is not recorded: mark it `static` or `unknown`; add no animation.
- A quality has no evidence: leave it empty instead of filling it with taste.
