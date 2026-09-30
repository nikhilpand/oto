# Prompt Slice P6: Synchronized Lyrics Engine

## Required Skills to Activate
- `reverse-engineer`: Clean-room adaptation of BitChord `09_LYRICS.md` & `18_REUSABLE_CODE.md` (LRC & TTML parsers).
- `performance-engineer`: 120Hz GPU text sweep shader, zero layout thrashing (measure line heights once on song load).
- `react-native-architecture`: Skia GPU text rendering, Reanimated scroll auto-follow at 35% viewport mark.
- `unit-testing-test-generate`: Unit test fixtures for LRC 2/3-digit ms, TTML syllable spans, duet agents, and malformed tags.
- `a11y-debugging`: Multilingual script fallbacks (Devanagari, Arabic, CJK, Cyrillic) and reduced motion snap behavior.

```text
Read AGENTS.md, docs/SPEC.md, and docs/DESIGN.md. Then execute the task below. Post a plan before editing.

Task:
Build `OTOLyrics` with both inline (3-line preview) and full-screen synchronized viewing modes:
1. Parsers:
   - Line-timed LRC parser (`src/utils/lyrics/LrcParser.ts` from BITCHORD_RE/18_REUSABLE_CODE.md):
     Regex: `/\[(\d{2}):(\d{2})\.(\d{2,3})\](.*)/`
     Handles both 2-digit and 3-digit millisecond fractions.
   - Word-timed TTML parser (`src/utils/lyrics/TtmlParser.ts` from BITCHORD_RE/09_LYRICS.md):
     Parses XML `<p>` and `<span begin="..." end="...">`, merges syllable spans into fluid words, preserves whitespace, and detects duet agents (`ttm:agent="v1"` vs `"v2"`).
2. Skia GPU Text Renderer:
   - Current line active at 100% opacity with scale transform (+20% scale via matrix transform, not font-size change to prevent re-layout).
   - Neighbor lines at 45% opacity; distant lines at 25% opacity.
   - Word-level synchronization: masked gradient color sweep shader moving across the word path based on UI-thread playhead progress between `startMs` and `endMs`.
3. Interaction:
   - Auto-follow keeps the current line at ~35% from the top of the viewport.
   - Manual scrolling pauses auto-follow and reveals a floating "Resume" pill.
   - Tapping any lyric line seeks playback to that exact timestamp.
4. Fallback States:
   - Loading skeleton lines, Lyrics Unavailable, Instrumental track, and Plain Unsynced text.
   - Script fallbacks verified: Devanagari, Arabic, CJK, and Cyrillic.

Constraints:
- Measure line heights and scroll offsets ONCE upon song load; zero layout thrashing during playback.
- Under `useReducedMotion()`, instant snap replaces eased scrolling.

Acceptance Criteria:
- Unit tests verify LRC and TTML parsing accuracy.
- Fluid 120Hz word-level glow animation runs without frame drops on ProMotion and 90Hz Android devices.
```
