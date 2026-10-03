import {
  useSleepTimerStore,
  calculateCosineFadeVolume,
} from '@/audio/SleepTimer';
import type { AudioEngine } from '@/audio/AudioEngine';

describe('SleepTimer — Worst-Case Stress Tests', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    useSleepTimerStore.getState().cancel();
  });

  afterEach(() => {
    useSleepTimerStore.getState().cancel();
    jest.useRealTimers();
  });

  describe('calculateCosineFadeVolume Mathematical Invariants', () => {
    test('guarded against NaN, Infinity, -Infinity, and negative values', () => {
      expect(calculateCosineFadeVolume(NaN)).toBe(0);
      expect(calculateCosineFadeVolume(Infinity)).toBe(0);
      expect(calculateCosineFadeVolume(-Infinity)).toBe(0);
      expect(calculateCosineFadeVolume(-5)).toBe(0);
      expect(calculateCosineFadeVolume(0)).toBe(0);
      expect(calculateCosineFadeVolume(10, NaN)).toBe(0);
      expect(calculateCosineFadeVolume(10, 0)).toBe(0);
      expect(calculateCosineFadeVolume(10, -10)).toBe(0);
    });

    test('quarter-cosine smooth attenuation curve at key intervals', () => {
      // At full remaining window (15s), volume is 1.0
      expect(calculateCosineFadeVolume(15, 15)).toBe(1.0);

      // At half remaining (7.5s), attenuation is cos(pi/4) = sqrt(2)/2 ≈ 0.7071
      expect(calculateCosineFadeVolume(7.5, 15)).toBeCloseTo(0.7071, 3);

      // At 0s remaining, volume is strictly 0
      expect(calculateCosineFadeVolume(0, 15)).toBe(0);

      // Beyond fade window (e.g. 30s remaining), volume is strictly 1.0
      expect(calculateCosineFadeVolume(30, 15)).toBe(1.0);
    });
  });

  describe('Device Sleep & Large Clock Jumps (Phone Screen Off)', () => {
    test('immediate pause and volume restoration when app wakes after 2 hours', () => {
      const mockSetVolume = jest.fn().mockResolvedValue(undefined);
      const mockPause = jest.fn().mockResolvedValue(undefined);

      const fakeEngine: Partial<AudioEngine> = {
        getVolume: jest.fn().mockReturnValue(0.85),
        setVolume: mockSetVolume,
        pause: mockPause,
      };

      const store = useSleepTimerStore.getState();
      store.start(15, fakeEngine as AudioEngine); // 15 min timer

      expect(useSleepTimerStore.getState().isActive).toBe(true);

      // Simulate device sleeping for 2 hours (7,200 seconds)
      jest.advanceTimersByTime(7_200_000);

      const stateAfter = useSleepTimerStore.getState();
      expect(stateAfter.isActive).toBe(false);
      expect(stateAfter.remainingSeconds).toBe(0);

      // Must have paused playback
      expect(mockPause).toHaveBeenCalledTimes(1);
      // Must restore volume to original 0.85 (so user doesn't wake up to muted phone)
      expect(mockSetVolume).toHaveBeenCalledWith(0.85);
    });
  });

  describe('Timer Extension Mid-Fade', () => {
    test('restores full audio volume when user extends timer while in fading state', () => {
      const mockSetVolume = jest.fn().mockResolvedValue(undefined);
      const fakeEngine: Partial<AudioEngine> = {
        getVolume: jest.fn().mockReturnValue(1.0),
        setVolume: mockSetVolume,
        pause: jest.fn().mockResolvedValue(undefined),
      };

      const store = useSleepTimerStore.getState();
      store.start(1, fakeEngine as AudioEngine); // 1 minute (60s)

      // Advance 55s -> 5s remaining -> inside 15s fade window
      jest.advanceTimersByTime(55_000);

      expect(useSleepTimerStore.getState().isFading).toBe(true);
      expect(mockSetVolume).toHaveBeenCalled(); // Volume was attenuated

      mockSetVolume.mockClear();

      // User hits "+15 minutes"
      store.extendMinutes(15);

      const extendedState = useSleepTimerStore.getState();
      expect(extendedState.isFading).toBe(false);
      expect(extendedState.remainingSeconds).toBeGreaterThan(60);

      // Volume must be restored immediately to saved initial volume (1.0)
      expect(mockSetVolume).toHaveBeenCalledWith(1.0);
    });
  });

  describe('Rapid Hammering & Interval Cleanup', () => {
    test('rapidly starting and cancelling timer 20 times does not leak interval handles', () => {
      const fakeEngine: Partial<AudioEngine> = {
        getVolume: jest.fn().mockReturnValue(1.0),
        setVolume: jest.fn().mockResolvedValue(undefined),
        pause: jest.fn().mockResolvedValue(undefined),
      };

      const store = useSleepTimerStore.getState();

      for (let i = 0; i < 20; i++) {
        store.start(15, fakeEngine as AudioEngine);
        store.cancel();
      }

      expect(useSleepTimerStore.getState().isActive).toBe(false);

      // Advancing timer does not trigger anything
      jest.advanceTimersByTime(100_000);
      expect(fakeEngine.pause).not.toHaveBeenCalled();
    });
  });

  describe('End-Of-Track Mode Edge Cases', () => {
    test('finishes and pauses when engine signals track transition', () => {
      let trackChangeCallback: ((track: any) => void) | null = null;

      const mockPause = jest.fn().mockResolvedValue(undefined);
      const fakeEngine: Partial<AudioEngine> = {
        getVolume: jest.fn().mockReturnValue(0.9),
        setVolume: jest.fn().mockResolvedValue(undefined),
        pause: mockPause,
        getCurrentTrack: jest.fn().mockReturnValue({ id: 'current_song' }),
        getDuration: jest.fn().mockReturnValue(180_000),
        getPosition: jest.fn().mockReturnValue(100_000),
        getStatus: jest.fn().mockReturnValue('playing'),
        onTrackChange: jest.fn().mockImplementation((cb) => {
          trackChangeCallback = cb;
          return () => {
            trackChangeCallback = null;
          };
        }),
      };

      const store = useSleepTimerStore.getState();
      store.startEndOfTrack(fakeEngine as AudioEngine);

      expect(useSleepTimerStore.getState().isActive).toBe(true);
      expect(useSleepTimerStore.getState().mode).toBe('end_of_track');

      // Track transition event occurs
      const cb = trackChangeCallback as ((track: any) => void) | null;
      cb?.({ id: 'next_song' });

      expect(useSleepTimerStore.getState().isActive).toBe(false);
      expect(mockPause).toHaveBeenCalledTimes(1);
    });
  });
});
