import { sha1Hex, sapisidHash, extractSapisid } from '../crypto';

describe('Innertube Crypto & SAPISIDHASH', () => {
  describe('sha1Hex', () => {
    it('computes standard RFC 3174 SHA-1 hashes correctly', () => {
      expect(sha1Hex('')).toBe('da39a3ee5e6b4b0d3255bfef95601890afd80709');
      expect(sha1Hex('The quick brown fox jumps over the lazy dog')).toBe(
        '2fd4e1c67a2d28fced849ee1bb76e7391b93eb12'
      );
      expect(sha1Hex('The quick brown fox jumps over the lazy cog')).toBe(
        'de9f2c7fd25e1b3afad3e85a0bd17d9b100db4b3'
      );
    });

    it('handles unicode and multi-byte characters', () => {
      expect(sha1Hex('हिंदी गाना 2026')).toBe('f32c91b77a684c30352550a525898c8776670086');
    });
  });

  describe('sapisidHash', () => {
    it('generates a valid SAPISIDHASH format with timestamp and 40-char hex digest', () => {
      const hash = sapisidHash('abc12345');
      expect(hash).toMatch(/^SAPISIDHASH \d+_[0-9a-f]{40}$/);
    });

    it('matches exact BitChord digest for a fixed timestamp', () => {
      const fixedTimestamp = 1790961117;
      const sapisid = 'abc12345';
      const origin = 'https://music.youtube.com';

      // 1790961117 abc12345 https://music.youtube.com -> f545050b8ff9cc1bcf7bb342b1918e6c71f2a2c9
      const result = sapisidHash(sapisid, origin, fixedTimestamp);
      expect(result).toBe('SAPISIDHASH 1790961117_f545050b8ff9cc1bcf7bb342b1918e6c71f2a2c9');
    });
  });

  describe('extractSapisid', () => {
    it('extracts SAPISID from cookie header', () => {
      const cookie = 'HSID=abc; SAPISID=my_sapisid_secret; SSID=def;';
      expect(extractSapisid(cookie)).toBe('my_sapisid_secret');
    });

    it('extracts __Secure-3PAPISID when SAPISID is not present', () => {
      const cookie = 'HSID=abc; __Secure-3PAPISID=secure_3p_secret; SSID=def;';
      expect(extractSapisid(cookie)).toBe('secure_3p_secret');
    });

    it('extracts __Secure-1PAPISID when only 1P is present', () => {
      const cookie = 'HSID=abc; __Secure-1PAPISID=secure_1p_secret; SSID=def;';
      expect(extractSapisid(cookie)).toBe('secure_1p_secret');
    });

    it('returns null if no valid SAPISID cookie exists', () => {
      expect(extractSapisid('')).toBeNull();
      expect(extractSapisid('OTHER=123; TEST=456;')).toBeNull();
    });
  });
});
