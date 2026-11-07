---
name: kumite-visual-assets
description: >-
  Source authentic visual assets from public image repositories (Pexels,
  Unsplash, Pixabay). Verifies licences and usage restrictions. Prefers
  authentic photography over AI-generated images. Use when a frontend project
  needs photographs, illustrations or visual content.
---

# Visual Assets

Source authentic visual assets from legitimate public repositories.

## When to use

- A frontend project needs photographs, illustrations or visual content.
- The user asks for images to use in a UI.
- Placeholder images need to be replaced with real content.

## Procedure

### 1. Understand the visual requirement

Clarify:

- subject matter;
- aspect ratio and resolution;
- style (photography, illustration, vector);
- placement (hero, card thumbnail, avatar).

### 2. Search public image sources

| Source | API available | Attribution | Commercial use |
|---|---|---|---|
| **Pexels** | Yes (free API key) | Recommended (link + credit) | Yes |
| **Unsplash** | Yes (free API key) | Required via API terms | Yes |
| **Pixabay** | Yes (free API key) | Not required, recommended | Yes |

### 3. Verify each asset

- [ ] **Licence** — allows the intended use.
- [ ] **Attribution** — note what is required and include it.
- [ ] **No AI generation** — prefer authentic photography and real
  illustrations.
- [ ] **Quality** — sufficient resolution, good composition, no watermark.

Record the source URL, photographer, licence and download date in the project's
`assets/CREDITS.md`.

### 4. Handle missing assets gracefully

When suitable authentic assets cannot be found:

- prefer a clean layout without the image over an artificial replacement;
- use a well-designed empty state or minimal placeholder;
- do not generate AI photographs to fill the gap;
- document that a real asset is still needed.

## Image composition requirements

Subject matter alone does not qualify an image. Before searching, obtain the
composition requirements from the pipeline's reference record or implementation
spec, and record them for every image:

| Requirement | Why it matters |
|---|---|
| Role | Determines crop tolerance, resolution and whether the image is replaceable |
| Focal point | Must stay in frame at every viewport |
| Text-safe area | The region that must stay visually quiet for overlaid text |
| Aspect ratio | Per viewport, not only desktop |
| Crop bounds | What may be cropped without losing the subject |
| Resolution | Sufficient for the largest rendered size, including high-DPI |
| Lighting and contrast | Text over the image must reach accessible contrast |
| `object-fit` / `object-position` | Prevents distortion and keeps the focal point |
| Responsive crop | A separate composition per evidenced breakpoint |

**Reject a subject-correct but composition-incompatible image.** If the focal
point sits where the heading must go, or the crop cannot survive mobile, search
for a better authentic image. Never substitute an AI-generated photograph.

After integration, verify on the rendered page:

- [ ] coverage is correct at every viewport; no gaps, stretching or upscaling;
- [ ] the focal point is still visible and correctly positioned;
- [ ] the crop matches the reference composition;
- [ ] text over the image meets contrast requirements, with the overlay applied
  only where needed.

The full method — seven image roles, composition-before-styling questions,
layered overlay structure and nine-point QA — is in
[`_shared/references/image-composition-intelligence.md`](../../../_shared/references/image-composition-intelligence.md).

## API access notes

All three services require API keys for programmatic access. These keys:

- are free with rate limits (Pexels ~200/hr, others similar);
- must be provided by the user or project configuration;
- must never be hardcoded or committed.

If no API key is configured, use web search to find suitable images on these
platforms and provide direct URLs, then verify them.

## Restrictions

- **No AI-generated photographs** for decorative purposes.
- **No bulk scraping** or dataset compilation.
- **Respect rate limits** and caching requirements (Pixabay requires 24 hr
  caching).
