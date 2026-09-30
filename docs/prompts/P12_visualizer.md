# Prompt Slice P12: Skia Visualizer

## Required Skills to Activate
- `react-native-architecture`: Single-canvas Skia GPU rendering, organic waveform ribbon / particle field.
- `reverse-engineer`: Clean-room adaptation of BitChord `08_AUDIO_ANALYSIS.md` (3 data modes: FFT, energy map, BPM sine).
- `performance-engineer`: Enforce <= 60 fps throttle, 0% CPU consumption when off-screen, player collapsed, or backgrounded.
- `ui-ux-designer`: Subtle low-contrast organic visual signature behind artwork that never competes with text.
- `test-driven-development`: Unit tests for synthetic BPM fallback math and tier gating.

```text
Read AGENTS.md, docs/SPEC.md, and docs/DESIGN.md. Then execute the task below. Post a plan before editing.

Task:
Build `OTOVisualizer` as a subtle, organic GPU visualizer drawn in React Native Skia (from docs/DESIGN.md and BITCHORD_RE/08_AUDIO_ANALYSIS.md):
1. Visual Signature:
   - Organic waveform ribbon or palette-seeded particle field rendering behind/under the album art at low contrast.
   - Never competes with title or controls for visual attention.
2. Data Pipeline (3 Modes):
   - Mode A (Real FFT): Utilized when a native audio tap provides live frequency bins (64 bins).
   - Mode B (Precomputed Energy Map): Uses track energy/beat timestamps from metadata analysis.
   - Mode C (Synthetic Fallback): Tempo-driven organic oscillation seeded by track BPM (`sin(time * bpmFactor)`).
   - Guarantee Mode C as the default fallback; never label as "audio-reactive" unless Mode A or B is active.
3. Power & Performance Throttling:
   - Capped at <= 60 fps on a single Skia canvas with uniform updates.
   - Pauses completely when the app is backgrounded or the player is collapsed.
   - Disabled by default on Tier <= 2 and when OS Battery Saver is active.

Constraints:
- Zero per-particle React nodes; 100% shader or Skia path drawing.
- Immediate pause when off-screen.

Acceptance Criteria:
- Profiler verifies 0% CPU consumption when visualizer is paused or off-screen.
- Visualizer respects Quality Tier and battery state.
```
