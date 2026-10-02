import { InnertubeClient } from '../InnertubeClient';
import { InnertubeSession } from '../types';

describe('InnertubeClient', () => {
  const mockSession: InnertubeSession = {
    cookie: 'HSID=123; SAPISID=mock_sapisid_token; SSID=456;',
    sapisid: 'mock_sapisid_token',
    authUser: '0',
  };

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('sends correct headers, SAPISIDHASH signature, and context payload', async () => {
    const fetchSpy = jest.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        activeAccountHeaderRenderer: {
          accountName: { runs: [{ text: 'Alice' }] },
          email: { runs: [{ text: 'alice@example.com' }] },
          accountPhoto: {
            thumbnails: [{ url: 'https://avatar.url/pic.jpg' }],
          },
        },
      }),
    } as any);

    const client = new InnertubeClient();
    const account = await client.fetchAccountProfile(mockSession);

    expect(account).not.toBeNull();
    expect(account?.name).toBe('Alice');
    expect(account?.email).toBe('alice@example.com');
    expect(account?.avatarUrl).toBe('https://avatar.url/pic.jpg');

    expect(fetchSpy).toHaveBeenCalledTimes(1);
    const [url, options] = fetchSpy.mock.calls[0]!;
    expect(url).toBe('https://music.youtube.com/youtubei/v1/account/account_menu?prettyPrint=false');
    expect(options?.method).toBe('POST');
    expect(options?.headers).toMatchObject({
      'Content-Type': 'application/json',
      'X-Origin': 'https://music.youtube.com',
      'X-YouTube-Client-Name': '67',
      'Cookie': mockSession.cookie,
      'X-Goog-AuthUser': '0',
    });
    expect((options?.headers as any)['Authorization']).toMatch(/^SAPISIDHASH \d+_[a-f0-9]{40}$/);

    const parsedBody = JSON.parse(options?.body as string);
    expect(parsedBody.context.client.clientName).toBe('WEB_REMIX');
  });

  it('fetches liked songs using browseId FEmusic_liked_videos', async () => {
    jest.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        contents: {
          twoColumnBrowseResultsRenderer: {
            secondaryContents: {
              musicPlaylistShelfRenderer: {
                contents: [
                  {
                    musicResponsiveListItemRenderer: {
                      playlistItemData: { videoId: 'song123' },
                      flexColumns: [
                        {
                          musicResponsiveListItemFlexColumnRenderer: {
                            text: { runs: [{ text: 'Blinding Lights' }] },
                          },
                        },
                        {
                          musicResponsiveListItemFlexColumnRenderer: {
                            text: { runs: [{ text: 'The Weeknd' }] },
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
      }),
    } as any);

    const client = new InnertubeClient();
    const songs = await client.fetchLikedSongs(mockSession);

    expect(songs).toHaveLength(1);
    expect(songs[0]!.videoId).toBe('song123');
    expect(songs[0]!.title).toBe('Blinding Lights');
    expect(songs[0]!.artist).toBe('The Weeknd');
  });

  it('fetches user playlists from FEmusic_liked_playlists', async () => {
    jest.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        contents: [
          {
            musicTwoRowItemRenderer: {
              title: { runs: [{ text: 'Favorites' }] },
              navigationEndpoint: {
                browseEndpoint: { browseId: 'VLPL987654' },
              },
            },
          },
        ],
      }),
    } as any);

    const client = new InnertubeClient();
    const playlists = await client.fetchUserPlaylists(mockSession);

    expect(playlists).toHaveLength(1);
    expect(playlists[0]!.playlistId).toBe('PL987654');
    expect(playlists[0]!.title).toBe('Favorites');
  });

  it('handles network errors gracefully without crashing', async () => {
    jest.spyOn(globalThis, 'fetch').mockRejectedValueOnce(new Error('Network offline'));

    const client = new InnertubeClient();
    const account = await client.fetchAccountProfile(mockSession);

    expect(account).toBeNull();
  });
});
