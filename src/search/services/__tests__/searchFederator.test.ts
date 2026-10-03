import { SearchFederator, SourceSearchProvider } from '../searchFederator';
import { Track } from '@/domain/types';

describe('SearchFederator', () => {
  const createMockTrack = (id: string, title: string): Track => ({
    id,
    title,
    artist: 'Artist',
    artists: ['Artist'],
    album: 'Album',
    durationMs: 180000,
    artworkUrl: 'https://art',
    thumbhash: 'hash123',
    isExplicit: false,
  });

  it('federates searches and orders higher-ranked external sources above YouTube', async () => {
    const jioSaavnProvider: SourceSearchProvider = {
      id: 'jiosaavn',
      rank: 1, // higher priority than YouTube (rank 2)
      search: jest.fn().mockResolvedValue([createMockTrack('js1', 'JioSaavn Hit')]),
    };

    const navidromeProvider: SourceSearchProvider = {
      id: 'navidrome',
      rank: 3, // lower priority than YouTube (rank 2)
      search: jest.fn().mockResolvedValue([createMockTrack('navi1', 'Self-hosted Track')]),
    };

    const youtubeTracks = [createMockTrack('yt1', 'YouTube Track')];

    const results = await SearchFederator.federate({
      query: 'test query',
      youtubeRank: 2,
      youtubeTracks,
      externalSources: [jioSaavnProvider, navidromeProvider],
      timeoutMs: 1000,
    });

    // JioSaavn (rank 1) -> YouTube (rank 2) -> Navidrome (rank 3)
    expect(results.map((t) => t.id)).toEqual(['js1', 'yt1', 'navi1']);
  });

  it('gracefully handles slow external sources via strict timeout', async () => {
    let timer: ReturnType<typeof setTimeout> | null = null;
    const hangingProvider: SourceSearchProvider = {
      id: 'hanging',
      rank: 1,
      search: () => new Promise((resolve) => {
        timer = setTimeout(resolve, 500);
      }),
    };

    const youtubeTracks: Track[] = [createMockTrack('yt1', 'YouTube Track')];

    const start = Date.now();
    const results = await SearchFederator.federate({
      query: 'fast',
      youtubeRank: 2,
      youtubeTracks,
      externalSources: [hangingProvider],
      timeoutMs: 50,
    });
    const elapsed = Date.now() - start;

    if (timer) clearTimeout(timer);

    expect(elapsed).toBeLessThan(500);
    expect(results).toHaveLength(1);
    expect(results[0]?.id).toBe('yt1');
  });

  it('pre-warms the stream URL for the top result without blocking', async () => {
    const resolver = jest.fn().mockResolvedValue('https://stream.audio/320k');
    const warmed = SearchFederator.prewarmTopResult('js1', resolver);

    expect(resolver).toHaveBeenCalledWith('js1');
    await expect(warmed).resolves.toBe('https://stream.audio/320k');
  });
});
