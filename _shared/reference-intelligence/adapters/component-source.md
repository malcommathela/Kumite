# Component source adapter

Use this adapter when the reference is a component or a piece of source code
rather than a rendered page. It is the strongest evidence for markup, states,
dependencies and accessibility, and the weakest for visual direction.

## Inspect before adapting

1. **Identity.** Registry URL, repository, package name, author and exact version
   or commit.
2. **Licence.** Read the actual licence. A public preview is not a licence to
   copy. Record attribution requirements.
3. **Dependencies.** Framework, styling, primitives, icon set, animation library
   and peer versions. Do not add a dependency the project does not need.
4. **Implementation.** Read the real source, not the preview. Identify the
   animation technology: CSS, WAAPI, framework-native tools, an installed animation library or other. Do not
   assume every animated component uses GSAP.
5. **States and behaviour.** Default, hover, focus-visible, pressed, disabled,
   loading, error, empty. Check keyboard and ARIA.
6. **Responsive.** Read the breakpoints and container assumptions.
7. **Fit.** Map the component to the approved design system and the component
   ladder. Replace foreign tokens, fonts and motion with approved ones.

## Adaptation rules

- Prefer the project's existing component. Adapt a source only when it adds a
  real capability or a better-evidenced treatment.
- Copy behaviour and structure, not a foreign visual identity.
- Re-implement with the approved tokens; do not paste a theme.
- Keep the licence and attribution in the project's credits.
- Run the component through the accessibility and responsive baseline.
- Record what changed and why in `_templates/component-spec.md`.

## Evidence

| Source | Proves | Does not prove |
|---|---|---|
| Component source | Markup, state logic, dependencies, ARIA | Visual fit with the approved direction |
| Live preview | Rendered appearance, interaction feel | Source quality, licence, edge cases |
| Documentation | Declared API and intent | Actual implementation |

## Stop conditions

- No licence or an incompatible licence: do not copy.
- The component requires a heavy dependency for a small effect: re-implement.
- The component's motion is decorative and unsupported by the direction: omit it.
- The source is inaccessible behind a paywall: record it and use another source.
