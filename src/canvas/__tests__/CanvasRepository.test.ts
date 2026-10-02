import { CanvasRepository } from '../CanvasRepository';
import { CanvasCache } from '../CanvasCache';
import type { Track } from '@/domain/types';
import type { CanvasArtwork } from '../CanvasTypes';

describe('CanvasRepository & CanvasCache', () => {
  const mockTrack: Track = {
    id: 'track-starboy-canvas',
    title: 'Starboy (feat. Daft Punk)',
    artist: 'The Weeknd',
    artists: ['The Weeknd', 'Daft Punk'],
    album: 'Starboy',
    durationMs: 230000,
    artworkUrl: 'https://example.com/starboy.jpg',
    thumbhash: 'hash123',
    isExplicit: true,
  };

  beforeEach(async () => {
    CanvasRepository.clearMemoryCache();
    CanvasRepository.setMockProvider(null);
    await CanvasCache.clearCache();
  });

  it('cleans track titles by stripping features and audio tags', () => {
    expect(CanvasRepository.cleanString('Blinding Lights (Official Video)')).toBe('blinding lights');
    expect(CanvasRepository.cleanString('One Dance [feat. Wizkid] (Remaster 2024)')).toBe('one dance');
  });

  it('returns null synchronously when not in cache', () => {
    expect(CanvasRepository.getCached(mockTrack)).toBeNull();
  });

  it('negatively caches misses to avoid repeating queries', async () => {
    let queryCount = 0;
    CanvasRepository.setMockProvider(async () => {
      queryCount++;
      return null;
    });

    const first = await CanvasRepository.canvasFor(mockTrack);
    expect(first).toBeNull();
    expect(queryCount).toBe(1);

    // Second call should return cached negative result without re-querying
    const second = await CanvasRepository.canvasFor(mockTrack);
    expect(second).toBeNull();
    expect(queryCount).toBe(1);
  });

  it('resolves and caches canvas motion artwork', async () => {
    const fakeCanvas: CanvasArtwork = {
      url: 'https://cdn.example.com/starboy_canvas.mp4',
      provider: 'spotify',
      aspectRatio: 'vertical',
      durationMs: 8000,
    };

    CanvasRepository.setMockProvider(async () => fakeCanvas);

    const result = await CanvasRepository.canvasFor(mockTrack);
    expect(result).not.toBeNull();
    expect(result?.provider).toBe('spotify');
    expect(result?.aspectRatio).toBe('vertical');

    // Subsequent sync lookup succeeds from memory cache
    const syncCached = CanvasRepository.getCached(mockTrack);
    expect(syncCached).not.toBeNull();
    expect(syncCached?.provider).toBe('spotify');
  });

  it('sanitizes cache filenames properly', () => {
    const safeName = CanvasCache.sanitizeFilename('track:123/special?id=abc');
    expect(safeName).toBe('track_123_special_id_abc.mp4');
  });
});
