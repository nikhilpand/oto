import { resolveAlbum } from '../albumResolutionService';
import { resolveArtist } from '../artistResolutionService';
import { innertubeClient } from '@/auth/innertube/InnertubeClient';
import * as jioSaavn from '@/api/directJioSaavn';

jest.mock('@/auth/innertube/InnertubeClient', () => ({
  innertubeClient: {
    browse: jest.fn(),
    fetchPlaylistTracks: jest.fn(),
  },
}));

jest.mock('@/api/directJioSaavn', () => ({
  ...jest.requireActual('@/api/directJioSaavn'),
  searchJioSaavn: jest.fn(),
}));

// Mock global fetch for JioSaavn album details endpoint
const originalFetch = globalThis.fetch;

describe('detailResolution (Album & Artist Worst-Case Tests)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    globalThis.fetch = originalFetch;
  });

  afterAll(() => {
    globalThis.fetch = originalFetch;
  });

  describe('resolveAlbum', () => {
    it('expands MPREb catalogue album into full backing playlist VLOLAK... to bypass 3-5 track truncation', async () => {
      // 1. YouTube browse returns MPREb album with backing playlist button
      (innertubeClient.browse as jest.Mock).mockResolvedValue({
        header: {
          musicDetailHeaderRenderer: {
            title: { runs: [{ text: 'Discovery' }] },
            subtitle: { runs: [{ text: 'Daft Punk • 2001' }] },
            menu: {
              menuRenderer: {
                topLevelButtons: [
                  {
                    buttonRenderer: {
                      navigationEndpoint: {
                        watchPlaylistEndpoint: {
                          playlistId: 'OLAK5uy_discovery_backing',
                        },
                      },
                    },
                  },
                ],
              },
            },
          },
        },
      });

      // 2. Full backing playlist tracks fetch
      (innertubeClient.fetchPlaylistTracks as jest.Mock).mockResolvedValue([
        {
          videoId: 'one_more_time',
          title: 'One More Time',
          artist: 'Daft Punk',
          durationText: '5:20',
          thumbnailUrl: 'https://example.com/art.jpg',
        },
        {
          videoId: 'aerodynamic',
          title: 'Aerodynamic',
          artist: 'Daft Punk',
          durationText: '3:27',
          thumbnailUrl: 'https://example.com/art.jpg',
        },
        {
          videoId: 'digital_love',
          title: 'Digital Love',
          artist: 'Daft Punk',
          durationText: '4:58',
          thumbnailUrl: 'https://example.com/art.jpg',
        },
        {
          videoId: 'harder_better',
          title: 'Harder, Better, Faster, Stronger',
          artist: 'Daft Punk',
          durationText: '3:44',
          thumbnailUrl: 'https://example.com/art.jpg',
        },
      ]);

      const album = await resolveAlbum('MPREb_daft_punk_discovery');

      expect(album).not.toBeNull();
      expect(album?.title).toBe('Discovery');
      expect(album?.artist).toBe('Daft Punk');
      expect(album?.year).toBe(2001);
      expect(album?.tracks).toHaveLength(4);
      expect(innertubeClient.fetchPlaylistTracks).toHaveBeenCalledWith(
        'VLOLAK5uy_discovery_backing',
        null
      );
    });

    it('resolves JioSaavn album via on-device JSON mapping with HTML entity decoding', async () => {
      globalThis.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          title: 'Rockstar &amp; Hits',
          primary_artists: 'A.R. Rahman, Mohit Chauhan',
          year: '2011',
          image: 'http://c.saavncdn.com/rockstar-150x150.jpg',
          list: [
            {
              id: 's1',
              title: 'Nadaan Parindey',
              primary_artists: 'A.R. Rahman, Mohit Chauhan',
              image: 'http://c.saavncdn.com/rockstar-150x150.jpg',
              more_info: { duration: '386' },
            },
          ],
        }),
      } as any);

      const album = await resolveAlbum('saavn_album_12345');

      expect(album).not.toBeNull();
      expect(album?.title).toBe('Rockstar & Hits'); // Decoded HTML entity
      expect(album?.artist).toBe('A.R. Rahman, Mohit Chauhan');
      expect(album?.year).toBe(2011);
      expect(album?.tracks).toHaveLength(1);
      expect(album?.tracks[0]?.durationMs).toBe(386000);
      expect(album?.artworkUrl).toBe('https://c.saavncdn.com/rockstar-500x500.jpg');
    });

    it('falls back to search query when album ID is unindexed in direct databases', async () => {
      (innertubeClient.browse as jest.Mock).mockResolvedValue(null);
      globalThis.fetch = jest.fn().mockResolvedValue({ ok: false } as any);

      (jioSaavn.searchJioSaavn as jest.Mock).mockResolvedValue({
        query: 'Random Access Memories',
        tracks: [
          {
            id: 'ram_track_1',
            title: 'Get Lucky',
            artist: 'Daft Punk',
            artists: ['Daft Punk'],
            album: 'Random Access Memories',
            artworkUrl: 'https://example.com/ram.jpg',
            thumbhash: '',
            durationMs: 248000,
            isExplicit: false,
          },
        ],
        artists: [],
        albums: [],
      });

      const album = await resolveAlbum('unknown_album_id', {
        title: 'Random Access Memories',
        artist: 'Daft Punk',
      });

      expect(album).not.toBeNull();
      expect(album?.title).toBe('Random Access Memories');
      expect(album?.tracks).toHaveLength(1);
    });

    it('handles total network blackout gracefully without throwing unhandled exceptions', async () => {
      (innertubeClient.browse as jest.Mock).mockRejectedValue(new Error('Network error'));
      globalThis.fetch = jest.fn().mockRejectedValue(new Error('Network offline'));

      const album = await resolveAlbum('MPREb_offline');
      expect(album).toBeNull();
    });
  });

  describe('resolveArtist', () => {
    it('parses YouTube Music artist with formatted subscribers and categorized discography', async () => {
      (innertubeClient.browse as jest.Mock).mockResolvedValue({
        header: {
          musicImmersiveHeaderRenderer: {
            title: { runs: [{ text: 'The Weeknd' }] },
            subscriptionButton: {
              subscribeButtonRenderer: {
                subscriberCountText: { runs: [{ text: '35.4M subscribers' }] },
              },
            },
            description: { runs: [{ text: 'Canadian singer and record producer.' }] },
          },
        },
        contents: {
          singleColumnBrowseResultsRenderer: {
            tabs: [
              {
                tabRenderer: {
                  content: {
                    sectionListRenderer: {
                      contents: [
                        {
                          musicShelfRenderer: {
                            contents: [
                              {
                                musicResponsiveListItemRenderer: {
                                  playlistItemData: { videoId: 'blinding_lights' },
                                  flexColumns: [
                                    {
                                      musicResponsiveListItemFlexColumnRenderer: {
                                        text: { runs: [{ text: 'Blinding Lights' }] },
                                      },
                                    },
                                    {
                                      musicResponsiveListItemFlexColumnRenderer: {
                                        text: { runs: [{ text: 'The Weeknd' }, { text: ' • ' }, { text: '3:20' }] },
                                      },
                                    },
                                  ],
                                },
                              },
                            ],
                          },
                        },
                        {
                          musicCarouselShelfRenderer: {
                            contents: [
                              {
                                musicTwoRowItemRenderer: {
                                  title: { runs: [{ text: 'After Hours' }] },
                                  subtitle: { runs: [{ text: 'Album • 2020' }] },
                                  navigationEndpoint: {
                                    browseEndpoint: { browseId: 'MPREb_after_hours' },
                                  },
                                },
                              },
                              {
                                musicTwoRowItemRenderer: {
                                  title: { runs: [{ text: 'Heartless' }] },
                                  subtitle: { runs: [{ text: 'Single • 2019' }] },
                                  navigationEndpoint: {
                                    browseEndpoint: { browseId: 'MPREb_heartless' },
                                  },
                                },
                              },
                              {
                                musicTwoRowItemRenderer: {
                                  title: { runs: [{ text: 'Bruno Mars' }] },
                                  subtitle: { runs: [{ text: 'Similar Artist' }] },
                                  navigationEndpoint: {
                                    browseEndpoint: { browseId: 'UC_bruno_mars' },
                                  },
                                },
                              },
                            ],
                          },
                        },
                      ],
                    },
                  },
                },
              },
            ],
          },
        },
      });

      const artist = await resolveArtist('UC_the_weeknd');

      expect(artist).not.toBeNull();
      expect(artist?.name).toBe('The Weeknd');
      expect(artist?.monthlyListeners).toBe(35_400_000);
      expect(artist?.popularTracks).toHaveLength(1);
      expect(artist?.popularTracks[0]?.title).toBe('Blinding Lights');

      // Discography categorized correctly
      expect(artist?.discography).toHaveLength(2);
      expect(artist?.discography[0]?.type).toBe('Album');
      expect(artist?.discography[1]?.type).toBe('Single');

      // Related artists extracted
      expect(artist?.related).toHaveLength(1);
      expect(artist?.related[0]?.name).toBe('Bruno Mars');
    });

    it('falls back to federated search for unindexed artists without hardcoding dummy numbers', async () => {
      (innertubeClient.browse as jest.Mock).mockResolvedValue(null);
      (jioSaavn.searchJioSaavn as jest.Mock).mockResolvedValue({
        query: 'Anuv Jain',
        tracks: [
          {
            id: 'anuv_1',
            title: 'Baarishein',
            artist: 'Anuv Jain',
            artists: ['Anuv Jain'],
            album: 'Baarishein Single',
            artworkUrl: 'https://example.com/baarishein.jpg',
            thumbhash: '',
            durationMs: 200000,
            isExplicit: false,
          },
        ],
        artists: [],
        albums: [],
      });

      const artist = await resolveArtist('saavn_artist_anuv', { name: 'Anuv Jain' });

      expect(artist).not.toBeNull();
      expect(artist?.name).toBe('Anuv Jain');
      expect(artist?.popularTracks).toHaveLength(1);
      expect(artist?.popularTracks[0]?.title).toBe('Baarishein');
    });
  });
});
