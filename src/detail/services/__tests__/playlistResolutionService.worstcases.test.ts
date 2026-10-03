/**
 * playlistResolutionService.worstcases.test.ts — Hard Worst-Case Tests for Playlist Resolution
 */

import { resolvePlaylist } from '../playlistResolutionService';
import { innertubeClient } from '@/auth/innertube/InnertubeClient';
import { GoogleAuthStore } from '@/auth/GoogleAuthStore';
import * as otoBackend from '@/api/otoBackend';

jest.mock('@/auth/innertube/InnertubeClient', () => ({
  innertubeClient: {
    fetchLikedSongs: jest.fn(),
    fetchPlaylistTracks: jest.fn(),
  },
}));

jest.mock('@/auth/GoogleAuthStore', () => ({
  GoogleAuthStore: {
    toInnertubeSession: jest.fn(),
  },
}));

jest.mock('@/api/otoBackend', () => ({
  getLiveHomeFeed: jest.fn(),
}));

const originalFetch = globalThis.fetch;

describe('playlistResolutionService Worst-Case Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    globalThis.fetch = originalFetch;
  });

  afterAll(() => {
    globalThis.fetch = originalFetch;
  });

  it('returns null on empty or null playlist ID', async () => {
    const res = await resolvePlaylist('');
    expect(res).toBeNull();
  });

  it('resolves liked songs when session is active', async () => {
    (GoogleAuthStore.toInnertubeSession as jest.Mock).mockReturnValue({
      account: { name: 'Test User' },
    });
    (innertubeClient.fetchLikedSongs as jest.Mock).mockResolvedValue([
      {
        videoId: 'v1',
        title: 'Song One',
        artist: 'Artist A',
        albumName: 'Album A',
        thumbnailUrl: 'https://img.com/1.jpg',
        durationText: '3:30',
        isExplicit: false,
      },
    ]);

    const pl = await resolvePlaylist('liked_songs');
    expect(pl).not.toBeNull();
    expect(pl?.id).toBe('liked_songs');
    expect(pl?.tracks.length).toBe(1);
    expect(pl?.tracks[0]?.id).toBe('v1');
    expect(pl?.tracks[0]?.durationMs).toBe(210000);
    expect(pl?.owner).toBe('Test User');
  });

  it('resolves YouTube Music playlist (PL...) via Innertube', async () => {
    (GoogleAuthStore.toInnertubeSession as jest.Mock).mockReturnValue(null);
    (innertubeClient.fetchPlaylistTracks as jest.Mock).mockResolvedValue([
      {
        videoId: 'yt_pl_1',
        title: 'Hit Track',
        artist: 'Top Artist',
        albumName: 'Top Album',
        thumbnailUrl: 'https://img.com/yt.jpg',
        durationText: '4:00',
        isExplicit: true,
      },
    ]);

    const pl = await resolvePlaylist('PL1234567890abcdef', {
      title: 'Global Top 50',
      subtitle: 'Official Chart',
    });

    expect(pl).not.toBeNull();
    expect(pl?.title).toBe('Global Top 50');
    expect(pl?.tracks.length).toBe(1);
    expect(pl?.tracks[0]?.isExplicit).toBe(true);
    expect(pl?.tracks[0]?.durationMs).toBe(240000);
  });

  it('resolves JioSaavn playlist when API returns valid json', async () => {
    globalThis.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        title: 'Bollywood Retro &amp; Classics',
        header_desc: 'Golden era songs',
        image: 'https://c.saavncdn.com/pl_500.jpg',
        firstname: 'JioSaavn Editorial',
        list: [
          {
            id: 'js_song_1',
            song: 'Lag Ja Gale',
            singers: 'Lata Mangeshkar',
            album: 'Woh Kaun Thi',
            duration: '255',
            image: 'https://c.saavncdn.com/song_500.jpg',
            explicit_content: 0,
          },
        ],
      }),
    } as any);

    const pl = await resolvePlaylist('saavn_playlist_987654');
    expect(pl).not.toBeNull();
    expect(pl?.title).toBe('Bollywood Retro & Classics');
    expect(pl?.tracks.length).toBe(1);
    expect(pl?.tracks[0]?.title).toBe('Lag Ja Gale');
    expect(pl?.tracks[0]?.durationMs).toBe(255000);
  });

  it('falls back to Made For You curated home feed when remote providers fail', async () => {
    (GoogleAuthStore.toInnertubeSession as jest.Mock).mockReturnValue(null);
    (otoBackend.getLiveHomeFeed as jest.Mock).mockResolvedValue({
      madeForYou: [
        {
          id: 'curated_mix_1',
          title: 'Daily Chill Mix',
          subtitle: 'Smooth tracks',
          artworkUrl: 'https://oto.com/mix.jpg',
          thumbhash: '',
          trackCount: 1,
          tracks: [
            {
              id: 'chill_1',
              title: 'Chill Song',
              artist: 'Chill Artist',
              artists: ['Chill Artist'],
              album: 'Chill Album',
              durationMs: 180000,
              artworkUrl: 'https://oto.com/chill.jpg',
              thumbhash: '',
              isExplicit: false,
            },
          ],
        },
      ],
      newReleases: [],
      quickPicks: [],
    });

    const pl = await resolvePlaylist('curated_mix_1');
    expect(pl).not.toBeNull();
    expect(pl?.id).toBe('curated_mix_1');
    expect(pl?.title).toBe('Daily Chill Mix');
    expect(pl?.tracks.length).toBe(1);
  });

  it('handles network failure gracefully without unhandled exceptions', async () => {
    globalThis.fetch = jest.fn().mockRejectedValue(new Error('Network offline'));
    (innertubeClient.fetchPlaylistTracks as jest.Mock).mockRejectedValue(new Error('Timeout'));
    (otoBackend.getLiveHomeFeed as jest.Mock).mockRejectedValue(new Error('Server error'));

    const pl = await resolvePlaylist('PL_failing_playlist');
    expect(pl).toBeNull();
  });
});
