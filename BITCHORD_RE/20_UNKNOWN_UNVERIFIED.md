# 20. UNKNOWN & UNVERIFIED GAP ANALYSIS

This document provides a disciplined audit of all findings from the BitChord reverse-engineering effort. To maintain scientific integrity, every claim is classified into one of four confidence categories. Furthermore, technical gaps that BitChord did not have to solve—but which are mandatory for a production React Native cross-platform application—are explicitly outlined.

---

## 1. Confidence Classification System

- **VERIFIED FROM SOURCE:** Directly observed, traced, and confirmed in actual BitChord source code with concrete file paths, class names, functions, and lines.
- **HIGH CONFIDENCE:** Strongly supported by multiple code artifacts, commit messages, and build configurations, though specific dynamic runtime interactions may vary by device.
- **INFERRED:** Deductions based on standard architectural patterns, third-party library contracts (e.g., Media3, ExoPlayer, ONNX), and standard Android behavior.
- **UNKNOWN:** Areas where source code was absent, obfuscated, incomplete, or where behavior cannot be definitively verified without runtime instrumented profiling.

---

## 2. Classified Findings Matrix

### 2.1 Verified from Source

| Domain | Finding / Architectural Mechanism | Source Reference |
| :--- | :--- | :--- |
| **Crossfade** | BitChord uses a symmetric dual-ExoPlayer architecture where the standby player prerolls the incoming track and takes over active playback at $t=0$. | `playback/CrossfadeController.kt`, `playback/PlaybackService.kt` |
| **Volume Curves** | Crossfade uses equal-power attenuation based on $\cos(\cdot)$ and $\sin(\cdot)$ trigonometric functions ensuring $\cos^2(\theta) + \sin^2(\theta) = 1.0$. | `playback/CrossfadeController.kt` |
| **Track Matching** | `TrackMatcher` employs a 3-phase fuzzy algorithm: token normalization, version marker symmetry (rejecting remix/live mismatches), and duration delta gating ($\le 3$s). | `data/matcher/TrackMatcher.kt` |
| **Caching** | `AudioCache` wraps ExoPlayer `SimpleCache`, splits downloads into 2MB HTTP `Range` chunks, and keys entries to `bitchord://watch?v={id}` rather than CDN URLs. | `playback/cache/AudioCache.kt` |
| **Lyrics Waterfall** | BitChord cascades across 16 lyrics providers with a concurrency timeout, parsing both LRC timestamps and TTML word-level syllable spans. | `data/lyrics/LyricsRepository.kt`, `data/lyrics/parsers/TtmlParser.kt` |
| **Musixmatch Auth**| Generates dynamic HMAC-SHA256 signatures over request paths and millisecond timestamps using a static private secret. | `data/lyrics/providers/MusixmatchProvider.kt` |
| **Storage Paradigm**| No SQLite or Room database is used for playback sessions, queues, or statistics; BitChord relies on MMKV and monthly partitioned JSON files. | `data/stats/ListeningStats.kt` |
| **Automix Styles** | `TransitionPlanner` evaluates 4 distinct transition styles: `GAPLESS`, `EQUAL_POWER`, `DJ_BLEND` (with low-frequency bass swap), and `DJ_FILTER`. | `automix/TransitionPlanner.kt` |
| **Bit-Perfect Audio**| `PrecisionAudioSink` directly queries Linux ALSA nodes `/dev/snd/pcmC*` and USB descriptors to bypass the Android OS audio mixer. | `native/audio/PrecisionAudioSink.cpp` |
| **Licensing** | Main app is licensed under GPLv3, while DSP analysis (`native/analyzer/`) is licensed under AGPLv3 (ported from Orchard). | `LICENSE`, `native/analyzer/README.md` |

---

### 2.2 High Confidence

| Domain | Finding / Architectural Mechanism | Supporting Evidence |
| :--- | :--- | :--- |
| **InnerTube Cipher** | Cipher solving is periodically broken by YouTube web player script updates, requiring BitChord to release maintenance patches or remote regex rules. | Commit `cfe10c6` ("switch to InnerTubeX client"), issues related to stream playback 403s. |
| **Binder Transaction**| Passing raw bitmap album art across Android Binder IPC for notifications was replaced with URI-based decoding to prevent `TransactionTooLargeException`. | Commit `d18a206`, `playback/MediaNotificationManager.kt`. |
| **CPU Cost of DSP** | Running full-length FFT spectral flux on mobile CPUs caused thermal throttling and battery drain, prompting the head/tail 45s analysis optimization. | `analysis/TrackAnalyzer.kt` (decodes only first and last 45,000ms). |
| **Queue Resilience** | Toggling shuffle mode never destroys the original playlist order; `QueueCoordinator` preserves an immutable `originalIndices` array. | `playback/queue/QueueCoordinator.kt`. |

---

### 2.3 Inferred

| Domain | Finding / Architectural Mechanism | Basis for Inference |
| :--- | :--- | :--- |
| **JioSaavn Bitrate** | JioSaavn streams extracted via DES-ECB decryption key `38346591` deliver true 320kbps CBR AAC. | Inferred from JioSaavn public API parameters (`bitrate=320`) and MP4 container metadata analysis. |
| **Memory Pressure** | Dual ExoPlayer instances playing high-bitrate lossless FLAC streams concurrently consume between 80MB and 140MB of native RAM. | Inferred from ExoPlayer default buffer configuration (`DefaultLoadControl`: 50MB min buffer per instance). |
| **QuickJS Overhead** | Embedding QuickJS as an Android C++ shared library added ~1.8MB to APK size and consumed ~12MB heap during scraper execution. | Inferred from QuickJS binary ELF sizes and typical engine memory allocation. |

---

### 2.4 Unknown / Unverified

| Domain | Open Question / Unknown Behavior | Why Unverified from Source |
| :--- | :--- | :--- |
| **Bit-Perfect DACs** | Exact behavior of `PrecisionAudioSink` on custom Android ROMs (MIUI, OneUI) with proprietary audio HALs. | Source code shows generic Linux ALSA probing; real-world behavior varies across non-standard vendor kernels. |
| **Thermal Throttling** | Sustained FPS impact of running ONNX INT8 neural models in background during active high-bitrate playback. | Requires physical device thermal profiling under heavy battery drain conditions. |
| **PoToken Reliability**| YouTube PoToken generation server endpoint longevity and rate-limiting thresholds. | Server-side API behavior managed by external providers outside the repository. |

---

## 3. Critical React Native Platform Gaps (What BitChord Never Had to Solve)

Because BitChord is a native Android application built in Kotlin, it operates with fundamental platform privileges that do **not** exist in React Native. The new React Native architecture must solve the following gaps:

### 3.1 Gap 1: iOS Background Audio Execution Limits
- **The Android Reality (BitChord):** An Android `ForegroundService` with a persistent notification and `MediaSession` can run indefinitely without OS termination.
- **The React Native iOS Gap:** iOS terminates apps in the background if audio buffers starve for even a few milliseconds or if background tasks exceed memory caps (typically ~50MB when suspended).
- **Required Solution:**
  - Enable `UIBackgroundModes: audio` in `Info.plist`.
  - Maintain an active `AVAudioSession` category (`AVAudioSessionCategoryPlayback`).
  - When bridging dual players on iOS, both `AVPlayer` instances must feed a single, continuous `AVAudioEngine` node. If one player stops and the session drops to zero amplitude, iOS may suspend the app process.

### 3.2 Gap 2: High-Frequency Playhead Ticking Across the JS Bridge
- **The Android Reality (BitChord):** Jetpack Compose can read a `StateFlow<Long>` on the main thread and redraw the slider without inter-process communication overhead.
- **The React Native Gap:** Emitting 60Hz or 120Hz progress events from native C++ over the React Native bridge to the Hermes JS thread saturates the bridge, causes garbage collection thrashing, and results in visible UI stutter.
- **Required Solution:**
  - Keep the playhead progress position entirely on the UI thread using **React Native Reanimated** `SharedValue<number>`.
  - The native audio module updates this value via a direct JSI synchronous callback.
  - The JS thread only receives coarse events (e.g., `onTrackChange`, `onPlaybackStateChange`, `onSeekComplete`).

### 3.3 Gap 3: Uniform Caching Between Android and iOS
- **The Android Reality (BitChord):** ExoPlayer provides `SimpleCache` and `CacheDataSource`, which seamlessly cache HTTP range requests to disk.
- **The React Native Gap:** Apple’s `AVPlayer` on iOS has **no built-in disk cache**. It streams directly to RAM and discards data upon completion.
- **Required Solution:**
  - Implement a custom native Swift `AVAssetResourceLoaderDelegate` that intercepts requests for custom schemes (e.g., `bitchord-stream://`), checks a local disk cache for 2MB chunks, serves cached slices, and downloads missing byte ranges via `URLSession`.

### 3.4 Gap 4: Dual-Engine JavaScript Sandboxing
- **The Android Reality (BitChord):** BitChord embedded QuickJS to run dynamic third-party web scrapers.
- **The React Native Gap:** React Native already embeds an optimized JS engine (**Hermes**). Embedding a secondary engine (QuickJS) inside a React Native app wastes 15MB+ of memory, doubles native binary bloat, and creates potential thread collisions.
- **Required Solution:**
  - Execute dynamic scraper modules directly within the Hermes JavaScript runtime (using isolated sandboxed contexts) or offload scraping entirely to a cloud worker.

### 3.5 Gap 5: Lockscreen Controls & Dynamic Island
- **The Android Reality (BitChord):** BitChord only implements Android `MediaStyle` notifications and Android Auto media tree browsables.
- **The React Native Gap:** iOS users expect rich lockscreen metadata via `MPNowPlayingInfoCenter`, remote scrub bar control via `MPRemoteCommandCenter`, and modern iOS 16+ **Live Activities / Dynamic Island** animations for active playback.
- **Required Solution:**
  - Build a dedicated Swift TurboModule implementing `ActivityKit` to display animated audio waveforms and track progress directly on the iPhone Dynamic Island.
