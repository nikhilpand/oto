# Prompt Slice P13: Downloads & Offline Storage

## Required Skills to Activate
- `reverse-engineer`: Clean-room adaptation of BitChord `06_CACHE.md` & `11_DOWNLOADS.md` (2MB range chunking, CDN throttling bypass).
- `protocol-reverse-engineering`: Container tagging: Vorbis comments (FLAC) and MP4 atoms (`covr`, `©lyr`, `©nam`, `©ART` for M4A/AAC).
- `database-architect`: SQLite download manifest schema design, index optimization, and storage tracking.
- `mobile-security-coder`: Safe app documents directory storage paths, sandbox validation, and secure file I/O.
- `test-driven-development`: Integration tests for range chunk assembly, offline fallback skipping, and network state recovery.

```text
Read AGENTS.md, docs/SPEC.md, and docs/DESIGN.md. Then execute the task below. Post a plan before editing.

Task:
Implement the Download Manager and offline playback architecture (adapting BITCHORD_RE/06_CACHE.md, BITCHORD_RE/11_DOWNLOADS.md, and docs/reverse_engineering/06_LYRICS_METADATA_AND_TAGGING.md):
1. Download Engine:
   - 2MB Bounded Range Chunking: fetches streams in discrete 2MB `Range` chunks (`bytes=0-2097151`, etc.) to bypass CDN rate throttling.
   - SQLite manifest schema:
     ```sql
     CREATE TABLE IF NOT EXISTS downloads (
       id TEXT PRIMARY KEY,
       track_json TEXT NOT NULL,
       local_uri TEXT NOT NULL,
       file_size_bytes INTEGER NOT NULL,
       status TEXT NOT NULL, -- 'queued', 'downloading', 'completed', 'failed'
       progress REAL NOT NULL,
       created_at INTEGER NOT NULL
     );
     ```
   - Container-Native Metadata Tagging: embeds Vorbis comments (FLAC) or MP4 atoms (`covr`, `©lyr`, `©nam`, `©ART` for M4A/AAC) with embedded cover art and synchronized lyrics directly into the audio file container.
   - Settings: "Download over Wi-Fi only" and storage limit caps.
2. Downloads Screen:
   - Storage utilization summary bar (Audio, Other Apps, Free Space).
   - Filter to "Downloaded Only" mode.
   - Per-item progress bar and swipe-to-delete.
3. Offline Playback Behavior:
   - Persistent, subtle offline banner when network drops.
   - Queue automatically skips unavailable non-downloaded tracks with an informative toast/snackbar explaining why.

Constraints:
- Audio files stored securely in app documents directory (`RNFS.DocumentDirectoryPath`).
- SQLite used exclusively for the download manifest, not for transient playback state.

Acceptance Criteria:
- Disconnecting Wi-Fi/cellular preserves full playback of all downloaded tracks.
- Storage summary accurately reflects file sizes on disk.
```
