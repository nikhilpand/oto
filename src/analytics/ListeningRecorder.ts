/**
 * ListeningRecorder — Zero-Database Listening Analytics & History Engine
 *
 * Clean-room implementation based on BitChord's ListeningRecorder.kt and
 * BITCHORD_RE/13_DATABASE_STATE.md zero-database persistence architecture.
 *
 * Avoids fragile SQLite schema migrations for listening history by using
 * partitioned MMKV aggregate buckets: pre-aggregated monthly keys (oto.stats.yyyy-MM)
 * with strict qualification gating:
 * - Minimum 30s playback OR 50% track duration before counting as a play (filters out skips)
 * - Maximum 3000ms delta step cap to prevent inflated stats during seeks
 * - Sub-millisecond synchronous reads for instant "Continue Listening" hydration.
 *
 * @see BITCHORD_RE/13_DATABASE_STATE.md
 * @see BitChord/.ua knowledge graph (ListeningRecorder.kt)
 */

import type { Track } from '@/domain/types';

export interface TrackListeningStat {
  trackId: string;
  title: string;
  artist: string;
  artworkUri?: string;
  albumTitle?: string;
  durationMs: number;
  playCount: number;
  totalListeningMs: number;
  firstPlayedAt: number;
  lastPlayedAt: number;
}

export interface MonthlyListeningPartition {
  yearMonth: string; // e.g. "2026-10"
  tracks: Record<string, TrackListeningStat>;
  totalListeningMs: number;
  totalPlays: number;
}

export interface MonthlySummary {
  yearMonth: string;
  totalListeningMinutes: number;
  totalPlays: number;
  uniqueTrackCount: number;
  topArtist: string | null;
}

export interface StorageBackend {
  getString: (key: string) => string | undefined;
  set: (key: string, value: string) => void;
  delete: (key: string) => void;
}

class MemoryStorage implements StorageBackend {
  private store = new Map<string, string>();
  getString(key: string): string | undefined {
    return this.store.get(key);
  }
  set(key: string, value: string): void {
    this.store.set(key, value);
  }
  delete(key: string): void {
    this.store.delete(key);
  }
}

function initStorage(): StorageBackend {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { MMKV } = require('react-native-mmkv');
    return new MMKV({ id: 'oto.analytics' });
  } catch {
    return new MemoryStorage();
  }
}

export const MAX_STEP_MS = 3000;
export const PLAY_FLOOR_MS = 30000; // 30s threshold
export const RECENT_HISTORY_KEY = 'oto.listening.recent';
export const PARTITION_PREFIX = 'oto.stats.';

export class ListeningRecorder {
  private static backend: StorageBackend = initStorage();

  // Active playback tracking session
  private static currentTrack: Track | null = null;
  private static lastSampleTime = 0;
  private static playedThisTrackMs = 0;
  private static playCounted = false;

  public static setBackendForTesting(customBackend: StorageBackend): void {
    this.backend = customBackend;
  }

  public static getYearMonth(timestamp = Date.now()): string {
    const d = new Date(timestamp);
    const month = String(d.getMonth() + 1).padStart(2, '0');
    return `${d.getFullYear()}-${month}`;
  }

  /**
   * Samples active playback. Must be called periodically (~1s or on position tick).
   */
  public static onSample(
    track: Track | null,
    isPlaying: boolean,
    now = Date.now()
  ): void {
    if (!track || !isPlaying) {
      if (this.currentTrack && !isPlaying) {
        this.flushInFlightDelta(now);
      }
      return;
    }

    // Track transition: finalize previous track's session
    if (this.currentTrack && this.currentTrack.id !== track.id) {
      this.onStopped(now);
    }

    // New track session initialization
    if (!this.currentTrack || this.currentTrack.id !== track.id) {
      this.currentTrack = track;
      this.lastSampleTime = now;
      this.playedThisTrackMs = 0;
      this.playCounted = false;
      return;
    }

    // Accumulate bounded step
    const delta = Math.min(MAX_STEP_MS, Math.max(0, now - this.lastSampleTime));
    this.playedThisTrackMs += delta;
    this.lastSampleTime = now;

    // Check qualification threshold: 30s OR >= 50% track duration
    const trackDuration = track.durationMs || 0;
    const isOverFloor = this.playedThisTrackMs >= PLAY_FLOOR_MS;
    const isOverHalf = trackDuration > 0 && this.playedThisTrackMs >= trackDuration * 0.5;

    if ((isOverFloor || isOverHalf) && !this.playCounted) {
      this.playCounted = true;
      this.commitVerifiedPlay(track, now);
    }
  }

  /**
   * Finalizes playback session for the current track and writes stats.
   */
  public static onStopped(now = Date.now()): void {
    if (!this.currentTrack) return;

    this.flushInFlightDelta(now);

    const track = this.currentTrack;
    const totalSessionMs = this.playedThisTrackMs;

    if (totalSessionMs > 1000) {
      this.addListeningDuration(track, totalSessionMs, now);
    }

    this.currentTrack = null;
    this.lastSampleTime = 0;
    this.playedThisTrackMs = 0;
    this.playCounted = false;
  }

  private static flushInFlightDelta(now: number): void {
    if (this.lastSampleTime > 0) {
      const delta = Math.min(MAX_STEP_MS, Math.max(0, now - this.lastSampleTime));
      this.playedThisTrackMs += delta;
      this.lastSampleTime = now;
    }
  }

  private static commitVerifiedPlay(track: Track, now: number): void {
    const ym = this.getYearMonth(now);
    const partition = this.getMonthlyPartition(ym);

    const stat = partition.tracks[track.id] || {
      trackId: track.id,
      title: track.title,
      artist: track.artist,
      artworkUri: track.artworkUrl,
      albumTitle: track.album,
      durationMs: track.durationMs,
      playCount: 0,
      totalListeningMs: 0,
      firstPlayedAt: now,
      lastPlayedAt: now,
    };

    stat.playCount += 1;
    stat.lastPlayedAt = now;
    partition.tracks[track.id] = stat;
    partition.totalPlays += 1;

    this.saveMonthlyPartition(partition);
    this.appendRecentTrack(track, now);
  }

  private static addListeningDuration(
    track: Track,
    durationMs: number,
    now: number
  ): void {
    const ym = this.getYearMonth(now);
    const partition = this.getMonthlyPartition(ym);

    const stat = partition.tracks[track.id] || {
      trackId: track.id,
      title: track.title,
      artist: track.artist,
      artworkUri: track.artworkUrl,
      albumTitle: track.album,
      durationMs: track.durationMs,
      playCount: 0,
      totalListeningMs: 0,
      firstPlayedAt: now,
      lastPlayedAt: now,
    };

    stat.totalListeningMs += durationMs;
    stat.lastPlayedAt = now;
    partition.tracks[track.id] = stat;
    partition.totalListeningMs += durationMs;

    this.saveMonthlyPartition(partition);
  }

  public static getMonthlyPartition(yearMonth: string): MonthlyListeningPartition {
    const key = `${PARTITION_PREFIX}${yearMonth}`;
    const raw = this.backend.getString(key);
    if (!raw) {
      return {
        yearMonth,
        tracks: {},
        totalListeningMs: 0,
        totalPlays: 0,
      };
    }
    try {
      return JSON.parse(raw) as MonthlyListeningPartition;
    } catch {
      return {
        yearMonth,
        tracks: {},
        totalListeningMs: 0,
        totalPlays: 0,
      };
    }
  }

  public static saveMonthlyPartition(partition: MonthlyListeningPartition): void {
    const key = `${PARTITION_PREFIX}${partition.yearMonth}`;
    this.backend.set(key, JSON.stringify(partition));
  }

  private static appendRecentTrack(track: Track, now: number): void {
    const raw = this.backend.getString(RECENT_HISTORY_KEY);
    let recents: { track: Track; playedAt: number }[] = [];
    if (raw) {
      try {
        recents = JSON.parse(raw);
      } catch {
        recents = [];
      }
    }

    // Filter out existing occurrence of this track and prepend
    recents = [{ track, playedAt: now }, ...recents.filter((r) => r.track.id !== track.id)].slice(0, 50);
    this.backend.set(RECENT_HISTORY_KEY, JSON.stringify(recents));
  }

  /**
   * Retrieves verified "Continue Listening" tracks in descending play order.
   */
  public static getContinueListening(limit = 10): Track[] {
    const raw = this.backend.getString(RECENT_HISTORY_KEY);
    if (!raw) return [];
    try {
      const recents: { track: Track; playedAt: number }[] = JSON.parse(raw);
      return recents.slice(0, limit).map((r) => r.track);
    } catch {
      return [];
    }
  }

  /**
   * Retrieves top listened tracks for a month sorted by play count.
   */
  public static getTopTracks(yearMonth?: string, limit = 10): TrackListeningStat[] {
    const ym = yearMonth || this.getYearMonth();
    const partition = this.getMonthlyPartition(ym);
    return Object.values(partition.tracks)
      .sort((a, b) => b.playCount - a.playCount || b.totalListeningMs - a.totalListeningMs)
      .slice(0, limit);
  }

  /**
   * Summarizes listening metrics for a month.
   */
  public static getMonthlySummary(yearMonth?: string): MonthlySummary {
    const ym = yearMonth || this.getYearMonth();
    const partition = this.getMonthlyPartition(ym);

    // Compute top artist
    const artistCounts: Record<string, number> = {};
    for (const track of Object.values(partition.tracks)) {
      if (track.artist) {
        artistCounts[track.artist] = (artistCounts[track.artist] || 0) + track.playCount;
      }
    }

    let topArtist: string | null = null;
    let highestPlays = 0;
    for (const [artist, plays] of Object.entries(artistCounts)) {
      if (plays > highestPlays) {
        highestPlays = plays;
        topArtist = artist;
      }
    }

    return {
      yearMonth: ym,
      totalListeningMinutes: Math.round(partition.totalListeningMs / 60000),
      totalPlays: partition.totalPlays,
      uniqueTrackCount: Object.keys(partition.tracks).length,
      topArtist,
    };
  }

  public static clearAllStats(): void {
    this.currentTrack = null;
    this.lastSampleTime = 0;
    this.playedThisTrackMs = 0;
    this.playCounted = false;
  }
}
