# Prompt Slice P2: Dynamic Color Pipeline

## Required Skills to Activate
- `ui-ux-designer`: OKLab/OKLCH color distance clustering, 5 palette roles (`dominant`, `secondary`, `accent`, `shadow`, `highlight`).
- `wcag-audit-patterns`: Implement OKLCH contrast clamp (>= 4.5:1 body, >= 3:1 accent) across all background tints.
- `performance-engineer`: Off-UI-thread pixel downsampling, <50ms Android extraction, <1ms MMKV cache hit.
- `react-native-architecture`: Reanimated SharedValue uniforms driving Skia shaders with zero React re-renders.
- `test-driven-development`: Comprehensive test suite for 12 edge cases (monochrome, dark, white, single dot).

```text
Read AGENTS.md, docs/SPEC.md, and docs/DESIGN.md. Then execute the task below. Post a plan before editing.

Task:
Build `OTOPaletteProvider` and the artwork color extraction pipeline:
1. Downsample artwork image to 64x64 off the UI thread (via native background worker or Skia `readPixels`).
2. Quantize and cluster colors in the OKLCH/OKLab color space.
3. Assign the 5 roles: `dominant`, `secondary`, `accent`, `shadow`, and `highlight`.
4. Apply the mandatory contrast clamp: ensure body text passes >= 4.5:1 against rendered backgrounds, and accent elements pass >= 3:1.
5. Cache extracted palettes in SQLite or MMKV by artwork SHA256 hash.
6. Expose palette roles as Reanimated shared values to drive Skia uniforms without triggering React component re-renders.

Add a debug harness screen with 12 diverse test artworks:
- Greyscale / monochromatic artwork
- Very dark / pitch-black artwork
- Very bright / white artwork
- Single saturated dot on white canvas
- Missing artwork fallback

Constraints:
- Zero color computation on the UI thread.
- Zero React re-renders during palette transitions.
- Unit tests for OKLCH color distance, clustering, and contrast clamp math.

Acceptance Criteria:
- All 12 test artworks produce valid, clamped palettes passing WCAG AA contrast.
- Average extraction time on low-end Android floor reported (<50ms).
- Cache hit returns in <1ms.
```
