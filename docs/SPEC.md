# OTO — Product Specification (v1)

## 1. Product Vision & Feeling
**OTO** is a premium, dark-first mobile music application for iOS and Android where artwork, typography, motion, and acoustic atmosphere behave as a single continuous environment.

> **Target Feeling:** *You didn't open a music app. You entered the music.*

The Now Playing screen is an immersive acoustic environment rather than a mechanical media-player interface. Controls float gracefully above the visual atmosphere, and the music remains the undisputed hero.

---

## 2. Target Platforms & Performance Floor

- **Target Audience:** Listeners who value deep immersion, fluid typography, dynamic artwork atmosphere, and zero-stutter playback.
- **Performance Floor (Benchmark Device):** Low-to-mid Android (~Pixel 6a / Galaxy A5x class, 60–90 Hz). *If it doesn't hold 60 fps during gestures on this floor, the feature must not ship.*
- **Mainstream Devices:** iPhone 12–16 (60–120 Hz ProMotion), Pixel 8/9, Galaxy S22–S25.
- **Minimum OS Support:**
  - iOS 16.4+ (React Native 0.85+ baseline)
  - Android API 26+ (Android 8.0 Oreo), optimized for Android 12+ (API 31+) native blur/audio pipelines.
- **Form Factors:** Mobile portrait first (360×640 dp up to 430 pt+ wide). Tablet and foldable landscape layouts must not crash, but dedicated tablet UI is out of scope for v1.

---

## 3. Core Domain Models & Schemas

```typescript
// src/domain/types.ts

export interface Track {
  id: string;                // Canonical track ID
  title: string;             // Cleaned title (e.g. "Blinding Lights")
  artist: string;            // Primary artist name
  artists: string[];         // All participating artists
  album: string;             // Album title
  durationMs: number;        // Track duration in milliseconds
  artworkUrl: string;        // Hi-res artwork CDN URL
  thumbhash: string;         // Blurhash / Thumbhash placeholder string
  isExplicit: boolean;       // Content advisory flag
  audioFormat?: 'flac' | 'aac' | 'opus';
  bitrate?: number;          // Bitrate in kbps (e.g. 320)
  lyricsId?: string;         // Synced lyrics reference key
  bpm?: number;              // Camelot / Automix analysis tempo
  camelotKey?: string;       // e.g. "8B"
}

export interface ResolvedStream {
  streamUrl: string;
  sourceId: 'cache' | 'lossless' | 'saavn' | 'innertube' | 'piped';
  bitrate: number;
  format: 'flac' | 'aac' | 'opus';
  expiresAt: number;         // Millisecond timestamp when CDN token expires
  headers?: Record<string, string>;
  is2MbChunked: boolean;     // Whether 2MB range chunking is active
}

export interface WordSpan {
  startMs: number;
  endMs: number;
  text: string;
  isBackground?: boolean;    // Secondary/backing vocal indicator
  agent?: 'v1' | 'v2';       // Duet performer assignment
}

export interface LyricLine {
  timeMs: number;
  durationMs: number;
  text: string;
  words?: WordSpan[];        // Word-level spans for rich TTML playback
  translation?: string;      // Optional localized translation
  romanization?: string;     // Optional phonetic romanization
}
```

---

## 4. Key Up-Front Decisions & Resolved Assumptions

| Architectural Area | Decision for OTO v1 | Technical Rationale & BitChord Link |
| :--- | :--- | :--- |
| **Catalog / Audio Source** | Local mock catalog (`mockData.json`) + royalty-free audio files for P0–P3. | Eliminates dependency on external network APIs or licensing hurdles while perfecting UI, animations, and gestures. |
| **Streaming Pipeline** | Clean-room modular `StreamResolver` waterfall (Lossless $\to$ 320k AAC $\to$ YouTube) in P1+. | Adapts BitChord's resilient waterfall and 3-phase fuzzy `TrackMatcher` without GPL code copying (`BITCHORD_RE/05_STREAM_RESOLUTION.md`). |
| **Audio Engine** | Unified `AudioEngine` TS interface (`src/audio/AudioEngine.ts`). | Early slices use timer-based `FakeAudioEngine`. Production uses native dual-player TurboModule (`ExoPlayer` on Android, `AVAudioEngine` on iOS) implementing BitChord's $\sin^2+\cos^2=1$ crossfade (`BITCHORD_RE/04_CROSSFADE.md`). |
| **Audio Caching** | 2MB bounded HTTP Range chunking. | Bypasses YouTube CDN rate limiting, downloading tracks at line rate in ~300ms (`BITCHORD_RE/06_CACHE.md`). |
| **State & Persistence** | **MMKV** for player state/queue + monthly partitioned JSON for stats. | Avoids SQLite/Room schema migration lockups and JNI overhead. SQLite is reserved strictly for offline download manifests (`BITCHORD_RE/13_DATABASE_STATE.md`). |
| **Visualizer Data Mode** | Three-tier data pipeline: (a) Real FFT when audio tap is active, (b) Precomputed energy map, (c) Tempo-driven synthetic motion fallback. | Never market as "audio-reactive" unless (a) or (b) is active. |
| **Signature Accent** | **Warm Amber / Ochre `#E5A93C`** (fallback brand accent). | Replaces generic neon, Spotify green, and purple/blue AI gradients with a sophisticated, luminescent warm tone. |
| **Typography** | **Plus Jakarta Sans** (variable sans) with fallback fonts for Devanagari, Arabic, CJK, and Cyrillic. | Ensures global lyric coverage without tofu glyph rendering. |

---

## 5. Listen Together Synchronized Playback Protocol

Adapted from BitChord's WebSocket sync engine (`docs/reverse_engineering/07_LISTEN_TOGETHER_SYNC_PROTOCOL.md`):
- **Clock Drift Calculation:**
  $$t_{\text{offset}} = \frac{(t_{\text{recv}} - t_{\text{orig}}) + (t_{\text{transmit}} - t_{\text{resp}})}{2}$$
- **Micro-Sync Adjustment:**
  - $\Delta t \le 25\text{ms}$: Synchronized (no adjustment).
  - $25\text{ms} < \Delta t \le 500\text{ms}$: Dynamically adjust playback rate by $\pm 0.5\%$ to smoothly close phase gap without pitch shift or buffer pop.
  - $\Delta t > 500\text{ms}$: Hard seek to host position.

---

## 6. Success Criteria & Definition of Done

1. **Continuous 60/120 fps:** The Mini Player $\longleftrightarrow$ Now Playing transition is 100% interruptible, reversible, and maintains $\le 16.6$ms frame times on the low-end Android floor.
2. **Zero-Stutter Playhead:** Progress scrubbing and lyric tracking run entirely on the UI thread without triggering React component re-renders.
3. **Contrast Guarantee:** Every artwork-derived text and icon accent passes WCAG AA contrast ($\ge 4.5:1$ for body text, $\ge 3:1$ for large elements) against real rendered backgrounds.
4. **Resilient Degradation:** Every visual effect gracefully degrades across 4 quality tiers (`Tier 3, 2, 1, 0`) and functions perfectly under OS "Reduce Motion" and "Reduce Transparency".
5. **Full Offline Capability:** The app works seamlessly offline for downloaded tracks, skipping missing items with clear user feedback.
