import { ChunkedDataSource, ChunkFetchError } from '../ChunkedDataSource';

const CHUNK = ChunkedDataSource.CHUNK_SIZE;

function mockFetchResponse(
  status: number,
  bytes: number,
  headers: Record<string, string> = {},
  delayMs = 0
): jest.SpyInstance {
  return jest.spyOn(globalThis, 'fetch').mockImplementation(() => {
    return new Promise((resolve, reject) => {
      setTimeout(() => {
        if (status === 0) {
          reject(new Error('Network connection terminated abruptly (ECONNRESET)'));
          return;
        }
        resolve({
          ok: status >= 200 && status < 300,
          status,
          statusText: status === 200 || status === 206 ? 'OK' : 'Error',
          arrayBuffer: () => Promise.resolve(new ArrayBuffer(bytes)),
          headers: {
            get: (key: string) => headers[key.toLowerCase()] ?? headers[key] ?? String(bytes),
          },
        } as unknown as Response);
      }, delayMs);
    });
  });
}

describe('ChunkedDataSource — Worst-Case Stress Tests (Music App Catastrophes)', () => {
  beforeEach(() => {
    ChunkedDataSource.clearCache();
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('CDN & Network Catastrophes', () => {
    it('throws ChunkFetchError with status 416 on HTTP Range Not Satisfiable (past EOF)', async () => {
      mockFetchResponse(416, 0);

      const opts = {
        url: 'https://cdn.oto.music/stream/track_1',
        trackId: 'track_1',
        totalBytes: 5000000,
      };

      // Requesting chunk 5 (offset 10MB) on a 5MB file
      await expect(ChunkedDataSource.fetchChunk(opts, 5)).rejects.toThrow(ChunkFetchError);

      try {
        await ChunkedDataSource.fetchChunk(opts, 5);
      } catch (err: any) {
        expect(err.httpStatus).toBe(416);
        expect(err.descriptor.chunkIndex).toBe(5);
      }
    });

    it('recovers after HTTP 403 CDN token expiration without cache poisoning', async () => {
      // 1. Initial chunk fetch fails due to expired CDN token (403 Forbidden)
      const mock403 = mockFetchResponse(403, 0);
      const expiredOpts = {
        url: 'https://cdn.oto.music/stream/track_1?token=expired',
        trackId: 'track_1',
      };

      await expect(ChunkedDataSource.fetchChunk(expiredOpts, 0)).rejects.toThrow(
        'Chunk fetch failed: HTTP 403'
      );
      mock403.mockRestore();

      // Ensure cache is empty (failed chunk must NOT be cached as valid)
      expect(ChunkedDataSource.getCacheStats().entries).toBe(0);

      // 2. App refreshes CDN token and retries with valid URL
      const mock206 = mockFetchResponse(206, 1024);
      const validOpts = {
        url: 'https://cdn.oto.music/stream/track_1?token=fresh_valid',
        trackId: 'track_1',
      };

      const result = await ChunkedDataSource.fetchChunk(validOpts, 0);
      expect(result.httpStatus).toBe(206);
      expect(result.data.byteLength).toBe(1024);
      expect(ChunkedDataSource.getCacheStats().entries).toBe(1);

      mock206.mockRestore();
    });

    it('handles socket reset (ECONNRESET) mid-stream gracefully', async () => {
      mockFetchResponse(0, 0); // status 0 triggers fetch rejection

      const opts = {
        url: 'https://cdn.oto.music/stream/track_err',
        trackId: 'track_err',
      };

      await expect(ChunkedDataSource.fetchChunk(opts, 0)).rejects.toThrow(
        'Network connection terminated abruptly'
      );
      expect(ChunkedDataSource.getCacheStats().entries).toBe(0);
    });

    it('halts fetchRange immediately when AbortController aborts mid-buffer', async () => {
      const controller = new AbortController();
      let fetchCount = 0;

      jest.spyOn(globalThis, 'fetch').mockImplementation((_url, _init?: RequestInit) => {
        fetchCount++;
        if (fetchCount === 2) {
          // Abort right when chunk 1 starts
          controller.abort();
        }
        return Promise.resolve({
          ok: true,
          status: 206,
          arrayBuffer: () => Promise.resolve(new ArrayBuffer(100)),
          headers: { get: () => '100' },
        } as unknown as Response);
      });

      const opts = {
        url: 'https://cdn.oto.music/stream/track_abort',
        trackId: 'track_abort',
        signal: controller.signal,
      };

      // Request chunks 0 through 10 (11 chunks)
      const chunks = await ChunkedDataSource.fetchRange(opts, 0, 10);

      // Must have stopped early instead of completing all 11 chunks
      expect(chunks.length).toBeLessThan(5);
    });
  });

  describe('LRU Cache Eviction Under Heavy Buffering Stress', () => {
    it('strictly limits cache to MAX_CACHED_CHUNKS (64) and evicts true LRU entry', async () => {
      mockFetchResponse(206, 512);

      // Fill cache with 64 chunks for track_A (0 to 63)
      for (let i = 0; i < 64; i++) {
        await ChunkedDataSource.fetchChunk(
          { url: 'https://x', trackId: 'track_A' },
          i
        );
      }
      expect(ChunkedDataSource.getCacheStats().entries).toBe(64);

      // Access chunk 0 again to make it recently used
      const chunk0 = await ChunkedDataSource.fetchChunk(
        { url: 'https://x', trackId: 'track_A' },
        0
      );
      expect(chunk0.httpStatus).toBe(200); // hit cache

      // Now insert chunk 64 (the 65th chunk)
      await ChunkedDataSource.fetchChunk(
        { url: 'https://x', trackId: 'track_A' },
        64
      );

      // Total entries must remain capped at 64
      expect(ChunkedDataSource.getCacheStats().entries).toBe(64);

      // Chunk 0 was accessed recently, so chunk 1 (not chunk 0) should have been evicted!
      // Let's verify: chunk 0 should still be a cache hit (httpStatus 200)
      const chunk0Check = await ChunkedDataSource.fetchChunk(
        { url: 'https://x', trackId: 'track_A' },
        0
      );
      expect(chunk0Check.httpStatus).toBe(200);
    });

    it('evicts only the targeted track while preserving others in multi-track playback', async () => {
      mockFetchResponse(206, 256);

      await ChunkedDataSource.fetchChunk({ url: 'https://x', trackId: 'song_1' }, 0);
      await ChunkedDataSource.fetchChunk({ url: 'https://x', trackId: 'song_1' }, 1);
      await ChunkedDataSource.fetchChunk({ url: 'https://x', trackId: 'song_2' }, 0);
      await ChunkedDataSource.fetchChunk({ url: 'https://x', trackId: 'song_3' }, 0);

      expect(ChunkedDataSource.getCacheStats().entries).toBe(4);

      // Evict song_1
      ChunkedDataSource.evictTrack('song_1');

      // Remaining should be song_2 and song_3 (2 entries)
      expect(ChunkedDataSource.getCacheStats().entries).toBe(2);
      expect(ChunkedDataSource.getCacheStats().estimatedBytes).toBe(512);
    });
  });

  describe('Boundary Byte Offsets & Corrupted Content-Length', () => {
    it('correctly clamps endByte for small sound effects / preview tracks (< 2MB)', async () => {
      mockFetchResponse(206, 500);

      const res = await ChunkedDataSource.fetchChunk(
        {
          url: 'https://x/short',
          trackId: 'sfx_short',
          totalBytes: 500, // file is only 500 bytes
        },
        0
      );

      expect(res.descriptor.startByte).toBe(0);
      expect(res.descriptor.endByte).toBe(499); // clamped to totalBytes - 1
    });

    it('probeContentLength handles corrupted or missing Content-Length headers safely', async () => {
      // 1. Missing header
      jest.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
        ok: true,
        headers: { get: () => null },
      } as unknown as Response);

      const cl1 = await ChunkedDataSource.probeContentLength('https://x/a');
      expect(cl1).toBe(-1);

      // 2. Non-numeric header "chunked"
      jest.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
        ok: true,
        headers: { get: () => 'chunked' },
      } as unknown as Response);

      const cl2 = await ChunkedDataSource.probeContentLength('https://x/b');
      expect(cl2).toBe(-1); // isNaN('chunked') -> returns -1

      // 3. Network crash during HEAD probe
      jest.spyOn(globalThis, 'fetch').mockRejectedValueOnce(new Error('DNS resolution failed'));

      const cl3 = await ChunkedDataSource.probeContentLength('https://x/c');
      expect(cl3).toBe(-1);
    });

    it('computes chunk descriptors for huge offsets (> 500MB FLAC/WAV audio) without overflow', () => {
      const offset500MB = 500 * 1024 * 1024;
      const desc = ChunkedDataSource.getChunkDescriptor('huge_track', offset500MB);

      expect(desc.chunkIndex).toBe(250);
      expect(desc.startByte).toBe(250 * CHUNK);
      expect(desc.endByte).toBe(251 * CHUNK - 1);
      expect(desc.cacheKey).toBe('oto://track/huge_track');
    });

    it('totalChunks handles 0 bytes and odd fractions properly', () => {
      expect(ChunkedDataSource.totalChunks(0)).toBe(0);
      expect(ChunkedDataSource.totalChunks(1)).toBe(1);
      expect(ChunkedDataSource.totalChunks(CHUNK)).toBe(1);
      expect(ChunkedDataSource.totalChunks(CHUNK + 1)).toBe(2);
      expect(ChunkedDataSource.totalChunks(10 * CHUNK)).toBe(10);
    });
  });
});
