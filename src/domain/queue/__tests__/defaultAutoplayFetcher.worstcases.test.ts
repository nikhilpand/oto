import { defaultAutoplayFetcher } from '../defaultAutoplayFetcher';
import { innertubeClient } from '@/auth/innertube/InnertubeClient';
import * as jioSaavn from '@/api/directJioSaavn';
import type { Track } from '@/domain/types';

jest.mock('@/auth/innertube/InnertubeClient', () => ({
  innertubeClient: {
    fetchRadioQueue: jest.fn(),
  },
}));

jest.mock('@/api/directJioSaavn', () => ({
  searchJioSaavn: jest.fn(),
}));

describe('defaultAutoplayFetcher (Worst-Case Punishing Tests)', () => {
  const mockSeedTrack: Track = {
    id: 'dQw4w9WgXcQ', // Valid 11-char YouTube Video ID
    title: 'Seed Song',
    artist: 'Seed Artist',
    artists: ['Seed Artist'],
    album: 'Seed Album',
    artworkUrl: 'https://example.com/art.jpg',
    thumbhash: '',
    durationMs: 200000,
    isExplicit: false,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('filters out the seed track from YouTube Music radio response to avoid endless loop', async () => {
    (innertubeClient.fetchRadioQueue as jest.Mock).mockResolvedValue([
      {
        videoId: 'dQw4w9WgXcQ', // Exact seed track
        title: 'Seed Song',
        artist: 'Seed Artist',
        durationText: '3:20',
        thumbnailUrl: 'https://example.com/seed.jpg',
      },
      {
        videoId: 'radio_next_1',
        title: 'Followup Hit',
        artist: 'Radio Artist',
        durationText: '3:45',
        thumbnailUrl: 'https://example.com/next.jpg',
      },
    ]);

    const result = await defaultAutoplayFetcher(mockSeedTrack, 5);

    expect(result).toHaveLength(1);
    expect(result[0]?.id).toBe('radio_next_1');
    expect(result.some((t) => t.id === 'dQw4w9WgXcQ')).toBe(false);
  });

  it('falls back to JioSaavn related artist search when YouTube Music returns an empty radio queue', async () => {
    (innertubeClient.fetchRadioQueue as jest.Mock).mockResolvedValue([]);
    (jioSaavn.searchJioSaavn as jest.Mock).mockResolvedValue({
      query: 'Seed Artist',
      tracks: [
        {
          id: 'saavn_radio_1',
          title: 'Jio Related Hit',
          artist: 'Seed Artist',
          artists: ['Seed Artist'],
          album: 'Jio Album',
          artworkUrl: 'https://example.com/jio.jpg',
          thumbhash: '',
          durationMs: 190000,
          isExplicit: false,
        },
      ],
      artists: [],
      albums: [],
    });

    const result = await defaultAutoplayFetcher(mockSeedTrack, 5);

    expect(jioSaavn.searchJioSaavn).toHaveBeenCalledWith(
      expect.stringContaining('Seed Artist'),
      expect.any(Number)
    );
    expect(result).toHaveLength(1);
    expect(result[0]?.id).toBe('saavn_radio_1');
  });

  it('falls back to JioSaavn when YouTube Music throws a network timeout exception', async () => {
    (innertubeClient.fetchRadioQueue as jest.Mock).mockRejectedValue(
      new Error('ETIMEDOUT: Connection to music.youtube.com timed out')
    );
    (jioSaavn.searchJioSaavn as jest.Mock).mockResolvedValue({
      query: 'Seed Artist',
      tracks: [
        {
          id: 'saavn_timeout_fallback',
          title: 'Resilient Track',
          artist: 'Seed Artist',
          artists: ['Seed Artist'],
          album: 'Resilient Album',
          artworkUrl: 'https://example.com/res.jpg',
          thumbhash: '',
          durationMs: 210000,
          isExplicit: false,
        },
      ],
      artists: [],
      albums: [],
    });

    const result = await defaultAutoplayFetcher(mockSeedTrack, 5);

    expect(result).toHaveLength(1);
    expect(result[0]?.id).toBe('saavn_timeout_fallback');
  });

  it('handles complete blackout gracefully without throwing when both YouTube and JioSaavn fail', async () => {
    (innertubeClient.fetchRadioQueue as jest.Mock).mockRejectedValue(new Error('Network offline'));
    (jioSaavn.searchJioSaavn as jest.Mock).mockRejectedValue(new Error('DNS resolution failed'));

    await expect(defaultAutoplayFetcher(mockSeedTrack, 5)).resolves.toEqual([]);
  });

  it('deduplicates candidate tracks having identical titles or IDs', async () => {
    (innertubeClient.fetchRadioQueue as jest.Mock).mockResolvedValue([
      {
        videoId: 'radio_dup_1',
        title: 'Song A',
        artist: 'Artist A',
        durationText: '3:00',
      },
      {
        videoId: 'radio_dup_1', // Duplicate ID
        title: 'Song A',
        artist: 'Artist A',
        durationText: '3:00',
      },
      {
        videoId: 'radio_dup_2',
        title: 'Song A', // Duplicate title and artist
        artist: 'Artist A',
        durationText: '3:00',
      },
      {
        videoId: 'radio_unique',
        title: 'Song B',
        artist: 'Artist B',
        durationText: '3:15',
      },
    ]);

    const result = await defaultAutoplayFetcher(mockSeedTrack, 5);

    expect(result).toHaveLength(2);
    expect(result[0]?.id).toBe('radio_dup_1');
    expect(result[1]?.id).toBe('radio_unique');
  });

  it('respects requested count ceiling and parses duration correctly', async () => {
    const list = Array.from({ length: 15 }, (_, i) => ({
      videoId: `track_${i}`,
      title: `Song ${i}`,
      artist: `Artist ${i}`,
      durationText: '4:00',
    }));
    (innertubeClient.fetchRadioQueue as jest.Mock).mockResolvedValue(list);

    const result = await defaultAutoplayFetcher(mockSeedTrack, 4);

    expect(result).toHaveLength(4);
    expect(result[0]?.durationMs).toBe(240000);
  });
});
