/**
 * Recent Searches Storage
 *
 * MMKV-backed persistence for recent search queries with in-memory
 * fallback for Jest / non-native environments.
 *
 * Key:     oto.search.recent_queries
 * Payload: string[] (max 10, most-recent first)
 */

const STORAGE_KEY = 'oto.search.recent_queries';
const MAX_QUERIES = 10;

// ─── Storage backend abstraction ──────────────────────────────────────

interface StorageBackend {
  getString(key: string): string | undefined;
  set(key: string, value: string): void;
}

class MemoryStorage implements StorageBackend {
  private data = new Map<string, string>();
  getString(key: string) { return this.data.get(key); }
  set(key: string, value: string) { this.data.set(key, value); }
}

function createBackend(): StorageBackend {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { MMKV } = require('react-native-mmkv') as { MMKV: new (config: { id: string }) => StorageBackend };
    return new MMKV({ id: 'oto-search' });
  } catch {
    return new MemoryStorage();
  }
}

const storage = createBackend();

// ─── Public API ───────────────────────────────────────────────────────

/** Return current recent queries, most-recent first. */
export function getRecentQueries(): string[] {
  try {
    const raw = storage.getString(STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as string[];
  } catch {
    return [];
  }
}

/** Prepend a query. Deduplicates and caps at MAX_QUERIES. */
export function addRecentQuery(query: string): void {
  const trimmed = query.trim();
  if (!trimmed) return;
  const current = getRecentQueries().filter((q) => q !== trimmed);
  const next = [trimmed, ...current].slice(0, MAX_QUERIES);
  storage.set(STORAGE_KEY, JSON.stringify(next));
}

/** Remove a specific query. */
export function removeRecentQuery(query: string): void {
  const next = getRecentQueries().filter((q) => q !== query);
  storage.set(STORAGE_KEY, JSON.stringify(next));
}

/** Clear all recent queries. */
export function clearRecentQueries(): void {
  storage.set(STORAGE_KEY, JSON.stringify([]));
}
