# Prompt Slice P11: Glass, Tab Bar & Progressive Blur

## Required Skills to Activate
- `react-native-architecture`: Expo Router Native Tabs, iOS 26 Liquid Glass API vs solid fallback.
- `mobile-developer`: Coordinated hide-on-scroll / show-on-scroll physics with the floating mini-player stack.
- `performance-engineer`: Skia progressive blur shader GPU cost profiling and low-power kill switch.
- `ui-visual-validator`: Android solid fallback audit (no glass-on-glass, hairline border highlight, pristine contrast).
- `a11y-debugging`: Support for High Contrast mode, Reduce Transparency system toggles.

```text
Read AGENTS.md, docs/SPEC.md, and docs/DESIGN.md. Then execute the task below. Post a plan before editing.

Task:
Finalize the navigation chrome, glass surfaces, and progressive edge blurs:
1. Native Tabs Integration:
   - Configure Expo Router Native Tabs for Home, Search, and Library.
   - Leverage native iOS 26 glass effects for the tab bar.
   - On Android and older iOS, apply `color.glass.solidFallback` with a hairline top highlight.
   - Implement hide-on-scroll during downward list scrolling, restoring on upward scroll or mini-player interaction.
2. Progressive Edge Blurs:
   - Top status bar edge and bottom mini-player boundary dissolve scrolling content smoothly.
   - Tier 3: Skia masked backdrop blur shader.
   - Tier 2: Static gradient alpha fade to `color.bg.base`.
   - Tier 1 & 0: Solid tinted bar.
   - Include an emergency runtime kill-switch flag in Settings.

Constraints:
- Tab bar and mini player must maintain a defined, non-overlapping vertical stack.
- Measured GPU cost of progressive blur reported per platform.

Acceptance Criteria:
- Verified on Android device: solid fallback looks polished with zero visual clipping artifacts.
- Progressive blur respects quality tier downgrades.
```
