/**
 * ChunkedDataSource — 2MB Range Chunk Fetch Manager
 *
 * Implements BitChord's approach of fetching audio in discrete 2MB range
 * chunks to avoid YouTube CDN rate throttling. Each chunk is keyed by a
 * canonical cache key (`oto://track/{id}`) for storage-level dedup.
 *
 * @classification REIMPLEMENT
 * @priority P1
 * @portedFrom BitChord: playback/ChunkedDataSource.kt
 *
 * CLEAN-ROOM IMPLEMENTATION
 * Reimplement — pure TypeScript fetch wrapper with Range headers.
 *
 * @see BITCHORD_RE/06_CACHE.md — 2MB bounded range chunk caching
 */

// ─── Constants ────────────────────────────────────────────────────────

/** Chunk size: 2MB (2 * 1024 * 1024 bytes) */
const CHUNK_SIZE = 2 * 1024 * 1024;

/** Maximum in-memory chunks to hold (LRU eviction beyond this) */
const MAX_CACHED_CHUNKS = 64; // 128MB max memory

// ─── Types ────────────────────────────────────────────────────────────

export interface ChunkDescriptor {
  /** Canonical cache key, e.g., `oto://track/abc123` */
  cacheKey: string;
  /** Zero-based chunk index */
  chunkIndex: number;
  /** Byte offset of chunk start */
  startByte: number;
  /** Byte offset of chunk end (inclusive) */
  endByte: number;
}

export interface FetchedChunk {
  descriptor: ChunkDescriptor;
  data: ArrayBuffer;
  /** HTTP status code from the range request */
  httpStatus: number;
  /** Content-Length as reported by server */
  contentLength: number;
}

export interface ChunkFetchOptions {
  /** The stream URL to fetch from */
  url: string;
  /** Canonical track ID for cache keying */
  trackId: string;
  /** Custom headers required for CDN access */
  headers?: Record<string, string>;
  /** AbortSignal for cancellation */
  signal?: AbortSignal;
  /** Total content length if known (from initial HEAD request) */
  totalBytes?: number;
}

// ─── In-Memory Chunk Cache ────────────────────────────────────────────

interface CachedEntry {
  data: ArrayBuffer;
  accessedAt: number;
}

const chunkCache = new Map<string, CachedEntry>();

function cacheKey(desc: ChunkDescriptor): string {
  return `${desc.cacheKey}:${desc.chunkIndex}`;
}

function getCached(desc: ChunkDescriptor): ArrayBuffer | null {
  const key = cacheKey(desc);
  const entry = chunkCache.get(key);
  if (entry) {
    entry.accessedAt = Date.now();
    return entry.data;
  }
  return null;
}

function putCached(desc: ChunkDescriptor, data: ArrayBuffer): void {
  // Evict LRU if at capacity
  if (chunkCache.size >= MAX_CACHED_CHUNKS) {
    let oldestKey: string | null = null;
    let oldestTime = Infinity;
    for (const [k, v] of chunkCache) {
      if (v.accessedAt < oldestTime) {
        oldestTime = v.accessedAt;
        oldestKey = k;
      }
    }
    if (oldestKey) chunkCache.delete(oldestKey);
  }
  chunkCache.set(cacheKey(desc), { data, accessedAt: Date.now() });
}

// ─── Public API ───────────────────────────────────────────────────────

export const ChunkedDataSource = {
  /** Chunk size in bytes (2MB) */
  CHUNK_SIZE,

  /**
   * Build canonical cache key for a track.
   * Format: `oto://track/{trackId}`
   */
  buildCacheKey(trackId: string): string {
    return `oto://track/${trackId}`;
  },

  /**
   * Calculate the chunk descriptor for a given byte offset.
   */
  getChunkDescriptor(trackId: string, byteOffset: number): ChunkDescriptor {
    const chunkIndex = Math.floor(byteOffset / CHUNK_SIZE);
    return {
      cacheKey: ChunkedDataSource.buildCacheKey(trackId),
      chunkIndex,
      startByte: chunkIndex * CHUNK_SIZE,
      endByte: (chunkIndex + 1) * CHUNK_SIZE - 1,
    };
  },

  /**
   * Calculate total number of chunks for a file of given size.
   */
  totalChunks(totalBytes: number): number {
    return Math.ceil(totalBytes / CHUNK_SIZE);
  },

  /**
   * Fetch a single 2MB chunk using an HTTP Range request.
   * Returns cached data if available.
   */
  async fetchChunk(
    options: ChunkFetchOptions,
    chunkIndex: number,
  ): Promise<FetchedChunk> {
    const descriptor = {
      cacheKey: ChunkedDataSource.buildCacheKey(options.trackId),
      chunkIndex,
      startByte: chunkIndex * CHUNK_SIZE,
      endByte: options.totalBytes
        ? Math.min((chunkIndex + 1) * CHUNK_SIZE - 1, options.totalBytes - 1)
        : (chunkIndex + 1) * CHUNK_SIZE - 1,
    };

    // Check cache first
    const cached = getCached(descriptor);
    if (cached) {
      return {
        descriptor,
        data: cached,
        httpStatus: 200,
        contentLength: cached.byteLength,
      };
    }

    // Fetch with Range header
    const rangeHeader = `bytes=${descriptor.startByte}-${descriptor.endByte}`;
    const fetchHeaders: Record<string, string> = {
      Range: rangeHeader,
      ...options.headers,
    };

    const response = await fetch(options.url, {
      headers: fetchHeaders,
      signal: options.signal,
    });

    if (!response.ok && response.status !== 206) {
      throw new ChunkFetchError(
        `Chunk fetch failed: HTTP ${response.status}`,
        response.status,
        descriptor,
      );
    }

    const data = await response.arrayBuffer();

    // Cache the fetched chunk
    putCached(descriptor, data);

    return {
      descriptor,
      data,
      httpStatus: response.status,
      contentLength: data.byteLength,
    };
  },

  /**
   * Fetch multiple sequential chunks (e.g., for pre-buffering).
   * Stops early if an abort signal fires.
   */
  async fetchRange(
    options: ChunkFetchOptions,
    startChunk: number,
    endChunk: number,
  ): Promise<FetchedChunk[]> {
    const results: FetchedChunk[] = [];
    for (let i = startChunk; i <= endChunk; i++) {
      if (options.signal?.aborted) break;
      const chunk = await ChunkedDataSource.fetchChunk(options, i);
      results.push(chunk);
    }
    return results;
  },

  /**
   * Probe content length via a HEAD request.
   * Returns total bytes, or -1 if server doesn't report.
   */
  async probeContentLength(
    url: string,
    headers?: Record<string, string>,
  ): Promise<number> {
    try {
      const response = await fetch(url, {
        method: 'HEAD',
        headers,
      });
      const cl = response.headers.get('Content-Length');
      if (!cl) return -1;
      const parsed = parseInt(cl, 10);
      return Number.isFinite(parsed) && parsed >= 0 ? parsed : -1;
    } catch {
      return -1;
    }
  },

  /**
   * Evict all cached chunks for a given track.
   */
  evictTrack(trackId: string): void {
    const prefix = `oto://track/${trackId}:`;
    for (const key of chunkCache.keys()) {
      if (key.startsWith(prefix)) {
        chunkCache.delete(key);
      }
    }
  },

  /**
   * Clear the entire chunk cache.
   */
  clearCache(): void {
    chunkCache.clear();
  },

  /**
   * Get cache statistics.
   */
  getCacheStats(): { entries: number; estimatedBytes: number } {
    let totalBytes = 0;
    for (const entry of chunkCache.values()) {
      totalBytes += entry.data.byteLength;
    }
    return { entries: chunkCache.size, estimatedBytes: totalBytes };
  },
} as const;

// ─── Error Type ───────────────────────────────────────────────────────

export class ChunkFetchError extends Error {
  constructor(
    message: string,
    public readonly httpStatus: number,
    public readonly descriptor: ChunkDescriptor,
  ) {
    super(message);
    this.name = 'ChunkFetchError';
  }
}
