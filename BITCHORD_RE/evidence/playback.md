# Playback Engine Evidence Log — BitChord Reverse-Engineering

This document records the verified playback mechanics, player lifecycle, queue invariants, and Media3 integration details discovered during Stage 2.

---

## Evidence 1: Twin-Player Architecture & Role Swapping
- **Claim:** BitChord maintains two symmetric `ExoPlayer` instances (`player` and `spare`). MediaSession ownership, listeners, audio focus, and audio filters are dynamically swapped between them via `adoptPlayer()`.
- **Evidence:**
  - `PlaybackService.kt` lines 527–567 defines `private var player: ExoPlayer?` and `private var spare: ExoPlayer?`.
  - `PlaybackService.kt` lines 2529–2576 defines `private fun adoptPlayer(outgoing: ExoPlayer, incoming: ExoPlayer)`:
    - Removes listeners from outgoing player.
    - Swaps references: `player = incoming; spare = outgoing`.
    - Swaps filter roles: `val held = activeFilter; activeFilter = spareFilter; spareFilter = held`.
    - Re-attaches listeners to incoming player.
    - Binds `mediaSession?.player = SessionPlayer(incoming, ...)`.
    - Invokes `onTrackBecameCurrent` explicitly to trigger scrobbling and playback stats.
- **File:** `BitChord/app/src/main/java/com/music/bitchord/playback/PlaybackService.kt`
- **Class:** `PlaybackService`
- **Function:** `adoptPlayer()`
- **Relevant Lines:** Lines 527–567, 2529–2576
- **Confidence:** `VERIFIED FROM SOURCE`
- **Implication for React Native:** In React Native, crossfade cannot be built by rapidly setting volume on a single native player. The native bridge must instantiate two parallel native audio players (e.g. two `ExoPlayer`s on Android, two `AVPlayer`s on iOS) and coordinate handoffs over JSI/TurboModules.

---

## Evidence 2: Audio Focus and Becoming Noisy Isolation
- **Claim:** Audio focus (`handleAudioFocus = true`) and becoming-noisy management (`handleAudioBecomingNoisy = true`) are strictly restricted to the currently active session owner. The standby player must never request audio focus while pre-rolling.
- **Evidence:**
  - `PlaybackService.kt` lines 2579–2591 defines `setSessionOwner(target: ExoPlayer, owns: Boolean)`:
    ```kotlin
    target.setAudioAttributes(AUDIO_ATTRIBUTES, /* handleAudioFocus = */ owns)
    target.setHandleAudioBecomingNoisy(owns)
    ```
  - KDoc explicitly states:
    > "Only one player may handle audio focus at a time. Two focus-handling players in one process fight each other: the standby taking focus as it starts would have Media3 pause the player that lost it, cutting the outgoing track dead instead of fading it."
- **File:** `BitChord/app/src/main/java/com/music/bitchord/playback/PlaybackService.kt`
- **Class:** `PlaybackService`
- **Function:** `setSessionOwner()`
- **Relevant Lines:** Lines 2579–2591
- **Confidence:** `VERIFIED FROM SOURCE`
- **Implication for React Native:** On iOS (`AVAudioSession`) and Android (`AudioManager`), requesting audio focus for Player B before Player A fades out will cause the OS to duck or pause Player A prematurely. Only the primary session player should hold system audio focus.

---

## Evidence 3: Lazy On-Demand Stream Resolution via `ResolvingDataSource`
- **Claim:** MediaItems placed into ExoPlayer contain synthetic URI schemes (`bitchord://source?...` or `bitchord://track?v=...`). Resolution to concrete Googlevideo, JioSaavn, or Qobuz URLs is deferred until the loader thread requires bytes.
- **Evidence:**
  - `PlaybackService.kt` lines 1204–1259 implements `ResolvingDataSource.Resolver`:
    - Intercepts `dataSpec.uri`.
    - If `uri.authority == "source"`, runs `SourceResolver.resolve(dataSpec.uri)` inside `runBlocking` with `RESOLVE_TIMEOUT_MS`.
    - Rewrites `DataSpec` with real target URL and sets appropriate HTTP headers.
- **File:** `BitChord/app/src/main/java/com/music/bitchord/playback/PlaybackService.kt`
- **Function:** `streamResolver` closure
- **Relevant Lines:** Lines 1204–1259
- **Confidence:** `VERIFIED FROM SOURCE`
- **Implication for React Native:** React Native should not resolve stream URLs for 50 tracks in a playlist upfront. Resolution should occur lazy on-demand 15–30 seconds before the current track finishes.

---

## Evidence 4: Two-Tier Queue Invariants
- **Claim:** Queue items belong to distinct tiers (`QueueTier.CONTEXT` vs `QueueTier.USER_QUEUE`). User-queued tracks are preserved across album/playlist starts and pruned upon consumption.
- **Evidence:**
  - `QueueCoordinator.kt` lines 41–97 implements `buildContextQueue`:
    - Timeline structure: `[Preceding Context] + [Selected Track] + [Preserved USER_QUEUE] + [Following Context Tracks]`.
  - `QueueCoordinator.kt` lines 207–220 implements `consumePlayedUserQueue`:
    - Prunes played `USER_QUEUE` items once playback enters `CONTEXT`, ensuring native `REPEAT_MODE_ALL` loops only context tracks.
- **File:** `BitChord/app/src/main/java/com/music/bitchord/playback/QueueCoordinator.kt`
- **Class:** `QueueCoordinator`
- **Relevant Lines:** Lines 41–97, 207–220
- **Confidence:** `VERIFIED FROM SOURCE`
- **Implication for React Native:** Queue management logic is completely platform-independent pure business logic. It can be ported directly into TypeScript with 100% fidelity.
