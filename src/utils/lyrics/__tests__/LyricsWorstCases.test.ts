import { LyricsRepository } from '../LyricsRepository';
import { parseTtml, parseTtmlTime } from '../TtmlParser';
import { decodeHtmlEntities, withInstrumentalGaps } from '../EnhancedLrcParser';
import { revealedChars, wordLift, canWordGrow } from '../AppleLyricsSweep';
import { LyricsTranslationService } from '../LyricsTranslation';
import type { LyricLine, LyricWord } from '../types';

describe('Lyrics Engine & Parsers — Worst-Case Stress Tests (Music App Catastrophes)', () => {
  beforeEach(() => {
    LyricsRepository.clearCache();
    jest.clearAllMocks();
  });

  describe('Multi-Provider Waterfall Catastrophes', () => {
    it('handles total blackout (all 5 providers reject simultaneously) without crashing', async () => {
      // Mock fetch to reject with different catastrophic failures across all endpoints
      jest.spyOn(globalThis, 'fetch').mockImplementation((url: RequestInfo | URL) => {
        const u = url.toString();
        if (u.includes('binimum')) {
          return Promise.reject(new Error('500 Internal Server Error: Binimum API down'));
        }
        if (u.includes('musixmatch')) {
          return Promise.resolve({
            ok: false,
            status: 401,
            json: () => Promise.resolve({ message: 'Unauthorized / Token Revoked' }),
          } as unknown as Response);
        }
        if (u.includes('simpmusic')) {
          return Promise.reject(new Error('ETIMEDOUT: Connection timed out after 10000ms'));
        }
        if (u.includes('kugou')) {
          return Promise.resolve({
            ok: false,
            status: 404,
            json: () => Promise.resolve({ errcode: 404 }),
          } as unknown as Response);
        }
        if (u.includes('lrclib')) {
          return Promise.resolve({
            ok: false,
            status: 429,
            json: () => Promise.resolve({ error: 'Rate limit exceeded' }),
          } as unknown as Response);
        }
        return Promise.reject(new Error('Unknown provider host'));
      });

      const lyrics = await LyricsRepository.getLyrics({
        title: 'NonExistentSong',
        artist: 'GhostArtist',
        durationMs: 240000,
        videoId: 'vid_fail_123',
      });

      // Must resolve cleanly to null, no unhandled rejection
      expect(lyrics).toBeNull();
    });

    it('prevents race conditions when user rapidly skips tracks', async () => {
      jest.spyOn(globalThis, 'fetch').mockImplementation((url: RequestInfo | URL) => {
        const u = url.toString().toLowerCase();
        // Song A has slow network (returns after 100ms)
        if (u.includes('songa') || u.includes('vid_a')) {
          return new Promise((resolve) =>
            setTimeout(
              () =>
                resolve({
                  ok: true,
                  json: () =>
                    Promise.resolve({
                      results: [
                        {
                          lyricsUrl: 'https://cdn/songA.ttml',
                        },
                      ],
                    }),
                  text: () => Promise.resolve('<p begin="00:01.00">Song A Lyrics</p>'),
                } as unknown as Response),
              100
            )
          );
        }
        // Song B has fast network (returns immediately)
        return Promise.resolve({
          ok: true,
          json: () =>
            Promise.resolve({
              results: [
                {
                  lyricsUrl: 'https://cdn/songB.ttml',
                },
              ],
            }),
          text: () => Promise.resolve('<p begin="00:01.00">Song B Lyrics</p>'),
        } as unknown as Response);
      });

      const promiseA = LyricsRepository.getLyrics({
        title: 'SongA',
        artist: 'Artist',
        videoId: 'vid_A',
      });

      const promiseB = LyricsRepository.getLyrics({
        title: 'SongB',
        artist: 'Artist',
        videoId: 'vid_B',
      });

      const [resA, resB] = await Promise.all([promiseA, promiseB]);

      // Cache and result for Song B must NEVER be corrupted by Song A
      expect(resB?.lines[0]?.text).toContain('Song B');
      expect(resA?.lines[0]?.text).toContain('Song A');
    });
  });

  describe('TTML Parser Malformations & Corruptions', () => {
    it('parseTtmlTime parses varied time formats (clock, units, hours) and rejects garbage', () => {
      // Milliseconds unit
      expect(parseTtmlTime('250ms')).toBe(250);
      expect(parseTtmlTime('1500ms')).toBe(1500);

      // Seconds unit
      expect(parseTtmlTime('2.5s')).toBe(2500);
      expect(parseTtmlTime('0.8s')).toBe(800);

      // Standard MM:SS.xx
      expect(parseTtmlTime('01:15.50')).toBe(75500);
      expect(parseTtmlTime('00:05.100')).toBe(5100);

      // Hours format HH:MM:SS.xx (for long concerts / DJ mixes)
      expect(parseTtmlTime('01:02:03.500')).toBe(3723500);

      // Garbage inputs -> return null safely
      expect(parseTtmlTime('invalid_timestamp')).toBeNull();
      expect(parseTtmlTime(null)).toBeNull();
      expect(parseTtmlTime('')).toBeNull();
      expect(parseTtmlTime('   ')).toBeNull();
      expect(parseTtmlTime('99:invalid')).toBeNull();
    });

    it('parseTtml handles corrupt/truncated XML without exploding', () => {
      // 1. Plain string error message
      const res1 = parseTtml('502 Bad Gateway from NGINX');
      expect(res1.lines).toHaveLength(0);

      // 2. Truncated XML mid-tag
      const truncatedXml = `<tt><body><div><p begin="00:10.00" end="00:15.00"><span>Unclosed tag`;
      const res2 = parseTtml(truncatedXml);
      expect(res2.lines).toHaveLength(0);

      // 3. XML with unclosed entity and missing spans
      const brokenXml = `<tt><body><div><p begin="00:05.00" end="00:08.00">Hello & World</p></div></body></tt>`;
      const res3 = parseTtml(brokenXml);
      expect(res3.lines).toHaveLength(1);
      expect(res3.lines[0]?.text).toBe('Hello & World');
    });

    it('parseTtml handles Duet vocals with multiple agents', () => {
      const duetXml = `
        <tt xmlns:ttm="http://www.w3.org/ns/ttml#metadata">
          <body>
            <div>
              <p begin="00:01.00" end="00:04.00" ttm:agent="v1">
                <span>Part 1</span>
              </p>
              <p begin="00:04.00" end="00:08.00" ttm:agent="v2">
                <span>Part 2</span>
              </p>
            </div>
          </body>
        </tt>
      `;

      const parsed = parseTtml(duetXml);
      expect(parsed.hasDuet).toBe(true);
      expect(parsed.lines).toHaveLength(2);
      expect(parsed.lines[0]?.agent).toBe('v1');
      expect(parsed.lines[1]?.agent).toBe('v2');
      // Lead singer aligned to start, second singer to end
      expect(parsed.lines[0]?.alignment).toBe('start');
      expect(parsed.lines[1]?.alignment).toBe('end');
    });
  });

  describe('Enhanced LRC & Instrumental Gap Worst Cases', () => {
    it('decodes complex and nested HTML entities properly', () => {
      expect(decodeHtmlEntities('Don&#x27;t stop &amp; listen')).toBe("Don't stop & listen");
      expect(decodeHtmlEntities('&quot;Golden&quot; &apos;Hour&apos;')).toBe('"Golden" \'Hour\'');
      expect(decodeHtmlEntities('No entities here')).toBe('No entities here');
      expect(decodeHtmlEntities('&lt;b&gt;bold&lt;/b&gt;')).toBe('<b>bold</b>');
    });

    it('withInstrumentalGaps inserts instrumental gap lines for silences >= 3500ms', () => {
      const line1: LyricLine = {
        id: '1',
        timeMs: 10000,
        endMs: 14000,
        text: 'First verse ends',
        words: [],
        isWordSynced: false,
        alignment: 'start',
      };
      // Next line starts at 22000ms (silence = 8000ms >= 3500ms)
      const line2: LyricLine = {
        id: '2',
        timeMs: 22000,
        endMs: 26000,
        text: 'Second verse begins',
        words: [],
        isWordSynced: false,
        alignment: 'start',
      };

      const withGaps = withInstrumentalGaps([line1, line2]);
      expect(withGaps).toHaveLength(3);
      expect(withGaps[1]?.isGap).toBe(true);
      expect(withGaps[1]?.timeMs).toBe(14000);
      expect(withGaps[1]?.endMs).toBe(22000);
    });

    it('withInstrumentalGaps does NOT insert gaps for normal lyrical pauses (< 3500ms)', () => {
      const line1: LyricLine = {
        id: '1',
        timeMs: 1000,
        endMs: 4000,
        text: 'Line 1',
        words: [],
        isWordSynced: false,
        alignment: 'start',
      };
      const line2: LyricLine = {
        id: '2',
        timeMs: 5000, // pause is 1000ms < 3500ms
        endMs: 8000,
        text: 'Line 2',
        words: [],
        isWordSynced: false,
        alignment: 'start',
      };

      const withGaps = withInstrumentalGaps([line1, line2]);
      expect(withGaps).toHaveLength(2);
    });
  });

  describe('Apple Lyrics 120Hz Progressive Character Sweep', () => {
    const lineWithWords: LyricLine = {
      id: 'l1',
      timeMs: 1000,
      endMs: 4000,
      text: 'Hello world',
      alignment: 'start',
      isWordSynced: true,
      words: [
        { text: 'Hello', startMs: 1000, endMs: 2000 },
        { text: 'world', startMs: 2500, endMs: 3500 },
      ],
    };

    it('revealedChars reveals exactly 0 before line start', () => {
      expect(revealedChars(lineWithWords, 500)).toBe(0);
      expect(revealedChars(lineWithWords, 999)).toBe(0);
    });

    it('revealedChars reveals progressively through active sung words', () => {
      // At 1500ms: halfway through "Hello" (5 chars * 0.5 = 2.5)
      const halfwayHello = revealedChars(lineWithWords, 1500);
      expect(halfwayHello).toBeCloseTo(2.5, 1);

      // At 2000ms: end of "Hello" (start of whitespace) = 5 chars
      expect(revealedChars(lineWithWords, 2000)).toBe(5);
    });

    it('revealedChars reveals across trailing whitespace gap between words', () => {
      // Gap between 2000ms and 2500ms across space char (length 1)
      const midSpace = revealedChars(lineWithWords, 2250);
      expect(midSpace).toBeCloseTo(5.5, 1);
    });

    it('revealedChars clamps to line.text.length when positionMs exceeds song/line', () => {
      expect(revealedChars(lineWithWords, 4000)).toBe(11);
      expect(revealedChars(lineWithWords, 999999)).toBe(11);
    });

    it('wordLift computes smooth Hermite elevation curve with strict [0, 1] bounds', () => {
      const word: LyricWord = { text: 'sing', startMs: 2000, endMs: 3000 };

      // Before start (at 1900ms): 0
      expect(wordLift(word, 1900)).toBe(0);

      // Midway through rise: (2000 + 125) = 2125ms
      const rising = wordLift(word, 2125);
      expect(rising).toBeGreaterThan(0);
      expect(rising).toBeLessThan(1);

      // Exactly at sung duration (2500ms): 1.0
      expect(wordLift(word, 2500)).toBe(1);

      // Far after end + riseMs (at 3300ms): 0
      expect(wordLift(word, 3300)).toBe(0);
    });

    it('canWordGrow rejects non-Latin scripts and symbols to prevent broken animations', () => {
      // 4-char word requires held >= 1050ms
      expect(canWordGrow({ text: 'hold', startMs: 0, endMs: 1200 })).toBe(true);
      // 2-char word requires held >= 1360ms
      expect(canWordGrow({ text: 'ah', startMs: 0, endMs: 1500 })).toBe(true);

      // Chinese ideographs -> false
      expect(canWordGrow({ text: '你好', startMs: 0, endMs: 2000 })).toBe(false);
      // Japanese Hiragana -> false
      expect(canWordGrow({ text: 'さようなら', startMs: 0, endMs: 2000 })).toBe(false);
      // Hyphenated word -> false
      expect(canWordGrow({ text: 'pre-order', startMs: 0, endMs: 2000 })).toBe(false);
      // Too long (> 7 chars) -> false
      expect(canWordGrow({ text: 'magnificent', startMs: 0, endMs: 2000 })).toBe(false);
    });
  });

  describe('Google Translate Service Edge Cases', () => {
    it('returns null safely when Google Translate returns fewer lines than source', async () => {
      const lines: LyricLine[] = [
        { id: '1', timeMs: 0, endMs: 2000, text: 'Line 1', words: [], isWordSynced: false, alignment: 'start' },
        { id: '2', timeMs: 2000, endMs: 4000, text: 'Line 2', words: [], isWordSynced: false, alignment: 'start' },
        { id: '3', timeMs: 4000, endMs: 6000, text: 'Line 3', words: [], isWordSynced: false, alignment: 'start' },
      ];

      // Simulate Google Translate dropping boundary markers and returning only 1 combined line
      jest.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve([
            [['Translated All In One Without Markers']],
          ]),
      } as unknown as Response);

      const translated = await LyricsTranslationService.translate('track_drop', lines, 'en');

      // Mismatched length MUST safely return null, preventing UI lyrics desync!
      expect(translated).toBeNull();
    });

    it('handles translation API 500 error or network crash without throwing', async () => {
      jest.spyOn(globalThis, 'fetch').mockRejectedValueOnce(new Error('Network error (DNS)'));

      const lines: LyricLine[] = [
        { id: '1', timeMs: 0, endMs: 2000, text: 'Text', words: [], isWordSynced: false, alignment: 'start' },
      ];

      const translated = await LyricsTranslationService.translate('track_err', lines, 'es');
      expect(translated).toBeNull();
    });
  });
});
