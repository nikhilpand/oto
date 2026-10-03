import {
  formatMsToTime,
  formatRemainingMsToTime,
  clampScrubProgress,
  calculateSeekTargetMs,
  calculateAdjustedPosition,
} from '../math/nowPlayingMath';

describe('Now Playing Scrubber Math — Worst-Case Stress Tests (Music App Catastrophes)', () => {
  describe('formatMsToTime Extreme Inputs', () => {
    it('handles negative, NaN, Infinity and non-finite timestamps safely', () => {
      expect(formatMsToTime(-1)).toBe('0:00');
      expect(formatMsToTime(-999999999)).toBe('0:00');
      expect(formatMsToTime(NaN)).toBe('0:00');
      expect(formatMsToTime(Infinity)).toBe('0:00');
      expect(formatMsToTime(-Infinity)).toBe('0:00');
    });

    it('formats exact millisecond second rollover boundaries', () => {
      expect(formatMsToTime(999)).toBe('0:00');
      expect(formatMsToTime(1000)).toBe('0:01');
      expect(formatMsToTime(59999)).toBe('0:59');
      expect(formatMsToTime(60000)).toBe('1:00');
    });

    it('formats long DJ mixes and podcasts (> 2 hours) without breaking seconds padding', () => {
      // 2 hours = 120 minutes = 7,200,000 ms
      expect(formatMsToTime(7200000)).toBe('120:00');
      // 2 hours, 5 minutes, 7 seconds = 7,507,000 ms
      expect(formatMsToTime(7507000)).toBe('125:07');
    });
  });

  describe('formatRemainingMsToTime Extreme Inputs', () => {
    it('handles currentMs >= durationMs without displaying inverted countdowns', () => {
      expect(formatRemainingMsToTime(200000, 200000)).toBe('-0:00');
      expect(formatRemainingMsToTime(205000, 200000)).toBe('-0:00');
      expect(formatRemainingMsToTime(999999, 200000)).toBe('-0:00');
    });

    it('handles invalid durationMs (0, negative, NaN) safely', () => {
      expect(formatRemainingMsToTime(5000, 0)).toBe('-0:00');
      expect(formatRemainingMsToTime(5000, -100)).toBe('-0:00');
      expect(formatRemainingMsToTime(5000, NaN)).toBe('-0:00');
      expect(formatRemainingMsToTime(5000, Infinity)).toBe('-0:00');
    });

    it('handles negative or NaN currentMs by measuring from 0', () => {
      expect(formatRemainingMsToTime(-5000, 180000)).toBe('-3:00');
      expect(formatRemainingMsToTime(NaN, 180000)).toBe('-3:00');
    });
  });

  describe('clampScrubProgress Touch Gestures', () => {
    it('clamps massive positive and negative dragging overshoots', () => {
      const trackWidth = 320;
      expect(clampScrubProgress(-500, trackWidth)).toBe(0);
      expect(clampScrubProgress(99999, trackWidth)).toBe(1);
    });

    it('handles zero, negative or NaN trackWidth without divide-by-zero NaN', () => {
      expect(clampScrubProgress(100, 0)).toBe(0);
      expect(clampScrubProgress(100, -320)).toBe(0);
      expect(clampScrubProgress(100, NaN)).toBe(0);
      expect(clampScrubProgress(NaN, 320)).toBe(0);
    });
  });

  describe('calculateSeekTargetMs Boundaries', () => {
    it('clamps seek target between 0 and durationMs', () => {
      const duration = 240000;
      expect(calculateSeekTargetMs(-0.5, duration)).toBe(0);
      expect(calculateSeekTargetMs(1.5, duration)).toBe(240000);
      expect(calculateSeekTargetMs(0.5, duration)).toBe(120000);
    });

    it('handles durationMs <= 0 without NaN', () => {
      expect(calculateSeekTargetMs(0.5, 0)).toBe(0);
      expect(calculateSeekTargetMs(0.5, -5000)).toBe(0);
      expect(calculateSeekTargetMs(0.5, NaN)).toBe(0);
    });
  });

  describe('calculateAdjustedPosition Accessibility Stepping (+/-10s)', () => {
    it('clamps forward steps to durationMs', () => {
      expect(calculateAdjustedPosition(195000, 200000, 10000)).toBe(200000);
      expect(calculateAdjustedPosition(200000, 200000, 10000)).toBe(200000);
    });

    it('clamps backward steps to 0ms', () => {
      expect(calculateAdjustedPosition(5000, 200000, -10000)).toBe(0);
      expect(calculateAdjustedPosition(0, 200000, -10000)).toBe(0);
    });
  });
});
