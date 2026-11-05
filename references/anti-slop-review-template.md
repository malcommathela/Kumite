# Anti-Slop Review Template

Copy this file into the project under review, complete every field, then run the
checker. A review is only valid when all 20 indicators are declared, either as
detected or explicitly not detected.

## Review header

| Field | Value |
| --- | --- |
| Subject | `<page, screen or component>` |
| Reference | `<path to screenshots, Design Memory Map or node ids>` |
| Reference evidence available | `true` / `false` |
| Viewports compared | `<e.g. 390, 768, 1440 CSS px>` |
| Reviewer | `<agent or person>` |
| Date | `<YYYY-MM-DD>` |

## Review table

| Indicator | Detected pattern | Evidence in reference | Justified | Required action |
| --- | --- | --- | --- | --- |
| AS-01 Tags and pills | `<pattern or "Not detected">` | `<quote, measurement, region, node, token or requirement>` | `<Yes/No>` | `<remove/replace/justify/keep>` |
| AS-02 Excessive italics | | | | |
| AS-03 Instrument Serif or unjustified fashionable typography choices | | | | |
| AS-04 Negative kerning | | | | |
| AS-05 Over-the-top detailed UI | | | | |
| AS-06 Excessive dividers | | | | |
| AS-07 Unnecessary colour shades and opacity variations | | | | |
| AS-08 Unnecessary bordered containers | | | | |
| AS-09 Overly detailed diagrams | | | | |
| AS-10 Verbose and redundant text | | | | |
| AS-11 Unnecessary code breadcrumbs | | | | |
| AS-12 Arbitrary section numbering | | | | |
| AS-13 Unrequested eyebrows | | | | |
| AS-14 Dithering | | | | |
| AS-15 ASCII images | | | | |
| AS-16 Unnecessary squircles | | | | |
| AS-17 Excessive monospace typography | | | | |
| AS-18 Unnecessary ALL-CAPS subtitles | | | | |
| AS-19 Unrequested gradient backgrounds | | | | |
| AS-20 Unnecessary periods in titles | | | | |

## Evidence rules

- `source-supported`: quote, measurement, viewport and region, or node id in
  `referenceEvidence`. The review must set `referenceEvidenceAvailable: true`.
- `design-system-supported`: name the token, component or variant in
  `designSystemReference`.
- `functional-requirement`: cite the requirement in `requirementReference`.
- `unsupported`: no evidence. Remove or replace the addition.
- Any non-unsupported classification also needs a written `justification` and
  `justified: true`.

## JSON skeleton

Every indicator must be present. Replace the defaults for detected indicators;
leave the rest as explicit not-detected rows. The optional evidence fields are
only needed for their matching classification.

```json
{
  "schemaVersion": "1.0.0",
  "subject": "Example page",
  "referenceEvidenceAvailable": true,
  "indicators": [
    { "id": "AS-01", "detected": false, "pattern": "", "classification": "unsupported", "justification": "", "referenceEvidence": [], "justified": false, "action": "keep", "note": "Not detected." },
    { "id": "AS-02", "detected": false, "pattern": "", "classification": "unsupported", "justification": "", "referenceEvidence": [], "justified": false, "action": "keep", "note": "Not detected." },
    { "id": "AS-03", "detected": false, "pattern": "", "classification": "unsupported", "justification": "", "referenceEvidence": [], "justified": false, "action": "keep", "note": "Not detected." },
    { "id": "AS-04", "detected": false, "pattern": "", "classification": "unsupported", "justification": "", "referenceEvidence": [], "justified": false, "action": "keep", "note": "Not detected." },
    { "id": "AS-05", "detected": false, "pattern": "", "classification": "unsupported", "justification": "", "referenceEvidence": [], "justified": false, "action": "keep", "note": "Not detected." },
    { "id": "AS-06", "detected": false, "pattern": "", "classification": "unsupported", "justification": "", "referenceEvidence": [], "justified": false, "action": "keep", "note": "Not detected." },
    { "id": "AS-07", "detected": false, "pattern": "", "classification": "unsupported", "justification": "", "referenceEvidence": [], "justified": false, "action": "keep", "note": "Not detected." },
    { "id": "AS-08", "detected": false, "pattern": "", "classification": "unsupported", "justification": "", "referenceEvidence": [], "justified": false, "action": "keep", "note": "Not detected." },
    { "id": "AS-09", "detected": false, "pattern": "", "classification": "unsupported", "justification": "", "referenceEvidence": [], "justified": false, "action": "keep", "note": "Not detected." },
    { "id": "AS-10", "detected": false, "pattern": "", "classification": "unsupported", "justification": "", "referenceEvidence": [], "justified": false, "action": "keep", "note": "Not detected." },
    { "id": "AS-11", "detected": false, "pattern": "", "classification": "unsupported", "justification": "", "referenceEvidence": [], "justified": false, "action": "keep", "note": "Not detected." },
    { "id": "AS-12", "detected": false, "pattern": "", "classification": "unsupported", "justification": "", "referenceEvidence": [], "justified": false, "action": "keep", "note": "Not detected." },
    { "id": "AS-13", "detected": false, "pattern": "", "classification": "unsupported", "justification": "", "referenceEvidence": [], "justified": false, "action": "keep", "note": "Not detected." },
    { "id": "AS-14", "detected": false, "pattern": "", "classification": "unsupported", "justification": "", "referenceEvidence": [], "justified": false, "action": "keep", "note": "Not detected." },
    { "id": "AS-15", "detected": false, "pattern": "", "classification": "unsupported", "justification": "", "referenceEvidence": [], "justified": false, "action": "keep", "note": "Not detected." },
    { "id": "AS-16", "detected": false, "pattern": "", "classification": "unsupported", "justification": "", "referenceEvidence": [], "justified": false, "action": "keep", "note": "Not detected." },
    { "id": "AS-17", "detected": false, "pattern": "", "classification": "unsupported", "justification": "", "referenceEvidence": [], "justified": false, "action": "keep", "note": "Not detected." },
    { "id": "AS-18", "detected": false, "pattern": "", "classification": "unsupported", "justification": "", "referenceEvidence": [], "justified": false, "action": "keep", "note": "Not detected." },
    { "id": "AS-19", "detected": false, "pattern": "", "classification": "unsupported", "justification": "", "referenceEvidence": [], "justified": false, "action": "keep", "note": "Not detected." },
    { "id": "AS-20", "detected": false, "pattern": "", "classification": "unsupported", "justification": "", "referenceEvidence": [], "justified": false, "action": "keep", "note": "Not detected." }
  ],
  "verdict": "pass"
}
```

## Completed row examples

```json
{
  "id": "AS-19",
  "detected": true,
  "pattern": "hero text-protection scrim",
  "classification": "source-supported",
  "justification": "The reference darkens the lower hero photograph so the headline keeps contrast.",
  "referenceEvidence": [
    "hero capture (1440px) - hero: rgb(0 0 0 / 0.55) fading to transparent behind the headline"
  ],
  "justified": true,
  "action": "keep",
  "note": "Measured from the reference, not chosen for atmosphere."
}
```

```json
{
  "id": "AS-19",
  "detected": true,
  "pattern": "radial gradient glow behind the hero",
  "classification": "unsupported",
  "justification": "",
  "referenceEvidence": [],
  "justified": false,
  "action": "remove",
  "note": "No gradient is present in the reference or the design system."
}
```

## Run the checker

```sh
node scripts/anti-slop-check.mjs path/to/review.json
node scripts/anti-slop-check.mjs path/to/review.json --json
```

Exit code `0` means pass. Exit code `1` means at least one violation. Fix the
implementation or the evidence, never the verdict.
