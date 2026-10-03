import { RecommendationEngine, HomeCandidateShelf } from '../RecommendationEngine';

describe('RecommendationEngine', () => {
  it('executes 4-stage waterfall for Quick Picks strictly excluding history and queue IDs', () => {
    const excludeIds = new Set(['song_excluded_1', 'song_excluded_2']);

    const shelves: HomeCandidateShelf[] = [
      {
        title: 'Listen again',
        tracks: [{ id: 'song_excluded_1', title: 'Old Track' }],
      },
      {
        title: 'Quick picks for you',
        tracks: [
          { id: 'song_excluded_2', title: 'Queued Track' },
          { id: 'rec_1', title: 'New Discovery 1' },
          { id: 'rec_2', title: 'New Discovery 2' },
        ],
      },
    ];

    // Stage 1 match on "Quick picks"
    const picks = RecommendationEngine.quickPicks(shelves, excludeIds);
    expect(picks.map((p) => p.id)).toEqual(['rec_1', 'rec_2']);
  });

  it('falls back to Stage 2 candidate shelves when direct shelf is missing', () => {
    const excludeIds = new Set(['playing_now']);
    const shelves: HomeCandidateShelf[] = [
      { title: 'Recents', tracks: [{ id: 'playing_now', title: 'Playing' }] },
      { title: 'Chill Vibes', tracks: [{ id: 'chill_1', title: 'Chill Song' }] },
    ];

    const picks = RecommendationEngine.quickPicks(shelves, excludeIds);
    expect(picks.map((p) => p.id)).toEqual(['chill_1']);
  });

  it('generates RDAMVM radio payload and extracts continuous autoplay queue', () => {
    const seedTrackId = 'seed_xyz_123';
    const payload = RecommendationEngine.buildRadioPayload(seedTrackId);

    expect(payload.videoId).toBe('seed_xyz_123');
    expect(payload.playlistId).toBe('RDAMVMseed_xyz_123');
    expect(payload.isAudioOnly).toBe(true);

    // Watch queue response parser: strips the seed track at index 0
    const rawQueue = [
      { videoId: 'seed_xyz_123', title: 'Seed Song' },
      { videoId: 'radio_1', title: 'Radio Track 1' },
      { videoId: 'radio_2', title: 'Radio Track 2' },
    ];

    const autoplayTracks = RecommendationEngine.parseRadioQueue(rawQueue, seedTrackId);
    expect(autoplayTracks).toHaveLength(2);
    expect(autoplayTracks[0]?.videoId).toBe('radio_1');
    expect(autoplayTracks[1]?.videoId).toBe('radio_2');
  });
});
