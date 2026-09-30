# Offline-First Database, Cache & Persistence Specification

This document provides a complete production-grade database schema, caching architecture, and persistence specification for building a modern, offline-first music streaming app based on the reverse-engineered design of [BitChord](file:///c:/Users/nikhil/Desktop/projects/music-mobile/BitChord).

While BitChord originally utilized a memory-first architecture with minimal disk storage, a production client requires an offline-capable relational database (Android Room with SQLite), Full-Text Search (FTS4), LRU audio cache, and image disk caches.

---

## 1. Storage & Persistence Tier Architecture

```mermaid
flowchart TD
    subgraph MemoryTier [Tier 1: High-Speed In-Memory State]
        StateFlows[Kotlin MutableStateFlow<br/>Active Queue, Playhead, UI State]
        AudioBlockMemory[AudioBlock Float32 Heap<br/>Zero GC Allocations]
        L1CoilCache[Coil Bitmap L1 Memory Cache<br/>25% Max Available JVM Heap]
    end

    subgraph RelationalDB [Tier 2: Structured Relational Database (Android Room 2.6+)]
        RoomDB[(Room SQLite Database<br/>app_database.db)]
        TracksTable[tracks & tracks_fts]
        PlaylistsTable[playlists & playlist_track_cross_ref]
        HistoryTable[playback_history]
        SmartAnalysisTable[smart_track_analysis]
        LyricsCacheTable[lyrics_cache]
    end

    subgraph BinaryDiskCache [Tier 3: Binary Media & Stream Cache (LRU)]
        Media3Cache[Media3 SimpleCache<br/>Encrypted / Direct Disk Cache<br/>Quota: 512MB - 4GB]
        OnnxCache[ONNX Neural Model Binaries<br/>beat_this_int8.onnx, vocals_umxhq_int8.onnx]
        CoilL2Cache[Coil Disk Cache: OkHttp DiskLruCache]
        PlayersCache[Preprocessed QuickJS Players<br/>innertubex_players/<hash>]
    end

    StateFlows <--> RoomDB
    RoomDB <--> TracksTable
    RoomDB <--> PlaylistsTable
    RoomDB <--> HistoryTable
    RoomDB <--> SmartAnalysisTable
    RoomDB <--> LyricsCacheTable
    StateFlows <--> Media3Cache
```

---

## 2. Complete Room Database Entities & Schema

Below are the exact Kotlin Room entity definitions:

### 1. Track Entity & FTS Virtual Table
```kotlin
package com.music.client.data.db.entities

import androidx.room.ColumnInfo
import androidx.room.Entity
import androidx.room.Fts4
import androidx.room.Index
import androidx.room.PrimaryKey

@Entity(
    tableName = "tracks",
    indices = [
        Index(value = ["videoId"], unique = true),
        Index(value = ["artistId"]),
        Index(value = ["albumId"]),
        Index(value = ["isFavorite"])
    ]
)
data class TrackEntity(
    @PrimaryKey
    @ColumnInfo(name = "videoId")
    val videoId: String,
    
    @ColumnInfo(name = "title")
    val title: String,
    
    @ColumnInfo(name = "artistName")
    val artistName: String,
    
    @ColumnInfo(name = "artistId")
    val artistId: String? = null,
    
    @ColumnInfo(name = "albumTitle")
    val albumTitle: String? = null,
    
    @ColumnInfo(name = "albumId")
    val albumId: String? = null,
    
    @ColumnInfo(name = "durationMs")
    val durationMs: Long,
    
    @ColumnInfo(name = "thumbnailUrl")
    val thumbnailUrl: String? = null,
    
    @ColumnInfo(name = "loudnessDb")
    val loudnessDb: Double? = null,
    
    @ColumnInfo(name = "isExplicit")
    val isExplicit: Boolean = false,
    
    @ColumnInfo(name = "isFavorite")
    val isFavorite: Boolean = false,
    
    @ColumnInfo(name = "isDownloaded")
    val isDownloaded: Boolean = false,
    
    @ColumnInfo(name = "localFilePath")
    val localFilePath: String? = null,
    
    @ColumnInfo(name = "audioBitrateKbps")
    val audioBitrateKbps: Int? = null,
    
    @ColumnInfo(name = "audioMimeType")
    val audioMimeType: String? = null, // e.g. "audio/webm; codecs=\"opus\"" or "audio/mp4"
    
    @ColumnInfo(name = "lastUpdatedTimestamp")
    val lastUpdatedTimestamp: Long = System.currentTimeMillis()
)

/**
 * High-performance Full-Text Search (FTS4) table indexing tracks for instantaneous
 * sub-millisecond offline search across titles, artists, and album names.
 */
@Fts4(contentEntity = TrackEntity::class)
@Entity(tableName = "tracks_fts")
data class TrackFtsEntity(
    @ColumnInfo(name = "title")
    val title: String,
    
    @ColumnInfo(name = "artistName")
    val artistName: String,
    
    @ColumnInfo(name = "albumTitle")
    val albumTitle: String?
)
```

### 2. Playlist & Many-to-Many CrossRef Entities
```kotlin
package com.music.client.data.db.entities

import androidx.room.ColumnInfo
import androidx.room.Entity
import androidx.room.ForeignKey
import androidx.room.Index
import androidx.room.PrimaryKey

@Entity(tableName = "playlists")
data class PlaylistEntity(
    @PrimaryKey
    @ColumnInfo(name = "playlistId")
    val playlistId: String, // UUID for local playlists, or YouTube Browse ID (e.g. "VLPL...")
    
    @ColumnInfo(name = "title")
    val title: String,
    
    @ColumnInfo(name = "description")
    val description: String? = null,
    
    @ColumnInfo(name = "thumbnailUrl")
    val thumbnailUrl: String? = null,
    
    @ColumnInfo(name = "isPinned")
    val isPinned: Boolean = false,
    
    @ColumnInfo(name = "isRemote")
    val isRemote: Boolean = false,
    
    @ColumnInfo(name = "createdAt")
    val createdAt: Long = System.currentTimeMillis(),
    
    @ColumnInfo(name = "updatedAt")
    val updatedAt: Long = System.currentTimeMillis()
)

@Entity(
    tableName = "playlist_track_cross_ref",
    primaryKeys = ["playlistId", "trackOrder"],
    foreignKeys = [
        ForeignKey(
            entity = PlaylistEntity::class,
            parentColumns = ["playlistId"],
            childColumns = ["playlistId"],
            onDelete = ForeignKey.CASCADE
        ),
        ForeignKey(
            entity = TrackEntity::class,
            parentColumns = ["videoId"],
            childColumns = ["videoId"],
            onDelete = ForeignKey.CASCADE
        )
    ],
    indices = [
        Index(value = ["playlistId"]),
        Index(value = ["videoId"])
    ]
)
data class PlaylistTrackCrossRef(
    @ColumnInfo(name = "playlistId")
    val playlistId: String,
    
    @ColumnInfo(name = "videoId")
    val videoId: String,
    
    @ColumnInfo(name = "trackOrder")
    val trackOrder: Int, // Preserves user manual drag-and-drop ordering
    
    @ColumnInfo(name = "addedAt")
    val addedAt: Long = System.currentTimeMillis()
)
```

### 3. Playback History Entity
```kotlin
package com.music.client.data.db.entities

import androidx.room.ColumnInfo
import androidx.room.Entity
import androidx.room.ForeignKey
import androidx.room.Index
import androidx.room.PrimaryKey

@Entity(
    tableName = "playback_history",
    foreignKeys = [
        ForeignKey(
            entity = TrackEntity::class,
            parentColumns = ["videoId"],
            childColumns = ["videoId"],
            onDelete = ForeignKey.CASCADE
        )
    ],
    indices = [
        Index(value = ["videoId"]),
        Index(value = ["listenedAt"])
    ]
)
data class PlaybackHistoryEntity(
    @PrimaryKey(autoGenerate = true)
    @ColumnInfo(name = "historyId")
    val historyId: Long = 0,
    
    @ColumnInfo(name = "videoId")
    val videoId: String,
    
    @ColumnInfo(name = "listenedAt")
    val listenedAt: Long = System.currentTimeMillis(),
    
    @ColumnInfo(name = "playedDurationMs")
    val playedDurationMs: Long,
    
    @ColumnInfo(name = "completedRatio")
    val completedRatio: Float // e.g. 0.95 for a fully heard song
)
```

### 4. Smart Track Analysis (Automix Cache) Entity
```kotlin
package com.music.client.data.db.entities

import androidx.room.ColumnInfo
import androidx.room.Entity
import androidx.room.PrimaryKey

@Entity(tableName = "smart_track_analysis")
data class SmartAnalysisEntity(
    @PrimaryKey
    @ColumnInfo(name = "videoId")
    val videoId: String,
    
    @ColumnInfo(name = "bpm")
    val bpm: Double,
    
    @ColumnInfo(name = "beatInterval")
    val beatInterval: Double,
    
    @ColumnInfo(name = "firstBeatTime")
    val firstBeatTime: Double,
    
    @ColumnInfo(name = "musicalKey")
    val musicalKey: String, // e.g. "C", "G#m", "11B"
    
    @ColumnInfo(name = "keyConfidence")
    val keyConfidence: Double,
    
    @ColumnInfo(name = "beatsJson")
    val beatsJson: String, // Serialized List<Double>
    
    @ColumnInfo(name = "downbeatsJson")
    val downbeatsJson: String, // Serialized List<Double>
    
    @ColumnInfo(name = "phraseBoundariesJson")
    val phraseBoundariesJson: String, // Serialized List<Double>
    
    @ColumnInfo(name = "chromaJson")
    val chromaJson: String, // Serialized 12-element List<Double>
    
    @ColumnInfo(name = "audibleStartTime")
    val audibleStartTime: Double,
    
    @ColumnInfo(name = "introEndTime")
    val introEndTime: Double,
    
    @ColumnInfo(name = "outroStartTime")
    val outroStartTime: Double,
    
    @ColumnInfo(name = "energyCurveJson")
    val energyCurveJson: String, // Serialized List<EnergyPoint>
    
    @ColumnInfo(name = "analyzedAt")
    val analyzedAt: Long = System.currentTimeMillis()
)
```

### 5. Lyrics Cache Entity
```kotlin
package com.music.client.data.db.entities

import androidx.room.ColumnInfo
import androidx.room.Entity
import androidx.room.Index
import androidx.room.PrimaryKey

@Entity(
    tableName = "lyrics_cache",
    indices = [
        Index(value = ["videoId"], unique = true),
        Index(value = ["queryHash"])
    ]
)
data class LyricsCacheEntity(
    @PrimaryKey
    @ColumnInfo(name = "videoId")
    val videoId: String,
    
    @ColumnInfo(name = "queryHash")
    val queryHash: String, // SHA256 of "artist:title"
    
    @ColumnInfo(name = "rawLyrics")
    val rawLyrics: String, // TTML XML, LRC, or plain text
    
    @ColumnInfo(name = "syncType")
    val syncType: String, // "SYLLABLE", "LINE", or "UNSYNCED"
    
    @ColumnInfo(name = "provider")
    val provider: String, // "TTML", "BINI", "LRCLIB", "GENIUS", etc.
    
    @ColumnInfo(name = "cachedAt")
    val cachedAt: Long = System.currentTimeMillis()
)
```

---

## 3. Data Access Objects (DAOs) Implementation

```kotlin
package com.music.client.data.db.dao

import androidx.room.*
import com.music.client.data.db.entities.*
import kotlinx.coroutines.flow.Flow

@Dao
interface TrackDao {
    @Upsert
    suspend fun upsertTrack(track: TrackEntity)
    
    @Upsert
    suspend fun upsertTracks(tracks: List<TrackEntity>)
    
    @Query("SELECT * FROM tracks WHERE videoId = :videoId LIMIT 1")
    suspend fun getTrackById(videoId: String): TrackEntity?
    
    @Query("SELECT * FROM tracks WHERE videoId = :videoId LIMIT 1")
    fun observeTrackById(videoId: String): Flow<TrackEntity?>
    
    @Query("SELECT * FROM tracks WHERE isFavorite = 1 ORDER BY lastUpdatedTimestamp DESC")
    fun observeFavoriteTracks(): Flow<List<TrackEntity>>
    
    @Query("SELECT * FROM tracks WHERE isDownloaded = 1 ORDER BY title ASC")
    fun observeDownloadedTracks(): Flow<List<TrackEntity>>
    
    /**
     * Sub-millisecond FTS4 search query matching across title, artist, or album.
     */
    @Transaction
    @Query("""
        SELECT t.* FROM tracks t
        JOIN tracks_fts fts ON t.title = fts.title
        WHERE tracks_fts MATCH :searchQuery
        ORDER BY rank
        LIMIT 50
    """)
    fun searchTracks(searchQuery: String): Flow<List<TrackEntity>>
    
    @Query("UPDATE tracks SET isFavorite = :isFavorite WHERE videoId = :videoId")
    suspend fun setFavorite(videoId: String, isFavorite: Boolean)
}

@Dao
interface PlaylistDao {
    @Upsert
    suspend fun upsertPlaylist(playlist: PlaylistEntity)
    
    @Upsert
    suspend fun upsertCrossRefs(crossRefs: List<PlaylistTrackCrossRef>)
    
    @Query("SELECT * FROM playlists ORDER BY isPinned DESC, updatedAt DESC")
    fun observeAllPlaylists(): Flow<List<PlaylistEntity>>
    
    @Transaction
    @Query("""
        SELECT t.* FROM tracks t
        INNER JOIN playlist_track_cross_ref r ON t.videoId = r.videoId
        WHERE r.playlistId = :playlistId
        ORDER BY r.trackOrder ASC
    """)
    fun observeTracksInPlaylist(playlistId: String): Flow<List<TrackEntity>>
    
    @Query("DELETE FROM playlist_track_cross_ref WHERE playlistId = :playlistId AND videoId = :videoId")
    suspend fun removeTrackFromPlaylist(playlistId: String, videoId: String)
    
    @Query("DELETE FROM playlists WHERE playlistId = :playlistId")
    suspend fun deletePlaylist(playlistId: String)
}

@Dao
interface SmartAnalysisDao {
    @Upsert
    suspend fun upsertAnalysis(analysis: SmartAnalysisEntity)
    
    @Query("SELECT * FROM smart_track_analysis WHERE videoId = :videoId LIMIT 1")
    suspend fun getAnalysisForTrack(videoId: String): SmartAnalysisEntity?
    
    @Query("DELETE FROM smart_track_analysis WHERE analyzedAt < :expiryTimestamp")
    suspend fun pruneOldAnalyses(expiryTimestamp: Long)
}
```

---

## 4. Media3 Audio Cache & Disk Quota Enforcement

BitChord utilizes AndroidX Media3's `SimpleCache` with an LRU eviction strategy:

```kotlin
package com.music.client.data.cache

import android.content.Context
import androidx.media3.common.util.UnstableApi
import androidx.media3.database.StandaloneDatabaseProvider
import androidx.media3.datasource.cache.LeastRecentlyUsedCacheEvictor
import androidx.media3.datasource.cache.SimpleCache
import java.io.File

@UnstableApi
object PlaybackCache {
    private var instance: SimpleCache? = null
    
    // Default 1.5 GB audio disk cache quota
    private const val DEFAULT_CACHE_BYTES = 1536L * 1024L * 1024L

    @Synchronized
    fun getInstance(context: Context): SimpleCache {
        return instance ?: run {
            val cacheDir = File(context.cacheDir, "media3_audio_cache").apply { mkdirs() }
            val evictor = LeastRecentlyUsedCacheEvictor(DEFAULT_CACHE_BYTES)
            val dbProvider = StandaloneDatabaseProvider(context)
            SimpleCache(cacheDir, evictor, dbProvider).also { instance = it }
        }
    }
}
```

### Cache Key Partitioning:
- **Streaming Chunks**: Cached using `videoId` as the unique cache key (`DataSpec.Builder().setKey(videoId).build()`).
- This guarantees that even if YouTube rotates its CDN domain (`r1---sn-....googlevideo.com`), pre-buffered byte ranges remain valid and cached locally.
