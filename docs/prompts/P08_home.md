# Prompt Slice P8: Home Screen

## Required Skills to Activate
- `ui-ux-designer`: Editorial hierarchy, artwork-led Hero wash, varied card densities (no adjacent identical card styles).
- `react-native-architecture`: Multi-axis virtualized FlashList v2 horizontal/vertical scrollers.
- `ui-visual-validator`: Anti-AI-slop verification: ensure no generic card stacks, exact-shape thumbhash skeleton loaders.
- `performance-engineer`: Zero frame drops during fling scrolling with concurrent image decoding.
- `a11y-debugging`: Screen reader carousel announcements, accessible action triggers, and designed offline state.

```text
Read AGENTS.md, docs/SPEC.md, and docs/DESIGN.md. Then execute the task below. Post a plan before editing.

Task:
Build the Home screen with varied section densities and editorial hierarchy:
1. Editorial Header:
   - Greeting, user avatar, and instant search entry trigger.
2. Section Hierarchy (no two adjacent sections share the same card style):
   - **Hero Section:** Artwork-led, atmospheric wash tinted by the featured album's palette, single prominent "Listen Now" action.
   - **Continue Listening:** Compact horizontal list with resume progress indicators.
   - **Made For You:** Large artwork carousel with rounded cards (`radius.lg`).
   - **Quick Picks:** Dense 2-3 column grid of borderless song rows (`OTOSongRow`).
   - **New Releases:** Horizontal scroller with release date badges.
   - **Moods & Genres:** Typographic chips/cards (no generic stock photos).
3. State Coverage:
   - Loading skeletons with thumbhash placeholders matching exact card shapes.
   - Designed Offline banner and Empty states.

Constraints:
- All data sourced from the local mock catalog (`src/mock/mockCatalog.json`).
- FlashList v2 used for virtualized horizontal/vertical scrollers.

Acceptance Criteria:
- Zero frame drops while scrolling through Home with image loading active.
- Verified appearance in Tier 0 (solid colors) and Tier 3 (ambient glows).
```
