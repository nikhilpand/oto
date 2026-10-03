import { ChunkedDataSource, ChunkFetchError } from '../ChunkedDataSource';

const CHUNK = ChunkedDataSource.CHUNK_SIZE;

function mockFetch(status: number, bytes: number): jest.SpyInstance {
  return jest.spyOn(globalThis, 'fetch').mockResolvedValue({
    ok: status >= 200 && status < 300,
    status,
    arrayBuffer: () => Promise.resolve(new ArrayBuffer(bytes)),
    headers: { get: () => String(bytes) },
  } as unknown as Response);
}

describe('ChunkedDataSource', () => {
  beforeEach(() => ChunkedDataSource.clearCache());
  afterEach(() => jest.restoreAllMocks());

  it('maps byte offsets to 2MB chunks', () => {
    const d = ChunkedDataSource.getChunkDescriptor('t1', CHUNK + 5);
    expect(d.chunkIndex).toBe(1);
    expect(d.startByte).toBe(CHUNK);
    expect(d.endByte).toBe(2 * CHUNK - 1);
    expect(d.cacheKey).toBe('oto://track/t1');
  });

  it('sends a Range header and caches the chunk', async () => {
    const spy = mockFetch(206, 10);
    const opts = { url: 'https://x/a', trackId: 't1' };
    await ChunkedDataSource.fetchChunk(opts, 0);
    await ChunkedDataSource.fetchChunk(opts, 0);
    expect(spy).toHaveBeenCalledTimes(1);
    const init = spy.mock.calls[0]?.[1] as RequestInit;
    expect((init.headers as Record<string, string>).Range).toBe(`bytes=0-${CHUNK - 1}`);
  });

  it('clamps the last chunk to total size', async () => {
    mockFetch(206, 10);
    const res = await ChunkedDataSource.fetchChunk(
      { url: 'https://x/a', trackId: 't2', totalBytes: CHUNK + 100 },
      1,
    );
    expect(res.descriptor.endByte).toBe(CHUNK + 99);
  });

  it('throws ChunkFetchError on HTTP failure', async () => {
    mockFetch(403, 0);
    await expect(
      ChunkedDataSource.fetchChunk({ url: 'https://x/a', trackId: 't3' }, 0),
    ).rejects.toBeInstanceOf(ChunkFetchError);
  });

  it('evicts a single track', async () => {
    mockFetch(206, 10);
    await ChunkedDataSource.fetchChunk({ url: 'https://x/a', trackId: 'a' }, 0);
    await ChunkedDataSource.fetchChunk({ url: 'https://x/b', trackId: 'b' }, 0);
    ChunkedDataSource.evictTrack('a');
    expect(ChunkedDataSource.getCacheStats().entries).toBe(1);
  });
});
