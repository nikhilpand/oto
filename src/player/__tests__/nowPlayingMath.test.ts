import {
  formatMsToTime,
  formatRemainingMsToTime,
  clampScrubProgress,
  calculateSeekTargetMs,
  calculateAdjustedPosition,
  getPauseScale,
} from '../math/nowPlayingMath';

describe('Now Playing Scrubber & Playhead Math (TDD)', () => {
  describe('formatMsToTime', () => {
    test('formats 0ms as "0:00"', () => {
      expect(formatMsToTime(0)).toBe('0:00');
    });

    test('formats under 10 seconds with leading zero', () => {
      expect(formatMsToTime(5000)).toBe('0:05');
      expect(formatMsToTime(9999)).toBe('0:09');
    });

    test('formats minutes and seconds accurately', () => {
      expect(formatMsToTime(65000)).toBe('1:05');
      expect(formatMsToTime(234000)).toBe('3:54');
      expect(formatMsToTime(600000)).toBe('10:00');
    });

    test('handles negative values gracefully', () => {
      expect(formatMsToTime(-5000)).toBe('0:00');
    });

    test('handles NaN and non-finite inputs', () => {
      expect(formatMsToTime(NaN)).toBe('0:00');
      expect(formatMsToTime(Infinity)).toBe('0:00');
    });
  });

  describe('formatRemainingMsToTime', () => {
    test('formats remaining duration with a minus sign', () => {
      expect(formatRemainingMsToTime(65000, 234000)).toBe('-2:49');
      expect(formatRemainingMsToTime(0, 234000)).toBe('-3:54');
      expect(formatRemainingMsToTime(234000, 234000)).toBe('-0:00');
    });

    test('handles currentMs greater than durationMs', () => {
      expect(formatRemainingMsToTime(240000, 234000)).toBe('-0:00');
    });
  });

  describe('clampScrubProgress', () => {
    test('clamps drag coordinate within [0, 1]', () => {
      expect(clampScrubProgress(50, 100)).toBe(0.5);
      expect(clampScrubProgress(0, 100)).toBe(0);
      expect(clampScrubProgress(100, 100)).toBe(1);
    });

    test('clamps out-of-bounds drags strictly to 0 and 1', () => {
      expect(clampScrubProgress(-20, 100)).toBe(0);
      expect(clampScrubProgress(150, 100)).toBe(1);
    });

    test('handles zero or negative track width safely', () => {
      expect(clampScrubProgress(50, 0)).toBe(0);
      expect(clampScrubProgress(50, -100)).toBe(0);
    });
  });

  describe('calculateSeekTargetMs', () => {
    test('calculates exact millisecond seek target', () => {
      expect(calculateSeekTargetMs(0.5, 200000)).toBe(100000);
      expect(calculateSeekTargetMs(0.25, 240000)).toBe(60000);
      expect(calculateSeekTargetMs(1, 180000)).toBe(180000);
      expect(calculateSeekTargetMs(0, 180000)).toBe(0);
    });

    test('clamps target within [0, durationMs]', () => {
      expect(calculateSeekTargetMs(-0.5, 200000)).toBe(0);
      expect(calculateSeekTargetMs(1.5, 200000)).toBe(200000);
    });
  });

  describe('calculateAdjustedPosition (Accessibility +/-10s)', () => {
    test('increments position by stepMs within bounds', () => {
      expect(calculateAdjustedPosition(30000, 200000, 10000)).toBe(40000);
      expect(calculateAdjustedPosition(195000, 200000, 10000)).toBe(200000); // capped at duration
    });

    test('decrements position by stepMs within bounds', () => {
      expect(calculateAdjustedPosition(30000, 200000, -10000)).toBe(20000);
      expect(calculateAdjustedPosition(5000, 200000, -10000)).toBe(0); // floored at 0
    });
  });

  describe('getPauseScale', () => {
    test('returns 1.0 when playing', () => {
      expect(getPauseScale(true)).toBe(1.0);
    });

    test('returns 0.92 when paused', () => {
      expect(getPauseScale(false)).toBe(0.92);
    });
  });
});
