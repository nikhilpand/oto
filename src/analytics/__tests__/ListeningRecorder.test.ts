import {
  ListeningRecorder,
  StorageBackend,
  MAX_STEP_MS,
} from '../ListeningRecorder';
import type { Track } from '@/domain/types';

class MockStorage implements StorageBackend {
  public map = new Map<string, string>();
  getString(key: string): string | undefined {
    return this.map.get(key);
  }
  set(key: string, value: string): void {
    this.map.set(key, value);
  }
  delete(key: string): void {
    this.map.delete(key);
  }
}

describe('ListeningRecorder', () => {
  let storage: MockStorage;

  const sampleTrackA: Track = {
    id: 'track-a',
    title: 'Song Alpha',
    artist: 'Artist One',
    artists: ['Artist One'],
    album: 'Album One',
    artworkUrl: 'https://example.com/a.jpg',
    thumbhash: 'hash-a',
    isExplicit: false,
    durationMs: 180000, // 3 minutes
  };

  const sampleTrackB: Track = {
    id: 'track-b',
    title: 'Song Beta',
    artist: 'Artist Two',
    artists: ['Artist Two'],
    album: 'Album Two',
    artworkUrl: 'https://example.com/b.jpg',
    thumbhash: 'hash-b',
    isExplicit: false,
    durationMs: 200000,
  };

  const shortTrack: Track = {
    id: 'track-short',
    title: 'Intro Interlude',
    artist: 'Artist One',
    artists: ['Artist One'],
    album: 'Album One',
    artworkUrl: 'https://example.com/short.jpg',
    thumbhash: 'hash-short',
    isExplicit: false,
    durationMs: 20000, // 20 seconds
  };

  beforeEach(() => {
    storage = new MockStorage();
    ListeningRecorder.setBackendForTesting(storage);
    ListeningRecorder.clearAllStats();
  });

  describe('Qualification Gate & Skips', () => {
    it('does NOT count a track skipped in under 30 seconds', () => {
      let t = 1700000000000;
      // Start track A
      ListeningRecorder.onSample(sampleTrackA, true, t);

      // Play for 15 seconds (below 30s floor)
      for (let i = 0; i < 15; i++) {
        t += 1000;
        ListeningRecorder.onSample(sampleTrackA, true, t);
      }

      // Track stopped/skipped
      ListeningRecorder.onStopped(t);

      const ym = ListeningRecorder.getYearMonth(t);
      const partition = ListeningRecorder.getMonthlyPartition(ym);
      expect(partition.totalPlays).toBe(0);
      expect(partition.tracks['track-a']?.playCount ?? 0).toBe(0);
      expect(ListeningRecorder.getContinueListening()).toHaveLength(0);
    });

    it('counts a track as verified play once it reaches 30 seconds', () => {
      let t = 1700000000000;
      ListeningRecorder.onSample(sampleTrackA, true, t);

      // Advance by 31 seconds in 1s increments
      for (let i = 0; i < 31; i++) {
        t += 1000;
        ListeningRecorder.onSample(sampleTrackA, true, t);
      }

      ListeningRecorder.onStopped(t);

      const ym = ListeningRecorder.getYearMonth(t);
      const partition = ListeningRecorder.getMonthlyPartition(ym);
      expect(partition.totalPlays).toBe(1);
      expect(partition.tracks['track-a']?.playCount).toBe(1);
      expect(partition.tracks['track-a']?.totalListeningMs).toBeGreaterThanOrEqual(30000);

      const continueList = ListeningRecorder.getContinueListening();
      expect(continueList).toHaveLength(1);
      expect(continueList[0]?.id).toBe('track-a');
    });

    it('qualifies short tracks (duration < 30s) if played >= 50% of duration', () => {
      let t = 1700000000000;
      ListeningRecorder.onSample(shortTrack, true, t);

      // 20s track: 11 seconds is > 50%
      for (let i = 0; i < 11; i++) {
        t += 1000;
        ListeningRecorder.onSample(shortTrack, true, t);
      }

      ListeningRecorder.onStopped(t);

      const ym = ListeningRecorder.getYearMonth(t);
      const partition = ListeningRecorder.getMonthlyPartition(ym);
      expect(partition.totalPlays).toBe(1);
      expect(partition.tracks['track-short']?.playCount).toBe(1);
    });

    it('caps large delta jumps to MAX_STEP_MS during seek or stall', () => {
      let t = 1700000000000;
      ListeningRecorder.onSample(sampleTrackA, true, t);

      // Single jump of 60 seconds (e.g. background sleep or seek)
      t += 60000;
      ListeningRecorder.onSample(sampleTrackA, true, t);

      // Should only have accumulated MAX_STEP_MS (3000ms), NOT 60,000ms!
      ListeningRecorder.onStopped(t);

      const ym = ListeningRecorder.getYearMonth(t);
      const partition = ListeningRecorder.getMonthlyPartition(ym);
      expect(partition.totalPlays).toBe(0); // Not qualified as play yet
      expect(partition.tracks['track-a']?.totalListeningMs).toBe(MAX_STEP_MS);
    });
  });

  describe('Track Transitions & Aggregates', () => {
    it('seamlessly transitions from track A to track B when track changes', () => {
      let t = 1700000000000;
      ListeningRecorder.onSample(sampleTrackA, true, t);

      // Play Track A for 35 seconds
      for (let i = 0; i < 35; i++) {
        t += 1000;
        ListeningRecorder.onSample(sampleTrackA, true, t);
      }

      // Immediate transition to Track B
      ListeningRecorder.onSample(sampleTrackB, true, t);

      // Play Track B for 35 seconds
      for (let i = 0; i < 35; i++) {
        t += 1000;
        ListeningRecorder.onSample(sampleTrackB, true, t);
      }

      ListeningRecorder.onStopped(t);

      const ym = ListeningRecorder.getYearMonth(t);
      const partition = ListeningRecorder.getMonthlyPartition(ym);
      expect(partition.totalPlays).toBe(2);
      expect(partition.tracks['track-a']?.playCount).toBe(1);
      expect(partition.tracks['track-b']?.playCount).toBe(1);

      const recents = ListeningRecorder.getContinueListening();
      expect(recents).toHaveLength(2);
      expect(recents[0]?.id).toBe('track-b'); // most recent
      expect(recents[1]?.id).toBe('track-a');
    });

    it('ranks top tracks and summarizes monthly listening stats accurately', () => {
      let t = 1700000000000;

      // Play Track A twice
      for (let cycle = 0; cycle < 2; cycle++) {
        ListeningRecorder.onSample(sampleTrackA, true, t);
        for (let i = 0; i < 35; i++) {
          t += 1000;
          ListeningRecorder.onSample(sampleTrackA, true, t);
        }
        ListeningRecorder.onStopped(t);
      }

      // Play Track B once
      ListeningRecorder.onSample(sampleTrackB, true, t);
      for (let i = 0; i < 35; i++) {
        t += 1000;
        ListeningRecorder.onSample(sampleTrackB, true, t);
      }
      ListeningRecorder.onStopped(t);

      const ym = ListeningRecorder.getYearMonth(t);
      const top = ListeningRecorder.getTopTracks(ym, 5);
      expect(top[0]?.trackId).toBe('track-a');
      expect(top[0]?.playCount).toBe(2);
      expect(top[1]?.trackId).toBe('track-b');
      expect(top[1]?.playCount).toBe(1);

      const summary = ListeningRecorder.getMonthlySummary(ym);
      expect(summary.totalPlays).toBe(3);
      expect(summary.uniqueTrackCount).toBe(2);
      expect(summary.topArtist).toBe('Artist One');
    });
  });
});
