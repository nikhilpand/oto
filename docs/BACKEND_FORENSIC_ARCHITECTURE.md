# OTO Backend Forensic Architecture & Engineering Specification

> **Status:** Production Master Blueprint  
> **Target System:** OTO Audio Streaming & Identity Microservice (`backend/`)  
> **Inherited Sources:** BitChord (`BITCHORD_RE/`, `docs/reverse_engineering/`), VIVI (`YTPlayerUtils`, `StreamUrlCache`), InnerTubeX (`ContentAwareFallbackStrategy`, `PlayerClientDirector`), Metrolist (`InnerTubeXPlayer`), Zemer (`RemotePlayerConfigStore`), SimpMusic (`CrossfadeExoPlayerAdapter`), and `ytmusicapi`.

---

## 1. Executive Summary & Forensic Grounding

Historical open-source music clients suffer from a fundamental architectural flaw: **coupling the music catalog to a single stream resolution mechanism**. When an upstream provider alters its player JavaScript obfuscation, rate-limits IP blocks via BotGuard / Proof-of-Origin (PO Token), or rotates CDN parameters, monolithic clients collapse.

OTO treats music streaming as a **heterogeneous multi-engine pipeline** consisting of four decoupled layers:
1. **Music Identity Engine:** Establishes canonical track identity across divergent provider representations, enforcing strict version-marker symmetry (`[Remix]`, `[Acoustic]`, `[Live]`) and hard duration gating ($\Delta t \le 3\text{s}$).
2. **Provider Matching Engine:** Cascades through prioritized audio sources (Lossless FLAC, JioSaavn 320kbps AAC, YouTube Opus/AAC, and local storage) without cross-song leakage.
3. **Playback Resolution Engine:** Disaggregates catalog browsing from stream extraction. Employs client-splitting (`ANDROID_VR_1_43_32` for low-latency stream extraction vs. `WEB_REMIX` for rich metadata), signature timestamp caching, and sandboxed cipher deobfuscation.
4. **Playback Reliability Engine:** Hardens playback against upstream failures via in-flight resolution coalescing, generation-tracked expiring LRU caching, two-stage byte-range probing (0–16KB header + >1MB deep probe), dynamic resolver health scoring with exponential cooldown, and self-healing remote configuration.

```
                           OTO MASTER PIPELINE
                                    │
             ┌──────────────────────┼──────────────────────┐
             ▼                      ▼                      ▼
      CATALOG SERVICE        IDENTITY SERVICE       PLAYBACK SERVICE
    (Search/Browse/Next)   (Canonical Matching)   (Resolution & Health)
             │                      │                      │
             └──────────────────────┼──────────────────────┘
                                    │
                       Resolved Canonical Track
                                    │
                                    ▼
                         PROVIDER WATERFALL
                ┌───────────────────┼───────────────────┐
                ▼                   ▼                   ▼
           Lossless FLAC      JioSaavn 320k       YouTube Opus
         (Qobuz/Tidal/LAN)    (DES-ECB Decrypt)   (Multi-Client)
                │                   │                   │
                └───────────────────┼───────────────────┘
                                    │
                                    ▼
                         STREAM VALIDATOR
                    (Stage 1: 0-16KB Header Probe)
                    (Stage 2: >1MB Boundary Probe)
                                    │
                        ┌───────────┴───────────┐
                        ▼                       ▼
                   Passed Probe            Failed Probe
                        │                       │
                        ▼                       ▼
                   STREAM CACHE           RESOLVER HEALTH
               (Gen-Tracked LRU)      (Cooldown & Client Failover)
                        │                       │
                        ▼                       ▼
                 EXOPLAYER / CLIENT       RETRY NEXT
                  (2MB Range Chunks)       PROVIDER
```

---

## 2. Core Data Contracts & Schema Models

### 2.1 The Stream Object Model
In OTO, stream resolution results are never raw URLs. Every resolved stream carries full provenance, cryptographic headers, format metrics, and range chunking policies.

```python
from dataclasses import dataclass
from enum import Enum
from typing import Optional, Dict, Any, List, Tuple

class Provider(str, Enum):
    YOUTUBE = "youtube"
    JIOSAAVN = "jiosaavn"
    LOCAL = "local"
    LOSSLESS = "lossless"

class AudioQuality(str, Enum):
    LOW = "low"          # ~64 kbps (Opus / AAC)
    MEDIUM = "medium"    # ~128 kbps
    HIGH = "high"        # ~160-320 kbps (Opus 160 / JioSaavn 320 AAC)
    LOSSLESS = "lossless"# 16/24-bit FLAC

@dataclass(frozen=True)
class StreamFormat:
    mime_type: str
    codec: Optional[str]
    bitrate: Optional[int]
    sample_rate: Optional[int]
    channels: Optional[int]
    content_length: Optional[int]
    is_lossless: bool = False

@dataclass(frozen=True)
class ResolvedStream:
    provider: Provider
    source_id: str
    url: str
    headers: Dict[str, str]
    client_name: Optional[str]
    client_version: Optional[str]
    format: StreamFormat
    resolved_at_ms: int
    expires_at_ms: Optional[int]
    requires_range: bool = True
    range_chunk_size: int = 2 * 1024 * 1024  # 2MB bounded chunks (BitChord CDN bypass)
    delivery_nonce: Optional[str] = None
```

### 2.2 Canonical Identity Models
To prevent the catastrophic "wrong song substitution" bug present in naive multi-source players, logical tracks are assigned immutable canonical identities independent of any single provider ID.

```python
@dataclass(frozen=True)
class TrackArtist:
    name: str
    normalized_name: str
    position: int
    browse_id: Optional[str] = None

@dataclass(frozen=True)
class TrackIdentity:
    id: str                         # Canonical OTO ID (e.g. "trk_01J8...")
    title: str
    normalized_title: str
    artists: Tuple[TrackArtist, ...]
    album_title: Optional[str]
    normalized_album: Optional[str]
    duration_ms: Optional[int]
    is_explicit: bool
    isrc: Optional[str] = None
    created_at_ms: int = 0
    updated_at_ms: int = 0

@dataclass(frozen=True)
class ProviderTrack:
    provider: Provider
    provider_track_id: str
    title: str
    normalized_title: str
    artists: Tuple[str, ...]
    album_title: Optional[str]
    duration_ms: Optional[int]
    is_explicit: bool
    isrc: Optional[str] = None
    confidence: float = 1.0
    encrypted_media_url: Optional[str] = None  # JioSaavn DES payload
```

### 2.3 SQLite Identity & Health Persistence Schemas

```sql
-- Canonical Music Identity Database
CREATE TABLE IF NOT EXISTS track_identity (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    normalized_title TEXT NOT NULL,
    album_title TEXT,
    normalized_album TEXT,
    duration_ms INTEGER,
    explicit INTEGER NOT NULL DEFAULT 0,
    isrc TEXT,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_track_norm_title ON track_identity(normalized_title);
CREATE INDEX IF NOT EXISTS idx_track_isrc ON track_identity(isrc);

CREATE TABLE IF NOT EXISTS track_artist (
    track_id TEXT NOT NULL,
    artist_name TEXT NOT NULL,
    normalized_name TEXT NOT NULL,
    position INTEGER NOT NULL,
    browse_id TEXT,
    PRIMARY KEY (track_id, artist_name),
    FOREIGN KEY (track_id) REFERENCES track_identity(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS provider_track (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    identity_id TEXT NOT NULL,
    provider TEXT NOT NULL,
    provider_track_id TEXT NOT NULL,
    title TEXT,
    duration_ms INTEGER,
    album_title TEXT,
    confidence REAL DEFAULT 1.0,
    created_at INTEGER NOT NULL,
    UNIQUE(provider, provider_track_id),
    FOREIGN KEY (identity_id) REFERENCES track_identity(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_provider_lookup ON provider_track(provider, provider_track_id);

-- Dynamic Resolver Health & Circuit Breaker Database
CREATE TABLE IF NOT EXISTS resolver_health (
    provider TEXT NOT NULL,
    resolver TEXT NOT NULL,
    profile TEXT NOT NULL,
    successes INTEGER NOT NULL DEFAULT 0,
    failures INTEGER NOT NULL DEFAULT 0,
    consecutive_failures INTEGER NOT NULL DEFAULT 0,
    avg_latency_ms REAL DEFAULT 350.0,
    last_success_at INTEGER,
    last_failure_at INTEGER,
    cooldown_until INTEGER DEFAULT 0,
    last_error TEXT,
    PRIMARY KEY (provider, resolver, profile)
);
```

---

## 3. Engine 1: Music Identity & Normalization Engine

### 3.1 Normalization Invariants
String matching in music metadata is notoriously noisy due to feature tags (`feat.`, `ft.`), version markers, remastered packaging brackets, and punctuation. The OTO normalizer enforces deterministic decomposition:

1. **Case & Unicode Normalization:** Unicode NFKD decomposition, strip combining diacritics, lowercase.
2. **Packaging Bracket Stripping:** Strip peripheral brackets such as:
   `[Official Audio]`, `(Official Music Video)`, `(Lyric Video)`, `[Visualizer]`, `(Audio)`, `From "Movie Name"`.
3. **Version Marker Preservation:** Version markers **MUST NEVER** be stripped. They are extracted into a structured set `versions`:
   `{"remix", "acoustic", "live", "instrumental", "slowed", "reverb", "edit", "deluxe", "unplugged", "orchestral", "sped up"}`.
4. **Artist Separation:** Split on delimiters: `","`, `"&"`, `"feat."`, `"ft."`, `"vs."`, `";"`, `"/"`.

### 3.2 Hard Deterministic Matching Gates
Before applying fuzzy Levenshtein or token-set ratios, candidates **MUST** pass strict boolean gates:

$$\text{HardMatch}(A, B) = \begin{cases}
\text{True} & \text{if } A.\text{isrc} \land B.\text{isrc} \land \text{norm}(A.\text{isrc}) = \text{norm}(B.\text{isrc}) \\
\text{False} & \text{if } A.\text{versions} \neq B.\text{versions} \quad \text{(Symmetric Agreement)} \\
\text{False} & \text{if } |A.\text{duration} - B.\text{duration}| > 3000\text{ms} \quad (\text{audio-to-audio}) \\
\text{False} & \text{if } |A.\text{duration} - B.\text{duration}| > 12000\text{ms} \quad (\text{video-to-audio mode}) \\
\text{False} & \text{if } A.\text{explicit} \neq B.\text{explicit} \\
\text{False} & \text{if } A.\text{artists} \cap B.\text{artists} = \emptyset \\
\text{False} & \text{if } \text{LevenshteinRatio}(A.\text{core\_title}, B.\text{core\_title}) < 0.85 \\
\text{True} & \text{otherwise}
\end{cases}$$

> **Critical Forensic Rule (BitChord & VIVI):** Symmetrical version agreement is non-negotiable. If track $A$ is `Hotel California (Live)` and candidate $B$ is `Hotel California (Original)`, $A.\text{versions} = \{\text{live}\}$ while $B.\text{versions} = \emptyset$. Because $\{\text{live}\} \neq \emptyset$, the candidate is instantly rejected, preventing acoustic/live substitution bugs.

---

## 4. Engine 2: Provider Matching & Extraction Engine

### 4.1 YouTube Multi-Client Disaggregation Architecture
As discovered in VIVI (`YTPlayerUtils.kt`) and InnerTubeX (`PlayerClientDirector.kt`), combining stream resolution and authenticated metadata into a single client is a severe anti-pattern.

YouTube assigns different rate-limiting, cipher, and format policies per client:
* **`ANDROID_VR_1_43_32` (Fast Stream Resolver):** Delivers unthrottled direct media URLs with minimal or zero signature cipher requirements and no content-bound PO token requirement. Used as OTO's primary resolution client.
* **`WEB_REMIX` (Metadata & Catalog Client):** Delivers rich, authenticated browse hierarchies, lyrics browse IDs, and radio graphs (`/youtubei/v1/next`). Requires content-bound PO Tokens and `n`-parameter transforms when used for media playback.
* **`TVHTML5_SIMPLY_EMBEDDED_PLAYER` / `IOS` (Fallbacks):** Direct MP4/AAC streams requiring no BotGuard challenges.

```
       OTO RESOLUTION CLIENT DISAGGREGATION
                       │
       ┌───────────────┴───────────────┐
       ▼                               ▼
 METADATA PIPELINE             STREAMING PIPELINE
(Client: WEB_REMIX)      (Client: ANDROID_VR_1_43_32)
       │                               │
POST /youtubei/v1/next          POST /youtubei/v1/player
       ├── tracks                      ├── direct Opus 160k (itag 251)
       ├── radioId                     └── zero-cipher direct CDN URL
       ├── lyricsBrowseId                      │
       └── relatedBrowseId                     ▼
                                         PROBE VALIDATOR
                                               │
                                      ┌────────┴────────┐
                                      ▼                 ▼
                                    Pass               Fail (403)
                                      │                 │
                                    CACHE        FALLBACK CASCADE
                                (Return Stream)   (IOS -> TVHTML5 -> NewPipe)
```

### 4.2 JioSaavn High-Bitrate AAC Provider & DES-ECB Decryption
JioSaavn provides unthrottled 320kbps AAC audio streams hosted on high-speed CDNs. The API returns an encrypted `encrypted_media_url` field.
* **Algorithm:** DES in ECB mode with PKCS5 / PKCS7 padding.
* **Secret Key:** Static ASCII bytes `"38346591"` (or hex `3834363538383839`).
* **Bitrate Upgrade:** The decrypted URL often points to `_96.mp4` or `_160.mp4`. Substituting the suffix with `_320.mp4` upgrades the stream to 320kbps AAC without authentication.

### 4.3 NewPipe Failsafe Optimizations
When all InnerTube clients fail, NewPipe extraction is invoked with the two BitChord latency hacks:
1. **Intercepting `/youtubei/v1/next`:** BitChord proves that NewPipe wastes 7–12 seconds loading unrelated playlist context during extraction. Intercepting the `next` endpoint and returning a synthetic empty response (`{"responseContext":{}}`) reduces extraction time from $9.4\text{s}$ to $1.2\text{s}$.
2. **Dedicated Connection Pool & Leash:** OkHttp connection pool bounded to 4 idle connections with a 6-second connect timeout and 8-second read timeout.

---

## 5. Engine 3: Playback Resolution & Coordination Engine

### 5.1 Resolution Coordinator (In-Flight Coalescing)
When a user begins playback, the prefetch engine, audio player, UI scrubber, and lyrics matcher often trigger stream resolution for the exact same track simultaneously.

Without coalescing, four concurrent network requests execute cipher deobfuscation and YouTube player queries, triggering 429 rate-limiting.

```python
import asyncio
from typing import Dict, Callable, Coroutine, Any

class ResolutionCoordinator:
    """Coalesces concurrent resolution requests for the same track into a single in-flight task."""
    def __init__(self):
        self._inflight: Dict[str, asyncio.Task] = {}
        self._lock = asyncio.Lock()

    async def resolve(
        self, 
        track_id: str, 
        resolver_fn: Callable[[], Coroutine[Any, Any, ResolvedStream]]
    ) -> ResolvedStream:
        async with self._lock:
            existing = self._inflight.get(track_id)
            if existing is not None:
                # Deduplicate: reuse the active in-flight coroutine
                task = existing
            else:
                task = asyncio.create_task(resolver_fn())
                self._inflight[track_id] = task
                task.add_done_callback(lambda _: self._inflight.pop(track_id, None))

        return await task
```

---

## 6. Engine 4: Playback Reliability & Health Engine

### 6.1 Generation-Tracked Expiring LRU Stream Cache
Stream URLs from YouTube typically expire in 6 hours (`expire` parameter in query string). However, simple TTL caching is vulnerable to asynchronous race conditions:
1. Turn $t_0$: Resolution of track $A$ begins (Generation = 5).
2. Turn $t_1$: Track $A$ is invalidated due to network change or stream failure (Generation $\to$ 6).
3. Turn $t_2$: New resolution for track $A$ completes and caches with Generation 6.
4. Turn $t_3$: Slow request from turn $t_0$ finally finishes and overwrites the fresh cache entry with stale data!

OTO introduces **Generation-Protected Caching** (derived from VIVI `StreamUrlCache.kt`):

```python
from collections import OrderedDict
import time

@dataclass
class CacheEntry:
    stream: ResolvedStream
    generation: int
    expires_at_ms: int

class StreamCache:
    def __init__(self, max_entries: int = 500):
        self._entries: OrderedDict[str, CacheEntry] = OrderedDict()
        self._generations: Dict[str, int] = {}
        self._max_entries = max_entries

    def get_generation(self, track_id: str) -> int:
        return self._generations.get(track_id, 0)

    def get(self, track_id: str, now_ms: Optional[int] = None) -> Optional[ResolvedStream]:
        if now_ms is None:
            now_ms = int(time.time() * 1000)

        entry = self._entries.get(track_id)
        if not entry:
            return None

        if entry.expires_at_ms <= now_ms:
            self.invalidate(track_id)
            return None

        self._entries.move_to_end(track_id)
        return entry.stream

    def put(self, track_id: str, stream: ResolvedStream, expected_generation: int) -> bool:
        current_gen = self.get_generation(track_id)
        # REJECT stale asynchronous writes
        if current_gen != expected_generation:
            return False

        now_ms = int(time.time() * 1000)
        expiry = stream.expires_at_ms or (now_ms + 300_000)

        self._entries[track_id] = CacheEntry(
            stream=stream,
            generation=current_gen,
            expires_at_ms=expiry
        )
        self._entries.move_to_end(track_id)

        while len(self._entries) > self._max_entries:
            self._entries.popitem(last=False)

        return True

    def invalidate(self, track_id: str) -> None:
        self._entries.pop(track_id, None)
        self._generations[track_id] = self.get_generation(track_id) + 1
```

### 6.2 Two-Stage Stream Validator (Byte Probing)
A 200 OK response on an endpoint does not guarantee playable audio. BitChord and Metrolist prove that YouTube often returns valid initial JSON with a CDN URL that immediately throws 403 Forbidden or throttles to 0 bytes.

OTO implements a mandatory two-stage verification harness before returning any stream to ExoPlayer:
1. **Stage 1 (Header & Initial Span Probe):**
   * Request: `Range: bytes=0-16383` (First 16KB).
   * Timeout: $6.0\text{ seconds}$.
   * Requirements: HTTP status in $(200, 206)$, `Content-Type` starting with `audio/` (or `video/mp4` containing audio), and received body $\ge 4096\text{ bytes}$.
2. **Stage 2 (Deep Range Boundary Probe):**
   * Trigger: Media duration $> 120\text{s}$ or `content_length > 1,200,000 bytes`.
   * Request: `Range: bytes=1048576-1064959` (16KB span across the 1MB throttling boundary).
   * Verifies that GoogleVideo rate throttling or signature expiration does not kill the stream mid-song.

### 6.3 Dynamic Resolver Health & Circuit Breaker Scoring
Each `(provider, resolver, profile)` triple maintains dynamic health metrics stored in SQLite:

$$\text{Reliability} = \frac{\text{successes}}{\max(\text{successes} + \text{failures}, 1)}$$

$$\text{LatencyScore} = \frac{1000.0}{\max(\text{avg\_latency\_ms}, 100.0)}$$

$$\text{CooldownMultiplier} = \begin{cases} 0.0 & \text{if } t < \text{cooldown\_until} \\ 1.0 & \text{otherwise} \end{cases}$$

$$\text{HealthScore} = \left( 0.70 \times \text{Reliability} + 0.30 \times \min\left(\frac{\text{LatencyScore}}{10.0}, 1.0\right) \right) \times \text{CooldownMultiplier}$$

* **Failure Handling:** On probe failure or playback 403, `consecutive_failures` increments.
* **Exponential Backoff Cooldown:**
  $$\text{cooldown\_duration} = \min\left(30 \times 2^{\text{consecutive\_failures} - 1}, 1800\right)\text{ seconds}$$

---

## 7. Self-Healing Remote Player Configuration (Zemer Model)

OTO avoids hardcoding extraction parameters into binary releases. Following the Zemer architecture (`RemotePlayerConfigStore`), OTO loads an immutable structured configuration with:
* **Strict Schema Versioning:** Immediate rejection if `schemaVersion` does not match.
* **ETag & 6-Hour Cache TTL.**
* **Forced Refresh on Unknown Player Hash:** If YouTube rolls a new `base.js` hash, OTO bypasses cache and queries upstream.
* **Live HTTP 206 Validation:** Remote config changes are verified with a synthetic 206 Range test before being committed.
* **Last-Known-Good Persistence:** If remote configuration is malformed or network fails, OTO falls back to the embedded snapshot.

```json
{
  "schemaVersion": 1,
  "revision": 104,
  "updatedAt": 1790800000000,
  "clientPriority": [
    "ANDROID_VR_1_43_32",
    "IOS",
    "TVHTML5_SIMPLY_EMBEDDED_PLAYER",
    "WEB_REMIX"
  ],
  "cipher": {
    "playerHash": "8a3f9b2c",
    "signatureTimestamp": 19842,
    "knownScramblePatterns": ["swap", "reverse", "splice"]
  },
  "providers": {
    "jiosaavn": {
      "enabled": true,
      "priority": 1,
      "key": "38346591"
    },
    "youtube": {
      "enabled": true,
      "priority": 2
    }
  },
  "playback": {
    "probeBytes": 16384,
    "probeTimeoutMs": 6000,
    "rangeChunkBytes": 2097152
  }
}
```

---

## 8. Lyrics, Telemetry & Recommendations

### 8.1 Canonical Lyrics Model & Multi-Source Routing
Lyrics are fetched across a router cascading through **LRCLIB**, **BetterLyrics**, and **SimpMusic Lyrics**.

```python
@dataclass(frozen=True)
class LyricWord:
    start_ms: int
    end_ms: Optional[int]
    text: str

@dataclass(frozen=True)
class LyricLine:
    start_ms: int
    end_ms: Optional[int]
    text: str
    words: Tuple[LyricWord, ...] = ()

@dataclass(frozen=True)
class Lyrics:
    provider: str
    track_id: str
    lines: Tuple[LyricLine, ...]
    is_synced: bool
    language: Optional[str] = None
    has_word_timestamps: bool = False
```

Candidates are scored using token symmetry and duration delta:
$$\text{Score} = 0.50 \times \text{TitleMatch} + 0.30 \times \text{ArtistMatch} + 0.20 \times \max\left(0, 1 - \frac{|\Delta \text{duration}|}{5000\text{ms}}\right)$$

### 8.2 Partitioned Zero-Database Listening Telemetry
Following BitChord's zero-database model:
* Transient playhead and queue positions are persisted in MMKV for instant cold startup.
* Historical playback events are appended to monthly partitioned JSON files (`telemetry/events_2026_10.jsonl`):
  `{"eventId": "evt_...", "trackId": "trk_...", "durationMs": 240000, "playedMs": 198000, "completed": true, "timestamp": 1790800000}`.
* This eliminates SQLite write-ahead-log (WAL) bloat and prevents schema migration deadlocks on mobile updates.

### 8.3 Heuristic Recommendation Engine v1 (Non-LLM)
Candidate pooling:
1. YouTube Radio queue (`/youtubei/v1/next` with `radioId`).
2. Related tracks graph.
3. Artist top tracks.
4. Recent listening history.

Scoring equation:
$$\text{Score} = 0.35 A_{\text{personal}} + 0.20 A_{\text{artist}} + 0.15 S_{\text{context}} + 0.10 C_{\text{completion}} + 0.05 F_{\text{freshness}} + 0.10 N_{\text{novelty}} + 0.05 C_{\text{source}}$$

Diversity constraints:
* No identical song within 25 tracks.
* Max 2 songs per artist in a 10-track window.
* 50% penalty on tracks skipped within first 30 seconds.

---

## 9. Verification & Chaos Testing Harness

### 9.1 The 17-Mode Fault Injection Suite
The chaos test runner injects the following failure modes against every resolver:
1. `HTTP 200` with `text/html` (Captive portal / BotGuard captcha).
2. `HTTP 200` with truncated audio payload ($< 1024$ bytes).
3. `HTTP 206` with correct audio headers (Passing baseline).
4. `HTTP 403 Forbidden` (Content-bound PO Token / expired signature).
5. `HTTP 404 Not Found` (Dead CDN node).
6. `HTTP 410 Gone` (Deleted stream format).
7. `HTTP 429 Too Many Requests` (IP rate limiting).
8. Connect timeout ($> 6\text{s}$).
9. Read timeout / connection reset mid-transfer.
10. Empty body (`Content-Length: 0`).
11. Invalid MIME type (`application/octet-stream` without audio headers).
12. Expired timestamp (`expire < now`).
13. Duration mismatch ($> 12\text{s}$ variance).
14. Acoustic/Live mismatch (Version symmetry violation).
15. ISRC collision with conflicting artist.
16. Non-audio video stream missing audio track.
17. Slow download throttling ($< 30\text{ kbps}$ on deep probe).

### 9.2 The 100-Song Marathon Benchmark SLOs

| Metric | Target SLO | Hard Engineering Gate |
| :--- | :---: | :---: |
| Metadata Lookup ($p_{50}$) | $< 300\text{ ms}$ | $< 800\text{ ms}$ |
| Metadata Lookup ($p_{95}$) | $< 1000\text{ ms}$ | $< 2500\text{ ms}$ |
| Stream Resolution ($p_{50}$) | $< 500\text{ ms}$ | $< 1200\text{ ms}$ |
| Stream Resolution ($p_{95}$) | $< 2000\text{ ms}$ | $< 4000\text{ ms}$ |
| Cache Hit Startup | $< 100\text{ ms}$ | $< 250\text{ ms}$ |
| Probe Failure Detection | $< 2000\text{ ms}$ | $< 6000\text{ ms}$ |
| Next-Track Prefetch Success | $> 95\%$ | $> 90\%$ |
| Wrong-Provider Match | $< 0.5\%$ | $\mathbf{0.0\%}$ (Hard gate) |
| Duplicate In-Flight Resolution | $\mathbf{0}$ | $\mathbf{0}$ (Coalesced) |
| Expired URL Served | $\mathbf{0}$ | $\mathbf{0}$ (Gen-Checked) |
| Infinite Retry Hangs | $\mathbf{0}$ | $\mathbf{0}$ (Circuit-Breaker) |
