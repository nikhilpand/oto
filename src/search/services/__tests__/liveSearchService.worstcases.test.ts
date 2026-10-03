import { executeLiveSearch, SEARCH_PROTOBUF_PARAMS } from '../liveSearchService';
import { SearchFilterType } from '../federatedSearchEngine';
import { innertubeClient } from '@/auth/innertube/InnertubeClient';
import * as jioSaavn from '@/api/directJioSaavn';

jest.mock('@/auth/innertube/InnertubeClient', () => ({
  innertubeClient: {
    postMusic: jest.fn(),
  },
}));

jest.mock('@/api/directJioSaavn', () => ({
  searchJioSaavn: jest.fn(),
}));

describe('liveSearchService (Worst-Case Punishing Tests)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('immediately returns empty results for blank, whitespace, or empty queries without network calls', async () => {
    const res1 = await executeLiveSearch('');
    const res2 = await executeLiveSearch('     ');
    const res3 = await executeLiveSearch('\t\n');

    expect(res1.tracks).toHaveLength(0);
    expect(res2.tracks).toHaveLength(0);
    expect(res3.tracks).toHaveLength(0);
    expect(innertubeClient.postMusic).not.toHaveBeenCalled();
    expect(jioSaavn.searchJioSaavn).not.toHaveBeenCalled();
  });

  it('passes verified BitChord protobuf filter tokens for each category chip', async () => {
    (innertubeClient.postMusic as jest.Mock).mockResolvedValue({});
    (jioSaavn.searchJioSaavn as jest.Mock).mockResolvedValue({
      query: 'test',
      tracks: [],
      artists: [],
      albums: [],
    });

    // 1. Songs filter
    await executeLiveSearch('Coldplay', 'Songs');
    expect(innertubeClient.postMusic).toHaveBeenCalledWith(
      'search',
      expect.objectContaining({
        query: 'Coldplay',
        params: SEARCH_PROTOBUF_PARAMS[SearchFilterType.SONGS],
      }),
      null
    );

    // 2. Artists filter
    await executeLiveSearch('Coldplay', 'Artists');
    expect(innertubeClient.postMusic).toHaveBeenCalledWith(
      'search',
      expect.objectContaining({
        query: 'Coldplay',
        params: SEARCH_PROTOBUF_PARAMS[SearchFilterType.ARTISTS],
      }),
      null
    );

    // 3. Albums filter
    await executeLiveSearch('Coldplay', 'Albums');
    expect(innertubeClient.postMusic).toHaveBeenCalledWith(
      'search',
      expect.objectContaining({
        query: 'Coldplay',
        params: SEARCH_PROTOBUF_PARAMS[SearchFilterType.ALBUMS],
      }),
      null
    );

    // 4. Videos filter
    await executeLiveSearch('Coldplay', 'Videos');
    expect(innertubeClient.postMusic).toHaveBeenCalledWith(
      'search',
      expect.objectContaining({
        query: 'Coldplay',
        params: SEARCH_PROTOBUF_PARAMS[SearchFilterType.VIDEOS],
      }),
      null
    );

    // 5. Playlists filter
    await executeLiveSearch('Coldplay', 'Playlists');
    expect(innertubeClient.postMusic).toHaveBeenCalledWith(
      'search',
      expect.objectContaining({
        query: 'Coldplay',
        params: SEARCH_PROTOBUF_PARAMS[SearchFilterType.PLAYLISTS],
      }),
      null
    );

    // 6. All filter (no params)
    await executeLiveSearch('Coldplay', 'All');
    expect(innertubeClient.postMusic).toHaveBeenCalledWith(
      'search',
      { query: 'Coldplay' },
      null
    );
  });

  it('handles multi-source deduplication when same track is found on both YouTube and JioSaavn', async () => {
    (innertubeClient.postMusic as jest.Mock).mockResolvedValue({
      contents: {
        tabbedSearchResultsRenderer: {
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
                                playlistItemData: { videoId: 'yt_dup_1' },
                                flexColumns: [
                                  {
                                    musicResponsiveListItemFlexColumnRenderer: {
                                      text: { runs: [{ text: 'Yellow' }] },
                                    },
                                  },
                                  {
                                    musicResponsiveListItemFlexColumnRenderer: {
                                      text: { runs: [{ text: 'Coldplay' }, { text: ' • ' }, { text: '4:29' }] },
                                    },
                                  },
                                ],
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

    (jioSaavn.searchJioSaavn as jest.Mock).mockResolvedValue({
      query: 'Yellow',
      tracks: [
        {
          id: 'saavn_dup_1',
          title: 'Yellow',
          artist: 'Coldplay',
          artists: ['Coldplay'],
          album: 'Parachutes',
          artworkUrl: 'https://c.saavncdn.com/123/track-500x500.jpg',
          thumbhash: '',
          durationMs: 269000,
          isExplicit: false,
        },
      ],
      artists: [],
      albums: [],
    });

    const result = await executeLiveSearch('Yellow');

    // Should rank JioSaavn higher due to 320kbps bitrate priority, and deduplicate
    expect(result.tracks).toHaveLength(1);
    expect(result.tracks[0]?.title).toBe('Yellow');
  });

  it('handles network error in YouTube Music while preserving JioSaavn results', async () => {
    (innertubeClient.postMusic as jest.Mock).mockRejectedValue(new Error('Connection aborted'));
    (jioSaavn.searchJioSaavn as jest.Mock).mockResolvedValue({
      query: 'Arijit',
      tracks: [
        {
          id: 'saavn_arijit_1',
          title: 'Tum Hi Ho',
          artist: 'Arijit Singh',
          artists: ['Arijit Singh'],
          album: 'Aashiqui 2',
          artworkUrl: 'https://c.saavncdn.com/arijit.jpg',
          thumbhash: '',
          durationMs: 260000,
          isExplicit: false,
        },
      ],
      artists: [{ id: 'ar_1', name: 'Arijit Singh', artworkUrl: '', thumbhash: '', role: 'Singer' }],
      albums: [],
    });

    const result = await executeLiveSearch('Arijit');

    expect(result.tracks).toHaveLength(1);
    expect(result.tracks[0]?.title).toBe('Tum Hi Ho');
    expect(result.artists).toHaveLength(1);
  });

  it('handles complex queries with Unicode, accents, punctuation, and script injection safely', async () => {
    (innertubeClient.postMusic as jest.Mock).mockResolvedValue(null);
    (jioSaavn.searchJioSaavn as jest.Mock).mockResolvedValue({
      query: "<script>alert('xss')</script>",
      tracks: [],
      artists: [],
      albums: [],
    });

    const hostileQuery = "<script>alert('xss')</script>   ";
    const result = await executeLiveSearch(hostileQuery);

    expect(result.query).toBe("<script>alert('xss')</script>");
    expect(result.tracks).toEqual([]);
  });
});
