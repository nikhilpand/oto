# OTO — Vibe-Coding Pack (v3)

A design system, agent rules, and a sequence of build prompts for building **OTO**, a premium dark-first music app, with an AI coding agent (Claude Code, Cursor, Codex, or similar) on **React Native + Expo**.

Status of facts: checked against public sources on **30 Sep 2026**. Library versions, OS behavior and licenses move quickly. Section 2 lists what to re-verify before you pin anything.

## How this pack is organised

| Part | What it is | Where it goes |
|---|---|---|
| 1 | Workflow: how to drive the agent | Read once |
| 2 | Stack decisions and known risks | Read before scaffolding |
| 3 | `AGENTS.md` (copy-paste) | Repo root; symlink as `CLAUDE.md` |
| 4 | Product spec (one page) | `docs/SPEC.md` |
| 5 | Design system: tokens, glass, motion, components | `docs/DESIGN.md` |
| 6 | Prompt pack P0–P14 | Paste one at a time |
| 7 | Review prompts and Definition of Done | Paste after each slice |

---

# Part 1 — Workflow (how to vibe-code this without it going sideways)

The consistent advice across current vibe-coding guides is that output quality tracks how specific and bounded each task is, and that the developer stays the owner and reviewer of the result. Apply it like this:

1. **Spec first, one page.** The agent makes its own architecture choices when scope is vague. `docs/SPEC.md` (Part 4) and `docs/DESIGN.md` (Part 5) are the context it reads every session.
2. **Rules in the repo.** Recurring rules live in `AGENTS.md`, not in your prompts. Do not repeat them in chat.
3. **One concern per prompt.** Use the P0–P14 slices in order. Each slice ends in something that runs.
4. **Inspect → plan → edit.** Every prompt tells the agent to read the relevant files and post a short plan before writing code. Reject the plan if it touches files outside scope.
5. **Constraints before instructions.** State what must *not* happen (new dependencies, JS-thread animation, hard-coded colors) before what to build.
6. **Smallest living version first.** Build against a **mock catalog and a fake audio engine** so the UI is never blocked by licensing, backend or native audio.
7. **Verify on device, not in your head.** Every slice has acceptance criteria you can check on a real low-end Android phone and a real iPhone.
8. **Commit after every working slice.** Small commits make regressions revertable when an agent "fixes" something unrelated.
9. **Ask the agent to critique itself.** After generation, run the review prompts in Part 7.
10. **Keep a prompt library.** Store the prompts in `docs/prompts/` and improve them when the agent misbehaves, the same way you would fix a bug.

Prompt anatomy used below: **Role → Context (files to read) → Task → Constraints → Output format → Acceptance criteria.**

---

# Part 2 — Stack decisions and known risks (verified 30 Sep 2026)

## 2.1 Baseline

| Concern | Decision | Notes |
|---|---|---|
| Framework | **Expo SDK 56** (React Native 0.85, React 19.2, Hermes v1) or **SDK 57** (RN 0.86) | SDK 56 shipped 21 May 2026; SDK 57 shipped 30 Jun 2026 and is described as a smaller, non-breaking, optional update. Start on whichever `create-expo-app` gives you, then read the risks below. |
| Architecture | New Architecture only | Cannot be disabled from RN 0.82 onward. Reanimated 4 and FlashList v2 require it. Expo Go supports only the New Architecture. |
| Builds | **Development build (EAS)**, not Expo Go | Glass effects, custom audio, and Skia need native code. |
| Routing | **Expo Router** with the **Native Tabs** API for the tab bar | Expo Router no longer depends on React Navigation as of SDK 56, so do not add `@react-navigation/*` imports; `expo-doctor` warns about the pairing. |
| Language | TypeScript strict | Use the TypeScript version the SDK template ships. |
| Animation | **Reanimated 4 + react-native-worklets**, Gesture Handler | Reanimated 4 also offers CSS-style animations/transitions for simple micro-interactions. Use them for press states and fades; use shared values + worklets for gesture-driven motion. |
| GPU drawing | **@shopify/react-native-skia** | Atmosphere, progressive blur, visualizer, waveform. |
| Images | `expo-image` (thumbhash/blurhash placeholders, cache policy) | SDK 57 adds cache read/write helpers. |
| Lists | `@shopify/flash-list` v2 | New Architecture only. |
| Native UI | **Expo UI** (SwiftUI / Jetpack Compose) for pickers, sliders, menus, sheets where it fits | Stable as of SDK 56, with drop-in replacements for several community libraries including `@gorhom/bottom-sheet` and `@react-native-menu/menu`. Evaluate these before adding extra native dependencies. |
| Glass | `expo-glass-effect` (iOS 26+) with mandatory fallback | See 2.3. |
| Icons | `expo-symbols` (SF Symbols on iOS) + Lucide-style set for cross-platform consistency | `@expo/vector-icons` is deprecated in SDK 56; use `@react-native-vector-icons/*` if you need a font-based set. |
| State | Zustand (small slices) + TanStack Query (server cache) + Zod (API validation) | Player state is **shared values + a thin store**, never React state per frame. |
| Storage | `react-native-mmkv` (settings), `expo-sqlite` (library, downloads, palette/lyrics cache) | |
| Component dev | Storybook (RN) | Build every component in isolation with stories for each state before wiring it into screens. |
| Tests | Jest + React Native Testing Library (logic), Maestro (E2E flows) | |
| Observability | Sentry or equivalent, plus on-device perf tracing | |

## 2.2 Audio: the highest-risk decision

`expo-av` was removed in SDK 55. Options:

| Option | Fit | Watch out for |
|---|---|---|
| **`expo-audio`** | Simplest default; Expo's supported replacement. | Verify lock-screen/remote controls, queue handling, gapless and crossfade against your needs before committing. |
| **React Native Track Player v5** (`@rntp/player`) | Deepest music-app feature set: background playback, queue, caching, Android Auto. | **Commercially licensed from v5** (free for personal/educational use). Older v4 may need native patches on current RN/Expo. |
| **Custom Expo module** on Media3/ExoPlayer and AVFoundation | Full control (crossfade, audio tap for the visualizer). | Significant native work; only after a prototype proves the others insufficient. |

**Rule:** the app talks to a single `AudioEngine` TypeScript interface (Part 6, P3). Start with a fake engine, then `expo-audio`, and swap only if a requirement fails. Crossfade and real FFT data are not free with any option.

## 2.3 Glass and blur: what actually works per platform

- **iOS 26+:** native Liquid Glass via `expo-glass-effect` (`GlassView`, `GlassContainer`). On iOS below 26 and on Android it falls back to a regular `View`. Guard with `isLiquidGlassAvailable()` and `isGlassEffectAPIAvailable()`, because some iOS 26 betas lack the API and can crash.
- **Android:** no native Liquid Glass. Use `expo-blur` where it renders acceptably (Android 12+/API 31+), otherwise a solid translucent tint. Some third-party libraries attempt Android refraction on Android 13+; treat them as experimental and never as a hard dependency.
- **Design rule for both:** glass belongs on the **navigation/controls layer floating above content** (tab bar, mini-player, sheets, transport controls), not on content itself, and not glass stacked on glass. The design must look correct with the fallback, because that is what a large share of Android users will see.
- Some libraries (for example `@callstack/liquid-glass`) are not supported in Expo Go and need a development build.

## 2.4 Known risks to check first (do this before P0)

1. **Hermes v1 memory regression with Reanimated/worklets.** Expo's SDK 56 changelog carries an update (27 Aug) warning that importing `react-native-worklets` or `react-native-reanimated` can sharply raise memory on RN 0.85's Hermes v1. Reports for SDK 57 mention roughly 25–30% higher Android memory with a worklets bundle-mode workaround. **Action:** read the current Expo changelog for a fixed patch version, pin it, and measure memory on a low-end Android device in P0.
2. **RN 0.85 toolchain requirements** (reported: recent Xcode 26.x, Node 22.x). Confirm against the RN release notes.
3. **Minimum OS:** SDK 56 raised the minimum iOS to 16.4. Confirm current Android minimum.
4. **Audio library license and capability** (2.2).
5. **Content licensing.** Streaming rights, lyrics, and artwork depend on your catalog provider. Build on mock data first and treat this as a business decision, not a coding one.

Run `npx expo-doctor` after every dependency change.

---

# Part 3 — `AGENTS.md` (copy into repo root)

```markdown
# AGENTS.md — OTO

OTO is a premium, dark-first music app (iOS + Android) built with Expo (New Architecture),
TypeScript strict, Expo Router, Reanimated 4 + react-native-worklets, Gesture Handler,
@shopify/react-native-skia, expo-image, FlashList v2, MMKV, expo-sqlite.
Read docs/SPEC.md and docs/DESIGN.md before any UI work.

## Working agreement
1. Inspect first. Read the files relevant to the task and post a plan (files to touch, approach,
   risks) BEFORE editing. Wait for approval if the plan touches >5 files or adds a dependency.
2. Stay in scope. No unrelated refactors, renames, or "cleanup". Preserve public behavior.
3. One slice at a time. Finish, run checks, summarize, stop.
4. Never add a dependency without asking. Prefer what is already installed.
5. Use `npx expo install` for Expo-managed packages. Run `npx expo-doctor` after dependency changes.
6. Do not use Expo Go assumptions. This project uses development builds.
7. If a requirement seems impossible on this stack, say so and propose alternatives. Do not fake it.

## Architecture rules (hard)
- High-frequency motion (gestures, scrubbing, player expansion, lyric highlight, palette morph,
  visualizer) runs on the UI thread: Gesture Handler -> shared values -> worklets -> animated
  styles / Skia uniforms. NEVER drive per-frame animation with setState, context updates, or
  React re-renders.
- The player is ONE persistent overlay component driven by a single shared value
  `playerProgress` (0 = mini, 1 = full). It is not a navigation screen.
- Playback position: native emits ~4-10 Hz; interpolate on the UI thread from
  (lastPosition, lastTimestamp, rate). Do not store position in React state.
- Audio is accessed only through the `AudioEngine` interface in src/audio/. UI code never imports
  an audio library directly.
- Environment (palette + Skia atmosphere) is separate from content and interaction.
  Environment reads shared values and must not force the content tree to re-render.
- Skia: one canvas per effect, uniforms driven by shared values, no per-particle React nodes.
  Pause when backgrounded or off-screen.
- Every animated/blurred effect must respect the quality tier (0-3) and reduced-motion.

## Design rules (hard)
- No hard-coded colors, font sizes, spacing, radii, durations or spring values. Use tokens from
  src/design/tokens.ts. If a token is missing, add it there with a comment, do not inline a value.
- Glass only on floating navigation/control surfaces. Never glass on glass. Always ship the
  non-glass fallback and test it.
- Artwork-derived colors are fills/accents only. Body text is near-white. Clamp accents to
  WCAG AA (4.5:1 text, 3:1 large text/graphics) before use.
- Touch targets >= 44pt (iOS) / 48dp (Android). No gesture without an accessible alternative.
- Do not introduce: purple/blue "AI" gradients, emoji as icons, stock card grids everywhere,
  decorative 3D, glow as a default, borders around every element.

## Code rules
- TypeScript strict, no `any` without a comment explaining why.
- Named exports. Components < ~200 lines; split otherwise.
- Every component has a Storybook story per state (default/pressed/disabled/loading/error) and
  accessibility props (role, label, state).
- Validate all external data with Zod at the boundary. UI consumes typed domain models.
- Lists: FlashList with stable keys. Images: expo-image with thumbhash placeholder and
  display-sized sources.
- Wrap every storage/audio/network call with error handling that surfaces a designed error state.

## Definition of done (every slice)
- `tsc --noEmit`, lint, and unit tests pass.
- Runs on iOS and Android dev builds; tested on a low-end Android device.
- No UI-thread frame drops during the slice's main gesture (profile it).
- Reduced-motion and Tier 0 behaviors verified.
- Screen-reader pass done (labels, order, custom actions).
- Summary of changes, files touched, and anything skipped is posted.

## Commit style
Conventional commits, one slice per PR, screenshots/screen recordings for UI changes.
```

---

# Part 4 — Product spec (one page → `docs/SPEC.md`)

**Product:** OTO, a mobile music app where artwork, motion, type and atmosphere behave as one system. Feeling: *you didn't open a music app, you entered the music.*

**Users:** listeners on modern phones (60/90/120 Hz), many on mid-range Android. Music first, everything else quiet.

**v1 scope:** Home, Search, Library, Album, Artist, Playlist, Now Playing, Mini Player, Lyrics, Queue, Discovery, Profile/Insights (lightweight), Settings, Downloads, all empty/loading/error/offline states.

**Out of scope for v1:** tablet layouts, CarPlay/Android Auto (do not architecturally block), social features, podcasts.

**Success criteria:**
- Mini → full player transition is interruptible and stays smooth on the low-end Android target.
- Dynamic color never hurts legibility.
- Every effect has a reduced/lower-tier fallback that still looks designed.
- The app is fully usable offline for downloaded content.

**Assumptions to confirm** (record answers in this file): catalog/licensing source; download/DRM in v1; lyrics provider and word-timing availability; audio engine choice (Part 2.2); minimum OS versions; backend dependencies for lyrics search, personalization, waveform peaks and insights.

---

# Part 5 — Design system (→ `docs/DESIGN.md`)

## 5.1 Principles (ranked)
1. Usability 2. Music experience 3. Performance 4. Hierarchy 5. Motion quality 6. Accessibility 7. Polish 8. Novelty. Higher wins.

Modern guidance behind the choices:
- **Layering (Apple, Liquid Glass era):** content sits at the bottom; navigation and controls float above as a distinct layer. Glass is that layer's material.
- **Spring physics (Google, Material 3 Expressive):** motion is built from springs, not fixed durations, with two families: **spatial** springs (position, size, layout; may overshoot) and **effects** springs (color, opacity; never overshoot). OTO adopts this split.
- **Expressive hierarchy:** use shape, color, type and motion to direct attention to the single most important element on each screen.

## 5.2 Visual identity
Dark-first, near-black with luminance steps (not borders), artwork-derived atmosphere, subtle grain (2–4%, pre-tiled texture to avoid banding), one deliberate signature accent (not a default green, and not a purple-blue gradient). Choose the exact accent and typeface in P1 and record them here.

## 5.3 Tokens (starting values; tune on device)

```ts
// src/design/tokens.ts
export const color = {
  bg:   { base: '#0A0A0B', s1: '#111113', s2: '#17171A', s3: '#1E1E22' },
  text: { primary: 'rgba(255,255,255,0.94)', secondary: 'rgba(255,255,255,0.64)',
          tertiary: 'rgba(255,255,255,0.44)',  // metadata only
          disabled: 'rgba(255,255,255,0.32)' },// decorative/disabled only
  hairline: 'rgba(255,255,255,0.06)',
  glass: { tint: 'rgba(10,10,12,0.55)', solidFallback: 'rgba(18,18,20,0.94)',
           highlight: 'rgba(255,255,255,0.09)' },
} as const;

export const space  = [0, 4, 8, 12, 16, 20, 24, 32, 48] as const;
export const radius = { sm: 8, md: 12, lg: 20, xl: 28, full: 999 } as const;

export const type = {  // pt before OS font scaling: [size, lineHeight]
  display: [34, 40], title: [28, 34], headline: [22, 28], section: [20, 26],
  track: [17, 24], body: [15, 22], meta: [13, 18], caption: [11, 14],
} as const;

// Spring families, following the spatial/effects split
export const spring = {
  spatial: {
    fast:    { damping: 22, stiffness: 420, mass: 1 },
    default: { damping: 26, stiffness: 300, mass: 1 },   // player expand: no visible overshoot
    slow:    { damping: 28, stiffness: 200, mass: 1 },
    playful: { damping: 16, stiffness: 320, mass: 1 },   // press / like, slight overshoot
  },
  effects: {  // critically damped: color/opacity never overshoot
    fast:    { damping: 40, stiffness: 600, mass: 1 },
    default: { damping: 40, stiffness: 400, mass: 1 },
    slow:    { damping: 40, stiffness: 200, mass: 1 },
  },
} as const;

export const duration = { micro: 140, standard: 280, large: 480, environment: 800 } as const;
```

Typography: one variable sans (open license or one you hold) via `expo-font`, with fallbacks for **Devanagari, Arabic, CJK, Cyrillic** so lyrics never render as tofu. Support OS font scaling with per-style `maxFontSizeMultiplier`; titles wrap to two lines before truncating.

## 5.4 Quality tiers

| Tier | Environment | Blur/Glass | Visualizer | Motion |
|---|---|---|---|---|
| 3 Full | Animated Skia atmosphere, progressive blur | Native glass (iOS 26) / live blur | On, ≤60 fps | Full springs |
| 2 Balanced | Static Skia gradient, slow palette morph | Native blur or tint | Off by default | Full |
| 1 Lite | Pre-rendered gradient | Solid translucent tint | Off | Simplified |
| 0 Minimal | Flat palette color | None | Off | Crossfades only |

Auto-drop on sustained frame drops, OS low-power mode, or thermal pressure; user overrides in Settings. Pause Skia when backgrounded or off-screen.

## 5.5 Dynamic color pipeline
Artwork → decode ~64×64 off the UI thread → quantize → **OKLCH** clustering → roles (`dominant, secondary, accent, shadow, highlight`) → **contrast clamp** → cache in SQLite by artwork hash → shared values → Skia uniforms.
Transitions: artwork crossfade ~350 ms plus palette interpolation in OKLab ~600–800 ms (effects spring), retargeting from the current value if the track changes mid-transition. Define fallbacks for greyscale, near-black, near-white, single-saturated-dot art, and missing art.

## 5.6 Modern component set (use these, don't reinvent)

| Need | Use |
|---|---|
| Tab bar | Expo Router **Native Tabs** (platform-authentic; iOS 26 glass behavior for free). Custom floating bar only if the design demands it, built on headless tabs, with solid fallback. |
| Floating mini-player | Custom overlay (`OTOMiniPlayer`) with `GlassView` on iOS 26, blur/tint fallback elsewhere |
| Player transition | Single `playerProgress` shared value; measured artwork rects; Gesture Handler `Pan` with velocity handoff to `spring.spatial.default` |
| Utility sheets | Expo UI bottom sheet or `@gorhom/bottom-sheet` (pick one, evaluate Reanimated 4 compatibility) |
| Context menus | Native menu (iOS context menu / Android sheet), one action list, two presentations |
| Sliders/pickers/toggles | Expo UI native components where visually acceptable; custom Skia scrubber for the player |
| Progressive blur | Skia masked backdrop blur (Tier 3), gradient fade (Tier 2), solid tint (Tier ≤1) |
| Lists | FlashList v2; lyrics via measured offsets + a single scroll shared value |
| Icons | SF Symbols on iOS via `expo-symbols`; consistent stroke set for Android/shared |
| Loading | Thumbhash artwork placeholders, artwork-shaped skeletons |
| Haptics | `expo-haptics`: play/pause, like, scrubber grab/release, queue pickup/drop, sheet snap, success |

## 5.7 Screens (summary; each is fully specified by its prompt in Part 6)

**Now Playing** (most important): environment behind; artwork ~42% of height; title/artist/like; scrubber or precomputed-peaks waveform; transport (shuffle, prev, **play/pause dominant**, next, repeat); secondary (lyrics, queue, output, timer, more). Artwork scales subtly on pause; no constant floating. Swipe down collapses; horizontal swipe on artwork skips; every gesture has a button/accessibility action.

**Mini Player:** floating glass bar with artwork, title/artist, play/pause, thin progress; vertical pan expands; horizontal pan skips.

**Lyrics:** current line full opacity and larger (via transform scale, not font-size), neighbors 40–55%, others 25–35%; word-level color sweep when timing exists; auto-follow with a Resume pill after manual scroll; tap line to seek; translation and romanization toggles; states for loading, unavailable, instrumental.

**Queue:** Now playing (dominant) → Next in queue (user-added, draggable) → Autoplay (labeled, separable) → History. Lift-and-drop reorder with haptics; swipe to remove/play next; **custom accessibility actions** for move/remove.

**Home:** greeting + avatar + search entry → one artwork-led Hero → Continue listening (compact) → Made for you (large carousel) → Quick picks (dense list) → New releases → Moods (typographic) → Artists. Vary density; do not stack identical card rows.

**Search:** instant recents and suggestions; Top result then Songs/Artists/Albums/Playlists/Lyrics; debounce 150–250 ms; cancel in-flight; helpful empty/no-results.

**Library:** filter chips over mixed layouts; Liked Songs pinned; download-state badges (downloaded, downloading, queued, failed, unavailable) as icon + text, never color-only.

**Album / Artist / Playlist:** palette-tinted header fading into `bg.base`, collapsing header with parallax, sticky play/shuffle, borderless rows, card → header shared-rect transition.

**Discovery / Profile / Insights / Settings / Downloads:** short, explained ("why you're seeing this"), few expressive charts (no dashboard grids), full text equivalents for screen readers, Settings includes Reduce Animations, Reduce Blur, Dynamic Colors, Visualizer, High-Quality Artwork, Quality tier override.

## 5.8 Accessibility and reduced motion

| Normal | Reduced motion / Reduce blur |
|---|---|
| Artwork scale + parallax + progressive blur + palette morph | Simple crossfade, static gradient |
| Player expand with artwork travel | Fade between mini and full |
| Lyrics eased scroll + scale | Snap + highlight change |
| Animated visualizer | Static or off |
| Springs with overshoot | Short fades using effects springs |
| Glass | Opaque tinted surface |

Also required: screen-reader labels and states, polite debounced track-change announcements, adjustable-role scrubber (±10 s), OS font scaling to 200% without clipping, WCAG AA contrast against real rendered backgrounds, no state conveyed by color alone.

## 5.9 Anti-"AI slop" checklist (reject a slice if any is true)
- Hard-coded color, size, spacing or duration in a component.
- Default gradient hero, purple/blue accent, or emoji used as an icon.
- Every section is the same card in a horizontal scroller.
- Borders on every surface instead of luminance and spacing.
- Glass used on content, or glass stacked on glass.
- Animation that runs on the JS thread or re-renders per frame.
- Effect present at Tier 3 with no lower-tier fallback.
- Text over artwork without a verified scrim/contrast.
- Gesture with no accessible alternative.
- Placeholder copy ("Lorem ipsum", "Song 1") left in a shipped state.

---

# Part 6 — Prompt pack (paste one at a time)

Every prompt below assumes `AGENTS.md`, `docs/SPEC.md`, and `docs/DESIGN.md` are in the repo. Start each session with: *"Read AGENTS.md, docs/SPEC.md and docs/DESIGN.md. Then do the task below. Post a plan before editing."*

### P0 — Scaffold and de-risk
**Task:** Create the Expo project (latest stable SDK), New Architecture, TypeScript strict, Expo Router with Native Tabs (Home, Search, Library), ESLint/Prettier, Jest, Storybook, a mock-data layer (local JSON + royalty-free artwork), and a dev-build config. Add `expo-image`, Reanimated 4 + worklets, Gesture Handler, Skia, FlashList v2, MMKV, expo-sqlite, expo-haptics, expo-glass-effect, expo-blur.
**Constraints:** no other dependencies; no `@react-navigation/*` imports; run `expo-doctor` clean.
**De-risk:** add a screen that mounts a trivial Reanimated shared value and a Skia canvas, then report memory on a low-end Android device and note whether the Hermes v1 / worklets memory issue in Part 2.4 applies to the pinned versions. Report the Expo changelog's current guidance.
**Acceptance:** builds and runs on iOS and Android dev builds; `tsc`, lint, tests pass; a written note on memory findings and pinned versions.

### P1 — Design tokens and primitives
**Task:** Implement `src/design/tokens.ts` from Part 5.3, a `ThemeProvider`, `useQualityTier()` and `useReducedMotion()` hooks, and primitives: `OTOText`, `OTOIconButton`, `OTOButton`, `OTOGlassSurface` (GlassView on iOS 26 with `isLiquidGlassAvailable`/`isGlassEffectAPIAvailable` guards; blur/tint fallback on Android and older iOS), `OTOArtwork` (expo-image + thumbhash).
**Constraints:** all values from tokens; press states via Reanimated CSS-style transitions or shared values; every primitive has stories for each state and accessibility props.
**Acceptance:** Storybook shows each primitive in default/pressed/disabled/reduced-motion/Tier 0; glass fallback verified on Android.

### P2 — Dynamic color pipeline
**Task:** Build `OTOPaletteProvider`: extract a palette off the UI thread (native or Skia `readPixels` on a 64×64 downsample), cluster in OKLCH, assign roles, apply the contrast clamp, cache in SQLite by artwork hash, and expose palette values as shared values. Add a debug screen with 12 test artworks including greyscale, near-black, near-white and single-dot art.
**Constraints:** no palette work on the UI thread; no React re-render on palette change; unit-test the clamp math.
**Acceptance:** all roles pass contrast rules against `bg.base`; extraction time reported for the low-end Android device; cache hit path verified.

### P3 — Audio engine interface and fake engine
**Task:** Define `AudioEngine` (`load, setQueue, play, pause, seek, next, previous, setRate, setRepeat, setShuffle, setCrossfade?`, events for state/position/track/error) in `src/audio/`. Implement a **fake engine** (timer-based) and a Zustand store that holds discrete state only (current track, status, queue ids). Implement UI-thread position interpolation from `(lastPosition, lastTimestamp, rate)` into a shared value.
**Constraints:** UI never imports an audio library; position never enters React state.
**Acceptance:** scrubbing and time labels update smoothly with no React renders (verify with the profiler); unit tests for the interpolation.

### P4 — Player shell: Mini ⇄ Now Playing
**Task:** Build the persistent overlay driven by one `playerProgress` shared value. `OTOMiniPlayer` (glass bar, artwork, title/artist, play/pause, thin progress) and an empty `OTONowPlaying` container. Vertical `Pan` expands/collapses with velocity handoff to `spring.spatial.default`; tap expands; horizontal pan on the mini bar skips. Artwork travels between measured mini and full rects. Sits above the Native Tabs bar without overlapping.
**Constraints:** interruptible mid-gesture; all motion via shared values; no state updates per frame; reduced motion replaces artwork travel with a crossfade.
**Acceptance:** reverse the drag halfway repeatedly with no jump; frame times stay within budget on the low-end Android device; screen-reader alternative to expand/collapse exists.

### P5 — Now Playing content
**Task:** Fill `OTONowPlaying` with the layout in Part 5.7: track info + like, Skia scrubber (adjustable role, time preview, haptic on grab/release), transport with a dominant play/pause, secondary actions, and the artwork pause-scale behavior. Add `OTODynamicBackground` (Skia atmosphere at Tier 3, static gradient at Tier 2, flat color at Tier ≤1) driven by palette shared values with the track-change transition from 5.5.
**Constraints:** no React re-render on progress or palette change; contrast clamp respected; landscape layout supported.
**Acceptance:** rapid track skipping shows retargeted, non-flashing transitions; Tier 0–3 all verified; 200% font scale has no clipping.

### P6 — Lyrics
**Task:** `OTOLyrics` with inline and full-screen modes. Parse LRC (required) and enhanced LRC/TTML (optional); support translation and romanization tracks; measure line offsets once; drive highlight and auto-follow from playback shared value; manual scroll pauses auto-follow with a Resume pill; tap line to seek; all designed states (loading, unavailable, instrumental).
**Constraints:** scale via transform, not font size; multi-script fallback fonts verified (Devanagari, Arabic, CJK); reduced motion snaps instead of eased scroll.
**Acceptance:** unit tests for parsers; smooth at 120 Hz on a capable device; no layout thrash during playback.

### P7 — Queue
**Task:** `OTOQueue` with sections (Now playing, Next in queue, Autoplay, History), lift-and-drop reorder with haptics and edge auto-scroll, swipe to remove/play next with undo, and custom accessibility actions for move up/down/remove. Prototype reorder on the list solution first and report whether FlashList or a bounded list is used and why.
**Acceptance:** reorder works with a screen reader via actions; reorder stays smooth with 200 items.

### P8 — Home
**Task:** Build Home per Part 5.7 with varied section densities, artwork-led Hero using the palette environment, skeletons, and error/offline states. Use mock catalog data.
**Constraints:** no more than two adjacent sections share the same card style; all sections have a designed empty and error state.

### P9 — Search and Library
**Task:** Search with debounce, cancellation, recents (MMKV), Top result and grouped results; Library with filter chips, Liked Songs pin, adaptive layouts, sort/view toggle, download-state badges (icon + text). Full offline behavior on downloaded content.

### P10 — Album, Artist, Playlist
**Task:** Palette-tinted collapsing headers with parallax, sticky play/shuffle, borderless track rows, context sheet via `⋯`, and the card → header shared-rect transition reusing the player's rect technique.

### P11 — Glass, tab bar, progressive blur
**Task:** Finalize the tab bar (Native Tabs, with iOS 26 behavior; custom floating variant only if needed), the glass recipe from Part 5, and Skia progressive blur at header and bottom edges for Tier 3 with Tier 2/1 fallbacks. Add hide-on-scroll where appropriate without overlapping the mini-player.
**Acceptance:** every glass surface has a verified non-glass fallback; measured cost of progressive blur reported per device, with a kill switch.

### P12 — Visualizer
**Task:** One signature Skia visualizer (organic ribbon or palette-seeded particle field). Implement three data modes: real FFT (only if the audio engine provides it), precomputed energy map, and tempo-driven synthetic fallback. Label nothing as audio-reactive unless real data is in use. Cap at 30–60 fps, pause off-screen, off by default on Tier ≤2 and in battery saver.

### P13 — Downloads and offline
**Task:** Download manager with a SQLite manifest, states (queued, downloading with progress, downloaded, failed with reason, unavailable), storage summary, retry, Wi-Fi-only setting, offline banner, and playback that skips unavailable tracks with explanation. Confirm licensing/DRM assumptions in `docs/SPEC.md` before starting.

### P14 — Discovery, Profile, Insights, Settings, hardening
**Task:** Discovery surfaces that state why they are shown, Profile and 3–4 expressive insight visualizations with text equivalents, Settings (quality tier, Reduce Animations/Blur, Dynamic Colors, Visualizer, HQ Artwork). Then a hardening pass: accessibility audit, performance traces, E2E flows in Maestro (play, expand/collapse, skip, queue reorder, offline).

---

# Part 7 — Review prompts and Definition of Done

**After every slice, paste:**

> Review the code you just wrote against AGENTS.md and docs/DESIGN.md. List, with file and line: (1) any hard-coded design values, (2) any per-frame React state or context updates, (3) any effect without a Tier 0–2 or reduced-motion fallback, (4) any gesture without an accessible alternative, (5) missing error/empty/loading states, (6) any new dependency. Fix what you find, then summarize residual risks. Do not change unrelated files.

**Performance prompt:**

> Identify every code path that runs during the main gesture of this slice. Confirm each runs on the UI thread. Report expected UI-thread work per frame and what would break at 120 Hz on a mid-range Android device. Propose the smallest change that removes any risk.

**Accessibility prompt:**

> Walk this screen with a screen reader in reading order. List each element's role, label and state, every gesture and its non-gesture alternative, contrast for every text/background pair including artwork-derived backgrounds, and behavior at 200% font scale and in reduced-motion mode.

**Definition of done (all must be true):** typecheck, lint and tests green · runs on iOS and Android dev builds · verified on the low-end Android target · gesture profiled without UI-thread drops · Tier 0–3 and reduced-motion checked · screen-reader pass complete · Storybook stories for each state · screenshots or a recording attached · changes committed.

---

# Appendix — When the agent gets stuck

- **It fakes an effect it can't build** → tell it to stop, list what is impossible on this stack, and propose alternatives (Part 2 and AGENTS.md rule 7).
- **It adds a dependency** → revert, and require justification and approval.
- **It re-renders per frame** → ask it to show the shared-value graph for the interaction and remove every `setState` in the path.
- **Glass looks wrong on Android** → that is expected; fix the fallback tint and hairline, do not chase iOS parity.
- **Long session degrades** → start a fresh session with the three docs and the specific slice; commit first.
