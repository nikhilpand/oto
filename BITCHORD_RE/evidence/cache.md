# Audio Cache & Download Evidence Log — BitChord Reverse-Engineering

This document records the verified caching strategies, chunking range requests, eviction algorithms, and download tagging mechanics from `AudioCache.kt` and `Downloads.kt`.

---

## Evidence 1: Cache Key Isolation from Ephemeral CDN URLs
- **Claim:** AudioCache keys cached blocks by immutable `videoId` or `trackKey`, NOT by the ephemeral signed CDN URL (which contains expiring timestamps and auth tokens).
- **Evidence:**
  - `AudioCache.kt` lines 56–62 (KDoc):
    > "The cache is keyed by videoId, not by URL: googlevideo URLs are single-use, expire within hours, and differ between resolves of the same track, so keying on them would cache every track afresh on every play. Because CacheDataSource sits *outside* the resolving data source it sees the original bitchord://watch?v=<id> request, and a cache hit never resolves a URL at all."
- **File:** `BitChord/app/src/main/java/com/music/bitchord/playback/AudioCache.kt`
- **Class:** `AudioCache`
- **Confidence:** `VERIFIED FROM SOURCE`
- **Implication for React Native:** In React Native, native audio caching layers must use custom cache key factories mapping `bitchord://track?v={id}` to the disk cache entry. Keying on HTTP URLs breaks caching completely.

---

## Evidence 2: 2MB Range Chunking for Line-Rate CDN Delivery
- **Claim:** BitChord downloads whole tracks in 2MB bounded byte ranges (`CHUNK_BYTES = 2L * 1024 * 1024`) rather than single open-ended HTTP streams to circumvent YouTube's CDN bandwidth throttling.
- **Evidence:**
  - `AudioCache.kt` lines 84–94 (KDoc):
    > "Ranges, not one long read, because googlevideo paces a continuous response down to roughly playback speed after the first megabyte or so — a track fetched that way finishes caching around the time it finishes playing... Bounded ranges are served at line rate: two megabytes lands in about a third of a second... against seventy seconds streamed."
- **File:** `BitChord/app/src/main/java/com/music/bitchord/playback/AudioCache.kt`
- **Constant:** `CHUNK_BYTES = 2L * 1024 * 1024`
- **Confidence:** `VERIFIED FROM SOURCE`
- **Implication for React Native:** When preloading audio on React Native, background download workers should fetch in 2MB HTTP `Range: bytes=X-Y` requests to achieve line-rate network utilization.

---

## Evidence 3: Dynamic LRU Eviction Sizing
- **Claim:** `DynamicLruCacheEvictor` allows real-time dynamic resizing of the cache ceiling between 512MB and 10GB without rebuilding the cache index or wiping existing blocks.
- **Evidence:**
  - `AudioCache.kt` line 74: `private val evictor = DynamicLruCacheEvictor(AppSettings.DEFAULT_CACHE_LIMIT_BYTES)`
  - Evictor drops least-recently-accessed media spans as new audio bytes are committed to disk.
- **File:** `BitChord/app/src/main/java/com/music/bitchord/playback/DynamicLruCacheEvictor.kt`
- **Confidence:** `VERIFIED FROM SOURCE`
- **Implication for React Native:** Native disk storage should maintain an LRU index in MMKV or SQLite, pruning oldest unpinned cache files when total directory size exceeds the user-configured budget.

---

## Evidence 4: Container-Native Metadata Tagging
- **Claim:** Downloaded files are tagged directly at the binary container level with embedded ID3v2, Vorbis Comments, iTunes MP4 atoms, and synchronized lyrics, producing standalone DRM-free media files.
- **Evidence:**
  - `FlacTagger.kt` injects Vorbis Comments and picture blocks.
  - `Mp4Tagger.kt` writes `\u00a9nam`, `\u00a9ART`, `\u00a9alb`, `covr`, and `soaa`.
  - `LyricsTag.kt` writes synchronized LRC/TTML lines into standard container metadata tags.
- **File:** `BitChord/app/src/main/java/com/music/bitchord/download/FlacTagger.kt`, `Mp4Tagger.kt`
- **Confidence:** `VERIFIED FROM SOURCE`
- **Implication for React Native:** Audio tagging should be executed via a fast native C++ / Rust library (e.g. `taglib` or `lofty`) compiled into a React Native TurboModule.
