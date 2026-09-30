# OTO Workspace Agent Rules

These rules apply to all coding, designing, and refactoring tasks for the OTO mobile music application.

## 1. Grounding References
Before writing any code or proposing solutions:
- Design & UI specs: consult `docs/DESIGN.md` and `OTO_master_prompt_v2.md`.
- Product & Screen specs: consult `docs/SPEC.md`.
- Audio & Streaming algorithms: consult `BITCHORD_RE/` (specifically `04_CROSSFADE.md`, `05_STREAM_RESOLUTION.md`, `06_CACHE.md`, `09_LYRICS.md`, `13_DATABASE_STATE.md`, and `19_REACT_NATIVE_ARCHITECTURE.md`).
- Slices & Execution prompts: consult `docs/prompts/` and `OTO_vibe_coding_pack_v3.md`.

## 2. Invariant Architecture Constraints
1. **Zero-Stutter Playhead Rule:**
   - High-frequency position ticks (~60/120 Hz) **MUST NEVER** enter React state, React context, or trigger component re-renders.
   - Position is maintained as a Reanimated `SharedValue<number>` on the UI thread, interpolated from `(lastPosition, lastTimestamp, playbackRate)`.
2. **Single Shared Value for Player Expansion:**
   - `playerProgress` ($0 = \text{mini}, 1 = \text{full}$) is the single source of truth for the Now Playing expansion.
   - All layout transforms, artwork bounds, background opacity, and controls transitions interpolate from this one value.
   - The player is a **persistent overlay**, never a separate navigation screen.
3. **AudioEngine Interface Decoupling:**
   - All playback code interacts strictly with `src/audio/AudioEngine.ts`.
   - Never import a native audio package (e.g. `expo-audio`, `@rntp/player`) directly inside UI components.
4. **Clean-Room BitChord Reimplementation:**
   - BitChord is GPLv3 / AGPLv3.
   - Never copy Kotlin or C++ source code tokens directly into OTO.
   - Extract the mathematical logic ($\sin^2+\cos^2=1$, 2MB range chunking, 3-phase fuzzy track matching) and implement clean-room TypeScript or C++ JSI classes.
5. **Quality Tier Gating:**
   - Every Skia effect, blur surface, and complex animation must be gated by `QualityTier` (Tier 3 Full, Tier 2 Balanced, Tier 1 Lite, Tier 0 Minimal) and respect `useReducedMotion()`.
