# Licensing Policy

This policy governs how Kumite handles licensing for external resources.

## Design resources

### Figma Community files
- Verify the licence on each Community file before use.
- Most Community files are published under "CC BY 4.0" or custom licences
  set by the author.
- Some are marked as free for personal use only — verify commercial terms.
- Attribution requirements vary by file — always check.

### Design systems and UI kits
- Open-source design systems (e.g. Material Design, Ant Design) have their
  own licences (typically MIT or Apache 2.0).
- Verify the specific licence before recommending or using.

## Visual assets

### Pexels
- Pexels Content Licence: free for commercial and personal use.
- Attribution not strictly required but recommended (link to Pexels + credit
  photographer).
- Cannot compile content for a competing stock photo service.
- Cannot use for AI/ML training without explicit permission.

### Unsplash
- Unsplash Licence: free for commercial and non-commercial use.
- API terms **require** attribution (credit photographer + profile link).
- Cannot build a competing service.
- Cannot sell unaltered photos.

### Pixabay
- Pixabay Content Licence: free for commercial and non-commercial use.
- Attribution not required but appreciated.
- API requires 24-hour caching of search results.
- Cannot redistribute as-is on physical products without modification.

## Component libraries

### shadcn/ui
- MIT licence. Source code is copied into the project, no runtime dependency.

### Hugeicons
- Check the specific licence for the package being used. Free tier and
  pro tier have different terms.

### Other libraries
- Verify the licence listed in the package's `package.json` or repository
  before adding as a dependency.

## General rules

1. Always verify the licence before using an external resource.
2. Record attribution requirements and include them in the project.
3. Never assume "free" means "no restrictions".
4. When in doubt, ask the user before proceeding.
5. Never store, cache or redistribute API keys or credentials.
