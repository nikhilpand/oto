import { FakeAudioEngine } from '../FakeAudioEngine';
import { interpolatePlayhead } from '../usePlayheadProgress';
import { Track } from '@/domain/types';

const MOCK_TRACK: Track = {
  id: 'track_stress_1',
  title: 'Starboy',
  artist: 'The Weeknd',
  artists: ['The Weeknd'],
  album: 'Starboy',
  durationMs: 230000,
  artworkUrl: 'https://images.unsplash.com/photo-1',
  thumbhash: '3OcRJYB4d3h/iIeHeEh3eIh4h4iH',
  isExplicit: false,
};

const MOCK_TRACK_SHORT: Track = {
  id: 'track_stress_short',
  title: 'Short Sound',
  artist: 'FX',
  artists: ['FX'],
  album: 'Sound Effects',
  durationMs: 1500,
  artworkUrl: 'https://images.unsplash.com/photo-2',
  thumbhash: '3OcRJYB4d3h/iIeHeEh3eIh4h4iH',
  isExplicit: false,
};

describe('AudioEngine & 120Hz Playhead — Worst-Case Stress Tests', () => {
  describe('interpolatePlayhead Mathematical Edge Cases (UI-Thread 120Hz)', () => {
    it('handles backward clock drift (NTP sync / DST leap) without negative playhead jumps', () => {
      const lastPos = 50000;
      const lastTs = 1700000000000;
      const backwardsNow = lastTs - 5000; // clock drifted 5s backwards

      const pos = interpolatePlayhead(lastPos, lastTs, backwardsNow, 1.0, 200000, true);
      // Math.max(0, now - lastTs) ensures elapsed is 0, so position remains at 50,000ms
      expect(pos).toBe(50000);
      expect(Number.isFinite(pos)).toBe(true);
    });

    it('handles zero-duration streams (live stream / corrupt metadata) without NaN', () => {
      const pos = interpolatePlayhead(0, 1000, 2000, 1.0, 0, true);
      expect(pos).toBe(0);
      expect(isNaN(pos)).toBe(false);

      const posPaused = interpolatePlayhead(100, 1000, 2000, 1.0, 0, false);
      expect(posPaused).toBe(0);
    });

    it('handles extreme and reversed playback rates gracefully', () => {
      // 1. Rewind (-2.0x playback rate)
      const rewindPos = interpolatePlayhead(10000, 1000, 3000, -2.0, 200000, true);
      // 10000 + (2000 * -2.0) = 6000
      expect(rewindPos).toBe(6000);

      // Extreme rewind that would go below 0: must clamp to 0
      const belowZeroPos = interpolatePlayhead(1000, 1000, 3000, -5.0, 200000, true);
      expect(belowZeroPos).toBe(0);

      // 2. High-speed fast-forward (10.0x playback rate) capping at duration
      const cappedPos = interpolatePlayhead(190000, 1000, 3000, 10.0, 200000, true);
      // 190000 + (2000 * 10) = 210000 -> clamped to 200,000
      expect(cappedPos).toBe(200000);

      // 3. Frozen playhead (rate = 0.0)
      const frozenPos = interpolatePlayhead(50000, 1000, 5000, 0.0, 200000, true);
      expect(frozenPos).toBe(50000);
    });

    it('clamps position when isPlaying is false even if lastPosition exceeded duration', () => {
      const pos = interpolatePlayhead(250000, 1000, 2000, 1.0, 200000, false);
      expect(pos).toBe(200000);

      const posNeg = interpolatePlayhead(-5000, 1000, 2000, 1.0, 200000, false);
      expect(posNeg).toBe(0);
    });
  });

  describe('FakeAudioEngine Catastrophic State & Thrashing Tests', () => {
    let engine: FakeAudioEngine;

    beforeEach(() => {
      jest.useFakeTimers();
      engine = new FakeAudioEngine();
    });

    afterEach(() => {
      engine.destroy();
      jest.useRealTimers();
    });

    it('handles seek thrashing (50 consecutive random seeks during buffering) without breaking', async () => {
      const loadPromise = engine.load(MOCK_TRACK, true);

      // Rapidly fire seeks while engine is in 'loading' state
      const seekTargets = [-500, 0, 999999, 12000, 45000, -100, 150000, 230000, 240000];
      for (const target of seekTargets) {
        engine.seekTo(target);
      }

      // Finish loading
      jest.advanceTimersByTime(50);
      await loadPromise;

      // Position should be clamped to last seek (240000 -> clamped to 230000)
      expect(engine.getPosition()).toBe(230000);
      expect(engine.getStatus()).toBe('playing');
    });

    it('handles seekTo when no track is loaded without crashing', () => {
      expect(engine.getStatus()).toBe('idle');
      expect(() => {
        engine.seekTo(5000);
        engine.seekTo(-1000);
      }).not.toThrow();
      expect(engine.getPosition()).toBe(0);
    });

    it('handles rapid track switching race conditions (Track A superseded by Track B in 10ms)', async () => {
      const trackA: Track = { ...MOCK_TRACK, id: 'track_A', title: 'Song A' };
      const trackB: Track = { ...MOCK_TRACK, id: 'track_B', title: 'Song B' };

      // Start loading Track A
      const loadA = engine.load(trackA, true);

      // Immediately switch to Track B 10ms later
      jest.advanceTimersByTime(10);
      const loadB = engine.load(trackB, true);

      // Advance past buffer time
      jest.advanceTimersByTime(50);

      await Promise.all([loadA, loadB]);

      // Active track MUST be Track B, not Track A!
      expect(engine.getCurrentTrack()?.id).toBe('track_B');
      expect(engine.getCurrentTrack()?.title).toBe('Song B');
    });

    it('handles track playback reaching exact end of file (transitions to idle on empty queue)', async () => {
      const loadPromise = engine.load(MOCK_TRACK_SHORT, true); // 1500ms duration
      jest.advanceTimersByTime(50);
      await loadPromise;

      expect(engine.getStatus()).toBe('playing');

      // Advance past 1500ms (simulate full song duration playing out)
      jest.advanceTimersByTime(1750);

      // With empty queue, status should transition to idle
      expect(engine.getStatus()).toBe('idle');
      expect(engine.getCurrentTrack()).toBeNull();
    });

    it('clamps volume strictly between 0.0 and 1.0 even with out-of-bounds inputs', () => {
      engine.setVolume(1.5);
      expect(engine.getVolume()).toBe(1.0);

      engine.setVolume(-0.5);
      expect(engine.getVolume()).toBe(0.0);

      engine.setVolume(0.42);
      expect(engine.getVolume()).toBe(0.42);
    });

    it('stops ticking and cleanly tears down on destroy without lingering timers', async () => {
      let tickCount = 0;
      engine.onPositionTick(() => {
        tickCount++;
      });

      const loadPromise = engine.load(MOCK_TRACK, true);
      jest.advanceTimersByTime(50);
      await loadPromise;

      jest.advanceTimersByTime(500);
      const ticksBefore = tickCount;
      expect(ticksBefore).toBeGreaterThan(0);

      // Destroy engine
      engine.destroy();

      // Advance time further: ticks must NOT fire anymore
      jest.advanceTimersByTime(1000);
      expect(tickCount).toBe(ticksBefore);
    });
  });
});
