import {
  collectRenderers,
  runsText,
  parseAccount,
  parsePlaylistSongs,
  parseUserPlaylists,
  parseContinuationToken,
} from '../innertubeParsers';

describe('Innertube Parsers', () => {
  describe('collectRenderers', () => {
    it('traverses deep nested json trees to find all named renderers', () => {
      const mockTree = {
        contents: {
          tabRenderer: {
            content: {
              sectionListRenderer: {
                contents: [
                  {
                    musicShelfRenderer: {
                      contents: [
                        { musicResponsiveListItemRenderer: { id: 'item1' } },
                        { musicResponsiveListItemRenderer: { id: 'item2' } },
                      ],
                    },
                  },
                ],
              },
            },
          },
        },
      };

      const found = collectRenderers(mockTree, 'musicResponsiveListItemRenderer');
      expect(found).toHaveLength(2);
      expect(found[0].id).toBe('item1');
      expect(found[1].id).toBe('item2');
    });
  });

  describe('runsText', () => {
    it('concatenates runs into a single clean string', () => {
      const node = {
        runs: [{ text: 'Artist Name' }, { text: ' • ' }, { text: 'Album Name' }],
      };
      expect(runsText(node)).toBe('Artist Name • Album Name');
    });

    it('falls back to simpleText', () => {
      const node = { simpleText: 'Single Header' };
      expect(runsText(node)).toBe('Single Header');
    });

    it('returns empty string for null or missing', () => {
      expect(runsText(null)).toBe('');
      expect(runsText({})).toBe('');
    });
  });

  describe('parseAccount', () => {
    it('parses activeAccountHeaderRenderer correctly', () => {
      const payload = {
        activeAccountHeaderRenderer: {
          accountName: { runs: [{ text: 'John Doe' }] },
          email: { runs: [{ text: 'johndoe@gmail.com' }] },
          channelHandle: { runs: [{ text: '@johndoe' }] },
          accountPhoto: {
            thumbnails: [
              { url: 'https://lh3.googleusercontent.com/a/photo_small=s88', width: 88, height: 88 },
              { url: 'https://lh3.googleusercontent.com/a/photo_large=s192', width: 192, height: 192 },
            ],
          },
        },
      };

      const account = parseAccount(payload);
      expect(account).not.toBeNull();
      expect(account?.name).toBe('John Doe');
      expect(account?.email).toBe('johndoe@gmail.com');
      expect(account?.handle).toBe('@johndoe');
      expect(account?.avatarUrl).toBe('https://lh3.googleusercontent.com/a/photo_large=s192');
    });

    it('falls back to handle if email is missing', () => {
      const payload = {
        activeAccountHeaderRenderer: {
          accountName: { runs: [{ text: 'John Doe' }] },
          channelHandle: { runs: [{ text: '@johndoe' }] },
          accountPhoto: {
            thumbnails: [{ url: 'https://lh3.googleusercontent.com/a/photo' }],
          },
        },
      };

      const account = parseAccount(payload);
      expect(account?.name).toBe('John Doe');
      expect(account?.email).toBe('@johndoe');
    });
  });

  describe('parsePlaylistSongs', () => {
    it('parses responsive list items into typed InnertubeSongs', () => {
      const payload = {
        contents: {
          twoColumnBrowseResultsRenderer: {
            secondaryContents: {
              musicPlaylistShelfRenderer: {
                contents: [
                  {
                    musicResponsiveListItemRenderer: {
                      playlistItemData: { videoId: 'vid123' },
                      flexColumns: [
                        {
                          musicResponsiveListItemFlexColumnRenderer: {
                            text: { runs: [{ text: 'Starboy' }] },
                          },
                        },
                        {
                          musicResponsiveListItemFlexColumnRenderer: {
                            text: {
                              runs: [
                                {
                                  text: 'The Weeknd',
                                  navigationEndpoint: {
                                    browseEndpoint: {
                                      browseId: 'UC_artist',
                                      browseEndpointContextSupportedConfigs: {
                                        browseEndpointContextMusicConfig: { pageType: 'MUSIC_PAGE_TYPE_ARTIST' },
                                      },
                                    },
                                  },
                                },
                                { text: ' • ' },
                                {
                                  text: 'Starboy (Album)',
                                  navigationEndpoint: {
                                    browseEndpoint: {
                                      browseId: 'MPRE_album',
                                      browseEndpointContextSupportedConfigs: {
                                        browseEndpointContextMusicConfig: { pageType: 'MUSIC_PAGE_TYPE_ALBUM' },
                                      },
                                    },
                                  },
                                },
                                { text: ' • ' },
                                { text: '3:50' },
                              ],
                            },
                          },
                        },
                      ],
                      thumbnail: {
                        musicThumbnailRenderer: {
                          thumbnail: {
                            thumbnails: [{ url: 'https://i.ytimg.com/vi/vid123/hqdefault.jpg' }],
                          },
                        },
                      },
                      badges: [
                        {
                          musicInlineBadgeRenderer: {
                            icon: { iconType: 'MUSIC_EXPLICIT_BADGE' },
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
      };

      const songs = parsePlaylistSongs(payload);
      expect(songs).toHaveLength(1);
      expect(songs[0]!.videoId).toBe('vid123');
      expect(songs[0]!.title).toBe('Starboy');
      expect(songs[0]!.artist).toBe('The Weeknd');
      expect(songs[0]!.artistId).toBe('UC_artist');
      expect(songs[0]!.albumName).toBe('Starboy (Album)');
      expect(songs[0]!.albumId).toBe('MPRE_album');
      expect(songs[0]!.durationText).toBe('3:50');
      expect(songs[0]!.thumbnailUrl).toBe('https://i.ytimg.com/vi/vid123/hqdefault.jpg');
      expect(songs[0]!.isExplicit).toBe(true);
    });
  });

  describe('parseUserPlaylists', () => {
    it('parses two-row items into InnertubePlaylists and ignores non-playlist prefixes', () => {
      const payload = {
        contents: [
          {
            musicTwoRowItemRenderer: {
              title: { runs: [{ text: 'Late Night Vibes' }] },
              subtitle: { runs: [{ text: 'Playlist • 50 songs' }] },
              navigationEndpoint: {
                browseEndpoint: { browseId: 'VLPL1234567890' },
              },
              thumbnailRenderer: {
                musicThumbnailRenderer: {
                  thumbnail: {
                    thumbnails: [{ url: 'https://lh3.googleusercontent.com/pl_thumb' }],
                  },
                },
              },
            },
          },
          {
            // Should be filtered out because it is Liked Music (LM) auto-playlist
            musicTwoRowItemRenderer: {
              title: { runs: [{ text: 'Liked Music' }] },
              navigationEndpoint: {
                browseEndpoint: { browseId: 'VLLM' },
              },
            },
          },
        ],
      };

      const playlists = parseUserPlaylists(payload);
      expect(playlists).toHaveLength(1);
      expect(playlists[0]!.playlistId).toBe('PL1234567890');
      expect(playlists[0]!.title).toBe('Late Night Vibes');
      expect(playlists[0]!.subtitle).toBe('Playlist • 50 songs');
      expect(playlists[0]!.thumbnailUrl).toBe('https://lh3.googleusercontent.com/pl_thumb');
    });
  });

  describe('parseContinuationToken', () => {
    it('extracts token from continuationItemRenderer', () => {
      const payload = {
        continuationItemRenderer: {
          continuationEndpoint: {
            continuationCommand: {
              token: 'my_next_page_token_123',
            },
          },
        },
      };

      expect(parseContinuationToken(payload)).toBe('my_next_page_token_123');
    });
  });
});
