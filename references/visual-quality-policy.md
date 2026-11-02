# Visual Quality Policy

This policy defines what is and is not acceptable in frontend implementations
produced with Kumite's guidance.

## Prohibited patterns

These patterns are common agent anti-patterns that produce superficially
impressive but fundamentally dishonest interfaces:

### Fake operational indicators
- Mock battery, signal strength, or time status bars
- Invented uptime percentages (e.g. "99.9% uptime" with no real data)
- Fabricated server status dashboards
- Fake "live" monitoring widgets with generated data

### Unnecessary decorative elements
- Floating abstract 3D spheres or blobs
- Generic 3D decorations without functional purpose
- Particle effects or animated backgrounds without design intent
- Random gradient overlays for visual complexity

### AI-generated visual content
- Generated photographs used as placeholder content
- AI illustrations used as decorative filler
- Deepfake-style avatar images

### Visual noise
- Gratuitous blur, glow or shadow effects
- Animations that serve no interaction purpose
- Excessive use of colour without design system backing
- Ornamental borders, dividers or decorative elements

## Permitted alternatives

### When real data exists
- Display actual application status from real data sources
- Show genuine metrics and monitoring from connected systems
- Use real user avatars and content

### When real data is unavailable
- Use well-designed empty states
- Show clear placeholder indicators ("Add your photo")
- Use skeleton loading states for deferred content
- Prefer clean, minimal layouts over fabricated content

### When 3D or animation is justified
- Product visualisation (e-commerce, configurators)
- Data visualisation (charts, graphs, maps)
- Interaction feedback (button press, drag confirmation)
- Branding elements specified by the design system

## Enforcement

This policy is enforced by the `kumite-design-quality` skill. Every frontend
implementation should be checked against this policy before delivery.
