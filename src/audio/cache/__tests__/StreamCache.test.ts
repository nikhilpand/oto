import * as FileSystem from 'expo-file-system';
import {
  getCachedStreamUri,
  evictLru,
  clearStreamCache,
  getCachedTotalBytes,
} from '../StreamCache';

jest.mock('expo-file-system', () => ({
  cacheDirectory: 'file:///data/user/0/com.oto/cache/',
  getInfoAsync: jest.fn(),
  makeDirectoryAsync: jest.fn(),
  deleteAsync: jest.fn(),
  downloadAsync: jest.fn(),
  moveAsync: jest.fn(),
}));

describe('StreamCache', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns null when track is not yet cached on disk', async () => {
    (FileSystem.getInfoAsync as jest.Mock).mockResolvedValue({ exists: false });

    const uri = await getCachedStreamUri('track_uncached_123');
    expect(uri).toBeNull();
  });

  it('returns local file path when track exists on disk with valid size', async () => {
    (FileSystem.getInfoAsync as jest.Mock).mockResolvedValue({
      exists: true,
      size: 5_000_000,
    });

    const uri = await getCachedStreamUri('track_cached_456');
    expect(uri).toBe('file:///data/user/0/com.oto/cache/oto_stream_cache/track_cached_456.m4a');
  });

  it('clears cache and resets memory index', async () => {
    await clearStreamCache();
    expect(getCachedTotalBytes()).toBe(0);
    expect(FileSystem.deleteAsync).toHaveBeenCalled();
  });

  it('evicts nothing if total bytes within budget', async () => {
    const evicted = await evictLru(100_000_000);
    expect(evicted).toBe(0);
  });
});
