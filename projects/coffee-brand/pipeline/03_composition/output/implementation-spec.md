# Implementation specification — Hollow Pine Coffee

Project: `projects/coffee-brand/site/`. Static HTML, CSS and ES modules. GSAP from
the official CDN. No framework, no build step, no backend.

## 1. Source and evidence

| Field | Value |
|---|---|
| Source type | screenshots (two live commerce sites, adapted) |
| Source identity | `reference/fellow-full-1440.webp`, `reference/bluebottle-full-1440.webp`, plus mobile captures |
| Access method | public Inspo archive |
| Licence | study only; captures not redistributed |
| Capture date | 2026-05-04 and 2026-05-18 |
| Evidence record | `../02_reference/output/reference-evidence.json` |

Unavailable: exact type sizes, padding, breakpoints, hover and scroll behaviour.
Those are `unknown` and replaced with stated design decisions, not guesses at the
reference.

## 2. Page structure

| # | Section | Purpose | Background | Container | Min height |
|---|---|---|---|---|---|
| 1 | `header` | Navigation and bag state | `--paper` | full, 64px bar | 64px |
| 2 | `hero` | State the position, one action | `--paper` | 1200px split | `calc(100svh - 64px)` at ≥820px, auto below |
| 3 | `roasts` | Choose a bag | `--sand` | 1200px | auto |
| 4 | `craft` | Explain the roasting position | `--paper` | 1200px split | auto |
| 5 | `roast-day` | Name the weekly rhythm | `--night` + photo | full bleed | 72vh |
| 6 | `origin` | Explain sourcing honestly | `--paper` | 1200px split | auto |
| 7 | `method` | Give a repeatable recipe | `--paper-2` | 1200px split | auto |
| 8 | `close` | Repeat the one action | `--espresso` + photo | full bleed | 62vh |
| 9 | `footer` | Navigation, contact, legal | `--night` | 1200px | auto |

## 3. Tokens

```css
--paper:#F2ECE1; --paper-2:#F7F3EA; --sand:#E6DACA;
--ink:#1B1511; --ink-2:#5B4E42;
--clay:#B04A28; --clay-2:#8A3A1F;
--espresso:#241C16; --night:#171310; --line:#D8CCBA;
--gutter:clamp(20px,5vw,64px); --container:1200px;
--step:clamp(64px,8vw,120px);
--radius:2px; --pill:999px;
```

Type, spacing and leading follow `art-direction.md`. Display tracking is
`-0.025em` on the hero, `-0.018em` on section headings and `-0.03em` on the
wordmark. The values are stated design decisions (`estimated`), applied only at
display sizes, never to body copy.

## 4. Components

### `site-header`
Sticky, paper field, 1px bottom rule that appears after 24px of scroll. Wordmark
left (Instrument Sans 600, `-0.03em`), three anchor links centre, bag button
right with a live count. Mobile: links hidden, wordmark and bag remain. The
header never covers content: `scroll-padding-top: 96px` on `html`.

### `display-headline`
Instrument Sans 500, sentence case, no terminal period, max 14ch–20ch depending
on role. Hero is three lines at 1440, four at 390.

### `ghost-cta`
Outlined pill, 1px `currentColor`, transparent fill, used only over photography
(hero is on paper, so the hero uses a solid button plus a text link). Hover:
fill at 10% white. Focus-visible: 2px clay outline, 3px offset.

### `solid-cta`
Ink block, paper text, 2px radius, 52px min height. Hover: `--clay-2` fill.
Active: translateY(1px). Used for "Shop the roasts" and "Add to bag".

### `product-card`
Sand field, 32px padding, no border. Contents: roast name (Display M), origin
line, tasting notes, roast-level bar (1–5 filled segments), price and weight,
add button. No arbitrary index numeral: the cards have no reading order, so a
number would be decoration. Hover: field moves to `--paper-2` and lifts 4px.
Focus-within: same lift plus a visible ring. The card is not a link; only the
button is interactive.

### `step-item`
Numbered 01–03, a hairline above, title and two lines of copy. No icons.

### `newsletter-form`
One labelled email field and a submit button. No backend. On submit, JS prevents
default and writes "Demo only — no list is connected." into an `aria-live` region.

### `legal-row`
Copyright, demonstration notice, credits link.

## 5. Content rules

- Product names, prices and tasting notes are fictional and declared in the
  project README.
- No testimonial, rating, award, certification, statistic, customer count or
  named farm.
- Farm names are described as printed on the bag, not invented on the page.
- The bag and newsletter are labelled demonstrations in the interface.

## 6. Images

| Slot | File | Alt | Aspect at 1440 | Aspect at 390 | Object position |
|---|---|---|---|---|---|
| Hero | `hero-pour-over.jpg` | Hand pouring water over a paper filter on an oak table | 4:5 | 4:3 | centre 55% |
| Craft | `craft-pour-over.jpg` | Water hitting coffee in a ceramic dripper | 5:4 | 4:3 | centre |
| Roast day | `roast-day.jpg` | Roasted beans falling from a drum roaster | 21:9 | 3:4 | centre 40% |
| Origin | `origin-hand.jpg` | A hand among coffee plant leaves | 3:4 | 4:3 | centre |
| Method | `method-machine.jpg` | Water dripping through a filter in a brewing machine | 4:5 | 4:3 | centre 40% |
| Close | `beans-slate.jpg` | Coffee beans scattered on a dark slate surface | 16:9 | 3:4 | centre |

Full-bleed images use three layers: `<img>` (or CSS background) → `.scrim` →
content. Scrims are `linear-gradient` only where text sits, with a measured
contrast check in the audit. No decorative gradient elsewhere.

All images are Pexels, free licence, credited in `site/assets/CREDITS.md`.

## 7. Responsive

| Breakpoint | Behaviour |
|---|---|
| ≥1024px | Splits side by side, 3-up roasts, centred nav, parallax on the band |
| 901–1023px | Splits stay side by side; roasts 3-up; footer drops to 3 columns |
| 820–900px | Splits side by side; roasts 1-up; nav still visible |
| 601–819px | Single column, image above copy, nav links hidden, band min-height 70vh, no parallax |
| ≤600px | Hero meta 1-up, footer 1-up, legal row stacked, wordmark subtitle hidden |

Breakpoints are `1023px`, `900px`, `819px` and `600px`. These are stated
decisions, not reference measurements.

## 8. Accessibility

| Requirement | Target | Verified by |
|---|---|---|
| Contrast | AA: 4.5:1 body, 3:1 large | computed contrast script in audit |
| Keyboard | Every control reachable, logical order | manual tab pass |
| Focus | 2px clay outline, 3px offset, never removed | CSS + screenshot |
| Structure | skip link, one h1, h2 per section, landmarks | DOM check |
| Names | bag button labelled with count; icon-free UI | DOM check |
| Images | descriptive alt, empty alt for the decorative scrims | DOM check |
| Reduced motion | all non-essential motion removed | media query + test |
| Touch | 24px minimum (WCAG 2.5.8), 44px preferred; measured 27–52px for controls, inline legal link exempt | CSS + audit |
| Live regions | bag count and form status announced | DOM check |

## 9. Anti-slop pre-implementation table

| Indicator | Detected | Classification | Justification |
|---|---|---|---|
| AS-01 Tags and pills | no | — | The only pill is a CTA button; the bag count conveys state, not a content chip |
| AS-02 Excessive italics | no | — | No italics except none |
| AS-03 Fashionable display serif | no | — | Grotesk display, reference-supported; serif rejected |
| AS-04 Negative kerning | yes, display only | source-supported | Both references show tight display tracking, `obs-type` |
| AS-05 Over-detailed UI | no | — | Three products, three steps |
| AS-06 Excessive dividers | no | — | Header rule, step rules, footer rule only |
| AS-07 Excess colour shades | no | — | Two dark-surface text levels (`muted`, `faint`) plus rule and border tokens |
| AS-08 Bordered containers | no | — | Cards are filled fields, no borders |
| AS-09 Detailed diagrams | no | — | None |
| AS-10 Verbose text | no | — | Copy kept to two short paragraphs per band |
| AS-11 Code breadcrumbs | no | — | None |
| AS-12 Arbitrary numbering | no | — | 01–03 are sequential brew steps, not section numbers |
| AS-13 Unrequested eyebrows | yes, four | source-supported | Section labels used by Blue Bottle, `section-label`, on four content bands |
| AS-14 Dithering | no | — | None |
| AS-15 ASCII images | no | — | None |
| AS-16 Squircles | no | — | 2px radius on buttons, 0 on cards |
| AS-17 Monospace | no | — | None |
| AS-18 ALL-CAPS subtitles | yes, labels and footer heads | source-supported | Tracked caps label system from Blue Bottle, `section-label` |
| AS-19 Gradients | yes, two scrims | source-supported | Reference records a gradient overlay on both photographic bands; used only for text protection |
| AS-20 Periods in titles | no | — | Headings carry no terminal period |

## 10. Unresolved questions

| # | Question | Impact | Resolution |
|---|---|---|---|
| 1 | Real shipping, VAT and returns copy | Footer legal only | Out of scope; the page says it is a demonstration |
| 2 | Real farm names and harvest | Origin copy | Avoided; copy says names are on the bag |
| 3 | Real product photography | Product cards | Cards are typographic; no fake packaging |
| 4 | Checkout | Bag interaction | Bag is local state only, labelled |
