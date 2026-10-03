/**
 * LastPlayed — Cold Start Resume
 *
 * Persists the last played track, position, and queue snapshot to MMKV
 * for instant restoration on app launch.
 *
 * @classification ALGORITHM_PORT
 * @priority P1
 * @portedFrom BitChord: playback/LastPlayed.kt
 *
 * CLEAN-ROOM IMPLEMENTATION
 * Algorithm port — MMKV persist: {trackId, positionMs, queueSnapshot}.
 * Hydrate on app launch.
 */

import { Track } from '@/domain/types';

// ─── Types ────────────────────────────────────────────────────────────

export interface LastPlayedSnapshot {
  /** Track that was playing when app was backgrounded/killed */
  track: Track;
  /** Playback position in ms at time of save */
  positionMs: number;
  /** Timestamp of when the snapshot was taken */
  savedAt: number;
  /** Was the track actively playing? */
  wasPlaying: boolean;
  /** Repeat mode at time of save */
  repeatMode: 'off' | 'all' | 'one';
  /** Whether shuffle was active */
  isShuffled: boolean;
  /** Volume level 0.0-1.0 */
  volume: number;
}

// ─── Storage Key ──────────────────────────────────────────────────────

const STORAGE_KEY = 'oto:last_played';

// ─── In-Memory Cache ──────────────────────────────────────────────────

let cachedSnapshot: LastPlayedSnapshot | null = null;
let isDirty = false;

// ─── Persistence Helpers ──────────────────────────────────────────────

interface KVStore {
  getString(key: string): string | undefined;
  set(key: string, value: string): void;
  delete(key: string): void;
}

let store: KVStore | null | undefined;

/** Lazily open the MMKV instance; null when native module is unavailable (Jest/web). */
function getStore(): KVStore | null {
  if (store !== undefined) return store;
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { MMKV } = require('react-native-mmkv');
    store = new MMKV({ id: 'oto.playback' }) as KVStore;
  } catch {
    store = null;
  }
  return store;
}

function writeToStorage(snapshot: LastPlayedSnapshot): void {
  try {
    getStore()?.set(STORAGE_KEY, JSON.stringify(snapshot));
  } catch {
    // Non-critical persistence — in-memory cache still serves this session
  }
}

function readFromStorage(): LastPlayedSnapshot | null {
  try {
    const raw = getStore()?.getString(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as LastPlayedSnapshot;
    // Validate essential fields
    if (!parsed.track?.id || typeof parsed.positionMs !== 'number') return null;
    return parsed;
  } catch {
    return null;
  }
}

// ─── Public API ───────────────────────────────────────────────────────

export const LastPlayed = {
  /**
   * Save current playback state. Called on:
   * - Track change
   * - App backgrounding (AppState → background)
   * - Periodic interval (every 15s during playback)
   * - Before app kill (if possible)
   */
  save(params: {
    track: Track;
    positionMs: number;
    wasPlaying: boolean;
    repeatMode?: 'off' | 'all' | 'one';
    isShuffled?: boolean;
    volume?: number;
  }): void {
    const snapshot: LastPlayedSnapshot = {
      track: params.track,
      positionMs: Math.max(0, params.positionMs),
      savedAt: Date.now(),
      wasPlaying: params.wasPlaying,
      repeatMode: params.repeatMode ?? 'off',
      isShuffled: params.isShuffled ?? false,
      volume: params.volume ?? 1.0,
    };

    cachedSnapshot = snapshot;
    isDirty = true;

    // Debounce actual write — avoid thrashing on rapid seeks
    LastPlayed._flush();
  },

  /**
   * Restore last played state on cold start.
   * Returns null if no valid snapshot exists or if it's too old (>7 days).
   */
  restore(): LastPlayedSnapshot | null {
    if (cachedSnapshot) return cachedSnapshot;

    const loaded = readFromStorage();
    if (!loaded) return null;

    // Expire snapshots older than 7 days
    const MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;
    if (Date.now() - loaded.savedAt > MAX_AGE_MS) {
      LastPlayed.clear();
      return null;
    }

    cachedSnapshot = loaded;
    return loaded;
  },

  /**
   * Clear the persisted snapshot (e.g., user logs out, clears data).
   */
  clear(): void {
    cachedSnapshot = null;
    isDirty = false;
    try {
      getStore()?.delete(STORAGE_KEY);
    } catch {
      // noop
    }
  },

  /**
   * Check whether a valid snapshot exists without fully loading it.
   */
  has(): boolean {
    if (cachedSnapshot) return true;
    return readFromStorage() !== null;
  },

  /** @internal Flush debounced write immediately */
  _flush(): void {
    if (isDirty && cachedSnapshot) {
      writeToStorage(cachedSnapshot);
      isDirty = false;
    }
  },
} as const;
