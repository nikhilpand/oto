import { ScrobbleManager } from '@/analytics/scrobbling/ScrobbleManager';
import type { Track } from '@/domain/types';

describe('ScrobbleManager — Worst-Case Stress Tests', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  const createTrack = (id: string, durationMs: number): Track => ({
    id,
    title: `Track ${id}`,
    artist: 'Artist',
    artists: ['Artist'],
    album: 'Album',
    durationMs,
    artworkUrl: 'https://art.com/1.jpg',
    thumbhash: '3OcRJYB4d3h/iIeHeEh3eIh4h4iH',
    isExplicit: false,
  });

  test('sub-30s short audio tracks (skits, ringtones) NEVER scrobble even if played to 100%', () => {
    const manager = new ScrobbleManager({ minDurationSeconds: 30 });
    const mockScrobble = jest.fn().mockResolvedValue(true);
    manager.setDispatchers(null, mockScrobble);

    // 25-second audio snippet
    const shortTrack = createTrack('skit_1', 25_000);
    manager.onSongStart(shortTrack);

    // Advance 30 seconds
    jest.advanceTimersByTime(30_000);

    // Track finishes
    manager.onSongStop();

    expect(mockScrobble).not.toHaveBeenCalled();
    expect(manager.getOfflineQueue().length).toBe(0);
  });

  test('rapid skip bombardment: 30 tracks skipped in 15 seconds never trigger scrobbles', () => {
    const manager = new ScrobbleManager();
    const mockScrobble = jest.fn().mockResolvedValue(true);
    manager.setDispatchers(null, mockScrobble);

    for (let i = 0; i < 30; i++) {
      const track = createTrack(`fast_${i}`, 180_000);
      manager.onSongStart(track);
      jest.advanceTimersByTime(500); // 0.5s playback per track
    }

    manager.onSongStop();

    expect(mockScrobble).not.toHaveBeenCalled();
    expect(manager.getOfflineQueue().length).toBe(0);
  });

  test('pausing at 49.5% and skipping to next song does not scrobble incomplete track', () => {
    const manager = new ScrobbleManager({ scrobbleDelayPercent: 0.5 });
    const mockScrobble = jest.fn().mockResolvedValue(true);
    manager.setDispatchers(null, mockScrobble);

    // 200s song. 50% is 100s.
    const track1 = createTrack('song_1', 200_000);
    manager.onSongStart(track1);

    // Play for 99s (49.5%)
    jest.advanceTimersByTime(99_000);
    manager.onSongPause();

    // Skip to track 2
    const track2 = createTrack('song_2', 200_000);
    manager.onPlayerStateChanged(true, track2);

    expect(mockScrobble).not.toHaveBeenCalled();
  });

  test('active accumulation across 5 pause/resume cycles qualifies at cumulative 50%', () => {
    const manager = new ScrobbleManager({ scrobbleDelayPercent: 0.5 });
    const mockScrobble = jest.fn().mockResolvedValue(true);
    manager.setDispatchers(null, mockScrobble);

    // 100s song -> 50s required
    const track = createTrack('segmented_1', 100_000);
    manager.onSongStart(track);

    // 5 chunks of 10s playback separated by 1 hour pauses
    for (let i = 0; i < 4; i++) {
      jest.advanceTimersByTime(10_000);
      manager.onSongPause();
      jest.advanceTimersByTime(3_600_000); // paused for 1 hour
      manager.onSongResume();
    }

    // Currently at 40s active listening. Scrobble should NOT have fired yet.
    expect(mockScrobble).not.toHaveBeenCalled();

    // Play final 10s -> reaches 50s total
    jest.advanceTimersByTime(10_000);

    expect(mockScrobble).toHaveBeenCalledTimes(1);
    expect(mockScrobble).toHaveBeenCalledWith(
      expect.objectContaining({ trackId: 'segmented_1' })
    );
  });

  test('long audio (1-hour podcast/mix) scrobbles at maxDelaySeconds cap (4 min), not 50%', () => {
    const manager = new ScrobbleManager({
      scrobbleDelayPercent: 0.5,
      maxDelaySeconds: 240, // 4 minutes
    });
    const mockScrobble = jest.fn().mockResolvedValue(true);
    manager.setDispatchers(null, mockScrobble);

    // 3,600s track (1 hour)
    const longMix = createTrack('dj_mix', 3_600_000);
    manager.onSongStart(longMix);

    // Advance 239 seconds -> not yet
    jest.advanceTimersByTime(239_000);
    expect(mockScrobble).not.toHaveBeenCalled();

    // Advance 1 more second (reaches 240s = 4 minutes)
    jest.advanceTimersByTime(1_000);
    expect(mockScrobble).toHaveBeenCalledTimes(1);
  });

  test('offline network failure enqueues to offline queue and flushes on connection recovery', async () => {
    const manager = new ScrobbleManager();
    // Dispatcher fails due to network error
    const failingDispatcher = jest.fn().mockRejectedValue(new Error('Network offline'));
    manager.setDispatchers(null, failingDispatcher);

    const track = createTrack('offline_song', 60_000);
    manager.onSongStart(track);

    // Advance past 30s qualification threshold
    jest.advanceTimersByTime(30_000);

    // Allow promise rejection microtask to settle
    await Promise.resolve();
    await Promise.resolve();
    await Promise.resolve();

    expect(manager.getOfflineQueue().length).toBe(1);
    expect(manager.getOfflineQueue()[0]?.payload.trackId).toBe('offline_song');

    // Network restored
    const successDispatcher = jest.fn().mockResolvedValue(true);
    manager.setDispatchers(null, successDispatcher);

    const flushed = await manager.flushOfflineQueue();
    expect(flushed).toBe(1);
    expect(manager.getOfflineQueue().length).toBe(0);
    expect(successDispatcher).toHaveBeenCalledWith(
      expect.objectContaining({ trackId: 'offline_song' })
    );
  });

  test('never scrobbles twice for the same track even if user continues listening to the end', () => {
    const manager = new ScrobbleManager();
    const mockScrobble = jest.fn().mockResolvedValue(true);
    manager.setDispatchers(null, mockScrobble);

    const track = createTrack('full_song', 100_000);
    manager.onSongStart(track);

    // Reach 50s -> fires scrobble #1
    jest.advanceTimersByTime(50_000);
    expect(mockScrobble).toHaveBeenCalledTimes(1);

    // User pauses and resumes multiple times afterwards
    manager.onSongPause();
    jest.advanceTimersByTime(10_000);
    manager.onSongResume();
    jest.advanceTimersByTime(30_000);
    manager.onSongPause();
    manager.onSongResume();
    jest.advanceTimersByTime(10_000); // 100s complete

    // Still exactly 1 scrobble
    expect(mockScrobble).toHaveBeenCalledTimes(1);
  });
});
