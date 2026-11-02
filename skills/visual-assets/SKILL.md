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
- What subject matter is needed?
- What aspect ratio and resolution?
- What style (photography, illustration, vector)?
- Where will it be used (hero image, card thumbnail, avatar)?

### 2. Search public image sources

Search in this order:

| Source | API available | Attribution required | Commercial use |
|--------|--------------|---------------------|----------------|
| **Pexels** | Yes (free API key) | Recommended (link + credit) | Yes |
| **Unsplash** | Yes (free API key) | Required via API terms | Yes |
| **Pixabay** | Yes (free API key) | Not required, recommended | Yes |

### 3. Verify each asset

For every image selected:

- [ ] **Licence** — confirm it allows the intended use.
- [ ] **Attribution** — note what attribution is required and include it.
- [ ] **No AI generation** — prefer authentic photography and real
  illustrations. Do not use AI-generated stock photos.
- [ ] **Quality** — sufficient resolution, good composition, not watermarked.

### 4. Handle missing assets gracefully

When suitable authentic assets cannot be found:
- **Prefer a clean layout** without the image over an artificial replacement.
- Use a well-designed empty state or minimal placeholder.
- Do not generate AI photographs to fill the gap.
- Document that a real asset is still needed.

## API access notes

All three services require API keys for programmatic access. These keys:
- Are free to obtain with rate limits (Pexels ~200/hr, others similar).
- Must be provided by the user or project configuration.
- Must never be hardcoded or committed to version control.

If no API key is configured, use web search to find suitable images on
these platforms and provide direct URLs.

## Restrictions

- **No AI-generated photographs** for decorative purposes.
- **No bulk scraping** or dataset compilation (violates all three platforms'
  terms).
- **Respect rate limits** and caching requirements (Pixabay requires 24hr
  caching).
