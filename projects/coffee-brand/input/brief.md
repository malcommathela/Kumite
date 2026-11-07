# Brief — Hollow Pine Coffee

## Request

Design and build one polished single-page site for a small specialty coffee
roaster. The page must sell beans and communicate craft without corporate SaaS
language. This is the validation build for the Content Experience pipeline.

## Audience

People who already buy specialty coffee and are deciding whether this roaster is
worth a subscription. They know what a washed lot is. They distrust copy that
sounds like a growth team wrote it.

## Page job

Make the roasts legible, make the roasting point of view believable, and get one
click towards a bag.

## One primary action

**Shop the roasts** — scroll to the three-roast section. The secondary action is
**How we roast**, which scrolls to the craft section.

## Section order

1. Header: wordmark, three links, bag count.
2. Hero: split composition — statement, supporting line, two actions, one
   portrait photograph.
3. Roast strip: three products with name, origin, tasting notes, price, weight.
4. Craft: photograph plus the roasting position.
5. Roast-day band: full-bleed photograph with one statement.
6. Origin: photograph plus the sourcing position.
7. Method: three numbered brew steps.
8. Close: subscription invitation with the one primary action repeated.
9. Footer: navigation, contact, credits, fine print.

## Real content per section

| Section | Content | Source |
|---|---|---|
| Header | Brand name, section labels | This brief (fictional brand) |
| Hero | Headline, supporting line | Written for this brief |
| Roasts | Three invented products with tasting notes and prices | This brief; product data is fictional and labelled as such in the project README |
| Craft | Roasting position, no numbers | Written for this brief |
| Roast day | One statement about the weekly schedule | Written for this brief |
| Origin | Sourcing position, no named farm, no certification claim | Written for this brief |
| Method | Three generic brew steps (dose, bloom, pour) | General brewing practice, no proprietary claim |
| Close | Subscription invitation, cancellation line | Written for this brief |
| Footer | Navigation, contact placeholder, credits | This brief |

Photography: six Pexels photographs, free licence, credited in
`site/assets/CREDITS.md`. They show generic coffee scenes, not this brand's
products, farm or roastery.

## Constraints

- Single page, static HTML/CSS/JS. No framework, no build step, no backend.
- GSAP from the official CDN. Lenis only if the page benefits; decide in motion.
- The bag is local interface state only. It must not imply a real checkout.
- Fictional brand. No testimonials, awards, certifications, statistics, customer
  counts, ratings or named farms.
- Warm, editorial, photographic, calm but confident.
- Must hold at 390, 768 and 1440 CSS px, honour `prefers-reduced-motion`, and
  keep keyboard focus visible.

## Explicitly unknown

- Whether any real roaster would use this name or these prices.
- Real product availability, shipping terms, VAT treatment and returns policy.
- A real address, phone number or email inbox.
- Real farm relationships and certification status.

None of these are invented to fill a layout. The contact block says the inbox is
a placeholder; the fine print says the shop is a demonstration.
