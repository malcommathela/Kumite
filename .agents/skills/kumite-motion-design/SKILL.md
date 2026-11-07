---
name: kumite-motion-design
description: >-
  Mandatory motion-design layer for reference-based frontend work. Resolves a
  specialist motion skill already installed in the agent environment, or
  retrieves the upstream design-motion-principles skill from GitHub when it is
  absent. Runs Create mode to design purposeful interaction motion and Audit
  mode to inspect existing motion for missing feedback, excess, accessibility
  and performance problems. Routes implementation detail to the official GSAP
  skills and optional Lenis. Use before implementing any interaction, transition,
  hover, focus, loading, scroll-driven or entrance/exit motion, and before
  accepting a motion-bearing interface.
---

# Motion Design Intelligence

Motion is part of the design reference, not decorative garnish added after the
layout is built. This skill makes motion analysis mandatory, resolves the
specialist motion skill that supplies the craft knowledge, and keeps the result
grounded in evidence.

This skill **coordinates**; it does not reimplement the specialist skill. The
installed `design-motion-principles` skill, or its upstream GitHub source,
remains the authority for motion recipes, designer-specific judgement and audit
reporting. The official GSAP skills under `.agents/skills/gsap-*` are the API
authority for implementation.

## When this skill is mandatory

Run it whenever any of the following is true:

- The reference shows a transition, hover, focus, press, loading, reveal,
  scroll-linked or entrance/exit state.
- The implementation will add motion to a component or page.
- The task asks to make an interface "feel" faster, smoother, more polished or
  more alive.
- An existing interface with motion must be reviewed before acceptance.
- The motion spec exists, even when it says motion is absent or unknown.

## Source of truth and static references

The pipeline's reference record and `motion-spec.md` are the source of truth. If
the reference is a static screenshot, image, design board or archived page, it
**cannot evidence timing, easing, springs, stagger or scroll behaviour**. Record
motion as `unknown` or `static`, list what is intentionally omitted, and do not
invent animation.

> A static reference does not become animated because an agent wants the page to
> feel more designed. When in doubt, do not animate.

A live page or Figma prototype may evidence motion through captured frames,
recorded interaction, computed styles, prototype settings or documentation. A
single still frame does not.

---

## Step A — Discover the installed specialist skill

Search agent skill directories for a directory named `design-motion-principles`
(case-insensitive). Check at least:

| Scope | Locations |
|---|---|
| Environment override | `$AGENT_SKILLS_DIR`, if set |
| User-level agent skills | `~/.agents/skills`, `~/.opencode/skills`, `~/.claude/skills`, `~/.config/opencode/skills`, `~/.gemini/config/skills` |
| Workspace agent skills | `.agents/skills`, `.opencode/skills`, `.claude/skills` |
| Platform-specific | any additional skill directory the host documents |

Do not assume the list is exhaustive. If the host exposes a skill registry or
list command, use it.

A candidate is usable only when it contains:

1. a readable `SKILL.md` with motion instructions; and
2. the supporting files those instructions require, at minimum
   `references/accessibility.md`, `references/motion-cookbook.md`,
   `references/audit-checklist.md` and `references/anti-checklist.md`, or
   equivalent content referenced by that `SKILL.md`.

If the directory exists but the required files are missing, treat it as
**incomplete**, record the missing resources and continue to the fallback. Do
not pretend an incomplete copy is usable.

## Step B — Use the installed skill

When a usable installed copy exists:

1. Read its `SKILL.md` in full.
2. Detect the mode (Create or Audit) using its own mode rules.
3. Read the workflow and references it requires for that mode.
4. Follow its workflow. Preserve the installed copy; do not edit, move or copy it
   into Kumite.
5. Record the resolution in `motion-spec.md` or the deliverable.

Do not paraphrase the specialist skill into this file. Load it and use it.

## Step C — GitHub fallback

When no usable installed copy exists, retrieve the actual upstream skill:

```text
https://github.com/kylezantos/design-motion-principles
```

Retrieval rules:

1. Prefer `git clone --depth 1` into a temporary or agent-managed location.
2. Record the resolved commit with `git rev-parse HEAD`.
3. Read the complete `SKILL.md`, both workflows and the references required by
   the selected mode. Retrieve instructions and resources, not a README summary.
4. Inspect the repository licence before redistributing or vendoring anything.
5. If the skill must remain available after the task, install it through the
   host agent's skill mechanism or a documented project-local skill directory.
   Do not silently vendor it into Kumite.
6. If `git` is unavailable, retrieve the same files from the repository's raw
   content or archive, and record the resolved commit or branch and the method.
7. If retrieval fails, stop the motion stage and report the failure. Never claim
   the specialist skill was loaded when it was not, and never fabricate a
   licence, version or commit.

## Step D — Record the resolution

Every run records:

```text
Resolution method: installed | github-fallback
Skill: design-motion-principles
Source: ~/.agents/skills/design-motion-principles | repository URL
Version / commit: declared version, upstream commit, or "not declared"
Licence: declared licence, or "not declared in the installed copy"
Loaded resources: SKILL.md; workflows/create.md; references/accessibility.md; ...
Limitations: missing metadata, incomplete references, unavailable network, ...
```

Keep absolute personal filesystem paths out of public documentation. In a
deliverable, use a home-relative path or the repository URL. Record the exact
local path only in the private working log or final report when needed for
reproducibility.

---

## Create mode

Run Create mode when motion is being designed or added.

1. **Resolve the specialist skill** with Steps A–D.
2. **Establish context.** Project type, interaction frequency, audience,
   existing motion conventions and the stack. Let the specialist skill propose
   its designer weighting; confirm it when the host provides a question tool.
3. **Load the evidence.** Read the reference record and the motion spec. Separate
   observed motion, source-supported motion, functional additions and
   intentionally omitted motion. Carry every `unknown` forward.
4. **Apply the frequency gate.** Rare or celebratory interactions may be
   expressive. Daily interactions should be subtle and fast. High-frequency and
   keyboard-initiated interactions should not animate at all unless the motion
   is the feedback itself.
5. **Specify before coding.** For each animated element record: trigger,
   interaction states, duration, delay, easing, spring parameters, stagger,
   enter and exit, scroll behaviour, hover and focus treatment, loading and
   feedback, responsive differences, reduced-motion alternative and performance
   considerations.
6. **Choose the implementation.** Reuse the project's motion tokens, components
   and libraries. If the project has no motion library, use GSAP and load only
   the official skill the task needs. Add Lenis only when the page benefits from
   smoothed scrolling and the spec says so.
7. **Ship reduced motion in the same change.** `prefers-reduced-motion` is not a
   follow-up task. Remove or replace non-essential motion; never leave content
   invisible because an entrance was disabled.
8. **Verify.** Check the rendered interaction, focus visibility, keyboard use,
   touch targets, timing, interruption behaviour and frame cost.

## Audit mode

Run Audit mode when existing motion must be reviewed.

1. **Resolve the specialist skill** with Steps A–D.
2. **Reconnoiter the project.** Read project instructions, dependencies,
   existing transitions and animation libraries. Identify the project context
   before applying any duration or style rule.
3. **Read the audit resources** required by the specialist skill: audit
   checklist, anti-checklist, accessibility, performance and output format.
4. **Inventory motion.** Record every animation, transition, spring and
   scroll-linked effect. Then search for motion gaps: state changes, conditional
   renders, modals, toasts, expandable regions, loading swaps and mode switches
   that happen without feedback.
5. **Test the hard requirements.** `prefers-reduced-motion` coverage, keyboard
   interactions, visible focus, touch behaviour, interruption, timing, easing
   and animated properties.
6. **Apply the motion anti-slop policy** below. Flag patterns by frequency and
   uniformity, not by a single intentional use.
7. **Report findings** with severity, evidence, affected element and required
   correction. Use the specialist skill's output format. Do not accept the
   interface until blocking findings are fixed and re-checked.

---

## GSAP routing

The eight official GSAP skills are vendored verbatim in `.agents/skills/`. Load
the one that matches the task; do not load all eight.

| Need | Skill |
|---|---|
| Tweens, easing, stagger, `matchMedia`, reduced motion | `gsap-core` |
| Sequencing, position parameter, nesting, playback | `gsap-timeline` |
| Scroll-linked animation, pinning, scrub, triggers | `gsap-scrolltrigger` |
| Plugins, Flip, Draggable, Observer, SplitText, SVG | `gsap-plugins` |
| `clamp`, `mapRange`, `snap`, `toArray`, `wrap` | `gsap-utils` |
| Transform-only animation, batching, layout thrash | `gsap-performance` |
| React, `useGSAP`, refs, cleanup | `gsap-react` |
| Vue, Svelte, lifecycle, scoped selectors | `gsap-frameworks` |

The vendored skills carry the upstream MIT licence. See
[`_shared/motion/README.md`](../../../_shared/motion/README.md) and
[`THIRD-PARTY-NOTICES.md`](../../../THIRD-PARTY-NOTICES.md).

## Lenis

Lenis is optional. Use it only when the page benefits from smoothed scrolling and
the reference or brief supports that feel. Follow the official GSAP ScrollTrigger
synchronization and keep `respectReducedMotion: true`. The full snippet and
rules are in
[`_shared/motion/README.md`](../../../_shared/motion/README.md).

---

## Motion anti-slop policy

The same evidence discipline as `kumite-design-quality` applies: motion is
acceptable only when it is **source-supported**, **design-system-supported** or a
**functional requirement**. Otherwise it is unsupported and must be removed.

| ID | Pattern to prevent | Detection signal | Required action |
|---|---|---|---|
| MAS-01 | Unnecessary pulsing indicators | Infinite pulse, glow, breathe or throb on dots, badges, status labels or CTAs | Remove unless a single brand element has written design rationale |
| MAS-02 | Hover scaling on every element | The same `scale()` on cards, buttons, images and list rows | Remove from utility and repeated elements; keep only a deliberate, isolated affordance |
| MAS-03 | Excessive stagger animations | Stagger on every list, grid or section; long index-based delays | Remove from utility lists; keep at most one deliberate moment per view |
| MAS-04 | Unjustified bouncy springs | Spring bounce on menus, toggles, modals, dropdowns or settings | Use restrained easing for utility actions; bounce only in playful contexts with evidence |
| MAS-05 | Identical fade-ins across all sections | Same opacity and translate values repeated across four or more unrelated blocks | Remove entrance motion from static content or differentiate it only with source evidence |
| MAS-06 | Unnecessary page-load animations | Text, navigation or body content that animates only to announce itself | Remove; content should be readable immediately |
| MAS-07 | Excessive blur entrances | Uniform `filter: blur()` on many components or on reading content | Limit to one intentional focal moment; never blur body text on first paint |
| MAS-08 | Distracting decorative animation | Looping particles, gradients, float, marquee or background motion with no state or brand purpose | Remove unless source-supported and non-distracting |
| MAS-09 | Motion that harms accessibility or performance | Missing reduced-motion handling, animated layout properties, blocked input, invisible focus, jank | Fix before delivery; accessibility failures are blocking |

### Required positive checks

- `prefers-reduced-motion: reduce` removes or replaces non-essential motion in
  the same implementation.
- Keyboard-initiated actions do not animate in a way that delays the result.
- Focus indicators remain visible; motion must never hide or outrun focus.
- Touch interactions provide immediate feedback and do not depend on hover.
- Durations and easing suit the context and the specialist skill's weighting.
- Only `transform`, `opacity` and `filter` are animated for continuous motion.
- Animations are interruptible; a new state must not wait for a decorative
  entrance to finish.
- Loading and feedback motion communicates real state, not invented activity.

A single intentional use is not automatically slop. Frequency, uniformity and
lack of purpose are the tells. The reference still wins: source-supported motion
is reproduced, not removed for taste.

---

## Motion spec integration

Motion is recorded in `motion-spec.md`. The template is
[`_templates/motion-spec.md`](../../../_templates/motion-spec.md). A motion spec
records:

| Field | Captures |
|---|---|
| Resolution | Specialist method, source, commit, licence, loaded resources, limits |
| Status | `observed`, `static`, `partial` or `unknown` |
| Identity | Motion style, personality, principles and project context |
| Components | Animated element, target and trigger |
| States | State-specific transitions and feedback |
| Timing | Duration, delay, easing, spring and stagger |
| Enter / exit | Properties; exits subtler than entrances |
| Scroll | Trigger, progress mapping, pin and once behaviour |
| Hover / focus / press | Pointer and keyboard feedback |
| Loading | Loading and feedback animation |
| Responsive | Breakpoint-specific motion changes |
| Reduced motion | The alternative, in the same change |
| Performance | Animated properties and known risks |
| Source-supported | Motion actually evidenced by the source |
| Functional additions | Motion added to meet a real interaction requirement |
| Intentionally omitted | Motion deliberately not added, with the reason |
| Evidence | Confidence and source per value |

Never record a guessed duration, easing curve, spring or trigger as `exact`. A
timing inferred from a recording is `measured`; one inferred from how the motion
feels is at most `estimated`; one never observed is `unknown`.

---

## Handoffs

| Skill | Motion responsibility |
|---|---|
| `kumite-content-experience` | Runs the Content pipeline, including motion before composition is built |
| `kumite-product-experience` | Runs the Product pipeline, including state feedback |
| `kumite-design-quality` | Includes motion anti-slop and checks the motion audit verdict alongside visual fidelity |
| `kumite-component-first` | Supplies component states and variants; motion is a state treatment, not a new variant |
| `kumite-visual-assets` | Confirms whether image parallax, reveal or hover motion is source-supported and composition-safe |
| `kumite-design-discovery` / `kumite-figma-integration` | Supply prototype evidence, interaction notes and structured node state where available |
| `gsap-*` | Supply the implementation API, patterns and performance guidance |

The specialist motion skill is invoked **before** motion is created or audited.
Reading this coordination skill alone is not a substitute.

## Delivery gate

- [ ] Specialist skill resolved as installed or GitHub fallback, with provenance recorded.
- [ ] Create or Audit mode chosen and the specialist workflow followed.
- [ ] `motion-spec.md` is present and honest about `unknown` or `static` sources.
- [ ] Every animated element has a trigger, timing, easing and interaction purpose.
- [ ] Static references gained no invented motion.
- [ ] MAS-01 to MAS-09 reviewed with evidence.
- [ ] `prefers-reduced-motion` handled in the same implementation.
- [ ] Keyboard, focus and touch behaviour verified.
- [ ] Motion audit completed before final acceptance.
