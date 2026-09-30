# Prompt Slice P5: Now Playing Content & Dynamic Atmosphere

## Required Skills to Activate
- `ui-ux-designer`: Layout anatomy (~42% artwork pause-scale 1.0 -> 0.92, scrubber anatomy, 4 tier definitions).
- `react-native-architecture`: Skia runtime effect shader `atmosphere.sksl` with palette uniform transitions.
- `performance-engineer`: Zero React re-renders during scrubber dragging or rapid track skips.
- `a11y-debugging`: 200% Dynamic Type font scaling verification without clip; scrubber accessible slider role.
- `ui-visual-validator`: Anti-AI-slop audit (no neon gradients, pure typography, pristine dark-mode aesthetics).

```text
Read AGENTS.md, docs/SPEC.md, and docs/DESIGN.md. Then execute the task below. Post a plan before editing.

Task:
Fill the expanded `OTONowPlaying` container with its complete interactive hierarchy:
1. `OTODynamicBackground`:
   - Tier 3: Render Skia runtime effect shader (`src/design/shaders/atmosphere.sksl` from docs/DESIGN.md) driven by palette uniforms (`uDominant`, `uSecondary`, `uAccent`, `uShadow`) with slow time drift.
   - Tier 2: Static Skia radial gradient with slow palette morph.
   - Tier 1: Static gradient image.
   - Tier 0: Solid flat palette color.
2. Layout Anatomy (following docs/DESIGN.md ratios):
   - Grab handle / dismiss control, context label ("Playing from ..."), overflow `...` button (~8%).
   - Artwork square (~42% height) with subtle pause-scale behavior (1.0 playing -> 0.92 paused) via `withSpring(scale, spring.spatial.playful)`.
   - Title / Artist / Like button row (~12%).
   - `OTOProgressBar` (~10%): Skia scrubber, draggable with haptic click on grab/release, time labels, and accessible adjustable role (+/- 10s increments).
   - Transport controls (~12%): Shuffle, Previous, dominant Play/Pause button, Next, Repeat.
   - Secondary action bar (~8%): Lyrics toggle, Queue toggle, Audio output route, Sleep timer.

Constraints:
- Zero React re-renders during playhead progression or scrubber dragging.
- Rapid track skipping cleanly retargets palette transitions without flash or color jump.
- 200% font scaling verified with no clipping or overlapping text.

Acceptance Criteria:
- Dynamic background transitions smoothly across 5 consecutive track skips.
- Scrubber touch target is accessible and emits haptic feedback.
- Storybook stories for Tier 0 through Tier 3.
```
