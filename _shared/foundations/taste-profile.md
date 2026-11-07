# Taste profile

Kumite is a collaborative, taste-led design partner. It helps the user discover,
select and combine references, then turns those choices into a coherent
experience. The taste profile is the durable record of that collaboration.

## Always ask for taste

Ask before choosing a visual direction, and ask with **visual examples**, not a
long questionnaire. Show three to six concrete references or crops, ask which
qualities the user wants, and record the answer. A blank page and a list of
abstract adjectives is not a taste conversation.

Do not repeat a question that the project or global profile already answers. If
the answer is stale, say what is recorded and ask whether it changed.

## Project and global scope

| Scope | Location | Holds | Rule |
|---|---|---|---|
| Project | `<project>/taste/profile.json` | Decisions for this brief, client and audience | Always allowed; the default |
| Global | the host agent's user config, e.g. `~/.config/kumite/taste-profile.json` | Durable personal preferences, never project facts | Only with explicit consent, never overwrite silently |

A project profile may inherit global preferences, but the project wins. Never
promote a project decision to global scope without asking.

## Shape

Use [`_templates/taste-profile.json`](../../_templates/taste-profile.json) as a
starting point. The shape is deliberately small:

```json
{
  "version": 1,
  "scope": "project",
  "project": "example",
  "updated": "YYYY-MM-DD",
  "inherits": "global | none",
  "identity": {
    "adjectives": [{ "value": "quiet, editorial", "confidence": "measured", "evidence": ["taste-01"] }],
    "antiPreferences": [{ "value": "no glossy gradients", "confidence": "measured", "evidence": ["taste-02"] }]
  },
  "dimensions": {
    "composition": { "preference": "...", "strength": "must | nice", "confidence": "measured", "evidence": ["taste-01"] },
    "layout": {},
    "typography": {},
    "colour": {},
    "identity": {},
    "imagery": {},
    "components": {},
    "interaction": {},
    "motion": {},
    "responsive": {}
  },
  "questionsAnswered": [
    { "id": "q-01", "question": "Which hero density?", "answer": "full-bleed", "date": "YYYY-MM-DD" }
  ],
  "approvals": []
}
```

Every dimension uses one of the four evidence labels from
[`../references/evidence-and-confidence.md`](../references/evidence-and-confidence.md):
`exact`, `measured`, `estimated` or `unknown`. A preference the user stated is
`exact` for intent; a quality inferred from a reference is at most `measured`.

## Elicitation sequence

1. **Seed from the brief.** Use the project's goals, audience and constraints.
   Do not ask what the brief already states.
2. **Show candidates.** Present a small board from the user's links, agent
   discovery, Figma, 21st.dev or the design library. Group by the decision the
   board is helping with, not by source.
3. **Ask for qualities, not verdicts.** "Which part of this do you want?" beats
   "Do you like it?" Record composition, type, colour, imagery and motion
   separately.
4. **Allow combinations.** The user may keep the type from one reference, the
   layout from another and the motion from a third. Record each contribution.
5. **Confirm in one sentence per dimension.** "Type: high-contrast editorial
   serif with tight tracking; motion: minimal, one reveal." Ask for correction.
6. **Update the profile and the selection board together.** Do not keep taste in
   chat history only.

## Rules

- A stated preference is evidence. A guessed preference is not.
- Dislikes are as useful as likes; record them.
- Never average conflicting preferences silently. Use
  [`conflict-resolution.md`](conflict-resolution.md).
- Motion taste is separate from visual taste and is approved separately. See
  [`../motion/motion-selection.md`](../motion/motion-selection.md).
- Keep personal data out of the repository unless the project requires it.
- A profile without evidence is a wish list, not a taste profile.
