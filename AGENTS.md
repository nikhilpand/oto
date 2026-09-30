# AGENTS.md — OTO Mobile Music App

OTO is a state-of-the-art, dark-first mobile music app for iOS and Android built on **React Native (New Architecture) + Expo**, TypeScript strict, Expo Router with Native Tabs, Reanimated 4 + `react-native-worklets`, Gesture Handler, `@shopify/react-native-skia`, `expo-image`, FlashList v2, MMKV, and `expo-sqlite`.

This repository unites five foundational resources:
1. **`docs/SPEC.md`** & **`OTO_master_prompt_v2.md`**: Master product vision, feeling ("you didn't open a music app, you entered the music"), and complete screen specifications.
2. **`docs/DESIGN.md`**: Design tokens, glass surface recipes, OKLCH contrast clamp, motion spring physics, Skia runtime shaders, and 4 quality tiers.
3. **`BITCHORD_RE/`**: 22 verified, reverse-engineered audio engine algorithms, dual-player equal-power crossfade ($\sin^2+\cos^2=1$), 2MB range chunk caching, 3-phase fuzzy track matching, and zero-database storage.
4. **`docs/reverse_engineering/`**: 10 deep architectural investigations into precision 32-bit float audio, cipher descrambling, neural ONNX automix, Listen Together clock drift sync, and container tagging.
5. **`BitChord/.ua/`**: Knowledge graph of 858 nodes, 1067 dependency edges, and 10 architectural layers across the BitChord codebase.

Read `docs/SPEC.md` and `docs/DESIGN.md` before any UI work. Read `BITCHORD_RE/` and `docs/reverse_engineering/` before any audio, streaming, caching, queue, or network work.

---

## 1. Working Agreement & Execution Protocol

1. **Inspect first.** Read relevant files and post a plan (files to touch, approach, risks) **BEFORE** editing. Wait for approval if the plan touches >5 files or adds a dependency.
2. **Stay in scope.** No unrelated refactors, renames, or "cleanup". Preserve public behavior.
3. **One slice at a time.** Follow the P0–P14 roadmap slices in `docs/prompts/` in order. Finish the slice, run checks, summarize, and stop.
4. **Never add a dependency without asking.** Prefer what is already installed or specified in the stack baseline.
5. **Use `npx expo install` for Expo packages.** Run `npx expo-doctor` after any dependency changes.
6. **No Expo Go assumptions.** This project uses Expo Development Builds (`npx expo run:android` / `npx expo run:ios`) because custom native audio, Skia, and liquid glass require native compilation.
7. **If a requirement seems impossible on this stack, say so.** Propose alternatives immediately; do not fake it with non-functional placeholders.
8. **Smallest living version first.** In early slices, build against a mock catalog and a fake timer-based audio engine (`FakeAudioEngine`) so UI development is never blocked.
9. **Multi-Skill Activation Mandate.** When executing each roadmap slice (P0–P14), inspect and activate all specialized skills assigned to that slice in [`docs/prompts/README.md`](file:///c:/Users/nikhil/Desktop/projects/music-mobile/docs/prompts/README.md). Combine domain skills (e.g., `react-native-architecture`, `mobile-developer`, `reverse-engineer`, `ui-ux-designer`, `performance-engineer`, `a11y-debugging`, and `test-driven-development`) to ensure architecture, performance, accessibility, and visual elegance are maintained simultaneously.

---

## 2. Hard Architectural Rules

### 2.1 UI Threading & High-Frequency Motion
- High-frequency motion (gestures, scrubbing, player expansion, lyric highlight, palette morph, visualizer) **must run on the UI thread**:
  $$\text{Gesture Handler} \longrightarrow \text{Shared Value} \longrightarrow \text{Worklet (UI thread)} \longrightarrow \text{Animated Style / Skia Uniforms}$$
- **NEVER** drive per-frame animation with `setState`, React context updates, or bridge message passing.
- React state changes **only on discrete events** (track change, sheet snapped, mode toggled).

### 2.2 Single Source of Truth for the Player
- The player is **ONE persistent overlay component**, not a navigation screen.
- It is driven by a single shared value `playerProgress` ($0 = \text{mini}, 1 = \text{full}$).
- Artwork position/size, background opacity, controls layout, mini-player fade, and tab-bar offset are pure interpolations of `playerProgress`.
- The transition is interruptible and reversible at any point without jumps.

### 2.3 Audio Engine Abstraction & BitChord Integration
- Audio is accessed **only through the `AudioEngine` TypeScript interface** (`src/audio/AudioEngine.ts`). UI code never imports an audio library directly.
- **Playback Position Rule:** Native audio emits position updates at ~4–10 Hz. The UI thread **interpolates** position at 120 Hz from `(lastPosition, lastTimestamp, playbackRate)` into a Reanimated shared value. High-frequency position ticks are **NEVER** emitted to React state or the JS thread.
- **BitChord Architectural Inheritance (`BITCHORD_RE/` & `docs/reverse_engineering/`):**
  - **Dual-Player Peer Handoff:** Standby player pre-rolls incoming track; role swap occurs at $t=0$ with equal-power crossfade curves ($\sin^2(\theta) + \cos^2(\theta) = 1$) to eliminate the 9ms–41ms audio seam bug (`BITCHORD_RE/04_CROSSFADE.md`).
  - **2MB Bounded Range Chunk Caching:** Avoid YouTube CDN rate throttling by fetching 2MB discrete range chunks, caching against static canonical keys (`oto://track/{id}`) (`BITCHORD_RE/06_CACHE.md`).
  - **3-Phase Fuzzy Track Matching:** Normalize tokens, strictly enforce version marker symmetry (`[Remix]`, `[Acoustic]`, `[Live]`), and gate duration delta ($\le 3$s) (`BITCHORD_RE/05_STREAM_RESOLUTION.md`).
  - **Two-Tier Queue:** Separate transient user-enqueued "Play Next" items from standard sequence while preserving un-shuffled history (`BITCHORD_RE/03_PLAYBACK.md`).
  - **Zero-Database Persistence:** Use MMKV for fast state/queue hydration and monthly partitioned JSON files for listening stats; avoid SQLite schema migration fragility for transient audio state (`BITCHORD_RE/13_DATABASE_STATE.md`).
  - **Listen Together Clock Drift Sync:** NTP-style RTT calculation with dynamic $\pm 0.5\%$ pitch-preserving tempo adjustment for micro-sync (`docs/reverse_engineering/07_LISTEN_TOGETHER_SYNC_PROTOCOL.md`).
  - **Clean-Room Legal Compliance:** BitChord is GPLv3 / AGPLv3. **DO NOT** copy raw Kotlin or C++ source code tokens. Reimplement the algorithms cleanly in TypeScript and C++ JSI.

### 2.4 Rendering Layer Stack & Skia Rules
- Layer stack per screen:
  $$\text{Artwork} \longrightarrow \text{Palette} \longrightarrow \text{Atmosphere (Skia)} \longrightarrow \text{Blur} \longrightarrow \text{Vignette} \longrightarrow \text{Surface} \longrightarrow \text{Content}$$
- Only **Atmosphere** and **Vignette** are Skia. Content (text, buttons, lists) is ordinary React Native so layout, accessibility, and text rendering stay native.
- **Skia Rule:** One canvas per effect, uniforms updated from shared values, no per-particle React nodes. Pause Skia rendering when backgrounded or off-screen.

### 2.5 Quality Tiers & Graceful Degradation
Every visual effect must respect the active `QualityTier`:
- **Tier 3 (Full):** Animated Skia atmosphere, progressive blur, native glass (iOS 26), live visualizer (≤60 fps).
- **Tier 2 (Balanced):** Static Skia gradient, slow palette morph, native blur/tint, visualizer off by default.
- **Tier 1 (Lite):** Pre-rendered gradient, solid translucent tint, simplified motion.
- **Tier 0 (Minimal):** Flat palette color, no blur, crossfades only.
- Auto-downgrade on sustained frame drops (UI-thread frame time $>16.6$ms over 2s), OS low-power mode, or thermal pressure. Never degrade interaction responsiveness to preserve visuals.

---

## 3. Hard Design Rules

1. **No hard-coded design values.** Never inline colors, font sizes, spacing, radii, durations, or spring values. Always import from `src/design/tokens.ts`. If a token is missing, add it to `tokens.ts` with a comment.
2. **Glass rules.** Glass belongs **only on floating navigation and control surfaces** (tab bar, mini-player, sheets, transport controls). Never glass on glass. Never glass on content.
3. **Mandatory glass fallback.** Every glass surface must have an opaque/translucent tinted fallback for Android and older iOS (`color.glass.solidFallback`). Android design must look intentional without glass refraction.
4. **Dynamic color contrast clamp.** Artwork-derived colors are used only as fills, glows, and accents. Body text is always near-white (`text.primary`). Any accent used for text or icons on dark surfaces must be lightened in OKLCH until it reaches **$\ge 4.5:1$ contrast** ($\ge 3:1$ for large text/graphics).
5. **Touch targets.** Every touch target must be **$\ge 44\times 44$ pt (iOS) / $\ge 48\times 48$ dp (Android)**.
6. **Accessible alternatives.** Every gesture (swipe to skip, pan to expand, drag to reorder) **must have an accessible tap/button or custom accessibility action alternative**.
7. **Anti-AI-Slop Checklist (Immediate Rejection Criteria):**
   - Hard-coded color, size, spacing, or duration in a component.
   - Purple/blue "AI" gradients, default green accents, or neon glowing borders.
   - Emoji used as navigation or control icons.
   - Stock card-grid layouts stacked identically section after section.
   - Borders around every element instead of luminance steps and spacing.
   - Text over artwork without a verified scrim or contrast clamp.
   - Placeholder copy ("Lorem ipsum", "Song 1") left in shipped code.

---

## 4. Code & Quality Standards

- **TypeScript Strict:** No `any` without an explicit comment explaining why.
- **File Length:** Component files must be $< 200$ lines. Split sub-views and helpers into focused files.
- **Named Exports:** Use named exports for all components and utilities.
- **External Data Validation:** Validate all external APIs, scrapers, and storage payloads using **Zod** at the boundary. UI consumes typed domain models.
- **Lists:** Use `@shopify/flash-list` v2 with stable keys and `estimatedItemSize`. Never animate individual list rows with JavaScript.
- **Images:** Use `expo-image` with thumbhash/blurhash placeholders and display-sized sources.
- **Error Handling:** Wrap every storage, network, and audio call with error handling that surfaces a designed OTO error state (never an unhandled redbox).

---

## 5. Definition of Done (Every Slice P0–P14)

Before marking any slice complete, the following checklist must be satisfied:
- [ ] `tsc --noEmit`, ESLint, and unit tests pass with zero errors.
- [ ] Builds and runs cleanly on iOS and Android development builds.
- [ ] No UI-thread frame drops during the slice's main gesture (profiled at 60/120 Hz).
- [ ] Reduced-motion (`useReducedMotion()`) and Tier 0 behaviors verified and functional.
- [ ] Screen-reader accessibility pass complete (labels, traits, custom actions, logical focus order).
- [ ] Storybook story created for each component state (default, pressed, disabled, loading, error).
- [ ] Summary of changes, files touched, and explicit verification results posted.
