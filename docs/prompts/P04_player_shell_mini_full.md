# Prompt Slice P4: Player Shell (Mini ⇄ Now Playing)

## Required Skills to Activate
- `react-native-architecture`: Persistent single overlay component architecture (never a navigation screen).
- `mobile-developer`: Reanimated 4 gesture controller, Pan gesture translation to `playerProgress`, velocity handoff.
- `performance-engineer`: Enforce frame times <= 16.6ms on Android floor during rapid mid-gesture direction reversal.
- `screen-reader-testing`: Accessible alternatives for expand/collapse states and VoiceOver/TalkBack announcements.
- `ui-visual-validator`: Measured rect continuous travel between mini and full artwork bounds with no visual snapping.

```text
Read AGENTS.md, docs/SPEC.md, and docs/DESIGN.md. Then execute the task below. Post a plan before editing.

Task:
Build the persistent player overlay shell driven by the single `playerProgress` Reanimated shared value (0 = mini, 1 = full).

Components to build:
1. `OTOMiniPlayer`: Floating glass bar above Native Tabs. Contains small rounded artwork (44x44), track title, artist, play/pause toggle, and a thin UI-thread progress line.
2. `OTONowPlaying`: Full-screen container that expands upward.
3. Shared Value & Motion Architecture:
   - `playerProgress = useSharedValue(0)` (0 = collapsed/mini, 1 = expanded/full).
   - Artwork bounds travel continuously between measured mini rect `{ x, y, width, height }` and full rect:
     `currentSize = interpolate(playerProgress.value, [0, 1], [miniSize, fullSize])`
   - Background opacity, controls fade, and mini player fade are pure interpolations of `playerProgress`.
4. Gesture Controller (Gesture Handler):
   - Vertical `Gesture.Pan()` translates vertical drag delta into `playerProgress` (0 to 1).
   - On gesture end, hand off gesture release velocity to `withSpring(target, spring.spatial.default)`.
   - Single tap on mini player triggers programmatic spring expansion to 1.
   - Horizontal swipe on mini player triggers track skip (`skipToNext` / `skipToPrevious`).
   - Under reduced motion (`useReducedMotion`), artwork travel is replaced with an instantaneous crossfade.

Constraints:
- The player MUST be a persistent overlay component, NOT an Expo Router navigation screen.
- 100% interruptible mid-gesture with zero visual jumps or hitching.
- No `setState` or per-frame bridge traffic during drag.
- Accessible alternatives for expand/collapse (accessible button / action).

Acceptance Criteria:
- Reversing drag direction repeatedly mid-motion produces zero frame drops or visual snapping.
- Measured frame times remain <= 16.6ms on benchmark Android device.
- Screen reader announces expand/collapse state correctly.
```
