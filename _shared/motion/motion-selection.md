# Motion discovery and selection

Motion taste is separate from visual taste. A user can love a reference's
composition and reject its motion, or want motion from a site whose visual
language is wrong. Do not infer one from the other.

## Discovery

Collect motion evidence only where it is real:

| Source | What it can evidence |
|---|---|
| Recording or screen capture | Sequence, approximate timing, easing feel, pointer feedback |
| Figma prototype | Declared transitions, durations, easing and interaction settings |
| Live page | Observed interaction, computed styles, scroll behaviour, frame captures |
| Written specification | Explicit intent, not observed behaviour |
| Static image or design board | Nothing about timing, easing or triggers |

For a recording, note the frame rate and measure at least three repetitions before
calling a duration `measured`. Compression can hide stutter and change perceived
easing. A value read by feel is at most `estimated`.

## Selection

Show a small motion board, not a lecture on easing curves. Group by the job the
motion does:

- **Enter and reveal**: how content arrives.
- **Scroll**: reveal, parallax, pinned sequence, progress.
- **Text**: split, mask, type-on, scramble.
- **SVG**: line drawing, morph, motion path.
- **Interaction**: hover, press, drag, menu, modal, selection.
- **Layout**: reorder, expand, shared-element transition.
- **Feedback**: loading, success, error, status change.
- **Stillness**: intentional no-motion areas.

Ask: "Which of these behaviours do you want, and where?" Record the choice with a
quality label, the source, the purpose and the confidence. Reuse the
`selection-board.json` shape or a short Markdown table; do not build a second
questionnaire.

Do not repeat a motion question that the taste profile already answers. If the
project changes, say what is recorded and ask whether it still holds.

## Approval

Motion has its own approval gate:

- [ ] The motion direction is written in the user's language.
- [ ] Each chosen behaviour has a purpose and a placement.
- [ ] Stillness is an explicit decision, not an omission.
- [ ] Static references contributed no invented motion.
- [ ] Reduced-motion alternatives are described.
- [ ] Performance and cleanup risks are named.
- [ ] The user approved the motion direction, separately from the visual one.
- [ ] The approval is recorded with a version and date.

A build that adds motion without this record is a violation.

## Motion direction record

```json
{
  "version": "m1",
  "status": "approved",
  "concept": "restrained editorial: one section reveal, no parallax",
  "approvedBy": "user",
  "date": "YYYY-MM-DD",
  "behaviours": [
    {
      "id": "motion-01",
      "job": "section reveal",
      "source": "ref-03 recording",
      "purpose": "orient the reader at section boundaries",
      "where": "project index and case-study sections",
      "confidence": "measured"
    }
  ],
  "intentionallyStill": ["navigation", "data table", "form controls"],
  "reducedMotion": "content visible immediately; no transform or opacity entrance",
  "open": []
}
```

## Relationship to the motion spec

The direction says **what** and **why**. The motion spec says **how**: exact
triggers, timing, easing, movement, scroll and pointer behaviour, mobile
behaviour, reduced-motion branch, performance and cleanup. See
[`README.md`](README.md) and [`_templates/motion-spec.md`](../../_templates/motion-spec.md).
