# Design Intelligence demonstration — Atelier Kōhaku

End-to-end demonstration of the Kumite Design Intelligence pipeline on one
single-page site. **Atelier Kōhaku is a fictional studio.** The page is a
composition study, not a clone of the reference and not a production site.

## Reference

- Source: `https://kononenkogroup.com` (Kononenko Architectural Bureau)
- Access: screenshots + live DOM inspection only. **No Figma file or Community
  resource was used.**
- Captures: `reference/hero-1440.webp` (1440×900), `reference/full-768.webp`
  (768×10151), `reference/mobile-full.png` (375×10939)
- Region crops: `reference/crops/`

The reference captures are kept for internal design study and comparison. They
are not licensed for redistribution.

## Artefacts

| File | Purpose |
|------|---------|
| `design-memory.json` | Design Memory Map, schema 1.0.0 (7 sections, 3 components, 6 images, 9 evidence entries) |
| `implementation-spec.md` | Completed implementation specification |
| `implementation-manifest.json` | What was actually built, in the fidelity comparator's shape |
| `anti-slop-review.json` | All 20 indicators declared; 4 detected, all justified |
| `discrepancy-report.md` | Automated result + manual region comparison + deviations |
| `index.html`, `styles.css` | The built page |
| `assets/` | Six Unsplash photographs used under the Unsplash License |
| `capture/` | Final desktop, tablet and mobile screenshots and region crops |

## Run it

```sh
python -m http.server 8123 --bind 127.0.0.1
# open http://127.0.0.1:8123/
```

Serve over HTTP rather than opening the file directly so the relative image
paths and capture tooling behave consistently.

## Verify it

From the repository root:

```sh
node scripts/validate-memory.mjs examples/design-intelligence-demo/design-memory.json
node scripts/anti-slop-check.mjs examples/design-intelligence-demo/anti-slop-review.json
node scripts/fidelity-check.mjs \
  examples/design-intelligence-demo/design-memory.json \
  examples/design-intelligence-demo/implementation-manifest.json
node --test "tests/**/*.test.mjs"
```

Expected: memory map valid, anti-slop `PASS`, fidelity `PASS`, 109 tests pass.

## Honest limitations

- Statistics and client-wall sections are omitted; reproducing them would require
  invented metrics and client identities.
- The display typeface is substituted; the licenced family is `unknown`.
- Individual Unsplash photo IDs and photographers were not retained. Recover them
  before any public use.
- Touch targets are below 44px. Fix before production.
- The manual fidelity verdict is **conditional pass**; see
  `discrepancy-report.md`.
