# 18. IDENTIFY ACTUAL CODE WORTH REUSING

This document provides a rigorous, file-by-file audit of the highest-value code assets within the BitChord codebase. Every candidate is evaluated under strict legal, architectural, and cross-platform criteria to determine whether it can be directly reused, whether its algorithm must be extracted and rewritten, or whether its architecture should serve as a blueprint.

---

## 1. Legal & Architectural Evaluation Framework

Before categorizing code assets, two critical constraints must be established:
1. **Licensing Boundary (GPLv3 / AGPLv3):**
   - The BitChord repository is licensed under **GNU General Public License v3.0 (GPLv3)**.
   - The native C++ DSP analyzer (`native/analyzer/`) and neural wrappers are licensed under **AGPLv3** (inherited from Orchard).
   - *Legal Conclusion:* Direct copying of Kotlin or C++ source code into a commercial or closed-source React Native application is legally prohibited by copyleft terms. Clean-room algorithmic extraction (implementing the mathematical or procedural specifications in TypeScript/C++ without copying code tokens) is required for proprietary projects. For open-source GPLv3 projects, direct code reuse is permitted where language runtimes allow.
2. **Runtime Separation (JVM vs JavaScript/C++):**
   - BitChord is written in **Kotlin** targeting Android JVM and **C++** targeting Android NDK.
   - React Native core executes on **Hermes JavaScript Engine** with a **C++ JSI (JavaScript Interface)** layer and platform-native TurboModules (Kotlin on Android, Swift on iOS).
   - "Direct Reuse" is strictly reserved for assets that run without translation (such as regex specifications, data schemas, mathematical constants) or portable C++ routines that compile cleanly under both NDK and Clang/Xcode.

---

## 2. Category A: Directly Reusable Assets (Minimal to Zero Changes)

Only components whose core logic, regex patterns, or mathematical tables are directly portable with trivial syntax translation are listed here.

---

### Candidate A.1: LrcParser (LRC Synchronized Lyric Parser)
- **File:** `app/src/main/java/com/bitchord/app/data/lyrics/parsers/LrcParser.kt`
- **Class:** `LrcParser`
- **Functions:** `parse(lrcContent: String): List<LyricLine>`, `parseTimestamp(token: String): Long`
- **Lines:** ~45 lines
- **Purpose:** Parses standard LRC files with timestamps `[mm:ss.xx]` or `[mm:ss.xxx]` into ordered millisecond intervals and text spans.
- **Dependencies:** None (Pure string manipulation and regex).
- **Platform:** Agnostic.
- **License:** GPLv3 (Algorithm is standard public domain format).
- **Can directly reuse?:** **YES (Clean-room direct TS port)**
- **Why?:** LRC parsing is standardized across the audio industry. BitChord's regex `\[(\d{2}):(\d{2})\.(\d{2,3})\](.*)` handles both 2-digit and 3-digit millisecond fractions correctly.
- **What must change?:** Transpile Kotlin regex and string splitting into a TypeScript function.
- **Recommended RN equivalent:**
  ```typescript
  export interface LyricLine {
    timeMs: number;
    text: string;
  }

  export function parseLrc(content: string): LyricLine[] {
    const regex = /\[(\d{2}):(\d{2})\.(\d{2,3})\](.*)/;
    const lines = content.split('\n');
    const result: LyricLine[] = [];

    for (const line of lines) {
      const match = line.match(regex);
      if (match) {
        const minutes = parseInt(match[1], 10);
        const seconds = parseInt(match[2], 10);
        const millis = match[3].length === 2 ? parseInt(match[3], 10) * 10 : parseInt(match[3], 10);
        const timeMs = minutes * 60000 + seconds * 1000 + millis;
        result.push({ timeMs, text: match[4].trim() });
      }
    }
    return result.sort((a, b) => a.timeMs - b.timeMs);
  }
  ```

---

### Candidate A.2: Musixmatch Token Generation Routine
- **File:** `app/src/main/java/com/bitchord/app/data/lyrics/providers/MusixmatchProvider.kt`
- **Class:** `MusixmatchProvider`
- **Functions:** `generateSignature(url: String, timestamp: Long): String`
- **Lines:** ~25 lines
- **Purpose:** Generates HMAC-SHA256 authorization signatures required to query the Musixmatch private consumer API for synchronized lyrics.
- **Dependencies:** Standard crypto (HMAC-SHA256).
- **Platform:** Agnostic.
- **License:** GPLv3.
- **Can directly reuse?:** **YES (Clean-room direct TS port)**
- **Why?:** The signing secret and timestamp formatting string are static constants.
- **What must change?:** Use React Native `crypto` (or lightweight JS SHA256 library).
- **Recommended RN equivalent:**
  ```typescript
  import { hmacSha256 } from './cryptoUtils';

  const MUSIXMATCH_SECRET = 'YOUR_STATIC_SECRET_KEY';

  export function getMusixmatchSignature(urlPath: string, timestamp: number): string {
    const payload = `${urlPath}${timestamp}`;
    return hmacSha256(payload, MUSIXMATCH_SECRET);
  }
  ```

---

### Candidate A.3: Camelot Wheel Harmonic Compatibility Table
- **File:** `app/src/main/java/com/bitchord/app/automix/TransitionPlanner.kt`
- **Class:** `HarmonicRules`
- **Functions:** `getCompatibility(keyA: String, keyB: String): Int`
- **Lines:** ~35 lines
- **Purpose:** Maps musical keys (e.g., 8B / C Major) into Camelot notation and computes harmonic mixing compatibility scores (Perfect = 100, Energy Boost = 85, Mood Shift = 70, Clash = 20).
- **Dependencies:** None (Pure static data table and integer delta math).
- **Platform:** Agnostic.
- **License:** GPLv3 (Musical theory rules are uncopyrightable).
- **Can directly reuse?:** **YES**
- **Why?:** Camelot wheel math is an immutable music theory standard: $\Delta \text{number} \le 1$ with identical letter, or same number with letter toggle ($A \leftrightarrow B$).
- **What must change?:** Direct mapping to a TypeScript dictionary and modular arithmetic helper.
- **Recommended RN equivalent:**
  ```typescript
  export function getCamelotCompatibility(keyA: string, keyB: string): number {
    if (keyA === keyB) return 100; // Perfect match
    const numA = parseInt(keyA.slice(0, -1), 10);
    const letterA = keyA.slice(-1);
    const numB = parseInt(keyB.slice(0, -1), 10);
    const letterB = keyB.slice(-1);

    const diff = Math.abs(numA - numB);
    const circularDiff = Math.min(diff, 12 - diff);

    if (letterA === letterB && circularDiff === 1) return 85; // Energy +1/-1
    if (letterA !== letterB && circularDiff === 0) return 75; // Relative Major/Minor
    if (letterA !== letterB && circularDiff === 1) return 60; // Diagonal modulation
    return 20; // Harmonic clash
  }
  ```

---

## 3. Category B: Algorithm / Logic to Port (Must Be Rewritten)

These components contain proprietary, high-value algorithms that solve difficult domain problems in mobile audio. They must be ported cleanly into TypeScript or C++.

---

### Candidate B.1: TrackMatcher (Fuzzy Title Deconstruction & Gating)
- **File:** `app/src/main/java/com/bitchord/app/data/matcher/TrackMatcher.kt`
- **Class:** `TrackMatcher`
- **Functions:** `match(target: Track, candidate: CandidateTrack): Boolean`, `normalizeTitle(title: String): String`, `extractVersionMarkers(title: String): Set<VersionMarker>`
- **Lines:** ~160 lines
- **Purpose:** Matches songs across diverse catalog providers (e.g., matching a Spotify track against YouTube Music search results) without false-positive remix, live, or instrumental matches.
- **Dependencies:** Kotlin StdLib.
- **Platform:** JVM / Android.
- **License:** GPLv3.
- **Can directly reuse?:** **NO (Requires full clean-room TS rewrite)**
- **Why?:** Crucial algorithm. Solves the standard issue where YouTube returns a 10-minute live concert version instead of the 3-minute studio album cut.
- **What must change:**
  1. Port 3-phase normalization pipeline to pure TypeScript.
  2. Maintain strict version marker parity: if candidate has `[Remix]` or `[Live]` and target does not, discard immediately.
  3. Enforce BitChord's strict duration gate: $\Delta \text{duration} \le 3000\text{ms}$.
- **Recommended RN equivalent:**
  - Create `src/domain/sources/matching/TrackMatcher.ts`.
  - Comprehensive Jest unit test suite mirroring BitChord edge cases (e.g., `"Song (feat. Artist)"`, `"Song - Live at Wembley"`, `"Song (Acoustic Version)"`).

---

### Candidate B.2: Equal Power Crossfade Math & Timing Thresholds
- **File:** `app/src/main/java/com/bitchord/app/playback/crossfade/CrossfadeController.kt`
- **Class:** `CrossfadeController`
- **Functions:** `calculateVolumeCurves(progress: Float): Pair<Float, Float>`, `checkArmingWindow(positionMs: Long, durationMs: Long): Boolean`
- **Lines:** ~120 lines of math/timing logic
- **Purpose:** Computes continuous volume attenuation curves using $\sin^2(\theta) + \cos^2(\theta) = 1$ to maintain constant perceived acoustic energy, avoiding volume dips in the transition midpoint.
- **Dependencies:** Android ExoPlayer `Player`.
- **Platform:** Android-only in BitChord.
- **License:** GPLv3.
- **Can directly reuse?:** **NO (Tightly coupled to Android ExoPlayer)**
- **Why?:** Volume math and state transitions are platform-agnostic, but BitChord executes them via Kotlin coroutines modifying ExoPlayer audio volume.
- **What must change:**
  - Decouple math from ExoPlayer.
  - Implement the crossfade volume engine in native C++ using high-precision audio clocks, or in native Kotlin/Swift TurboModules.
- **Recommended RN equivalent:**
  - Native C++ `AudioCrossfadeEngine` managing sample-accurate attenuation multipliers on two PCM streams or dual native player volume controllers.

---

### Candidate B.3: TtmlParser Syllable-to-Word Span Merging
- **File:** `app/src/main/java/com/bitchord/app/data/lyrics/parsers/TtmlParser.kt`
- **Class:** `TtmlParser`
- **Functions:** `parse(xml: String): RichLyrics`, `mergeSyllableSpans(elements: List<XmlNode>): List<WordSpan>`
- **Lines:** ~210 lines
- **Purpose:** Parses complex Apple Music / Spotify TTML rich lyric files, reconstructing syllable-by-syllable timed spans into fluid, word-level highlighted lyric lines with agent/duet identification.
- **Dependencies:** Android XML PullParser.
- **Platform:** Android JVM.
- **License:** GPLv3.
- **Can directly reuse?:** **NO (Uses Android XML PullParser)**
- **Why?:** Android `XmlPullParser` is unavailable in React Native JS environment.
- **What must change:**
  - Use `fast-xml-parser` in TypeScript.
  - Implement BitChord’s whitespace preservation and agent separation logic (`ttm:agent="v1"` vs `"v2"`).
- **Recommended RN equivalent:**
  - Pure TypeScript `TtmlParser.ts` generating a normalized `RichLyricData` schema consumable by React Native Skia.

---

### Candidate B.4: Two-Tier Queue Coordinator
- **File:** `app/src/main/java/com/bitchord/app/playback/queue/QueueCoordinator.kt`
- **Class:** `QueueCoordinator`
- **Functions:** `playNext(song: Song)`, `addToQueue(song: Song)`, `shuffle(keepCurrent: Boolean)`, `getNextTrack(): Song?`
- **Lines:** ~180 lines
- **Purpose:** Implements a professional queue structure separating user-enqueued "Play Next" songs (`priorityQueue`) from album/playlist sequence (`standardQueue`), while preserving original un-shuffled history during shuffle toggles.
- **Dependencies:** Kotlin Collections, Coroutine StateFlow.
- **Platform:** Agnostic concept, Kotlin implementation.
- **License:** GPLv3.
- **Can directly reuse?:** **NO**
- **Why?:** Needs to integrate with React Native state management (Zustand or Redux Toolkit).
- **What must change:**
  - Reimplement in TypeScript with immutable state operations and persist to MMKV.
- **Recommended RN equivalent:**
  - `src/domain/playback/queue/QueueManager.ts` integrated directly with Zustand store.

---

## 4. Category C: Architecture to Reimplement (Conceptual Influence Only)

These subsystems should not be ported at the code level, but their architectural blueprints are state-of-the-art and should be faithfully reproduced in React Native.

---

### Candidate C.1: Zero-Database Persistence Paradigm
- **File:** `app/src/main/java/com/bitchord/app/data/stats/ListeningStats.kt` & JSON file handlers
- **Subsystem:** Persistence & Data Layer
- **Purpose:** Completely eliminates SQLite/Room for local player state, history, and stats. Uses monthly-partitioned JSON files and memory caches.
- **Why reproduce?:**
  - Room/SQLite requires complex schema migrations, crashes on database version mismatches, and introduces high JNI overhead in React Native.
  - BitChord's JSON aggregation model is lightning-fast and impervious to corruption.
- **Recommended RN Architecture:**
  - Use **MMKV** for settings, auth tokens, active queue, and last playhead position.
  - Use **react-native-fs** to write monthly historical logs: `${RNFS.DocumentDirectoryPath}/stats/stats_2026_09.json`.

---

### Candidate C.2: Dual-Player Peer-to-Peer Standby Handoff
- **File:** `app/src/main/java/com/bitchord/app/playback/PlaybackService.kt`
- **Subsystem:** Audio Engine Architecture
- **Purpose:** Avoids the 9ms–41ms audio duplicate seam bug by designating `Player A` and `Player B` as symmetric peers. The standby player prerolls the incoming track and takes over primary session status at $t=0$.
- **Why reproduce?:**
  - Single-player crossfade hacks in mobile audio consistently suffer from audio buffer starvation or duplicate frame rendering.
- **Recommended RN Architecture:**
  - Android: Native Kotlin TurboModule managing two `ExoPlayer` instances bound to a single `MediaSession`.
  - iOS: Native Swift TurboModule managing two `AVPlayer` instances routed through an `AVAudioEngine` mixer.

---

### Candidate C.3: Decoupled Multi-Source Streaming Waterfall
- **File:** `app/src/main/java/com/bitchord/app/streaming/StreamResolver.kt`
- **Subsystem:** Audio Source Discovery
- **Purpose:** Decouples song discovery metadata (YouTube/Spotify) from physical stream delivery, gracefully falling back through multiple CDNs without user intervention.
- **Why reproduce?:**
  - Mobile audio apps that rely on a single scraper break permanently when that provider changes its API.
- **Recommended RN Architecture:**
  - Modular TypeScript plugin architecture adhering to `interface StreamProvider`. Priority ordered: `LocalCache` $\to$ `LosslessAddon` $\to$ `JioSaavn` $\to$ `InnerTube` $\to$ `Piped`.

---

## 5. Candidate Summary Table

| Category | Component / Asset | BitChord Source File | Clean-Room Target in RN | Complexity |
| :--- | :--- | :--- | :--- | :--- |
| **Category A** | `LrcParser` | `parsers/LrcParser.kt` | `src/utils/lyrics/LrcParser.ts` | Low (1 day) |
| **Category A** | `Musixmatch Signer` | `providers/MusixmatchProvider.kt`| `src/utils/crypto/musixmatch.ts` | Low (0.5 day) |
| **Category A** | `Camelot Rules` | `automix/TransitionPlanner.kt` | `src/domain/automix/Camelot.ts` | Low (0.5 day) |
| **Category B** | `TrackMatcher` | `matcher/TrackMatcher.kt` | `src/domain/matching/TrackMatcher.ts` | Medium (2 days) |
| **Category B** | `Crossfade Curves` | `crossfade/CrossfadeController.kt` | `native/audio/CrossfadeEngine.cpp` | High (4 days) |
| **Category B** | `TtmlParser` | `parsers/TtmlParser.kt` | `src/utils/lyrics/TtmlParser.ts` | Medium (2 days) |
| **Category B** | `QueueCoordinator` | `queue/QueueCoordinator.kt` | `src/domain/queue/QueueManager.ts` | Medium (2 days) |
| **Category C** | `Zero-DB Schema` | `stats/ListeningStats.kt` | MMKV + Monthly Partition Files | Medium (2 days) |
| **Category C** | `Dual-Player Core` | `playback/PlaybackService.kt` | Native TurboModules (Android/iOS) | High (5 days) |
| **Category C** | `Stream Waterfall` | `streaming/StreamResolver.kt` | `src/domain/streaming/Resolver.ts` | Medium (3 days) |
