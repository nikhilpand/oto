import { ScrobbleManager } from '../ScrobbleManager';
import type { Track } from '@/domain/types';
import type { ScrobbleTrackPayload } from '../ScrobbleTypes';

describe('ScrobbleManager', () => {
  let manager: ScrobbleManager;
  let nowPlayingPayloads: ScrobbleTrackPayload[];
  let scrobblePayloads: ScrobbleTrackPayload[];

  const standardTrack: Track = {
    id: 'track-starboy',
    title: 'Starboy',
    artist: 'The Weeknd',
    artists: ['The Weeknd'],
    album: 'Starboy',
    durationMs: 200000, // 200s (50% = 100s)
    artworkUrl: 'https://example.com/art.jpg',
    thumbhash: 'hash',
    isExplicit: false,
  };

  const shortTrack: Track = {
    id: 'track-short',
    title: 'Intro',
    artist: 'The Weeknd',
    artists: ['The Weeknd'],
    album: 'Starboy',
    durationMs: 20000, // 20s (< 30s min duration)
    artworkUrl: 'https://example.com/art.jpg',
    thumbhash: 'hash',
    isExplicit: false,
  };

  const longSymphony: Track = {
    id: 'track-symphony',
    title: 'Symphony No. 5',
    artist: 'Beethoven',
    artists: ['Beethoven'],
    album: 'Classics',
    durationMs: 600000, // 600s (50% would be 300s, but max delay is 240s)
    artworkUrl: 'https://example.com/art.jpg',
    thumbhash: 'hash',
    isExplicit: false,
  };

  beforeEach(() => {
    jest.useFakeTimers();
    nowPlayingPayloads = [];
    scrobblePayloads = [];

    manager = new ScrobbleManager({
      isEnabled: true,
      scrobbleDelayPercent: 0.5,
      maxDelaySeconds: 240,
      minDurationSeconds: 30,
    });

    manager.setDispatchers(
      async (p) => {
        nowPlayingPayloads.push(p);
        return true;
      },
      async (p) => {
        scrobblePayloads.push(p);
        return true;
      }
    );
  });

  afterEach(() => {
    manager.destroy();
    jest.useRealTimers();
  });

  it('broadcasts Now Playing immediately on song start', () => {
    manager.onSongStart(standardTrack);

    expect(nowPlayingPayloads).toHaveLength(1);
    expect(nowPlayingPayloads[0]?.title).toBe('Starboy');
    expect(scrobblePayloads).toHaveLength(0);
  });

  it('ignores tracks shorter than minSongDuration', () => {
    manager.onSongStart(shortTrack);

    expect(nowPlayingPayloads).toHaveLength(1);

    // Fast-forward past whole duration
    jest.advanceTimersByTime(25000);
    expect(scrobblePayloads).toHaveLength(0);
  });

  it('scrobbles after 50% of track duration has elapsed', () => {
    manager.onSongStart(standardTrack);

    // Advance 50s (not yet qualified)
    jest.advanceTimersByTime(50000);
    expect(scrobblePayloads).toHaveLength(0);

    // Advance another 50s (100s total = 50% of 200s)
    jest.advanceTimersByTime(50000);
    expect(scrobblePayloads).toHaveLength(1);
    expect(scrobblePayloads[0]?.title).toBe('Starboy');
  });

  it('caps qualifying delay at maxDelaySeconds (240s)', () => {
    manager.onSongStart(longSymphony);

    // Advance 239 seconds
    jest.advanceTimersByTime(239000);
    expect(scrobblePayloads).toHaveLength(0);

    // Advance to 240 seconds
    jest.advanceTimersByTime(1000);
    expect(scrobblePayloads).toHaveLength(1);
    expect(scrobblePayloads[0]?.title).toBe('Symphony No. 5');
  });

  it('preserves accumulated time across pause and resume', () => {
    manager.onSongStart(standardTrack);

    // Listen for 40s, then pause
    jest.advanceTimersByTime(40000);
    manager.onSongPause();

    // Remain paused for 30s (timer should NOT advance qualifying playback)
    jest.advanceTimersByTime(30000);
    expect(scrobblePayloads).toHaveLength(0);

    // Resume playback: needs 60s more to reach 100s
    manager.onSongResume();
    jest.advanceTimersByTime(59000);
    expect(scrobblePayloads).toHaveLength(0);

    jest.advanceTimersByTime(1000);
    expect(scrobblePayloads).toHaveLength(1);
  });

  it('queues scrobbles offline if dispatcher fails, and flushes on reconnect', async () => {
    let networkOnline = false;
    manager.setDispatchers(
      async () => true,
      async (p) => {
        if (!networkOnline) return false;
        scrobblePayloads.push(p);
        return true;
      }
    );

    manager.onSongStart(standardTrack);
    jest.advanceTimersByTime(100000);
    await Promise.resolve();

    // Scrobble failed because offline; queued into offline queue
    expect(scrobblePayloads).toHaveLength(0);
    expect(manager.getOfflineQueue()).toHaveLength(1);

    // Connection restored: flush queue
    networkOnline = true;
    const flushed = await manager.flushOfflineQueue();
    expect(flushed).toBe(1);
    expect(scrobblePayloads).toHaveLength(1);
    expect(manager.getOfflineQueue()).toHaveLength(0);
  });
});
