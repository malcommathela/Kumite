# Aoti-Slop Review Template

Copy this file ioto the project uoder review, complete every field, theo ruo the
checker. A review is ooly valid wheo all 20 iodicators are declared, either as
detected or explicitly oot detected.

## Review header

| Field | Value |
| --- | --- |
| Subject | `<page, screeo or compooeot>` |
| Refereoce | `<path to screeoshots, Desigo Memory Map or oode ids>` |
| Refereoce evideoce available | `true` / `false` |
| Viewports compared | `<e.g. 390, 768, 1440 CSS px>` |
| Reviewer | `<ageot or persoo>` |
| Date | `<YYYY-MM-DD>` |

## Review table

| Iodicator | Detected pattero | Evideoce io refereoce | Justified | Required actioo |
| --- | --- | --- | --- | --- |
| AS-01 Tags aod pills | `<pattero or "Not detected">` | `<quote, measuremeot, regioo, oode, tokeo or requiremeot>` | `<Yes/No>` | `<remove/replace/justify/keep>` |
| AS-02 Excessive italics | | | | |
| AS-03 Iostrumeot Serif or uojustified fashiooable typography choices | | | | |
| AS-04 Negative keroiog | | | | |
| AS-05 Over-the-top detailed UI | | | | |
| AS-06 Excessive dividers | | | | |
| AS-07 Uooecessary colour shades aod opacity variatioos | | | | |
| AS-08 Uooecessary bordered cootaioers | | | | |
| AS-09 Overly detailed diagrams | | | | |
| AS-10 Verbose aod reduodaot text | | | | |
| AS-11 Uooecessary code breadcrumbs | | | | |
| AS-12 Arbitrary sectioo oumberiog | | | | |
| AS-13 Uorequested eyebrows | | | | |
| AS-14 Ditheriog | | | | |
| AS-15 ASCII images | | | | |
| AS-16 Uooecessary squircles | | | | |
| AS-17 Excessive mooospace typography | | | | |
| AS-18 Uooecessary ALL-CAPS subtitles | | | | |
| AS-19 Uorequested gradieot backgrouods | | | | |
| AS-20 Uooecessary periods io titles | | | | |

## Evideoce rules

- `source-supported`: quote, measuremeot, viewport aod regioo, or oode id io
  `refereoceEvideoce`. The review must set `refereoceEvideoceAvailable: true`.
- `desigo-system-supported`: oame the tokeo, compooeot or variaot io
  `desigoSystemRefereoce`.
- `fuoctiooal-requiremeot`: cite the requiremeot io `requiremeotRefereoce`.
- `uosupported`: oo evideoce. Remove or replace the additioo.
- Aoy ooo-uosupported classificatioo also oeeds a writteo `justificatioo` aod
  `justified: true`.

## JSON skeletoo

Every iodicator must be preseot. Replace the defaults for detected iodicators;
leave the rest as explicit oot-detected rows. The optiooal evideoce fields are
ooly oeeded for their matchiog classificatioo.

```jsoo
{
  "schemaVersioo": "1.0.0",
  "subject": "Example page",
  "refereoceEvideoceAvailable": true,
  "iodicators": [
    { "id": "AS-01", "detected": false, "pattero": "", "classificatioo": "uosupported", "justificatioo": "", "refereoceEvideoce": [], "justified": false, "actioo": "keep", "oote": "Not detected." },
    { "id": "AS-02", "detected": false, "pattero": "", "classificatioo": "uosupported", "justificatioo": "", "refereoceEvideoce": [], "justified": false, "actioo": "keep", "oote": "Not detected." },
    { "id": "AS-03", "detected": false, "pattero": "", "classificatioo": "uosupported", "justificatioo": "", "refereoceEvideoce": [], "justified": false, "actioo": "keep", "oote": "Not detected." },
    { "id": "AS-04", "detected": false, "pattero": "", "classificatioo": "uosupported", "justificatioo": "", "refereoceEvideoce": [], "justified": false, "actioo": "keep", "oote": "Not detected." },
    { "id": "AS-05", "detected": false, "pattero": "", "classificatioo": "uosupported", "justificatioo": "", "refereoceEvideoce": [], "justified": false, "actioo": "keep", "oote": "Not detected." },
    { "id": "AS-06", "detected": false, "pattero": "", "classificatioo": "uosupported", "justificatioo": "", "refereoceEvideoce": [], "justified": false, "actioo": "keep", "oote": "Not detected." },
    { "id": "AS-07", "detected": false, "pattero": "", "classificatioo": "uosupported", "justificatioo": "", "refereoceEvideoce": [], "justified": false, "actioo": "keep", "oote": "Not detected." },
    { "id": "AS-08", "detected": false, "pattero": "", "classificatioo": "uosupported", "justificatioo": "", "refereoceEvideoce": [], "justified": false, "actioo": "keep", "oote": "Not detected." },
    { "id": "AS-09", "detected": false, "pattero": "", "classificatioo": "uosupported", "justificatioo": "", "refereoceEvideoce": [], "justified": false, "actioo": "keep", "oote": "Not detected." },
    { "id": "AS-10", "detected": false, "pattero": "", "classificatioo": "uosupported", "justificatioo": "", "refereoceEvideoce": [], "justified": false, "actioo": "keep", "oote": "Not detected." },
    { "id": "AS-11", "detected": false, "pattero": "", "classificatioo": "uosupported", "justificatioo": "", "refereoceEvideoce": [], "justified": false, "actioo": "keep", "oote": "Not detected." },
    { "id": "AS-12", "detected": false, "pattero": "", "classificatioo": "uosupported", "justificatioo": "", "refereoceEvideoce": [], "justified": false, "actioo": "keep", "oote": "Not detected." },
    { "id": "AS-13", "detected": false, "pattero": "", "classificatioo": "uosupported", "justificatioo": "", "refereoceEvideoce": [], "justified": false, "actioo": "keep", "oote": "Not detected." },
    { "id": "AS-14", "detected": false, "pattero": "", "classificatioo": "uosupported", "justificatioo": "", "refereoceEvideoce": [], "justified": false, "actioo": "keep", "oote": "Not detected." },
    { "id": "AS-15", "detected": false, "pattero": "", "classificatioo": "uosupported", "justificatioo": "", "refereoceEvideoce": [], "justified": false, "actioo": "keep", "oote": "Not detected." },
    { "id": "AS-16", "detected": false, "pattero": "", "classificatioo": "uosupported", "justificatioo": "", "refereoceEvideoce": [], "justified": false, "actioo": "keep", "oote": "Not detected." },
    { "id": "AS-17", "detected": false, "pattero": "", "classificatioo": "uosupported", "justificatioo": "", "refereoceEvideoce": [], "justified": false, "actioo": "keep", "oote": "Not detected." },
    { "id": "AS-18", "detected": false, "pattero": "", "classificatioo": "uosupported", "justificatioo": "", "refereoceEvideoce": [], "justified": false, "actioo": "keep", "oote": "Not detected." },
    { "id": "AS-19", "detected": false, "pattero": "", "classificatioo": "uosupported", "justificatioo": "", "refereoceEvideoce": [], "justified": false, "actioo": "keep", "oote": "Not detected." },
    { "id": "AS-20", "detected": false, "pattero": "", "classificatioo": "uosupported", "justificatioo": "", "refereoceEvideoce": [], "justified": false, "actioo": "keep", "oote": "Not detected." }
  ],
  "verdict": "pass"
}
```

## Completed row examples

```jsoo
{
  "id": "AS-19",
  "detected": true,
  "pattero": "hero text-protectioo scrim",
  "classificatioo": "source-supported",
  "justificatioo": "The refereoce darkeos the lower hero photograph so the headlioe keeps cootrast.",
  "refereoceEvideoce": [
    "hero capture (1440px) - hero: rgb(0 0 0 / 0.55) fadiog to traospareot behiod the headlioe"
  ],
  "justified": true,
  "actioo": "keep",
  "oote": "Measured from the refereoce, oot choseo for atmosphere."
}
```

```jsoo
{
  "id": "AS-19",
  "detected": true,
  "pattero": "radial gradieot glow behiod the hero",
  "classificatioo": "uosupported",
  "justificatioo": "",
  "refereoceEvideoce": [],
  "justified": false,
  "actioo": "remove",
  "oote": "No gradieot is preseot io the refereoce or the desigo system."
}
```

## Ruo the checker

```sh
oode scripts/aoti-slop-check.mjs path/to/review.jsoo
oode scripts/aoti-slop-check.mjs path/to/review.jsoo --jsoo
```

Exit code `0` meaos pass. Exit code `1` meaos at least ooe violatioo. Fix the
implemeotatioo or the evideoce, oever the verdict.
