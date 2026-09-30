# 17. FEATURE-BY-FEATURE PORTABILITY MATRIX

This document provides a comprehensive classification of every architectural subsystem, engine, manager, and algorithm in BitChord. Each component is evaluated for its technical adaptability into a clean-room, modern React Native (TypeScript + Native TurboModules) mobile audio application.

---

## 1. Portability Taxonomy & Definitions

| Classification | Definition & Legal / Technical Rules |
| :--- | :--- |
| **DIRECT PORT** | Code or specification can be reused with zero or minimal structural changes (e.g., pure mathematical algorithms, regex rules, pure contracts). *Note: Must respect licensing boundaries (GPLv3 vs clean-room TS/C++ implementation).* |
| **ALGORITHM PORT** | The underlying mathematical, heuristic, or procedural algorithm is high-value and must be rewritten cleanly in TypeScript or C++ to decouple from Android SDK / Kotlin runtime. |
| **ARCHITECTURE PORT** | The system design, multi-tier relationship, state machine, or pipeline design should be reproduced, but concrete implementation classes are entirely native or framework-specific. |
| **REIMPLEMENT** | The feature capability is required, but BitChord’s specific implementation is tightly coupled to Android-only libraries (e.g., ExoPlayer internals, Compose UI) and must be rebuilt using React Native paradigms (e.g., JSI, Reanimated, Skia). |
| **PLATFORM-SPECIFIC** | Android-only capabilities that have an iOS counterpart requiring completely distinct system APIs (e.g., MediaSession vs MPRemoteCommandCenter, PrecisionAudioSink vs CoreAudio). |
| **DO NOT USE** | Patterns, libraries, or hacks in BitChord that introduce fragility, memory leaks, high latency, GPL contagion, or unnecessary complexity in React Native. |

---

## 2. Complete Component Matrix

| Subsystem / Component | Primary BitChord Source File | Core Purpose / Responsibility | Portability Classification | Recommended React Native Implementation | Priority |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **CrossfadeController** | `playback/CrossfadeController.kt` | Dual-player orchestration, arming window math, $\sin^2+\cos^2=1$ equal power crossfade curve, $t=0$ handoff, audio ducking prevention. | **ALGORITHM PORT** | Core crossfade state machine implemented in C++ Audio Engine / Native TurboModule driving dual player nodes (`PlayerNodeA`, `PlayerNodeB`). | **P0** |
| **PlaybackService** | `playback/PlaybackService.kt` | Android foreground service, lifecycle anchor, MediaSession hosting, notification dispatch, audio focus, becoming noisy. | **ARCHITECTURE PORT** | Separate into Android `PlaybackService` (Media3) and iOS `AudioSessionManager` (AVAudioSession), coordinated via unified TypeScript `PlaybackController`. | **P0** |
| **QueueCoordinator** | `playback/QueueCoordinator.kt` | Two-tier queue management (`priorityQueue` for user inserts vs `standardQueue`), shuffle preservation, index tracking. | **ALGORITHM PORT** | Pure TypeScript domain module `QueueManager` with immutable state updates and Zustand store synchronization. | **P0** |
| **StreamResolver** | `streaming/StreamResolver.kt` | Orchestrates multi-source waterfall resolution (Lossless Addons $\to$ JioSaavn $\to$ InnerTubeX $\to$ Piped). | **ARCHITECTURE PORT** | TypeScript `StreamResolver` interface with asynchronous waterfall chain and dynamic source prioritizing. | **P0** |
| **TrackMatcher** | `matching/TrackMatcher.kt` | Multi-pass title normalization, regex deconstruction (remix, acoustic, live), artist token set intersection, duration delta ($\le 3$s) gating. | **ALGORITHM PORT** | Pure TypeScript `TrackMatcher` class with zero native dependencies, exact regex ports, and 100% unit test coverage. | **P0** |
| **AudioCache** | `cache/AudioCache.kt` | ExoPlayer `SimpleCache` wrapper, 2MB bounded HTTP range chunks, canonical URL keying (`bitchord://watch?v={id}`), cache eviction. | **REIMPLEMENT** | Android: Media3 `SimpleCache` via TurboModule; iOS: Custom `AVAssetResourceLoaderDelegate` with 2MB chunking to disk. | **P0** |
| **DynamicLruCacheEvictor** | `cache/DynamicLruCacheEvictor.kt` | Dynamic LRU storage eviction monitoring total filesystem free space rather than static limits. | **ALGORITHM PORT** | Native storage eviction worker or TS MMKV disk-budget monitor deleting oldest cached chunks. | **P1** |
| **InnerTubeX / YouTube** | `sources/youtube/InnerTubeClient.kt` | Extraction of streaming URLs from YouTube InnerTube Web/Android client API, cipher solving, PoToken injection. | **REIMPLEMENT** | Offload cipher/PoToken solving to a lightweight self-hosted backend/worker API, or run via bundled Hermes JS runtime. | **P0** |
| **JioSaavn Source** | `sources/saavn/SaavnClient.kt` | Encrypted 320kbps AAC stream extraction with DES-ECB decryption key `38346591`. | **ALGORITHM PORT** | Pure TypeScript client using native `crypto` or lightweight DES-ECB implementation. | **P1** |
| **TrackAnalyzer** | `analysis/TrackAnalyzer.kt` | Fast head/tail (45s) audio decoding, spectral feature extraction, BPM estimation, beat grid construction, and vocal presence tracking. | **ALGORITHM PORT** | C++ Audio Analyzer TurboModule using KissFFT / Mini-Aubio compiled via JSI or backend analysis service. | **P2** |
| **TransitionPlanner** | `analysis/TransitionPlanner.kt` | Evaluates 4 transition styles (`GAPLESS`, `EQUAL_POWER`, `DJ_BLEND`, `DJ_FILTER`), Camelot wheel harmonic mixing, and EQ sweeps. | **ALGORITHM PORT** | Pure TypeScript domain service `TransitionPlanner` outputting structural execution plans to native playback engine. | **P2** |
| **BeatTracker (ONNX)** | `analysis/BeatTracker.kt` | Deep neural beat tracking via `beat_this_int8.onnx` executed on ONNX Runtime Mobile. | **REIMPLEMENT** | `react-native-onnxruntime` executing INT8 quantized model or server-side analysis pipeline. | **P3** |
| **VocalTracker (ONNX)** | `analysis/VocalTracker.kt` | Vocal energy tracking via `vocals_umxhq_int8.onnx` executed on ONNX Runtime Mobile. | **REIMPLEMENT** | `react-native-onnxruntime` executing INT8 quantized model or server-side analysis pipeline. | **P3** |
| **LyricsRepository** | `lyrics/LyricsRepository.kt` | 16-provider concurrent waterfall, parsing, normalizer, and disk caching. | **ARCHITECTURE PORT** | TypeScript `LyricsRepository` coordinating multiple decoupled provider modules with Promise waterfall. | **P1** |
| **LrcParser** | `lyrics/parsers/LrcParser.kt` | Standard LRC format parser with millisecond timestamp regex matching. | **DIRECT PORT** | Pure TypeScript regex parser module (~40 lines of code). | **P1** |
| **TtmlParser** | `lyrics/parsers/TtmlParser.kt` | Rich XML TTML parser handling Apple Music / Spotify word-level sync, syllable spans, background vocals, and agent duets. | **ALGORITHM PORT** | TypeScript XML parser using `fast-xml-parser` implementing BitChord's syllable-to-word span merging algorithm. | **P1** |
| **Musixmatch Token Gen** | `lyrics/providers/MusixmatchProvider.kt` | HMAC-SHA256 signature generation for dynamic Musixmatch user tokens. | **DIRECT PORT** | TypeScript helper using standard HMAC-SHA256 crypto function. | **P1** |
| **SourceRegistry** | `sources/SourceRegistry.kt` | Dynamic registration of music sources, priority scoring, capability querying, and circuit-breaker health tracking. | **ARCHITECTURE PORT** | TypeScript `SourceRegistry` singleton managing active provider plugins. | **P1** |
| **ModuleSource (QuickJS)** | `sources/js/ModuleSource.kt` | Sandboxed JavaScript scraper execution using QuickJS native engine. | **DO NOT USE** | Avoid embedding QuickJS inside React Native. React Native *already* runs Hermes; run scrapers in worker context or backend. | **P3** |
| **Downloader** | `download/Downloader.kt` | Multi-worker background track downloading, stream multiplexing, and progress broadcasting. | **REIMPLEMENT** | Background download engine via `react-native-background-actions` or native WorkManager/URLSession modules. | **P2** |
| **FlacTagger / Mp4Tagger**| `download/tagger/` | Native file tagging embedding Vorbis comments, ID3, MP4 atoms, album art, and unsynced/synced lyrics. | **ALGORITHM PORT** | C++ tagger compiled into Native TurboModule or pure JS binary buffer manipulation for MP4/FLAC containers. | **P2** |
| **ListeningStats** | `stats/ListeningStats.kt` | Zero-database monthly JSON aggregate stats, 30s listen thresholds, playback history logging. | **ARCHITECTURE PORT** | TypeScript MMKV-backed JSON storage with monthly partitioning schema. | **P1** |
| **PrecisionAudioSink** | `native/audio/PrecisionAudioSink.cpp` | Float32 PCM pipeline, direct USB DAC probing (UAC1/UAC2), sample rate matching (bit-perfect). | **PLATFORM-SPECIFIC** | Android: Native C++ AAudio / Oboe audio sink. iOS: CoreAudio / AVAudioEngine with `kAudioFormatLinearPCM`. | **P3** |
| **Equalizer / FX** | `playback/EqualizerController.kt` | 10-band parametric equalizer, bass boost, and virtualizer using Android AudioEffect API. | **REIMPLEMENT** | Built into unified C++ Audio Engine (Biquad filters) for uniform EQ behavior on both Android and iOS. | **P2** |
| **MediaNotificationManager**| `playback/MediaNotificationManager.kt`| Android MediaStyle notification with playback controls, custom actions (like, repeat), and album art. | **PLATFORM-SPECIFIC** | Android: Native Kotlin Media3 `MediaNotificationProvider`. iOS: Native Swift `MPNowPlayingInfoCenter`. | **P0** |
| **Bluetooth / AudioFocus** | `playback/AudioFocusHelper.kt` | Audio focus change handling, ducking, transient loss, and Bluetooth A2DP disconnects ("becoming noisy"). | **PLATFORM-SPECIFIC** | Android: `AudioManager.OnAudioFocusChangeListener`. iOS: `AVAudioSession.interruptionNotification`. | **P0** |

---

## 3. Subsystem Breakdown by Architectural Layer

### 3.1 Playback Core Layer
- **Crossfade Engine:** Rated **ALGORITHM PORT**. The mathematical calculations ($\sin^2(\theta) + \cos^2(\theta) = 1$, arming window duration, dynamic thresholding, handoff execution at $t=0$) are 100% platform-independent. They must be ported into a C++ state machine or native audio node controller.
- **Queue Management:** Rated **ALGORITHM PORT**. The two-tier queue (`QueueCoordinator`) is brilliant in its simplicity: a transient priority queue overlaid on a permanent standard queue. This should be a direct TypeScript implementation in React Native.
- **MediaSession & Service:** Rated **PLATFORM-SPECIFIC**. Android requires `androidx.media3.session.MediaSessionService`, while iOS requires `MPRemoteCommandCenter` and `AVAudioSession`. React Native bridges these via an abstract TypeScript facade.

### 3.2 Streaming & Resolution Layer
- **Resolution Pipeline:** Rated **ARCHITECTURE PORT**. The waterfall architecture (checking local cache $\to$ lossless source $\to$ high-bitrate AAC $\to$ YouTube adaptive audio) allows pluggable streaming providers.
- **Track Matching:** Rated **ALGORITHM PORT**. `TrackMatcher.kt` is one of the most valuable files in BitChord. Its 3-phase matching heuristic (Title cleaning $\to$ Version parity $\to$ Duration gating) solves the classic "wrong live version" or "wrong acoustic version" bug common in streaming apps. It will be a pure TypeScript port.
- **InnerTube Scraping:** Rated **REIMPLEMENT**. Running complex DOM/JS deciphering routines on mobile devices leads to app breakage when YouTube updates player scripts. A hybrid approach (bundled Hermes JS module with remote CDN fallback) is recommended.

### 3.3 Audio Processing & Automix Layer
- **C++ DSP Analyzer:** Rated **ALGORITHM PORT**. The spectral flux, onset detection, and BPM histogram algorithms in `native/analyzer/` are standard DSP routines. They should be cleanly reimplemented in modern C++ (C++20) and exposed to React Native via JSI.
- **Transition Planner:** Rated **ALGORITHM PORT**. The state machine that picks transition styles based on BPM delta and Camelot key compatibility is pure business logic. Port directly to TypeScript.
- **ONNX Models:** Rated **REIMPLEMENT**. The ONNX models (`beat_this_int8.onnx` and `vocals_umxhq_int8.onnx`) are neural network weights. They must be loaded using an official React Native ONNX runtime wrapper rather than BitChord’s Android-specific JNI wrapper.

### 3.4 Data & State Layer
- **Zero-Room Architecture:** Rated **ARCHITECTURE PORT**. BitChord avoids SQLite/Room for local playback state, relying on atomic JSON files for playback sessions and stats. In React Native, MMKV + Zustand provides even higher performance ($\sim 0.05$ms read latency) without SQLite schema migration headaches.
- **LRU Audio Cache:** Rated **REIMPLEMENT**. ExoPlayer's `SimpleCache` does not exist on iOS. A unified native caching architecture (or platform-specific native delegates) must be built.
