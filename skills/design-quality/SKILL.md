---
name: kumite-design-quality
description: >-
  Enforce visual quality standards and design consistency in frontend
  implementations. Prevents common agent anti-patterns: fake status bars,
  invented metrics, unnecessary decorative elements, random visual noise.
  Use when reviewing or implementing any frontend interface to verify
  design quality and intentionality.
---

# Design Quality Enforcement

Verify that every visual element serves a purpose and meets design standards.

## When to use

- Implementing any frontend interface.
- Reviewing generated frontend code for quality.
- The user asks for a design review or quality check.

## Visual quality checklist

### Must NOT introduce

- [ ] **Fake system status bars** — no mock battery, signal, time overlays
  unless building a device preview tool.
- [ ] **Invented operational indicators** — no fake uptime percentages,
  server status dots, or monitoring dashboards with fabricated data.
- [ ] **Unnecessary decorative 3D objects** — no floating spheres, abstract
  blobs, or generic 3D decorations without design purpose.
- [ ] **Random gradients and glows** — no gradient backgrounds, glowing
  effects, or animated particles added for visual flair without design intent.
- [ ] **AI-generated decorative images** — no generated photographs or
  illustrations used as filler.

### Allowed exceptions

- Real application status indicators connected to actual data.
- 3D assets that serve a genuine functional or branding purpose.
- Gradients and animations specified by a design system.
- Loading states, skeleton screens and genuine interaction feedback.

## Design fidelity verification

When implementing from a design reference:

1. **Typography** — Verify font family, size, weight and line-height match
   the design system. Do not approximate.
2. **Spacing** — Use the design system's spacing scale. Do not use arbitrary
   pixel values.
3. **Colours** — Use design tokens or CSS custom properties. Do not hardcode
   hex values that approximate the design.
4. **Component variants** — Use the correct variant (primary, secondary, ghost)
   as specified. Do not default everything to primary.
5. **Responsive behaviour** — Verify the layout works at standard breakpoints.
   Do not only test at one viewport width.

## Accessibility baseline

Every implementation must meet:

- Sufficient colour contrast (WCAG 2.1 AA minimum).
- Keyboard navigability for all interactive elements.
- Semantic HTML structure (headings, landmarks, lists).
- ARIA labels for elements without visible text.
- Focus indicators that are visible.

## Verification procedure

After implementing a frontend change:

1. Review the rendered output, not just the code.
2. Check against the design quality checklist above.
3. Test at mobile, tablet and desktop breakpoints.
4. Verify keyboard navigation through interactive elements.
5. Check colour contrast on text elements.
