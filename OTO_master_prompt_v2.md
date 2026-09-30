# OTO — Master Product & Design-System Prompt (v2)

## 0. How to use this prompt

This prompt is written to be given to a design/engineering collaborator (human or AI) **in phases**, not all at once. Asking for 30 screens plus a full design system in one response produces shallow output everywhere. Work in this order and approve each phase before starting the next:

| Phase | Deliverable | Gate |
|---|---|---|
| 1 | Brand, tokens (color, type, spacing, radius, elevation, motion), quality tiers | Tokens exist as TypeScript, not just prose |
| 2 | Core loop: Mini Player ⇄ Now Playing, Lyrics, Queue, dynamic-color pipeline | Interaction spec + implementation plan per component |
| 3 | Home, Search, Library, Album, Artist, Playlist | Screen specs with all states |
| 4 | Discovery, Profile, Insights, Settings, Downloads | Screen specs |
| 5 | Empty/loading/error/offline states, accessibility audit, performance test plan | Checklists signed off |

Every phase output must use the formats in **Section 15**.

---

## 1. Role and goal

You are a senior product designer paired with a senior React Native engineer. Design **OTO**, a premium, dark-first, music-first mobile app for iOS and Android whose Now Playing experience feels like an immersive environment rather than a media-player screen.

The output must be specific enough that an engineer can build it without reinterpreting the visual language, and honest enough that nothing in it depends on an effect the stack cannot deliver.

**Reference handling.** Use Apple Music (refinement), Spotify (discoverability), TIDAL (atmosphere) and BitChord (immersive player, artwork-derived environment, lyrics, floating controls) as *quality benchmarks only*. Describe the **principles** you take from them in your own words. Do not reproduce their layouts, components, colors or branding, and do not assert specific details of any product you cannot verify.

**Feeling to hit:** *You didn't open a music app. You entered the music.*

---

## 2. Design principles (decision rules)

Ranked. When two conflict, the higher one wins.

1. **Usability** — every core action reachable one-handed, ≥44×44 pt (iOS) / 48×48 dp (Android) targets.
2. **Music experience** — playback never stutters, controls never lag, music is the visual hero.
3. **Performance** — visuals degrade before interaction does.
4. **Hierarchy** — one focal point per screen.
5. **Motion quality** — continuity and causality over spectacle.
6. **Accessibility** — treated as a constraint on 1–5, not a polish item.
7. **Polish, then novelty.**

**Avoid:** Spotify/Apple Music clones, card-everything grids, blanket glassmorphism, neon/cyberpunk, decorative 3D, gradients on every surface, glow as a default, JS-thread-driven animation, hundreds of animated React nodes for one effect.

---

## 3. Platform baseline and stack

### Target devices (design and test against these, not flagships)
- **Low-mid Android:** ~Pixel 6a / Galaxy A5x class, 60–90 Hz. *This is the performance floor.*
- **Mainstream:** iPhone 12–15, Pixel 8, Galaxy S2x, 60–120 Hz.
- **Small screens:** 360×640 dp Android, iPhone SE class. **Large:** 430 pt+ wide, foldables in cover-screen mode (tablet layouts are out of scope for v1 but must not break).

### Stack
| Concern | Choice | Grounding notes |
|---|---|---|
| App | React Native (New Architecture), TypeScript, Expo dev builds | Reanimated 4 and FlashList v2 require the New Architecture. Expo Go will not work once custom native audio is added. |
| Animation | Reanimated 4 + `react-native-worklets` | Worklets now ship as a separate package. Pin versions and test the whole set together. |
| Gestures | Gesture Handler | Use `Gesture.Pan()` etc. driving shared values directly. |
| GPU visuals | `@shopify/react-native-skia` | Mesh-like backgrounds via Skia `Patch` (Coons patch) or a runtime-effect shader; there is no built-in "mesh gradient" primitive. |
| Images | `expo-image` | Use `cachePolicy`, blurhash/thumbhash placeholders, correctly sized sources. |
| Blur | Native blur (`expo-blur`) for static surfaces; Skia for animated/progressive | Android native blur has historically been less consistent than iOS. Verify on the target Android devices and provide a translucent-solid fallback. |
| Sheets | `@gorhom/bottom-sheet` for utility sheets (track actions, sleep timer, settings) | **Not** for the Now Playing expansion (see §6). Verify the installed version's Reanimated 4 compatibility before committing. |
| Lists | FlashList | Always provide `estimatedItemSize`/stable keys; avoid animating individual rows with JS. |
| Haptics | `expo-haptics` | See §12. |
| Storage | MMKV for settings/small state; SQLite for library, downloads, palette cache, lyrics cache | |
| Audio | **Native audio engine behind a single TypeScript interface** | See §10. This is the highest-risk part of the project. |

Every recommendation in this document that is a *starting value* (springs, durations, thresholds) must be tuned on device. Say so in the spec rather than presenting numbers as final.

---

## 4. Rendering architecture

### 4.1 Layer stack (per screen with an environment)
```
Artwork  →  Palette  →  Atmosphere (Skia)  →  Blur  →  Vignette/gradient  →  Surface  →  Content
```
Only *Atmosphere* and *Vignette* are Skia. Content is ordinary React Native so text, accessibility and layout stay native.

### 4.2 Threading rule
High-frequency input follows exactly one path:
```
Gesture Handler → Shared Value → Worklet (UI thread) → Animated style / Skia uniforms
```
No `setState` during a gesture or per-frame animation. React state changes only on **discrete events** (track change, sheet snapped, mode toggled).

### 4.3 Single source of truth for the player
`playerProgress` is one shared value, `0` = mini, `1` = full. Every element (artwork size/position, background opacity, controls layout, mini-player fade, tab-bar offset) is a pure interpolation of it. Gesture, tap, and programmatic open all write to this one value. This is what makes the transition interruptible and reversible for free.

Implement the player as **a persistent overlay component, not a navigation screen.** Screens underneath keep their scroll position and state.

### 4.4 Quality tiers
Effects are gated by a tier. The app picks a tier at launch and can drop one tier at runtime.

| Tier | Environment | Blur | Visualizer | Motion |
|---|---|---|---|---|
| **3 — Full** | Animated Skia atmosphere, progressive blur | Live | On (≤60 fps cap) | Full |
| **2 — Balanced** | Static Skia gradient, slow palette morph | Native blur | Off by default | Full |
| **1 — Lite** | Pre-rendered gradient image | Solid translucent surfaces | Off | Simplified |
| **0 — Minimal** | Flat palette color | None | Off | Crossfades only |

Auto-downgrade triggers: sustained dropped frames (measure UI-thread frame time over ~2 s), OS low-power mode, thermal state "serious", or the user's Reduce Animations / Reduce Blur settings. Never upgrade automatically mid-session without a stable window.

Pause all Skia animation when the app is backgrounded, the player is collapsed (unless the mini-player shows it), or the screen is off.

---

## 5. Dynamic artwork color pipeline

```
Artwork URL → decode small (≈64×64) → quantize → OKLCH clustering → role assignment
           → contrast clamp → cache (SQLite, keyed by artwork hash) → shared values
```

- **Run off the UI thread**, once per artwork, ideally prefetched for the next queued track. Options: a small native module (Android `Palette` / iOS Core Image sampling) or Skia `readPixels` on a downsampled image. Prefer whichever is measurably cheaper on the low-end Android target.
- **Roles:** `dominant`, `secondary`, `accent`, `shadow` (darkest), `highlight`.
- **Work in OKLCH/OKLab**, not RGB/HSL: interpolate and adjust lightness there for perceptually even transitions.
- **Contrast clamp is mandatory.** Artwork-derived colors are only used as *fills, glows and accents*. Body text is always near-white. Any accent used for text or icons on a dark surface is lightened until it reaches **≥4.5:1** (≥3:1 for large text/graphical objects). Backgrounds are darkened/desaturated to a max lightness so the near-white text always passes.
- **Failure cases to define:** monochrome/greyscale art, very dark art, very bright/white art, art with a single saturated dot on white, missing art (use OTO fallback palette).
- **Track change:** crossfade artwork (≈350 ms) while interpolating palette shared values in OKLab (≈600–800 ms, ease-out) and morphing gradient stops. One perceived transition, no flash. If a change arrives mid-transition, retarget from the current interpolated value.
- **Tier behavior:** Tier 0–1 do a plain color crossfade.

---

## 6. Design tokens (starting values)

### 6.1 Color
```
bg.base      #0A0A0B     surface.1  #111113
surface.2    #17171A     surface.3  #1E1E22
text.primary rgba(255,255,255,0.94)
text.secondary rgba(255,255,255,0.64)
text.tertiary  rgba(255,255,255,0.44)   // metadata only; not for essential info
text.disabled  rgba(255,255,255,0.32)   // decorative/disabled only
border.hairline rgba(255,255,255,0.06)  // use sparingly
```
Semantic: `success`, `warning`, `error`, `info` — muted, desaturated, checked for contrast on all surfaces. Provide a fallback brand accent (used when no artwork palette exists). Define the OTO **signature accent** deliberately; it should not be a default green, purple-blue "AI" gradient, or neon.

Add a very subtle **grain/noise** overlay (≈2–4% opacity, pre-tiled texture, not a per-frame shader) to hide gradient banding on dark backgrounds.

### 6.2 Typography
- One variable sans-serif with an open license (or a commercial license you actually hold), loaded via `expo-font`. Name the exact font and weights in the spec.
- **Script coverage matters for lyrics:** specify fallback fonts for Devanagari, Arabic, CJK, Cyrillic, and Latin diacritics, and verify line-height and clipping in each.
- Scale (pt, before Dynamic Type): Display 34/40, Title 28/34, Headline 22/28, Section 20/26, Track title 17/24 (semibold), Body 15/22, Artist 15/20, Meta 13/18, Caption 11/14 (minimum).
- Support OS font scaling. Use `maxFontSizeMultiplier` per style (e.g., 1.3 for chrome, 2.0+ for body/lyrics) and specify what reflows or truncates at each step. Track titles wrap to two lines before truncating at large sizes.

### 6.3 Spacing, shape, elevation
- 4-pt base grid: `4, 8, 12, 16, 20, 24, 32, 48`. Screen gutter 20 (16 on ≤360 wide).
- Radii: `8` (chips/rows), `12`, `20` (cards), `28` (sheets/mini-player), `full`.
- Elevation is expressed through luminance step + soft shadow + hairline highlight, not borders on every element.

### 6.4 Glass surface recipe (used only for mini-player, tab bar, sheets, contextual controls)
```
backdrop blur → dark tint (surface.2 @ 55–70%) → 1px inner highlight (top-edge, white @ 8–10%)
→ hairline border (white @ 6%) → content
```
Tier 1 and below: replace blur with the same tint at higher opacity.

### 6.5 Motion tokens
| Token | Duration | Use |
|---|---|---|
| `micro` | 100–180 ms | press, icon morph, toggle |
| `standard` | 200–350 ms | list changes, sheet content, fades |
| `large` | 350–600 ms | player expand/collapse (spring-settled), page transitions |
| `environment` | 500–1000 ms | palette/background morph |

Spring starting points (Reanimated `withSpring`, tune on device):
```
press:        { damping: 18, stiffness: 420, mass: 0.6 }
standard:     { damping: 22, stiffness: 300, mass: 1 }
playerExpand: { damping: 26, stiffness: 220, mass: 1 }   // settle without visible overshoot
sheetSnap:    { damping: 28, stiffness: 260, mass: 1 }
```
Rules: gestures hand off their release **velocity** to the spring; drag past bounds uses rubber-banding; every transition is interruptible; no easing curve is used for something the user is physically dragging.

---

## 7. Core components and specs

### 7.1 Mini Player
- Floating glass bar above the tab bar. Contents: artwork (rounded, 44–48), title, artist, play/pause, thin progress line. Optional next/previous via horizontal swipe on the bar.
- Tap or drag up → `playerProgress` 0→1. Artwork animates from its mini rect to its full rect (measured once, stored as shared values); the environment fades in beneath.
- **Gesture zones:** vertical pan on the bar and full player header area; horizontal pan for skip. Define how they disambiguate (direction lock after ~10 pt).
- Progress is drawn on the UI thread from a shared value (see §10), not React state.
- Reduced motion: no artwork travel; crossfade between mini and full.

### 7.2 Now Playing (full)
Vertical layout (small-phone safe; ratios, not fixed pixels):
```
Grab handle / close, context ("Playing from …"), overflow  ~8%
Artwork (square, max width = screen − 2×gutter, capped by height) ~42%
Track title / artist / like                                    ~12%
Progress (scrubber or waveform) + times                        ~10%
Transport: shuffle · prev · PLAY/PAUSE · next · repeat         ~12%
Secondary: lyrics · queue · cast/output · timer · more         ~8%
```
- **Artwork behavior:** scales down subtly when paused (e.g., 1.0 → 0.92) and returns on play; small parallax with vertical drag; no continuous floating motion by default.
- **Scrubber:** enlarges on touch, shows time preview, haptic on grab/release, and is exposed as an accessible *adjustable* element (increment/decrement by 10 s).
- **Waveform option:** precomputed peaks (per-track, cached; generated server-side or on download), rendered in Skia. Fallback to a plain bar when unavailable.
- **Swipe down** collapses; **swipe up** on secondary area opens lyrics/queue sheet; **horizontal swipe on artwork** skips tracks (with visible artwork slide and velocity threshold).
- **Landscape:** artwork left, controls right; environment unchanged.

### 7.3 Lyrics
- Modes: **inline** (replaces artwork area with a compact 3-line view) and **full-screen**.
- Data: line-timed (LRC) required; word-timed (enhanced LRC / TTML) optional; plain unsynced fallback; optional translation and romanization tracks toggled independently.
- Style: current line full-opacity and larger (≈+20% scale via transform, not font-size change, to avoid re-layout), neighbors 40–55% opacity, distant lines 25–35%. Word-level highlight is a masked color sweep, driven by a shared value tied to playback time.
- Auto-follow scrolls current line to ~35% from top. Manual scroll pauses auto-follow and shows a "Resume" pill; tapping a line seeks to it. Do not re-run layout per line; measure once and store offsets.
- Long lines wrap. Multi-script lines respect RTL and the fallback fonts from §6.2.
- Reduced motion: current line changes via opacity/weight-free highlight, no scale or eased scroll; instant snap.
- States: loading (skeleton lines), not available, instrumental, out-of-sync report.
- Legal: lyrics come from a licensed provider; the UI must not assume every track has lyrics.

### 7.4 Queue
- Bottom sheet or in-player mode with sections: **Now playing** (visually dominant), **Next in queue** (user-added, draggable), **Autoplay / Up next** (recommended, clearly labeled and separable), **History** (collapsed).
- Drag handle reorder with lift (scale 1.02 + shadow), haptic on pickup and on drop, auto-scroll near edges. Swipe row to remove (with undo snackbar) and to "play next".
- Accessibility: reorder via **custom accessibility actions** (Move up / Move down / Remove), because drag is not operable with a screen reader.
- Implementation note: reorder over FlashList needs a proven approach (or a bounded-length virtualized list). Prototype early; this is a known difficulty.

### 7.5 Progressive blur
- Used at the top edge under status bar/headers and above the tab bar/mini-player so scrolling content dissolves rather than clipping.
- Implementation: stacked blur layers with gradient masks, or a Skia backdrop filter with a mask shader. It is **expensive**. Ship it Tier 3 only; Tier 2 uses a static gradient fade to background color; lower tiers use a solid tinted bar.
- Blur radius/opacity are token-driven, not hard-coded per screen.

### 7.6 Visualizer
- Skia-drawn, one signature style (e.g., a slow organic waveform ribbon or a particle field seeded by palette), **not** an equalizer bar chart. Renders behind or inside the artwork zone at low contrast so it never competes with text.
- **Data source (important):** true beat/FFT reactivity requires access to decoded audio. That means a native audio tap (Android Media3 audio processor; iOS AVAudioEngine tap or `MTAudioProcessingTap`), which may be unavailable for DRM-protected or certain streamed content. Design the visualizer to work in three modes: (a) real FFT data, (b) precomputed energy/beat map from the track, (c) tempo-driven synthetic motion. Pick (c) as the guaranteed fallback and label nothing as "audio-reactive" unless (a) or (b) is active.
- Cap at 30–60 fps, single Skia canvas, uniforms updated from shared values, no per-particle React nodes. Off by default on Tier ≤2 and when battery saver is on.

### 7.7 Floating tab bar
Home · Search · Library (+ optional Profile). Glass surface, animated active indicator, hides on scroll-down in long lists and returns on scroll-up or when the mini-player is interacted with. Respects safe areas and the Android gesture/navigation bar. Never overlaps the mini-player; they are stacked with a defined gap.

---

## 8. Screens

For **each** screen the spec must include: purpose · layout (with ratios/tokens) · content hierarchy · states (loading, empty, error, offline, populated) · interactions and gestures · transitions in/out · responsive behavior (small/large, font scale 100%/200%) · accessibility notes · implementation notes · Tier 0–3 differences.

**Home.** Greeting + avatar + search entry. Editorial hierarchy: one **Hero** (artwork-led, environment-tinted, single primary action) → *Continue listening* (compact, horizontal) → *Made for you* (large artwork carousel) → *Quick picks* (dense 2–3 column list of songs) → *New releases* → *Moods/genres* (typographic, not image cards) → *Recommended artists*. Vary density between sections; cap visible sections before "See more". Skeleton states use artwork-shaped placeholders and thumbhash.

**Search.** Focus → instant recent searches and typeahead suggestions. Results are grouped with a **Top result** first, then Songs, Artists, Albums, Playlists, and Lyrics matches (lyrics search requires a backend index; mark as dependent). Debounce input (~150–250 ms), cancel in-flight requests, cache recents in MMKV. Empty and no-results states offer alternatives, not dead ends.

**Library.** Segmented filter chips (Playlists · Albums · Artists · Downloads) over a mixed layout; **Liked Songs** as a pinned, distinct entry; sort and view toggle (list/grid); download state badges (downloaded · downloading with progress · queued · failed · unavailable) that are icon + text-accessible, not color-only. Works fully offline.

**Album / Artist / Playlist.** Header uses the artwork palette for a soft environment that fades into `bg.base` by first-scroll; collapsing header with parallax (Reanimated scroll handler); sticky play/shuffle. Track rows: number or artwork, title/artist, explicit/download/like indicators, `⋯` for the context sheet; no borders between rows. Artist: follow, popular, discography tabs/sections, related artists. Playlist: creator, description (expandable), collaborators if supported, reorder/edit mode. Transition from a card: artwork expands into the header (shared-rect approach, same technique as the player).

**Discovery.** Quick Mix, Mood Mix, Because you listened to…, Hidden gems, New for you. Each surface explains *why* it's shown in one short line. Personalization must degrade gracefully for new users (cold start).

**Profile & Insights.** Identity header, top artists/genres/tracks, listening minutes, streaks, favorite moods. Visualize with a small number of expressive charts (Skia or SVG) instead of card grids. All insights have text equivalents for screen readers. Privacy controls and "clear history" live here. Do not invent metrics the data layer can't provide.

**Settings.** Playback (crossfade, gapless, normalization, audio quality per network), Appearance (Reduce Animations, Reduce Blur, Dynamic Colors, Visualizer, High-Quality Artwork, Quality tier override), Downloads (quality, storage limit, Wi-Fi only), Lyrics (translation, romanization, text size), Notifications, Account, About.

**Downloads.** Storage summary, queue with per-item progress/pause/retry, failure reasons in plain language, "Available offline" filter.

---

## 9. Sheets and menus

- **Utility sheets** (track actions, playlist actions, sleep timer, playback speed, lyrics settings, share, add to playlist) use `@gorhom/bottom-sheet` with defined snap points, backdrop, and dismiss gesture.
- **Context menu vs sheet:** long-press on a row opens a native-feeling context menu on iOS where suitable, and the same action set in a bottom sheet on Android. One action list, two presentations.
- Standard action order: Play next · Add to queue · Add to playlist · Like · Download · Go to artist · Go to album · Share · (destructive last).
- Sheets must not be used to host the Now Playing expansion; they can't express the shared-element, environment-level transition with the control we need.

---

## 10. Audio, data and platform realities (call these out in the spec)

- **Audio engine:** build behind a TypeScript interface (`play, pause, seek, load, setQueue, setCrossfade, getPosition, events`). Android: Media3/ExoPlayer with a `MediaSession`/`MediaLibraryService`; iOS: AVFoundation with `MPNowPlayingInfoCenter` and `MPRemoteCommandCenter`. Consider an existing library (e.g., a maintained track-player module) vs. a custom Expo module, and justify the choice. **Crossfade and gapless are not free** — they require dual-player or a custom pipeline. Scope them explicitly.
- **Playback position:** native emits position at ~4–10 Hz; the UI thread **interpolates** between updates using the last position, timestamp and playback rate, so the scrubber and lyrics are smooth at 120 Hz without more events.
- **Lock screen / notification / headset / car:** required. Artwork, controls, seek, and metadata on both platforms; Android Auto and CarPlay are future scope but must not be architecturally blocked.
- **Interruptions:** audio focus/session handling for calls, other apps, headphone unplug, Bluetooth.
- **Background restrictions:** Android foreground service, battery optimization, notification permission (Android 13+); iOS background audio capability.
- **Offline:** downloads stored in app storage with a manifest in SQLite; DRM/licensing constraints depend on the content source and must be resolved before designing "download" as guaranteed.
- **Content rights:** streaming rights, lyrics licensing, and artwork usage depend on the catalog provider. State the assumed data source and where the design depends on it.

---

## 11. Motion behavior summary

| Level | Examples | Approach |
|---|---|---|
| Micro | press scale (0.96), icon morph play↔pause, like burst, progress tick | Reanimated, `micro` token, spring |
| Medium | sheet open, row swipe, artwork skip, lyric line change | Reanimated + Gesture Handler |
| Large | mini ⇄ full player, card → detail header | Single `playerProgress` / shared-rect interpolation |
| Environmental | palette morph, atmosphere drift | Skia uniforms from shared values |

Every animation needs a defined reduced-motion behavior (§13). Do not animate for its own sake; each animation must communicate hierarchy, continuity, causality or spatial origin.

---

## 12. Haptics

Use for: play/pause (light), like (success/selection), scrubber grab/release, queue pickup/drop, sheet snap, sleep-timer set, successful download/add. Not for: scrolling, every tap, purely decorative motion. Provide a Settings toggle and respect the system haptics setting.

---

## 13. Accessibility

- **Screen readers:** meaningful labels ("Play, Blinding Lights, The Weeknd"), roles, state (`selected`, `busy`, `expanded`), live announcements for track change (polite, debounced), ordered focus (player controls before secondary actions).
- **Gestures need alternatives:** every swipe/drag has a button or custom accessibility action (skip, dismiss player, reorder, remove).
- **Text:** OS font scaling with defined limits; no clipped or overlapping text at 200%; lyrics respect user size.
- **Contrast:** WCAG AA against *actual rendered backgrounds* including artwork-derived environments. Add a scrim/overlay rule when art is behind text.
- **Targets:** ≥44 pt / 48 dp with adequate spacing.
- **Motion:** honor OS "Reduce Motion" (Reanimated `useReducedMotion`) and an in-app override.

| Normal | Reduced motion |
|---|---|
| Artwork scale + parallax + progressive blur + palette morph | Simple crossfade; static gradient |
| Player expand with artwork travel | Fade between mini and full |
| Lyrics eased scroll + scale | Instant snap + highlight change |
| Animated visualizer | Static or off |
| Springs with overshoot | Short linear/ease fades |

- **Reduce blur / Reduce transparency:** replace glass with opaque tinted surfaces.
- **Color independence:** download and playback states never rely on color alone.

---

## 14. Performance budgets and verification

Budgets (starting targets; measure on the low-end Android device):
- **Interaction frames:** UI thread ≤ 8.3 ms at 120 Hz and ≤ 16.6 ms at 60 Hz during player gestures; JS thread not required to be active during a gesture.
- **Scroll:** no visible frame drops in Home with images loading.
- **Cold start to interactive:** define a target (e.g., <2 s mid-range) and measure.
- **Memory:** cap decoded image cache; artwork decoded at display size; release Skia images when off-screen.
- **Battery:** define a per-hour drain budget for playback with screen on at Tier 3 and with screen off.
- **Network:** artwork sizes per context (thumb/medium/large); prefetch next track's art and palette.

Verification: profile with the React Native performance monitor, Android Studio/Perfetto, and Xcode Instruments; test on 60/90/120 Hz; record before/after for each Skia effect; keep a "kill switch" flag per effect.

---

## 15. Required output formats

**Tokens:** TypeScript objects (`colors`, `typography`, `spacing`, `radii`, `motion`, `springs`, `tiers`), exportable and typed.

**Component spec (one per component, use this template):**
```
Name:
Purpose:
Anatomy (layers/children):
Props (typed) and variants:
States: default / pressed / focused / disabled / loading / error / selected
Layout & responsive rules (incl. 200% font scale):
Interaction & gestures:
Motion (tokens, springs, interruptibility):
Rendering approach (RN / Skia / native) and why:
Shared values and what drives them:
Performance notes and budget:
Accessibility (role, label, actions, focus):
Reduced-motion behavior:
Tier 0–3 behavior:
Edge cases:
Open questions / risks:
```

**Screen spec:** the fields listed in §8, plus a state diagram for complex flows (player, queue, downloads).

**Mockups / visuals:** where produced, include light-weight annotated wireframes first, then high-fidelity frames for key screens. Show collapsed/expanded and loading/empty/error states side by side. Do not present a static concept that depends on an effect the spec has not proven feasible.

**Required component inventory:** `OTOArtwork, OTODynamicBackground, OTOMeshGradient, OTOSongRow, OTOArtistCard, OTOAlbumCard, OTOPlaylistCard, OTOMiniPlayer, OTONowPlaying, OTOProgressBar, OTOVisualizer, OTOLyrics, OTOQueue, OTOBottomSheet, OTONavigationBar, OTOIconButton, OTOButton, OTOGlassSurface`, plus `OTOPaletteProvider` (shared values + tier), `OTOAudioEngine` (interface), and state components (`Skeleton`, `EmptyState`, `ErrorState`, `OfflineBanner`).

**Separation of concerns:** content (data/text), environment (palette + Skia), and interaction (gestures + shared values) are separate layers. The environment reads from shared values and must never require the React tree to re-render.

---

## 16. Empty, loading, error and offline states

Design each so it is unmistakably OTO (tone, typography, subtle atmosphere), not a generic placeholder.

- **Loading:** artwork-shaped skeletons + thumbhash; shimmer only at Tier ≥2 and never while reduced motion is on.
- **Empty:** Library, playlist, queue, downloads, search history, no lyrics — each with one clear next action.
- **Errors:** stream unavailable, track region-locked, network failure, download failed (reason + retry), lyrics failed. Non-blocking where possible (inline/snackbar), blocking only when playback is impossible.
- **Offline:** persistent but quiet banner; UI filters to downloaded content; unavailable items are dimmed **and** labeled; queue skips unavailable tracks with an explanation.

---

## 17. Quality gate (before approving any screen or component)

1. Is the music the visual hero and is the hierarchy obvious in 2 seconds?
2. Does it feel premium and like OTO, not a reference product?
3. Can it be built with the stack in §3 without unproven effects?
4. Does its animation stay on the UI thread, and is it interruptible?
5. Does it hold 60 fps on the low-end Android target and plausibly 120 Hz on capable devices?
6. Is it still attractive and usable at Tier 0 with reduced motion?
7. Does it pass contrast against real artwork-derived backgrounds?
8. Does every gesture have an accessible alternative?
9. Are loading, empty, error and offline states designed?
10. Would a senior engineer need to ask clarifying questions? If yes, the spec is incomplete.

If any answer is "no", revise before moving on.

---

## 18. Assumptions and open decisions to resolve up front

List explicitly, with a recommendation for each:
1. Content source and licensing (own catalog, licensed provider, user-imported files).
2. Whether downloads/DRM are in v1.
3. Lyrics provider and word-level timing availability.
4. Custom native audio module vs. an existing library.
5. Visualizer data mode (real FFT vs. precomputed vs. synthetic).
6. Signature accent color and typeface.
7. Minimum OS versions (iOS / Android API level).
8. Backend dependencies for search-by-lyrics, personalization, waveform peaks, insights.

---

## Final feel

**You didn't open a music app. You entered the music.**

Every element should reinforce that — and keep working when the effects are turned off.
