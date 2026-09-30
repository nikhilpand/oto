# Stream Resolution Evidence Log — BitChord Reverse-Engineering

This document records the verified stream extraction pipeline, multi-source waterfall, candidate matching rules, and cipher deobfuscation mechanisms.

---

## Evidence 1: Decoupled Multi-Source Waterfall
- **Claim:** BitChord separates track catalog identity from physical stream URLs. A song queued from YouTube can be substituted with a lossless FLAC stream from Qobuz, Tidal, or local SMB/WebDAV, or a 320kbps AAC stream from JioSaavn.
- **Evidence:**
  - `SourceResolver.kt` lines 140–188 (`resolve`):
    - Checks `StreamRequest.Lossless`. If active, queries higher-ranked sources (`rankedAbove(configId, active)`).
    - If lossless match found on a higher-ranked source via `matchAndStream(source, target, request)`, it returns the upgraded stream.
    - If pinned source fails, falls back to `bestAcross()`.
  - `SourceResolver.kt` lines 213–234 (`substituteForYouTube`):
    - When a track is queued from YouTube, races all sources ranked above YouTube to substitute with higher-fidelity audio.
- **File:** `BitChord/app/src/main/java/com/music/bitchord/data/sources/SourceResolver.kt`
- **Class:** `SourceResolver`
- **Confidence:** `VERIFIED FROM SOURCE`
- **Implication for React Native:** The multi-source waterfall is pure asynchronous domain logic. It should be implemented as an extensible TypeScript plugin architecture in React Native.

---

## Evidence 2: Structural Title Deconstruction & Duration Gating
- **Claim:** Cross-catalog track matching breaks song titles into 3 distinct components: core words, version markers, and context/packaging. Version markers (remix, acoustic, live) must match symmetrically in both directions. Runtime duration delta is strictly clamped to $\le 3$ seconds.
- **Evidence:**
  - `TrackMatcher.kt` lines 22–39 (KDoc) & lines 81–90 (`queries`):
    > "The title is taken apart into three pieces: TitleParts.words (must agree exactly), TitleParts.versions (remix, live, acoustic — must agree exactly in both directions), TitleParts.context (everything else thrown away with brackets — never a veto, only a tie-break)... a runtime far from the one asked for rules a candidate out."
  - `TrackMatcher.kt` duration threshold check:
    Rejects any candidate whose runtime differs by more than 3 seconds unless flagged as a music video.
- **File:** `BitChord/app/src/main/java/com/music/bitchord/data/sources/TrackMatcher.kt`
- **Class:** `TrackMatcher`
- **Confidence:** `VERIFIED FROM SOURCE`
- **Implication for React Native:** Port `TrackMatcher.kt` 1:1 into TypeScript. This is the single most important algorithmic guard against "playing the wrong song under the right title".

---

## Evidence 3: InnerTubeX Cipher Deobfuscation & PoToken Prewarming
- **Claim:** YouTube stream resolution handles rotating JavaScript cipher transformations and BotGuard Proof-of-Origin (PoToken) challenges using InnerTubeX, pre-warming the cipher cache in a background thread to avoid 8–20s playback latency on cold starts.
- **Evidence:**
  - `InnerTubeXResolver.kt` lines 65–85:
    ```kotlin
    fun init(context: Context) {
        // ...
        scope.launch {
            cipherService.setPreprocessedPlayerCache(::readPlayer, ::writePlayer)
            warm(WARM_DELAY_MS)
        }
    }
    ```
  - KDoc notes:
    > "Pays the cold costs before a track needs them: the player config, the EJS solver (8.7s in QuickJS when zemer-cipher lacks the player's hash), and the BotGuard WebView behind WEB_REMIX's PoToken... put an age-restricted track 15-20s from first audio when paid on the play path."
- **File:** `BitChord/app/src/main/java/com/music/bitchord/data/innertube/InnerTubeXResolver.kt`
- **Class:** `InnerTubeXResolver`
- **Confidence:** `VERIFIED FROM SOURCE`
- **Implication for React Native:** Cipher deobfuscation and PoToken generation are fragile when done on-device in React Native JS. In a production React Native app, YouTube signature deobfuscation and PoToken minting are best offloaded to a self-hosted or serverless backend endpoint, with local native fallback.
