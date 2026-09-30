# Architectural Evidence Log — BitChord Reverse-Engineering

This document records the verified architectural facts, code locations, caller-callee chains, and boundaries discovered during Stage 1.

---

## Evidence 1: Dependency Injection Mechanism
- **Claim:** BitChord uses manual singleton pattern (`object` declarations and companion `init(context)` functions) rather than an automated dependency injection framework like Dagger, Hilt, or Koin.
- **Evidence:** 
  - `BitChordApplication.kt` lines 38–127 explicitly orchestrates startup initialization of each subsystem sequentially or via background worker threads without any DI container annotations (`@HiltAndroidApp`, `@Inject`, etc.).
  - Search across all source files for `@Hilt`, `@Inject`, and `org.koin` returned zero matches.
- **File:** `BitChord/app/src/main/java/com/music/bitchord/BitChordApplication.kt`
- **Class:** `BitChordApplication`
- **Function:** `onCreate()`
- **Relevant Lines:** Lines 43–60, 82–106
- **Confidence:** `VERIFIED FROM SOURCE`
- **Implication for React Native:** In React Native, this translates to clean TypeScript service singletons or React Context providers at the root without needing heavyweight inversion-of-control frameworks.

---

## Evidence 2: UI Navigation and Screen Management
- **Claim:** BitChord does not use AndroidX Navigation (`NavHost`, `NavController`) or Jetpack Navigation Compose. Screen management is completely state-driven within `MainActivity.kt` using `selectedTab`, `detail: DetailPage?`, `showSettings: Boolean`, and back-stack handlers.
- **Evidence:**
  - `MainActivity.kt` lines 419–460 declares state variables: `selectedTab`, `showNowPlaying`, `webSession`, `showSettings`, `showReplay`, `showListenTogether`, `showEqualizer`.
  - Lines 858–875 and 2710–3245 handle switching via `when (selectedTab)` and `AnimatedContent`.
  - Zero imports of `androidx.navigation`.
- **File:** `BitChord/app/src/main/java/com/music/bitchord/MainActivity.kt`
- **Class:** `MainActivity`
- **Relevant Lines:** Lines 415–460, 858–875, 2710–3245
- **Confidence:** `VERIFIED FROM SOURCE`
- **Implication for React Native:** A monolithic 4,500-line activity is an anti-pattern. React Native should use `@react-navigation/bottom-tabs` combined with a native gesture-driven bottom-sheet modal (e.g. `@gorhom/bottom-sheet`) for `NowPlayingScreen` to achieve modularity and 60/120fps performance.

---

## Evidence 3: Playhead Tick Isolation (Performance Critical)
- **Claim:** BitChord isolates the playback position playhead tick (`PlaybackPosition.positionMs`) from the general `PlayerState` data class to prevent high-frequency state emissions (2–10 Hz) from invalidating the root UI tree and recomposing expensive real-time background shaders.
- **Evidence:**
  - `PlayerConnection.kt` explicitly documents this optimization in its KDoc:
    > "The playhead, deliberately kept out of [PlayerState]. It moves twice a second; everything else on [PlayerState] moves on a track change. Carried in the same object, the two are one snapshot read... split out and held behind a stable object, the tick is a read of this alone."
- **File:** `BitChord/app/src/main/java/com/music/bitchord/playback/PlayerConnection.kt`
- **Class:** `PlaybackPosition` & `PlayerState`
- **Relevant Lines:** Lines 42–62, 65–94
- **Confidence:** `VERIFIED FROM SOURCE`
- **Implication for React Native:** Critical! In React Native, progress updates must NEVER pass through global state (Redux/Zustand) or React re-renders. It must be a `useSharedValue` from `react-native-reanimated` or an isolated native event listener directly manipulating the slider component on the UI thread.

---

## Evidence 4: Zero-Database / Aggregate-Only Persistence
- **Claim:** BitChord does not use Room, SQLite, or Realm. Storage is exclusively composed of Android `SharedPreferences`, `EncryptedSharedPreferences`, and monthly partitioned JSON files on disk.
- **Evidence:**
  - `build.gradle.kts` does not include `androidx.room`.
  - `ListeningStats.kt` uses calendar-month partitioned JSON files (`yyyy-MM.json`) containing pre-aggregated counters rather than individual row-per-play transaction logs.
  - `Downloads.kt` tracks saved media via a serialized `Map<String, String>` in `SharedPreferences`.
  - `AuthStore.kt` uses `EncryptedSharedPreferences` for master cookie and token storage.
- **File:** `BitChord/app/src/main/java/com/music/bitchord/data/stats/ListeningStats.kt`, `BitChord/app/src/main/java/com/music/bitchord/download/Downloads.kt`, `BitChord/app/src/main/java/com/music/bitchord/auth/AuthStore.kt`
- **Confidence:** `VERIFIED FROM SOURCE`
- **Implication for React Native:** React Native should use `react-native-mmkv` for ultra-fast key-value configuration/state (<0.1ms read/write) and either lightweight MMKV or OP-SQLite for local metadata queries without database bloat.

---

## Evidence 5: Media Service and Inter-Process Communication
- **Claim:** `PlaybackService` is an AndroidX `MediaLibraryService` running within the *same process* as `MainActivity`. `MainActivity` communicates with `PlaybackService` via `MediaController` asynchronously using Guava `ListenableFuture`.
- **Evidence:**
  - `AndroidManifest.xml` declares `PlaybackService` without `android:process=":..."`, confirming single-process hosting.
  - `PlayerConnection.kt` lines 98–105 binds `MediaController` using `SessionToken(context, ComponentName(context, PlaybackService::class.java))`.
  - `PlaybackService.kt` implements `MediaLibrarySession.Callback` and exposes custom `SessionCommand` actions.
- **File:** `BitChord/app/src/main/java/com/music/bitchord/playback/PlaybackService.kt`, `BitChord/app/src/main/java/com/music/bitchord/playback/PlayerConnection.kt`
- **Confidence:** `VERIFIED FROM SOURCE`
- **Implication for React Native:** On Android, a native foreground service wrapping `MediaLibrarySession` / `ExoPlayer` is required. The React Native JavaScript layer will interface with this service via a TurboModule bridge, receiving events and dispatching commands asynchronously.

---

## Evidence 6: Native DSP & AI Model Execution
- **Claim:** Heavy audio DSP (Log-Mel spectrogram, onset envelope, tempo/beat tracking, vocal separation) is implemented in C++20 with raw PCM inputs, using ONNX Runtime for neural models and Aubio/custom resamplers.
- **Evidence:**
  - `native/analyzer/` contains C++ implementations of `audio_analysis.cpp`, `mel_spectrogram.cpp`, `resampler.cpp`, `tempo_analysis.cpp`, and `vocal_spectrogram.cpp`.
  - `app/src/main/cpp/CMakeLists.txt` links `libonnxruntime.so` and compiles `jni/analysis_jni.cpp`, `jni/mel_jni.cpp`, `jni/vocal_jni.cpp`.
  - Models `beat_this_int8.onnx` (4.5 MB) and `vocals_umxhq_int8.onnx` (9.0 MB) reside in `app/src/main/assets/`.
- **File:** `BitChord/app/src/main/cpp/CMakeLists.txt`, `BitChord/native/analyzer/audio_analysis.cpp`
- **Confidence:** `VERIFIED FROM SOURCE`
- **Implication for React Native:** This C++ core is clean and cross-platform. It can be compiled directly into a React Native C++ TurboModule (using JSI) to run on both Android and iOS without modifying the DSP algorithms.
