/**
 * paletteCache.ts — MMKV palette cache keyed by artwork URI hash.
 *
 * Cache contract:
 *  - Key: djb2 hash of artwork URI (string) → avoids SHA256 overhead on JS thread
 *  - Value: JSON-serialized OTOPalette
 *  - TTL: none (palette for a given artwork never changes)
 *  - Max entries: 200 (LRU eviction via simple counter approach)
 */

import { createMMKV } from 'react-native-mmkv';
import { OTOPalette } from './quantize';

const storage = createMMKV({ id: 'oto-palette-cache' });
const KEY_PREFIX = 'p:';
const INDEX_KEY = '__keys__';
const MAX_ENTRIES = 200;

/** djb2 hash — fast, collision-resistant enough for cache keying */
function djb2(str: string): string {
  let hash = 5381;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) + hash) ^ str.charCodeAt(i);
    hash = hash >>> 0; // keep unsigned 32-bit
  }
  return hash.toString(36);
}

function getIndex(): string[] {
  try {
    return JSON.parse(storage.getString(INDEX_KEY) ?? '[]') as string[];
  } catch {
    return [];
  }
}

function setIndex(keys: string[]): void {
  storage.set(INDEX_KEY, JSON.stringify(keys));
}

/** Get cached palette. Returns null on miss. O(1). */
export function getCachedPalette(uri: string): OTOPalette | null {
  const key = KEY_PREFIX + djb2(uri);
  const raw = storage.getString(key);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as OTOPalette;
  } catch {
    return null;
  }
}

/** Store palette. Evicts oldest entry if > MAX_ENTRIES. */
export function setCachedPalette(uri: string, palette: OTOPalette): void {
  const key = KEY_PREFIX + djb2(uri);
  const index = getIndex();
  // Evict oldest if at capacity
  if (index.length >= MAX_ENTRIES && !index.includes(key)) {
    const oldest = index.shift();
    if (oldest) storage.remove(oldest);
  }
  if (!index.includes(key)) index.push(key);
  storage.set(key, JSON.stringify(palette));
  setIndex(index);
}

/** Clear entire palette cache. */
export function clearPaletteCache(): void {
  const index = getIndex();
  index.forEach((k) => storage.remove(k));
  storage.remove(INDEX_KEY);
}
