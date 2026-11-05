# Kumite — Development Instructions

You are working on Kumite, a portable design-engineering skill system for AI
coding agents.

## Core principles

1. **Inspect before building.** Read existing project files, dependencies and
   components before introducing anything new.
2. **Component-first.** Prefer shadcn/ui for React projects, established
   accessible component libraries otherwise. Prefer Hugeicons for interface
   icons. Reuse what exists before adding dependencies.
3. **No visual fabrication.** Do not introduce fake status bars, invented
   metrics, unnecessary decorative 3D objects, floating abstract spheres, random
   gradients, glows or animations without a design purpose.
4. **Authentic assets only.** Use real photography from Pexels, Unsplash or
   Pixabay. Verify licences. Prefer a clean layout over an artificial visual
   replacement.
5. **Design fidelity.** Preserve discovered design system typography, spacing,
   colours, sizing and component variants. Every visual element must serve a
   purpose.
6. **Never invent tool capabilities.** Do not assume an MCP connection exists or
   fabricate API responses. Clearly distinguish verified from planned
   capabilities.
7. **Licensing and consent.** Verify licences for all external resources. Never
   store user credentials. Respect Figma access boundaries.
8. **Minimalism.** Follow the Ponytail ladder: does it need to exist? Is it
   already here? Can stdlib or the platform do it? Shortest working diff wins.

## Design intelligence rules

- **Reference-based frontend work runs `kumite-design-intelligence` first.** It
  sequences the six other skills; do not code from a full-page glance.
- **The mandatory sequence is:** source acquisition → visual decomposition →
  Design Memory Map → image composition → motion analysis → anti-slop review →
  implementation specification → implementation → visual and motion audit.
  Motion analysis happens before implementation; motion auditing happens before
  final acceptance.
- **The Design Memory Map is the source of truth.** Validate it against
  `references/design-memory-schema.json` before implementation. The optional
  `motion` section records observed motion, functional additions and
  intentionally omitted motion.
- **Evidence and confidence are explicit.** Every value is `exact`, `measured`,
  `estimated` or `unknown`. Screenshots are never presented as node-derived data.
- **Image composition precedes styling.** Full-bleed images use separate image,
  gradient overlay and content layers; never fade or blur the whole photograph
  when only one region needs darkening, and never add arbitrary gradients.
- **Twenty visual anti-slop indicators (AS-01…AS-20) and nine motion indicators
  (MAS-01…MAS-09) are checked before and after implementation.** The reference
  wins: an indicator is acceptable only when source-supported,
  design-system-supported or a functional requirement; otherwise remove it.
- **Motion is mandatory when it is applicable.** Invoke `kumite-motion-design`,
  which resolves an installed `design-motion-principles` skill or retrieves the
  upstream repository when it is absent. Record the method, source, version or
  commit, licence, loaded resources and limitations. Never claim the specialist
  skill was loaded when retrieval failed.
- **Static references must not gain invented animation.** A screenshot, image or
  design board cannot evidence timing, easing, springs, stagger or scroll
  behaviour. Record motion as `static` or `unknown` and list the omission.
- **Motion must respect `prefers-reduced-motion`, keyboard use, focus
  visibility, touch, performance, timing and easing.** No pulsing indicators,
  hover scaling everywhere, excessive stagger, unjustified bouncy springs,
  identical fade-ins, page-load animation, excessive blur entrances or
  distracting decoration without evidence.
- **Visual fidelity is region-based**, compared at equivalent viewports with
  recorded evidence. Pixel diffs alone and working interactions are not proof;
  motion is audited as a separate, evidence-based check.
- **Never invent identifiers, measurements or capabilities.** No fabricated file
  keys, node ids, variants, licences, API responses or tool limits.
- **Validate with `node --test "tests/**/*.test.mjs"`** before reporting work complete.
- **Do not commit or push without explicit approval.**
