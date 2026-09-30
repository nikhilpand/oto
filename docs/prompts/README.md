# OTO Prompt Pack (Slices P0 — P14)

This directory contains the exact, bounded engineering execution slices for building OTO with an AI agent. Each prompt is designed to be executed sequentially, ending in a running, verified slice before moving to the next.

Always start any build session with:
> *"Read AGENTS.md, docs/SPEC.md, and docs/DESIGN.md. Then execute the prompt slice below. Post a plan before editing."*

---

## Prompt Slices Overview

| Slice | Title | Primary Deliverable | Core Verification Gate |
| :---: | :--- | :--- | :--- |
| **[P0](file:///c:/Users/nikhil/Desktop/projects/music-mobile/docs/prompts/P00_scaffold_and_derisk.md)** | **Scaffold & De-Risk** | Expo SDK (New Architecture), Expo Router Native Tabs, pinned stack | `expo-doctor` clean; dev-build runs; memory profiled. |
| **[P1](file:///c:/Users/nikhil/Desktop/projects/music-mobile/docs/prompts/P01_tokens_and_primitives.md)** | **Tokens & Primitives** | `tokens.ts`, `OTOText`, `OTOButton`, `OTOGlassSurface`, `OTOArtwork` | Storybook stories for all states; Android glass fallback verified. |
| **[P2](file:///c:/Users/nikhil/Desktop/projects/music-mobile/docs/prompts/P02_dynamic_color_pipeline.md)** | **Dynamic Color Pipeline** | `OTOPaletteProvider`, OKLCH extractor, contrast clamp, SQLite cache | 12 test artworks (greyscale, dark, white) pass WCAG AA contrast. |
| **[P3](file:///c:/Users/nikhil/Desktop/projects/music-mobile/docs/prompts/P03_audio_engine_and_fake.md)** | **Audio Engine & Fake** | `AudioEngine.ts` interface, `FakeAudioEngine`, UI-thread interpolation | Zero React re-renders during scrubber motion (verified with profiler). |
| **[P4](file:///c:/Users/nikhil/Desktop/projects/music-mobile/docs/prompts/P04_player_shell_mini_full.md)** | **Player Shell: Mini ⇄ Full** | Persistent overlay, `playerProgress` shared value, artwork rect travel | Fully interruptible pan gesture; 60/120 fps maintained on Android floor. |
| **[P5](file:///c:/Users/nikhil/Desktop/projects/music-mobile/docs/prompts/P05_now_playing_content.md)** | **Now Playing Content** | Skia scrubber, dominant play/pause, `OTODynamicBackground`, pause-scale | Rapid skipping retargets smoothly; 200% font scaling passes. |
| **[P6](file:///c:/Users/nikhil/Desktop/projects/music-mobile/docs/prompts/P06_lyrics.md)** | **Lyrics Engine** | `OTOLyrics`, LRC & TTML parser, word-level glowing text sweep | 120 Hz smooth scrolling; Devanagari/Arabic/CJK fallbacks verified. |
| **[P7](file:///c:/Users/nikhil/Desktop/projects/music-mobile/docs/prompts/P07_queue.md)** | **Queue Manager** | Two-tier `OTOQueue`, drag lift-and-drop, swipe removal with undo | Smooth reordering with 200 items; accessible custom actions working. |
| **[P8](file:///c:/Users/nikhil/Desktop/projects/music-mobile/docs/prompts/P08_home.md)** | **Home Screen** | Artwork-led Hero, varied section densities, continue listening, skeletons | No adjacent sections share the same card style; offline state handled. |
| **[P9](file:///c:/Users/nikhil/Desktop/projects/music-mobile/docs/prompts/P09_search_and_library.md)** | **Search & Library** | Debounced search, MMKV recents, segmented filter chips, download badges | Instant suggestions; complete offline filtering for downloaded tracks. |
| **[P10](file:///c:/Users/nikhil/Desktop/projects/music-mobile/docs/prompts/P10_album_artist_playlist.md)**| **Album, Artist, Playlist** | Parallax collapsing headers, sticky controls, borderless track rows | Card $\to$ header shared rect transition; smooth scroll physics. |
| **[P11](file:///c:/Users/nikhil/Desktop/projects/music-mobile/docs/prompts/P11_glass_tabs_progressive_blur.md)**| **Glass, Tabs & Blur** | Native Tabs integration, Skia progressive blur, edge dissolve | Every glass surface has verified non-glass fallback; kill switch tested. |
| **[P12](file:///c:/Users/nikhil/Desktop/projects/music-mobile/docs/prompts/P12_visualizer.md)** | **Visualizer** | Organic waveform/particle ribbon, 3 data modes (FFT, map, synthetic) | Capped at $\le 60$ fps; pauses off-screen and in battery saver. |
| **[P13](file:///c:/Users/nikhil/Desktop/projects/music-mobile/docs/prompts/P13_downloads_and_offline.md)**| **Downloads & Offline** | Download manager, SQLite manifest, storage summary, offline playback | Gracefully skips missing streams with explicit user messaging. |
| **[P14](file:///c:/Users/nikhil/Desktop/projects/music-mobile/docs/prompts/P14_discovery_insights_hardening.md)**| **Discovery & Hardening** | Discovery context, monthly listening trends, Settings, Maestro E2E | Accessibility audit passed; Maestro E2E test suite green. |

---

## Multi-Skill Execution Matrix

When executing any slice, activate **all** corresponding skills together. Do not hesitate to invoke multiple specialized skills to maintain state-of-the-art standards:

| Slice | Title | Required Skills to Activate |
| :---: | :--- | :--- |
| **P0** | **Scaffold & De-Risk** | `react-native-architecture`, `mobile-developer`, `performance-engineer`, `verification-before-completion`, `writing-plans` |
| **P1** | **Tokens & Primitives** | `ui-ux-designer`, `react-native-architecture`, `ui-visual-validator`, `a11y-debugging`, `test-driven-development`, `wcag-audit-patterns` |
| **P2** | **Dynamic Color Pipeline** | `ui-ux-designer`, `wcag-audit-patterns`, `performance-engineer`, `react-native-architecture`, `test-driven-development` |
| **P3** | **Audio Engine & Fake** | `react-native-architecture`, `reverse-engineer`, `performance-engineer`, `react-state-management`, `test-driven-development` |
| **P4** | **Player Shell: Mini ⇄ Full** | `react-native-architecture`, `mobile-developer`, `performance-engineer`, `screen-reader-testing`, `ui-visual-validator` |
| **P5** | **Now Playing Content** | `ui-ux-designer`, `react-native-architecture`, `performance-engineer`, `a11y-debugging`, `ui-visual-validator` |
| **P6** | **Lyrics Engine** | `reverse-engineer`, `performance-engineer`, `react-native-architecture`, `unit-testing-test-generate`, `a11y-debugging` |
| **P7** | **Queue Manager** | `reverse-engineer`, `react-state-management`, `react-native-architecture`, `screen-reader-testing`, `test-driven-development` |
| **P8** | **Home Screen** | `ui-ux-designer`, `react-native-architecture`, `ui-visual-validator`, `performance-engineer`, `a11y-debugging` |
| **P9** | **Search & Library** | `react-native-architecture`, `react-state-management`, `ui-ux-designer`, `performance-engineer`, `test-driven-development` |
| **P10** | **Album, Artist, Playlist** | `react-native-architecture`, `mobile-developer`, `ui-ux-designer`, `performance-engineer`, `a11y-debugging` |
| **P11** | **Glass, Tabs & Blur** | `react-native-architecture`, `mobile-developer`, `performance-engineer`, `ui-visual-validator`, `a11y-debugging` |
| **P12** | **Visualizer** | `react-native-architecture`, `reverse-engineer`, `performance-engineer`, `ui-ux-designer`, `test-driven-development` |
| **P13** | **Downloads & Offline** | `reverse-engineer`, `protocol-reverse-engineering`, `database-architect`, `mobile-security-coder`, `test-driven-development` |
| **P14** | **Discovery & Hardening** | `e2e-testing-patterns`, `accessibility-compliance-accessibility-audit`, `screen-reader-testing`, `performance-engineer`, `code-reviewer`, `verification-before-completion` |

