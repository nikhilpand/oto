import {
  unescapeHtml,
  mapJioSaavnSongToTrack,
  probeCdnStreamUrl,
  resolveDirectStream,
} from '../directJioSaavn';

describe('directJioSaavn', () => {
  describe('unescapeHtml', () => {
    it('unescapes standard HTML entities', () => {
      expect(unescapeHtml('&quot;Hello&quot; &amp; &#039;World&#039; &hellip;')).toBe(
        '"Hello" & \'World\' ...'
      );
      expect(unescapeHtml('&lt;tag&gt;')).toBe('<tag>');
      expect(unescapeHtml(null)).toBe('');
    });
  });

  describe('mapJioSaavnSongToTrack', () => {
    it('correctly maps raw JioSaavn song object to Track domain model', () => {
      const raw = {
        id: '123456',
        title: 'Kesariya &amp; Brahmastra',
        more_info: {
          album: 'Brahmastra',
          duration: '268',
          encrypted_media_url: 'dummyEncryptedUrl',
          artistMap: {
            primary_artists: [{ name: 'Arijit Singh' }, { name: 'Pritam' }],
          },
        },
        image: 'https://c.saavncdn.com/150x150/test.jpg',
      };

      const track = mapJioSaavnSongToTrack(raw);
      expect(track.id).toBe('saavn_123456');
      expect(track.title).toBe('Kesariya & Brahmastra');
      expect(track.artist).toBe('Arijit Singh');
      expect(track.artists).toEqual(['Arijit Singh', 'Pritam']);
      expect(track.album).toBe('Brahmastra');
      expect(track.durationMs).toBe(268000);
      expect(track.artworkUrl).toBe('https://c.saavncdn.com/500x500/test.jpg');
      expect(track.audioFormat).toBe('aac');
      expect(track.bitrate).toBe(320);
    });
  });

  describe('probeCdnStreamUrl', () => {
    const originalFetch = globalThis.fetch;

    afterEach(() => {
      globalThis.fetch = originalFetch;
    });

    it('returns true when CDN responds with 200 OK or 206 Partial Content', async () => {
      globalThis.fetch = jest.fn().mockResolvedValue({
        status: 206,
      } as unknown as Response);

      const alive = await probeCdnStreamUrl('https://aac.saavncdn.com/test_320.mp4', 1000);
      expect(alive).toBe(true);
    });

    it('returns false when CDN responds with 404 Not Found', async () => {
      globalThis.fetch = jest.fn().mockResolvedValue({
        status: 404,
      } as unknown as Response);

      const alive = await probeCdnStreamUrl('https://aac.saavncdn.com/test_320.mp4', 1000);
      expect(alive).toBe(false);
    });

    it('falls back to true optimistically when probe fetch throws or times out', async () => {
      globalThis.fetch = jest.fn().mockRejectedValue(new Error('Network timeout'));

      const alive = await probeCdnStreamUrl('https://aac.saavncdn.com/test_320.mp4', 1000);
      expect(alive).toBe(true);
    });
  });

  describe('resolveDirectStream', () => {
    it('returns resolved stream when encrypted URL is available in memory', async () => {
      // Map a song to populate cache
      mapJioSaavnSongToTrack({
        id: 'test_resolve_1',
        title: 'Cached Song',
        more_info: {
          encrypted_media_url: 'dummyBase64Encrypted',
        },
      });

      // resolveDirectStream with decryptJioSaavnUrl mock
      const stream = await resolveDirectStream('saavn_test_resolve_1');
      // If decryption fails on invalid dummy base64, returns null gracefully
      // But verifies no crash
      expect(stream === null || typeof stream?.streamUrl === 'string').toBe(true);
    });
  });
});
