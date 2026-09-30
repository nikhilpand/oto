# 11 — Download & Offline Storage Architecture

## Executive Summary: BitChord's Download System

BitChord treats downloads not as encrypted proprietary cache blobs, but as **first-class, tagged, DRM-free audio files** stored in user-accessible storage (or external app storage) with embedded album artwork, Vorbis comments / ID3v2 tags, and synchronized lyrics.

The download architecture decouples in-memory volatile job queues (`_active: Map<String, DownloadState>`) from persistent disk records (`_saved: Map<String, String>` videoId to URI), ensuring that interrupted background downloads never leave corrupted states on restart.

---

## 1. End-to-End Download Pipeline

```mermaid
flowchart TD
    Req([User Taps Download Track / Album]) --> QManager[Downloads.enqueue]
    
    QManager --> ResolveQ[Determine Target Format & Bitrate<br/>SourceResolver.requestForDownload]
    ResolveQ --> ConcurrentPool[DownloadService Coroutine Worker Pool<br/>Max Concurrency: 3 Parallel Workers]
    
    ConcurrentPool --> StreamSource[SourceResolver: Fetch Stream URL<br/>FLAC / JioSaavn 320k / YouTube Opus]
    
    StreamSource --> WriteTemp[Download to Temporary .part File<br/>Stream bytes with line-rate progress reporting]
    
    WriteTemp --> ProgressUpdates[Emit DownloadState.Running fraction<br/>Update Notification & UI]
    
    WriteTemp --> VerifyIntegrity{Download Completed Successfully?}
    VerifyIntegrity -- No --> RetryLogic{Retry Count < 3?}
    RetryLogic -- Yes --> ConcurrentPool
    RetryLogic -- No --> FailState[Emit DownloadState.Failed reason]
    
    VerifyIntegrity -- Yes --> TaggingStep[Container-Native Metadata Tagging]
    
    subgraph Taggers ["Binary Container Taggers"]
        Tag_FLAC[FlacTagger: Vorbis Comments + Picture Block]
        Tag_M4A[Mp4Tagger: iTunes Atoms nam, ART, alb, covr]
        Tag_WebM[WebmTagger: Matroska EBML Tags]
        Tag_Lyrics[LyricsTag: Embed Synced TTML/LRC]
    end
    
    TaggingStep --> Tag_FLAC
    TaggingStep --> Tag_M4A
    TaggingStep --> Tag_WebM
    TaggingStep --> Tag_Lyrics
    
    Tag_FLAC --> FinalRename[Atomically Move .part to Final Output File]
    Tag_M4A --> FinalRename
    Tag_WebM --> FinalRename
    Tag_Lyrics --> FinalRename
    
    FinalRename --> PersistMeta[Record in SharedPreferences<br/>_saved videoId -> uri + SavedSongMetadata]
    PersistMeta --> Complete([Emit DownloadState.Saved & Notify MediaStore])
```

---

## 2. Technical Mechanics of `Downloads.kt` & `DownloadService.kt`

### 2.1 State Separation: Active vs Saved
- **Active State (`_active: StateFlow<Map<String, DownloadState>>`):**
  - Volatile, in-memory state.
  - States: `Queued`, `Running(fraction: Float)`, `Failed(reason: String)`.
  - Empty on cold start. Interrupted downloads are cleared cleanly without leaving stale spinners.
- **Saved State (`_saved: StateFlow<Map<String, String>>`):**
  - Persistent record saved in `SharedPreferences` serialized as JSON.
  - Maps `videoId` $\to$ file URI.
  - Allows instantaneous "is track downloaded?" lookups for the UI without scanning Android's slow `MediaStore` per list row.

### 2.2 Concurrency & Worker Management
- Managed via Kotlin Coroutines `Semaphore` and worker pool (`MAX_CONCURRENT_DOWNLOADS = 3`).
- Prevents network saturation while downloading large 100-track playlists.
- Cancellation is immediate: tapping cancel on a downloading row cancels the underlying coroutine `Job`, deletes the `.part` file, and cleans memory state.

### 2.3 Binary Metadata Taggers
BitChord avoids external bulky Java tagging libraries like Jaudiotagger by writing container-specific taggers in pure Kotlin:
- **`FlacTagger.kt`:** Rewrites FLAC metadata blocks (STREAMINFO, VORBIS_COMMENT, PICTURE). Embeds 800x800 JPEG artwork and Vorbis tags (`TITLE`, `ARTIST`, `ALBUM`, `DATE`).
- **`Mp4Tagger.kt`:** Traverses MP4 box hierarchies (`moov -> udta -> meta -> ilst`) and injects standard iTunes atoms (`©nam`, `©ART`, `©alb`, `covr`).
- **`LyricsTag.kt`:** Injects syllable-accurate TTML or line-synced LRC text directly into the file so third-party music players can display synced lyrics offline.

---

## 3. React Native Architecture & Mapping

```mermaid
graph TD
    subgraph RN_JS ["React Native JS Domain"]
        DM_JS[DownloadManager.ts - Queue & Concurrency]
        MMKV_Downloads[MMKV: Persistent Saved Map videoId -> filePath]
    end

    subgraph Native_Module ["Native Background Download Module"]
        NDM[NativeDownloadTurboModule]
        WorkerPool[Android WorkManager / iOS NSURLSession Background]
        NativeTagger[Native TagLib C++ Module]
    end

    subgraph Storage ["Device Storage"]
        App_Storage[Sandbox App Storage / Documents Directory]
        Shared_Music[Shared Music Folder / MediaStore]
    end

    DM_JS --> MMKV_Downloads
    DM_JS -->|Start / Cancel / Pause| NDM
    NDM --> WorkerPool
    WorkerPool --> NativeTagger
    NativeTagger --> App_Storage
    NativeTagger --> Shared_Music
```

### React Native Implementation Strategy:
1. **Queue Management in JS / TS:** Keep the download queue and retry logic in TypeScript (`DownloadManager.ts`).
2. **Background Execution:** Use iOS `URLSessionConfiguration.background` and Android `WorkManager` / Foreground Service so downloads continue even if the app is killed.
3. **Audio Tagging:** Compile the industry-standard C++ library **TagLib** via React Native JSI / TurboModule to tag MP4, FLAC, and MP3 files at native speed (<20ms per file).
4. **Offline Playback:** When a downloaded song is selected, the player bypasses `SourceResolver` and feeds the local `file://` URI directly to the native audio player.
