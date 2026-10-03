/**
 * Autoplay — Auto Queue Extension
 *
 * Generates follow-up tracks when the queue runs empty based on
 * the currently playing track's characteristics (artist, genre, BPM).
 *
 * @classification ALGORITHM_PORT
 * @priority P1
 * @portedFrom BitChord: playback/Autoplay.kt
 *
 * CLEAN-ROOM IMPLEMENTATION
 * Algorithm port — uses related tracks API + local listening history.
 */

import { Track } from '@/domain/types';
import { QueueItem, QueueSource } from './types';
import { QueueCoordinator } from './QueueCoordinator';
import { defaultAutoplayFetcher } from './defaultAutoplayFetcher';

// ─── Configuration ────────────────────────────────────────────────────

/** Number of autoplay tracks to fetch ahead */
const AUTOPLAY_LOOKAHEAD = 15;

/** Minimum tracks remaining before triggering autoplay */
const TRIGGER_THRESHOLD = 2;

/** Maximum recently played tracks to avoid repeats */
const HISTORY_DEDUP_SIZE = 50;

// ─── Types ────────────────────────────────────────────────────────────

export interface AutoplayConfig {
  /** Enable/disable autoplay globally */
  enabled: boolean;
  /** Allow explicit content in autoplay */
  allowExplicit: boolean;
  /** Prefer tracks from same artist */
  preferSameArtist: boolean;
  /** Maximum number of autoplay tracks to queue */
  maxTracks: number;
}

export type AutoplayFetcher = (
  seedTrack: Track,
  count: number,
  excludeIds: string[]
) => Promise<Track[]>;

// ─── Default Config ───────────────────────────────────────────────────

const DEFAULT_CONFIG: AutoplayConfig = {
  enabled: true,
  allowExplicit: true,
  preferSameArtist: false,
  maxTracks: AUTOPLAY_LOOKAHEAD,
};

// ─── State ────────────────────────────────────────────────────────────

let config: AutoplayConfig = { ...DEFAULT_CONFIG };
let recentlyPlayedIds: string[] = [];
let isFetching = false;
let registeredFetcher: AutoplayFetcher | null = null;

// ─── Public API ───────────────────────────────────────────────────────

export const Autoplay = {
  /**
   * Register the related-tracks fetcher (called once at app init).
   * The fetcher should call the API to get tracks similar to the seed.
   */
  registerFetcher(fetcher: AutoplayFetcher): void {
    registeredFetcher = fetcher;
  },

  /**
   * Update autoplay configuration.
   */
  configure(partial: Partial<AutoplayConfig>): void {
    config = { ...config, ...partial };
  },

  /**
   * Check if autoplay should trigger and fetch tracks if needed.
   * Called by the queue store when popNext() is invoked.
   *
   * @returns Tracks to append to the standard queue, or empty array
   */
  async checkAndFetch(params: {
    currentTrack: Track | null;
    remainingInQueue: number;
    allQueueIds: string[];
  }): Promise<Track[]> {
    if (!config.enabled || !params.currentTrack || isFetching) {
      return [];
    }

    // Only trigger when queue is nearly empty
    if (params.remainingInQueue > TRIGGER_THRESHOLD) {
      return [];
    }

    const fetcher = registeredFetcher || defaultAutoplayFetcher;

    isFetching = true;
    try {
      // Build exclusion set from queue + recent history
      const excludeIds = new Set([
        ...params.allQueueIds,
        ...recentlyPlayedIds,
        params.currentTrack.id,
      ]);

      const tracks = await fetcher(
        params.currentTrack,
        config.maxTracks,
        Array.from(excludeIds)
      );

      // Filter explicit if needed
      const filtered = config.allowExplicit
        ? tracks
        : tracks.filter((t) => !t.isExplicit);

      // Record these as played to avoid repeats
      for (const t of filtered) {
        Autoplay._recordPlayed(t.id);
      }

      return filtered;
    } catch {
      // On API failure, return fallback
      return Autoplay._generateFallbackTracks(params.currentTrack);
    } finally {
      isFetching = false;
    }
  },

  /**
   * Record a track as played (for dedup in future autoplay).
   */
  recordPlayed(trackId: string): void {
    Autoplay._recordPlayed(trackId);
  },

  /**
   * Convert autoplay results to QueueItems for the standard queue.
   */
  toQueueItems(tracks: Track[]): QueueItem[] {
    const source: QueueSource = {
      id: 'autoplay',
      title: 'Autoplay',
      type: 'radio',
    };
    return tracks.map((track) => QueueCoordinator.asQueueEntry(track, 'standard', source));
  },

  /**
   * Reset autoplay state (on logout, queue clear, etc.).
   */
  reset(): void {
    recentlyPlayedIds = [];
    isFetching = false;
  },

  /** @internal */
  _recordPlayed(id: string): void {
    recentlyPlayedIds.push(id);
    if (recentlyPlayedIds.length > HISTORY_DEDUP_SIZE) {
      recentlyPlayedIds = recentlyPlayedIds.slice(-HISTORY_DEDUP_SIZE);
    }
  },

  /**
   * @internal Generate simple fallback tracks when no API is available.
   * In production, this returns empty — the UI shows "queue ended" state.
   */
  _generateFallbackTracks(_seed: Track): Track[] {
    // Fallback: return empty. UI should show "Add more music" prompt.
    return [];
  },
} as const;
