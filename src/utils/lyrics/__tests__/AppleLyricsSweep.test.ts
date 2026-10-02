import {
  parseEnhancedLrc,
  decodeHtmlEntities,
  withInstrumentalGaps,
} from '../EnhancedLrcParser';
import {
  revealedChars,
  wordLift,
  canWordGrow,
  sampleCharGrowth,
} from '../AppleLyricsSweep';
import type { LyricLine } from '../types';

describe('EnhancedLrcParser & AppleLyricsSweep', () => {
  describe('EnhancedLrcParser', () => {
    const rawEnhancedLrc = `
[00:27.39]<00:27.39>I <00:27.54>been <00:27.74>tryna <00:28.07>call
[00:30.18]<00:30.18>on <00:30.39>my <00:30.64>own
    `.trim();

    it('reads word timings out of enhanced LRC', () => {
      const lines = parseEnhancedLrc(rawEnhancedLrc);
      expect(lines).toHaveLength(2);

      const firstLine = lines[0]!;
      expect(firstLine.text).toBe('I been tryna call');
      expect(firstLine.isWordSynced).toBe(true);
      expect(firstLine.words.map((w) => w.text)).toEqual(['I', 'been', 'tryna', 'call']);

      // Word starts and ends
      expect(firstLine.words[0]?.startMs).toBe(27390);
      expect(firstLine.words[0]?.endMs).toBe(27540);
      expect(firstLine.words[1]?.startMs).toBe(27540);
    });

    it('decodes HTML entities safely without double-decoding', () => {
      expect(decodeHtmlEntities('don&#x27;t')).toBe("don't");
      expect(decodeHtmlEntities('&quot;hello&quot;')).toBe('"hello"');
      expect(decodeHtmlEntities('&amp;#x27;')).toBe('&#x27;');
    });

    it('returns empty array when input contains no word stamps', () => {
      const plainLrc = '[00:10.00] Line one\n[00:15.00] Line two';
      expect(parseEnhancedLrc(plainLrc)).toEqual([]);
    });

    it('inserts instrumental gaps when lines have >= 3500ms silence', () => {
      const lines: LyricLine[] = [
        {
          id: '1',
          timeMs: 1000,
          endMs: 3000,
          text: 'Line 1',
          words: [],
          isWordSynced: false,
          alignment: 'start',
        },
        {
          id: '2',
          timeMs: 10000, // 7000ms gap
          endMs: 12000,
          text: 'Line 2',
          words: [],
          isWordSynced: false,
          alignment: 'start',
        },
      ];

      const withGaps = withInstrumentalGaps(lines);
      expect(withGaps).toHaveLength(3);
      expect(withGaps[1]?.isGap).toBe(true);
      expect(withGaps[1]?.timeMs).toBe(3000);
      expect(withGaps[1]?.endMs).toBe(10000);
    });
  });

  describe('AppleLyricsSweep: revealedChars', () => {
    const sweepLine: LyricLine = {
      id: 'test-sweep',
      timeMs: 1000,
      endMs: 2400,
      text: 'one two',
      alignment: 'start',
      isWordSynced: true,
      words: [
        { startMs: 1000, endMs: 1500, text: 'one' },
        { startMs: 2000, endMs: 2400, text: 'two' },
      ],
    };

    it('calculates character reveal fractionally across words', () => {
      expect(revealedChars(sweepLine, 500)).toBe(0);
      expect(revealedChars(sweepLine, 1000)).toBe(0);
      // Halfway through "one" (duration 500ms, at 1250ms = 50% of 3 chars = 1.5)
      expect(revealedChars(sweepLine, 1250)).toBeCloseTo(1.5, 2);
      // End of "one" (at 1500ms = 3.0 chars)
      expect(revealedChars(sweepLine, 1500)).toBe(3);
    });

    it('smoothly creeps across trailing space during pause between words', () => {
      // 1500ms to 2000ms is gap between "one" and "two" (char index 3 is the space)
      // Halfway through pause (1750ms) -> 3.5 chars
      expect(revealedChars(sweepLine, 1750)).toBeCloseTo(3.5, 2);
      // Start of "two" (2000ms) -> 4.0 chars
      expect(revealedChars(sweepLine, 2000)).toBe(4);
    });

    it('reveals entire line once last word finishes', () => {
      expect(revealedChars(sweepLine, 2400)).toBe(7);
      expect(revealedChars(sweepLine, 3000)).toBe(7);
    });
  });

  describe('AppleLyricsSweep: wordLift', () => {
    it('elevates word over 250ms rise window and settles over 250ms fall window', () => {
      const word = { startMs: 1000, endMs: 2000, text: 'floating' };

      expect(wordLift(word, 900)).toBe(0); // before rise
      expect(wordLift(word, 1500)).toBeCloseTo(1.0, 1); // mid-word peak lift
      expect(wordLift(word, 2300)).toBe(0); // after fall
    });
  });

  describe('AppleLyricsSweep: note-held swells', () => {
    it('detects held notes that qualify for progressive letter swells', () => {
      expect(canWordGrow({ startMs: 0, endMs: 1500, text: 'hold' })).toBe(true);
      expect(canWordGrow({ startMs: 0, endMs: 300, text: 'hold' })).toBe(false);
      expect(canWordGrow({ startMs: 0, endMs: 1500, text: 'ah' })).toBe(true);
    });

    it('propagates the swell wave across letters in turn', () => {
      const word = { startMs: 1000, endMs: 3000, text: 'golden' };

      // At 1200ms, first letter 'g' has started swelling, while last letter 'n' has not
      const char0 = sampleCharGrowth(word, 0, 1200);
      const char5 = sampleCharGrowth(word, 5, 1200);

      expect(char0.scale).toBeGreaterThan(1.0);
      expect(char5.scale).toBe(1.0); // has not begun swell yet
    });
  });
});
