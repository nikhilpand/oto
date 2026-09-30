# 13 — Data Models & State Persistence Architecture

## Executive Summary: The Zero-Database Paradigm

A remarkable design decision in BitChord is its **complete absence of a relational database (Room / SQLite)**. While conventional mobile apps use heavy SQLite databases for playlists, history, and downloads, BitChord proves that an audio streaming application can achieve superior speed and lower memory usage by using:
1. **Memory-Mapped Key-Value Storage:** Android `SharedPreferences` for flags and configuration.
2. **Hardware-Backed Encryption:** Android Keystore `EncryptedSharedPreferences` for session cookies.
3. **Partitioned JSON Aggregate Buckets:** Pre-aggregated monthly files (`yyyy-MM.json`) for listening history.
4. **File-System Binary Media:** Direct storage of tagged media files in Android's `Music/` folder without maintaining database duplicates.

---

## 1. Domain Entities & State Models

```mermaid
classDiagram
    class Song {
        +String videoId
        +String title
        +String artist
        +String thumbnailUrl
        +String durationText
        +String albumName
        +Boolean isVideo
        +QueueTier queueTier
        +String queueEntryId
        +String localUri
        +String downloadFormat
        +String playbackSource
    }

    class QueueTier {
        <<enumeration>>
        USER_QUEUE
        CONTEXT
        AUTOPLAY
    }

    class DownloadState {
        <<sealed>>
        Queued
        Running(fraction)
        Failed(reason)
    }

    class TrackAnalysis {
        +String trackId
        +Double bpm
        +Double beatInterval
        +List~Double~ downbeats
        +List~Double~ energyEnvelope
        +Double audibleStartSec
        +Double contentEndSec
        +Double confidence
    }

    Song --> QueueTier
```

---

## 2. Persistence Layer Distribution

| Data Domain | BitChord Implementation | Storage Location | Eviction / Retention Policy |
| :--- | :--- | :--- | :--- |
| **User Settings** | `AppSettings.kt` | `SharedPreferences` | Permanent until app uninstall or clear data. |
| **Auth & Cookies** | `AuthStore.kt` | `EncryptedSharedPreferences` | Encrypted with Android Keystore master key. |
| **Search History** | `SearchHistory.kt` | JSON string in `SharedPreferences` | Capped at 50 most recent queries. |
| **Listening History** | `ListeningStats.kt` | Monthly JSON (`filesDir/stats/yyyy-MM.json`) | Retained indefinitely; pre-aggregated on write. |
| **Saved Downloads** | `Downloads.kt` | JSON map in `SharedPreferences` | Verified against filesystem on each query. |
| **Audio Cache** | `AudioCache.kt` | Media3 `SimpleCache` block files | Dynamic LRU eviction capped at user limit (512MB–10GB). |
| **Automix Analysis** | `AnalysisStore.kt` | Disk JSON files (`cacheDir/analysis/`) | LRU cache holding analyzed track features. |

---

## 3. React Native State & Storage Blueprint

In React Native, we can adapt this lean storage philosophy while utilizing modern high-performance libraries like **MMKV** and **OP-SQLite**:

```mermaid
graph TD
    subgraph Fast_KV ["Ultra-Fast Key-Value Storage (react-native-mmkv)"]
        MMKV_Settings[User Settings & Feature Flags]
        MMKV_Search[Search History Array]
        MMKV_Downloads[Saved Downloads Index: videoId -> filePath]
        MMKV_Queue[Last Active Queue Snapshot for Session Restore]
    end

    subgraph Secure_Storage ["Hardware Secure Enclave (react-native-keychain)"]
        KC_Auth[Google Session Cookies & Refresh Tokens]
        KC_API[Third-Party Service API Keys]
    end

    subgraph File_System ["Local Device File System"]
        FS_Audio[Audio Cache Directory: 2MB Cached Chunks]
        FS_Media[Downloaded Tagged Songs in Music/]
        FS_Stats[Stats Directory: Monthly JSON Aggregate Files]
        FS_Analysis[Automix Analysis JSON Cache]
    end

    subgraph Memory_State ["In-Memory State Management (Zustand)"]
        Z_Player[usePlayerStore: Track, Status, Buffering]
        Z_Queue[useQueueStore: Context, User Queue, Autoplay]
        Z_UI[useUIStore: Active Tab, Player Sheet Expansion]
    end
```

### Architectural Mapping Matrix: What Lives Where

| Subsystem Component | Recommended RN Technology | Justification |
| :--- | :--- | :--- |
| **UI State (Tabs, Modals)** | **Zustand / React Context** | Transient UI state; does not require disk persistence. |
| **Playback Queue** | **Zustand + MMKV** | In-memory execution with automatic debounced snapshots saved to MMKV for instant session restore. |
| **Playhead Progress** | **Reanimated `SharedValue`** | Isolates 60Hz tick from React component tree to avoid re-renders. |
| **Settings & Preferences** | **`react-native-mmkv`** | Synchronous, $<0.1\text{ms}$ read times; eliminates async waterfall on app startup. |
| **Auth Tokens / Secrets** | **`react-native-keychain`** | Hardware-backed Keychain (iOS) and Keystore (Android) security. |
| **Listening Statistics** | **Local JSON Files (Monthly)** | Follows BitChord's proven aggregate design; prevents database bloat. |
| **Local Music Library** | **OP-SQLite (Optional)** | Only if indexing $>10,000$ local tracks from device storage for instant complex search/sorting. |
| **Audio Cache Spans** | **Native Platform Audio Cache** | Managed directly by native audio player engine (Media3 / AVAsset). |
