import { FakeAudioEngine } from '@/audio/FakeAudioEngine';
import { interpolatePlayhead } from '@/audio/usePlayheadProgress';
import { usePlaybackStore } from '@/store/usePlaybackStore';
import { useQueueStore } from '@/store/useQueueStore';
import { Track } from '@/domain/types';

const MOCK_TRACK: Track = {
  id: 'track_1',
  title: 'Starboy',
  artist: 'The Weeknd',
  artists: ['The Weeknd', 'Daft Punk'],
  album: 'Starboy',
  durationMs: 230000,
  artworkUrl: 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=800',
  thumbhash: '3PcNNQSXeHiId4eAeHh3eIh4eA==',
  isExplicit: true,
};

const MOCK_TRACK_2: Track = {
  id: 'track_2',
  title: 'Blinding Lights',
  artist: 'The Weeknd',
  artists: ['The Weeknd'],
  album: 'After Hours',
  durationMs: 200000,
  artworkUrl: 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=800',
  thumbhash: '3PcNNQSXeHiId4eAeHh3eIh4eB==',
  isExplicit: false,
};

const MOCK_TRACK_3: Track = {
  id: 'track_3',
  title: 'Save Your Tears',
  artist: 'The Weeknd',
  artists: ['The Weeknd'],
  album: 'After Hours',
  durationMs: 215000,
  artworkUrl: 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=800',
  thumbhash: '3PcNNQSXeHiId4eAeHh3eIh4eC==',
  isExplicit: false,
};

describe('FakeAudioEngine Lifecycle & Control', () => {
  let engine: FakeAudioEngine;

  beforeEach(() => {
    jest.useFakeTimers();
    usePlaybackStore.getState().reset();
    useQueueStore.getState().reset();
    engine = new FakeAudioEngine();
  });

  afterEach(() => {
    engine.destroy();
    jest.useRealTimers();
  });

  async function loadTrack(t = MOCK_TRACK, autoplay = true) {
    const promise = engine.load(t, autoplay);
    jest.advanceTimersByTime(50);
    await promise;
  }

  test('initial state is idle with no track', () => {
    expect(engine.getStatus()).toBe('idle');
    expect(engine.getCurrentTrack()).toBeNull();
  });

  test('load() transitions to loading then playing when autoplay is true', async () => {
    const statusChanges: string[] = [];
    engine.onStatusChange((s) => statusChanges.push(s));

    const loadPromise = engine.load(MOCK_TRACK, true);
    jest.advanceTimersByTime(50); // simulate buffer latency
    await loadPromise;

    expect(statusChanges).toContain('loading');
    expect(statusChanges).toContain('playing');
    expect(engine.getStatus()).toBe('playing');
    expect(engine.getCurrentTrack()).toEqual(MOCK_TRACK);
  });

  test('emits position ticks at ~4Hz during playback', async () => {
    let tickCount = 0;
    let lastPos = 0;
    engine.onPositionTick((posMs) => {
      tickCount++;
      lastPos = posMs;
    });

    await loadTrack(MOCK_TRACK, true);
    jest.advanceTimersByTime(1000); // 1 second = ~4 ticks at 250ms intervals

    expect(tickCount).toBeGreaterThanOrEqual(3);
    expect(lastPos).toBeGreaterThanOrEqual(750);
  });

  test('pause() stops ticking and play() resumes from current position', async () => {
    await loadTrack(MOCK_TRACK, true);
    jest.advanceTimersByTime(500);

    await engine.pause();
    expect(engine.getStatus()).toBe('paused');
    const posAtPause = engine.getPosition();

    jest.advanceTimersByTime(1000);
    expect(engine.getPosition()).toBe(posAtPause); // no advancement while paused

    await engine.play();
    expect(engine.getStatus()).toBe('playing');
    jest.advanceTimersByTime(500);
    expect(engine.getPosition()).toBeGreaterThan(posAtPause);
  });

  test('seekTo() updates position immediately within valid bounds', async () => {
    await loadTrack(MOCK_TRACK, true);
    await engine.seekTo(120000);
    expect(engine.getPosition()).toBe(120000);

    // Negative seek clamps to 0
    await engine.seekTo(-500);
    expect(engine.getPosition()).toBe(0);

    // Beyond duration clamps to duration
    await engine.seekTo(300000);
    expect(engine.getPosition()).toBe(MOCK_TRACK.durationMs);
  });

  test('setRepeatMode() and setPlaybackRate() update parameters', async () => {
    await loadTrack(MOCK_TRACK, true);
    await engine.setRepeatMode('one');
    expect(engine.getRepeatMode()).toBe('one');

    await engine.setPlaybackRate(1.5);
    expect(engine.getPlaybackRate()).toBe(1.5);
  });

  test('auto-advances to next track at duration end using two-tier queue', async () => {
    useQueueStore.getState().playContext([MOCK_TRACK, MOCK_TRACK_2], 0, {
      id: 'test_album',
      title: 'Test Album',
      type: 'album',
    });

    await loadTrack(MOCK_TRACK, true);
    expect(engine.getCurrentTrack()?.id).toBe(MOCK_TRACK.id);

    // Advance timer past full duration
    jest.advanceTimersByTime(MOCK_TRACK.durationMs);
    // Allow load buffer delay
    jest.advanceTimersByTime(100);

    expect(engine.getCurrentTrack()?.id).toBe(MOCK_TRACK_2.id);
  });

  test('skipToPrevious seeks to 0 if playing for >3s, or goes to previous track', async () => {
    useQueueStore.getState().playContext([MOCK_TRACK, MOCK_TRACK_2], 0, {
      id: 'test_album',
      title: 'Test Album',
      type: 'album',
    });

    await loadTrack(MOCK_TRACK, true);

    // 1. If playing > 3000ms: seek to 0 and stay on same track
    await engine.seekTo(5000);
    await engine.skipToPrevious();
    expect(engine.getPosition()).toBe(0);
    expect(engine.getCurrentTrack()?.id).toBe(MOCK_TRACK.id);

    // 2. Advance to second track
    const skipPromise = engine.skipToNext();
    jest.advanceTimersByTime(50);
    await skipPromise;
    expect(engine.getCurrentTrack()?.id).toBe(MOCK_TRACK_2.id);

    // Position is at 0 (< 3000ms), skipping previous goes to track 1
    const prevPromise = engine.skipToPrevious();
    jest.advanceTimersByTime(50);
    await prevPromise;
    expect(engine.getCurrentTrack()?.id).toBe(MOCK_TRACK.id);
  });
});

describe('UI-Thread Playhead Interpolation Math', () => {
  test('interpolates linearly when playing', () => {
    const lastPositionMs = 10000;
    const lastTimestampMs = 1000;
    const nowMs = 1250; // 250ms later
    const rate = 1.0;
    const durationMs = 200000;

    const interpolated = interpolatePlayhead(
      lastPositionMs,
      lastTimestampMs,
      nowMs,
      rate,
      durationMs,
      true
    );

    expect(interpolated).toBe(10250);
  });

  test('respects playbackRate factor during interpolation', () => {
    const lastPositionMs = 10000;
    const lastTimestampMs = 1000;
    const nowMs = 1500; // 500ms elapsed
    const rate = 2.0; // 2x speed
    const durationMs = 200000;

    const interpolated = interpolatePlayhead(
      lastPositionMs,
      lastTimestampMs,
      nowMs,
      rate,
      durationMs,
      true
    );

    // 10000 + 500 * 2.0 = 11000
    expect(interpolated).toBe(11000);
  });

  test('stays frozen at lastPositionMs when paused', () => {
    const lastPositionMs = 54000;
    const lastTimestampMs = 1000;
    const nowMs = 5000; // 4000ms later while paused
    const rate = 1.0;
    const durationMs = 200000;

    const interpolated = interpolatePlayhead(
      lastPositionMs,
      lastTimestampMs,
      nowMs,
      rate,
      durationMs,
      false
    );

    expect(interpolated).toBe(54000);
  });

  test('clamps at track duration to prevent overshoot', () => {
    const lastPositionMs = 199900;
    const lastTimestampMs = 1000;
    const nowMs = 2000; // 1000ms elapsed
    const rate = 1.0;
    const durationMs = 200000;

    const interpolated = interpolatePlayhead(
      lastPositionMs,
      lastTimestampMs,
      nowMs,
      rate,
      durationMs,
      true
    );

    expect(interpolated).toBe(200000);
  });
});

describe('Zustand Playback Store Architecture', () => {
  beforeEach(() => {
    usePlaybackStore.getState().reset();
    useQueueStore.getState().reset();
  });

  test('stores discrete playback state and updates accurately', () => {
    const store = usePlaybackStore.getState();
    expect(store.currentTrack).toBeNull();
    expect(store.status).toBe('idle');
    expect(store.isPlaying).toBe(false);

    store.setTrack(MOCK_TRACK);
    store.setStatus('playing');
    store.setPlaying(true);

    const updated = usePlaybackStore.getState();
    expect(updated.currentTrack).toEqual(MOCK_TRACK);
    expect(updated.status).toBe('playing');
    expect(updated.isPlaying).toBe(true);
  });

  test('manages track queue and index progression', () => {
    const store = usePlaybackStore.getState();
    store.setQueue([MOCK_TRACK, MOCK_TRACK_2], 0);

    expect(usePlaybackStore.getState().currentTrack).toEqual(MOCK_TRACK);

    store.nextTrack();
    expect(usePlaybackStore.getState().currentTrack).toEqual(MOCK_TRACK_2);

    store.prevTrack();
    expect(usePlaybackStore.getState().currentTrack).toEqual(MOCK_TRACK);
  });

  test('two-tier priority queue invariant: Play Next preempts standard tracks', () => {
    const store = usePlaybackStore.getState();
    // Context queue: track 1, track 2
    store.setQueue([MOCK_TRACK, MOCK_TRACK_2], 0);

    // User enqueues track 3 with "Play Next"
    useQueueStore.getState().playNext(MOCK_TRACK_3);

    // Next track must be track 3 (priority tier), NOT track 2!
    const next1 = store.nextTrack();
    expect(next1?.id).toBe(MOCK_TRACK_3.id);

    // Next track after priority queue exhausts must return to standard track 2
    const next2 = store.nextTrack();
    expect(next2?.id).toBe(MOCK_TRACK_2.id);
  });

  test('GUARANTEE: store has NO continuous playhead position field', () => {
    const state = usePlaybackStore.getState() as any;
    // Architectural rule: playhead ticks MUST NEVER enter React state/Zustand store!
    expect(state.position).toBeUndefined();
    expect(state.positionMs).toBeUndefined();
    expect(state.currentPosition).toBeUndefined();
    expect(state.progress).toBeUndefined();
  });
});
