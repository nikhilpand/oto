import {
  mapJioSaavnSongToTrack,
  upgradeImageUrl,
  unescapeHtml,
} from '@/api/directJioSaavn';
import { decryptJioSaavnUrl, base64ToUint8Array } from '@/api/crypto/desEcb';

describe('JioSaavn Direct API & DES Decryption — Worst-Case Stress Tests', () => {
  describe('mapJioSaavnSongToTrack Resilience', () => {
    test('handles null and undefined input without throwing TypeError', () => {
      const trackFromNull = mapJioSaavnSongToTrack(null);
      expect(trackFromNull).toBeDefined();
      expect(trackFromNull.id).toBe('saavn_');
      expect(trackFromNull.title).toBe('Untitled Track');
      expect(trackFromNull.artist).toBe('Unknown Artist');
      expect(trackFromNull.durationMs).toBe(195000);

      const trackFromUndefined = mapJioSaavnSongToTrack(undefined);
      expect(trackFromUndefined).toBeDefined();
      expect(trackFromUndefined.id).toBe('saavn_');
    });

    test('handles completely empty object input', () => {
      const track = mapJioSaavnSongToTrack({});
      expect(track.id).toBe('saavn_');
      expect(track.title).toBe('Untitled Track');
      expect(track.artist).toBe('Unknown Artist');
      expect(track.artists).toEqual(['Unknown Artist']);
      expect(track.album).toBe('Single');
      expect(track.durationMs).toBe(195000);
      expect(track.artworkUrl).toBe('');
    });

    test('recovers from negative, zero, NaN, and Infinity durations to default fallback', () => {
      expect(mapJioSaavnSongToTrack({ duration: -50 }).durationMs).toBe(195000);
      expect(mapJioSaavnSongToTrack({ duration: 0 }).durationMs).toBe(195000);
      expect(mapJioSaavnSongToTrack({ duration: 'NaN' }).durationMs).toBe(195000);
      expect(mapJioSaavnSongToTrack({ duration: 'Infinity' }).durationMs).toBe(195000);
      expect(mapJioSaavnSongToTrack({ duration: 'corrupt_string' }).durationMs).toBe(195000);

      // Valid numeric duration in seconds -> converts to ms
      expect(mapJioSaavnSongToTrack({ duration: '240' }).durationMs).toBe(240000);
      expect(mapJioSaavnSongToTrack({ more_info: { duration: 180 } }).durationMs).toBe(180000);
    });

    test('parses artist names when artistMap contains null elements or missing names', () => {
      const track = mapJioSaavnSongToTrack({
        more_info: {
          artistMap: {
            primary_artists: [null, undefined, { name: '' }, { name: 'A.R. Rahman &amp; Team' }],
          },
        },
      });

      expect(track.artist).toBe('A.R. Rahman & Team');
      expect(track.artists).toContain('A.R. Rahman & Team');
    });

    test('falls back through primary_artists and subtitle correctly', () => {
      // Subtitle with middle dot
      const trackWithSub = mapJioSaavnSongToTrack({
        subtitle: 'The Weeknd · Starboy',
      });
      expect(trackWithSub.artist).toBe('The Weeknd');

      // Comma-separated primary_artists
      const trackWithList = mapJioSaavnSongToTrack({
        primary_artists: 'Dua Lipa, Elton John',
      });
      expect(trackWithList.artist).toBe('Dua Lipa');
      expect(trackWithList.artists).toEqual(['Dua Lipa', 'Elton John']);
    });
  });

  describe('upgradeImageUrl URL Transformation', () => {
    test('handles null, undefined, and empty string without throwing', () => {
      expect(upgradeImageUrl(null)).toBe('');
      expect(upgradeImageUrl(undefined)).toBe('');
      expect(upgradeImageUrl('')).toBe('');
    });

    test('forces HTTPS protocol on insecure CDN URLs', () => {
      const url = upgradeImageUrl('http://c.saavncdn.com/123/art-150x150.jpg');
      expect(url.startsWith('https://')).toBe(true);
      expect(url).toContain('-500x500.jpg');
    });

    test('upgrades multiple thumbnail dimensions (50x50, 150x150) to 500x500', () => {
      expect(upgradeImageUrl('https://saavn.com/art-50x50.webp')).toBe(
        'https://saavn.com/art-500x500.webp'
      );
      expect(upgradeImageUrl('https://saavn.com/art-150x150.png')).toBe(
        'https://saavn.com/art-500x500.png'
      );
    });
  });

  describe('unescapeHtml Entity Decoding', () => {
    test('handles empty and null values cleanly', () => {
      expect(unescapeHtml(null)).toBe('');
      expect(unescapeHtml(undefined)).toBe('');
      expect(unescapeHtml('')).toBe('');
    });

    test('decodes complex mixed HTML entities in song titles', () => {
      const raw = '&quot;Rock &amp; Roll&quot; &#039;Live&#039; &lt;Bootleg&gt; &hellip;';
      const clean = unescapeHtml(raw);
      expect(clean).toBe('"Rock & Roll" \'Live\' <Bootleg> ...');
    });
  });

  describe('decryptJioSaavnUrl Edge & Error Handling', () => {
    test('returns null for empty, non-string, or nullish cipher inputs', () => {
      expect(decryptJioSaavnUrl('')).toBeNull();
      expect(decryptJioSaavnUrl(null as any)).toBeNull();
      expect(decryptJioSaavnUrl(undefined as any)).toBeNull();
    });

    test('returns null when base64 is not an 8-byte DES multiple', () => {
      // 5 bytes base64
      expect(decryptJioSaavnUrl('AQIDBAU=')).toBeNull();
    });

    test('returns null when decrypted data does not start with http', () => {
      // 8 bytes of garbage DES block that decrypts to non-http
      const base64Garbage = 'AAAAAAAABBBBBBBB';
      expect(decryptJioSaavnUrl(base64Garbage)).toBeNull();
    });

    test('base64ToUint8Array ignores malformed padding or invalid characters without hanging', () => {
      const bytes = base64ToUint8Array('!@#$%^&*()');
      expect(bytes.length).toBe(0);
    });
  });
});
