/**
 * Zero-Database MMKV Fast Hydration for Two-Tier Queue
 *
 * Implements BitChord Zero-Database Persistence pattern (BITCHORD_RE/13_DATABASE_STATE.md).
 * Uses MMKV for sub-millisecond serialization and hydration of queue state across app launches.
 * Includes defensive in-memory fallback for test runners (Jest) and environments without JSI.
 */

import { QueueState } from './types';

const STORAGE_KEY = 'oto_queue_state_v1';

interface StorageBackend {
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
    // Dynamic require or import of react-native-mmkv
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { MMKV } = require('react-native-mmkv');
    return new MMKV({ id: 'oto.queue' });
  } catch {
    // Fallback to in-memory storage for Jest or non-native runs
    return new MemoryStorage();
  }
}

export class QueueStorage {
  private static backend: StorageBackend = initStorage();

  /**
   * Serializes and writes queue state snapshot to MMKV.
   */
  static save(state: QueueState): void {
    try {
      const serialized = JSON.stringify(state);
      this.backend.set(STORAGE_KEY, serialized);
    } catch {
      // Non-critical persistence failure; ignore safely
    }
  }

  /**
   * Hydrates queue state from MMKV. Returns null if empty or corrupt.
   */
  static load(): QueueState | null {
    try {
      const raw = this.backend.getString(STORAGE_KEY);
      if (!raw) return null;
      const parsed = JSON.parse(raw) as QueueState;
      if (
        parsed &&
        Array.isArray(parsed.priorityQueue) &&
        Array.isArray(parsed.standardQueue)
      ) {
        return parsed;
      }
      return null;
    } catch {
      return null;
    }
  }

  /**
   * Wipes persisted queue state.
   */
  static clear(): void {
    try {
      this.backend.delete(STORAGE_KEY);
    } catch {
      // Ignore
    }
  }
}
