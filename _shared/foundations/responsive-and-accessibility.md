# Responsive and accessibility baseline

These checks are not a later audit. They are part of every checkpoint and every
approved direction.

## Responsive

- Record the breakpoints the evidence actually shows. Do not invent a breakpoint
  because a framework has one.
- Check the real content at each viewport, not a short placeholder. Long names,
  long emails, large numbers and empty states are part of the test.
- Name what changes: reflow, stack, hide, reorder, resize, crop, navigation
  pattern, table strategy and touch target size.
- A full-bleed image needs per-breakpoint crop and focal-point behaviour. A split
  image needs `object-position` per breakpoint.
- Test without JavaScript and without smooth scrolling; the page must remain
  readable and navigable.
- If only one viewport is evidenced, mark the others `unknown` and say so.

## Accessibility

- Semantic landmarks, headings and lists. A `div` is not a button.
- Keyboard order follows visual order. Every interactive element is reachable
  and operable.
- `:focus-visible` is visible, has enough contrast and is never removed without
  a replacement.
- Text and meaningful non-text contrast meet WCAG AA at the rendered size.
- Labels, descriptions, error messages and status changes are programmatically
  associated. Do not rely on colour or placeholder text alone.
- Touch targets are large enough and do not depend on hover.
- Motion respects `prefers-reduced-motion`; no content is hidden when an entrance
  is disabled.
- Loading, empty, error and permission states are announced where they change
  meaning.
- A custom control needs a documented reason and the full ARIA/keyboard contract.

## Reduced motion

```css
@media (prefers-reduced-motion: reduce) {
  *,
  *::before,
  *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
    scroll-behavior: auto !important;
  }
}
```

This is a floor, not the whole answer. Component-level alternatives must still
set the final state, remove parallax and pinning, and keep feedback immediate.
See [`../motion/README.md`](../motion/README.md).

## Verification

Use real captures and real interaction, not a code read. Record the viewport,
input method, browser and any assistive-technology check. A passing automated
check does not prove usability; it only removes known failure modes.
