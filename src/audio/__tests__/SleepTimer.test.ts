import {
  useSleepTimerStore,
  calculateCosineFadeVolume,
  SLEEP_TIMER_PRESETS,
} from '../SleepTimer';
import type { AudioEngine } from '../AudioEngine';

describe('SleepTimer', () => {
  let mockEngine: jest.Mocked<AudioEngine>;

  beforeEach(() => {
    jest.useFakeTimers();
    useSleepTimerStore.getState().cancel();

    mockEngine = {
      load: jest.fn().mockResolvedValue(undefined),
      play: jest.fn().mockResolvedValue(undefined),
      pause: jest.fn().mockResolvedValue(undefined),
      seekTo: jest.fn().mockResolvedValue(undefined),
      skipToNext: jest.fn().mockResolvedValue(undefined),
      skipToPrevious: jest.fn().mockResolvedValue(undefined),
      setPlaybackRate: jest.fn().mockResolvedValue(undefined),
      setRepeatMode: jest.fn().mockResolvedValue(undefined),
      setShuffle: jest.fn().mockResolvedValue(undefined),
      setCrossfadeDuration: jest.fn().mockResolvedValue(undefined),
      setVolume: jest.fn().mockResolvedValue(undefined),
      getVolume: jest.fn().mockReturnValue(1.0),
      getStatus: jest.fn().mockReturnValue('playing'),
      getCurrentTrack: jest.fn().mockReturnValue({ id: 'track-1', title: 'Test', artist: 'Artist', durationMs: 180000 }),
      getPosition: jest.fn().mockReturnValue(30000),
      getDuration: jest.fn().mockReturnValue(180000),
      getPlaybackRate: jest.fn().mockReturnValue(1.0),
      getRepeatMode: jest.fn().mockReturnValue('off'),
      isShuffleEnabled: jest.fn().mockReturnValue(false),
      onStatusChange: jest.fn().mockReturnValue(() => {}),
      onTrackChange: jest.fn().mockImplementation((cb) => {
        (mockEngine as any)._triggerTrackChange = cb;
        return () => {};
      }),
      onPositionTick: jest.fn().mockReturnValue(() => {}),
      onError: jest.fn().mockReturnValue(() => {}),
      destroy: jest.fn(),
    } as any;
  });

  afterEach(() => {
    jest.clearAllTimers();
    jest.useRealTimers();
  });

  describe('calculateCosineFadeVolume', () => {
    it('returns 1.0 when remaining time equals or exceeds fade window', () => {
      expect(calculateCosineFadeVolume(15, 15)).toBe(1.0);
      expect(calculateCosineFadeVolume(20, 15)).toBe(1.0);
    });

    it('returns 0.0 when remaining time is zero or negative', () => {
      expect(calculateCosineFadeVolume(0, 15)).toBe(0.0);
      expect(calculateCosineFadeVolume(-2, 15)).toBe(0.0);
    });

    it('returns ~0.707 (equal-power -3dB) at the midpoint of the fade curve', () => {
      const midVolume = calculateCosineFadeVolume(7.5, 15);
      expect(midVolume).toBeCloseTo(Math.cos(Math.PI / 4), 3);
    });

    it('monotonically decreases as remaining seconds approach 0', () => {
      const v15 = calculateCosineFadeVolume(15, 15);
      const v10 = calculateCosineFadeVolume(10, 15);
      const v5 = calculateCosineFadeVolume(5, 15);
      const v1 = calculateCosineFadeVolume(1, 15);
      const v0 = calculateCosineFadeVolume(0, 15);

      expect(v15).toBeGreaterThan(v10);
      expect(v10).toBeGreaterThan(v5);
      expect(v5).toBeGreaterThan(v1);
      expect(v1).toBeGreaterThan(v0);
    });
  });

  describe('Presets', () => {
    it('includes standard sleep presets (15, 30, 45, 60)', () => {
      expect(SLEEP_TIMER_PRESETS).toEqual([15, 30, 45, 60]);
    });
  });

  describe('Timer Lifecycle', () => {
    it('starts with initial state', () => {
      const state = useSleepTimerStore.getState();
      expect(state.isActive).toBe(false);
      expect(state.mode).toBeNull();
      expect(state.remainingSeconds).toBe(0);
    });

    it('starts a timer for specified minutes and ticks down', () => {
      useSleepTimerStore.getState().start(1, mockEngine);

      const state = useSleepTimerStore.getState();
      expect(state.isActive).toBe(true);
      expect(state.mode).toBe('minutes');
      expect(state.remainingSeconds).toBe(60);
      expect(state.isFading).toBe(false);

      // Advance by 10 seconds
      jest.advanceTimersByTime(10000);
      expect(useSleepTimerStore.getState().remainingSeconds).toBe(50);
    });

    it('begins cosine fade when remaining time is <= 15s', () => {
      useSleepTimerStore.getState().start(0.5, mockEngine); // 30 seconds

      // Advance 16 seconds -> 14s remaining (in fade zone)
      jest.advanceTimersByTime(16000);

      const state = useSleepTimerStore.getState();
      expect(state.isFading).toBe(true);
      expect(state.remainingSeconds).toBeLessThanOrEqual(15);
      expect(mockEngine.setVolume).toHaveBeenCalled();
    });

    it('pauses playback and restores volume upon timer expiration', () => {
      useSleepTimerStore.getState().start(0.25, mockEngine); // 15 seconds

      // Advance full 15 seconds
      jest.advanceTimersByTime(16000);

      expect(mockEngine.pause).toHaveBeenCalled();
      expect(mockEngine.setVolume).toHaveBeenCalledWith(1.0); // restored initial volume
      expect(useSleepTimerStore.getState().isActive).toBe(false);
    });

    it('cancels timer and restores volume immediately', () => {
      useSleepTimerStore.getState().start(1, mockEngine);
      expect(useSleepTimerStore.getState().isActive).toBe(true);

      useSleepTimerStore.getState().cancel();

      expect(useSleepTimerStore.getState().isActive).toBe(false);
      expect(mockEngine.setVolume).toHaveBeenCalledWith(1.0);
    });

    it('extends active timer by specified minutes', () => {
      useSleepTimerStore.getState().start(1, mockEngine); // 60 seconds
      jest.advanceTimersByTime(30000); // 30 seconds left

      useSleepTimerStore.getState().extendMinutes(5); // + 300 seconds

      const state = useSleepTimerStore.getState();
      expect(state.remainingSeconds).toBeGreaterThan(320);
      expect(state.isFading).toBe(false);
    });

    it('finishes on end_of_track when track change is emitted', () => {
      useSleepTimerStore.getState().startEndOfTrack(mockEngine);
      expect(useSleepTimerStore.getState().isActive).toBe(true);
      expect(useSleepTimerStore.getState().mode).toBe('end_of_track');

      // Trigger track change callback
      const trackCallback = (mockEngine as any)._triggerTrackChange;
      expect(trackCallback).toBeDefined();

      trackCallback({ id: 'track-2', title: 'Next Song' });

      expect(mockEngine.pause).toHaveBeenCalled();
      expect(useSleepTimerStore.getState().isActive).toBe(false);
    });
  });
});
