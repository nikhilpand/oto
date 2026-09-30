# Data & State Persistence Evidence Log — BitChord Reverse-Engineering

This document records verified facts about BitChord's data models, storage mechanisms, cache structures, and state distribution.

---

## Evidence 1: Entity Models and Queue Invariants
- **Claim:** The fundamental entity is `Song`, which encapsulates both remote YouTube catalog metadata and local playback invariants (`queueTier`, `queueEntryId`, `localUri`).
- **Evidence:**
  - `data/model/Models.kt` lines 14–98:
    `Song` carries `queueEntryId: String? = null`, assigned once when entering `QueueCoordinator`.
  - `QueueTier` enum: `USER_QUEUE`, `CONTEXT`, `AUTOPLAY`.
- **File:** `BitChord/app/src/main/java/com/music/bitchord/data/model/Models.kt`
- **Class:** `Song`
- **Confidence:** `VERIFIED FROM SOURCE`
- **Implication for React Native:** TypeScript interface for `Song` should mirror these exact fields.

---

## Evidence 2: Zero-Database Architecture (Pre-Aggregated JSON Files)
- **Claim:** BitChord has no relational database (Room/SQLite). Listening statistics are stored in calendar-month partitioned JSON files (`yyyy-MM.json`) containing pre-aggregated counters.
- **Evidence:**
  - `ListeningStats.kt` lines 25–45 (KDoc):
    > "Aggregates, not an event log: The obvious shape for listening history is a row per play, summed up when something asks. It is also the shape that grows without bound on a phone nobody is going to garbage-collect... So the addition happens on the way in... Buckets are calendar months in the device's own time zone, one JSON file each."
- **File:** `BitChord/app/src/main/java/com/music/bitchord/data/stats/ListeningStats.kt`
- **Class:** `ListeningStats`
- **Confidence:** `VERIFIED FROM SOURCE`
- **Implication for React Native:** Avoid heavy SQLite relational setups for simple play history. Monthly JSON files or a lightweight key-value store in MMKV provide instantaneous lookups with zero DB migration headaches.

---

## Evidence 3: Encrypted Session Security via Android Keystore
- **Claim:** User Google session cookies and tokens are encrypted with AES-256-GCM via `EncryptedSharedPreferences` backed by the Android Keystore system.
- **Evidence:**
  - `BitChordApplication.kt` lines 43–50 and `auth/AuthStore.kt`.
- **File:** `BitChord/app/src/main/java/com/music/bitchord/auth/AuthStore.kt`
- **Confidence:** `VERIFIED FROM SOURCE`
- **Implication for React Native:** In React Native, sensitive tokens and cookies should be stored in `react-native-keychain` or `react-native-mmkv` with hardware encryption enabled.
