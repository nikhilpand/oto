# Music Sources & Module Addon Evidence Log — BitChord Reverse-Engineering

This document records verified facts about provider registration, QuickJS engine sandboxing, addon interfaces, and health tracking from `SourceRegistry.kt` and `QuickJsExecutor.kt`.

---

## Evidence 1: Dynamic Addon Extension via Sandboxed QuickJS
- **Claim:** BitChord supports external user-installed JavaScript plugins (Qobuz, Tidal, Spine modules) executed inside an embedded QuickJS virtual machine pool (`QuickJsExecutor.kt`) with host OkHttp bindings.
- **Evidence:**
  - `QuickJsExecutor.kt` lines 22–54 (KDoc):
    > "Sandboxed QuickJS engine pool for executing module JS... Keeping one engine alive per loaded module, reused across calls... each module gets a small pool instead: [ENGINES_PER_MODULE] independent VMs, each handed to one caller at a time."
  - Uses `com.dokar.quickjs:quickjs-android:1.0.14`.
- **File:** `BitChord/app/src/main/java/com/music/bitchord/data/sources/module/QuickJsExecutor.kt`
- **Class:** `QuickJsExecutor`
- **Confidence:** `VERIFIED FROM SOURCE`
- **Implication for React Native:** In React Native, the application runtime is already JavaScript (Hermes). We can run addon scripts directly in isolated Hermes contexts or dedicated background worker threads without embedding QuickJS.

---

## Evidence 2: Source Priority & Codec Negotiation
- **Claim:** Sources are ranked in a user-reorderable priority list in `SourceRegistry.kt`. The resolver queries sources in strict priority order, matching capabilities against device audio codecs (`DeviceCodecs.kt`).
- **Evidence:**
  - `SourceRegistry.kt` lines 80–120: maintains `activeForPlayback()` and `rankedAbove()`.
  - `DeviceCodecs.kt` inspects Android `MediaCodecList` to verify hardware FLAC, Opus, and AAC decoding support before requesting formats.
- **File:** `BitChord/app/src/main/java/com/music/bitchord/data/sources/SourceRegistry.kt`, `DeviceCodecs.kt`
- **Confidence:** `VERIFIED FROM SOURCE`
- **Implication for React Native:** Maintain an array of registered provider objects sorted by user priority in MMKV / Redux.

---

## Evidence 3: Source Health Tracking & Silent Fallback
- **Claim:** Sources that return repeated HTTP 500 errors, network timeouts, or invalid streams are marked unhealthy and temporarily placed in an exponential backoff state, preventing a broken provider from delaying playback.
- **Evidence:**
  - `SourceResolver.kt` tracks failures in `attempt(source) { ... }` and transparently routes playback to `bestAcross()` fallback sources.
- **File:** `BitChord/app/src/main/java/com/music/bitchord/data/sources/SourceResolver.kt`
- **Confidence:** `VERIFIED FROM SOURCE`
- **Implication for React Native:** Implement a circuit-breaker / health tracking pattern around each source plugin.
