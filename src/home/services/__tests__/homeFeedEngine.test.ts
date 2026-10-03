import {
  HomeFeedEngine,
  RawShelf,
  RawItem,
} from '../homeFeedEngine';

describe('HomeFeedEngine', () => {
  it('replaces stale Listen Again with deduplicated Recents history at index 0', () => {
    const coreShelves: RawShelf[] = [
      {
        title: 'Listen again',
        items: [
          { videoId: 'old1', title: 'Old Song 1', subtitle: 'Artist 1' },
          { videoId: 'old2', title: 'Old Song 2', subtitle: 'Artist 2' },
        ],
      },
      {
        title: 'Mixed for you',
        items: [{ videoId: 'mix1', title: 'Mix Song 1', subtitle: 'Artist 3' }],
      },
    ];

    const rawHistory: RawItem[] = [
      { videoId: 'rec1', title: 'Recent Song 1', subtitle: 'Artist 4' },
      { videoId: 'rec1', title: 'Recent Song 1 Dup', subtitle: 'Artist 4' },
      { videoId: 'rec2', title: 'Recent Song 2', subtitle: 'Artist 5' },
    ];

    const result = HomeFeedEngine.assembleHomeFeed({
      coreShelves,
      historyItems: rawHistory,
      supplementShelves: [],
      recentLimit: 20,
    });

    expect(result.shelves[0]?.title).toBe('Recents');
    expect(result.shelves[0]?.items).toHaveLength(2);
    expect(result.shelves[0]?.items[0]?.videoId).toBe('rec1');
    expect(result.shelves[0]?.items[1]?.videoId).toBe('rec2');
    // Ensure stale "Listen again" shelf was purged
    const listenAgain = result.shelves.find((s) => s.title.toLowerCase() === 'listen again');
    expect(listenAgain).toBeUndefined();
  });

  it('filters out video compilations and non-music video items', () => {
    const rawShelves: RawShelf[] = [
      {
        title: 'Daily Top Music Videos',
        items: [{ videoId: 'v1', title: 'Video 1', subtitle: 'Artist 1' }],
      },
      {
        title: 'Trending Charts',
        items: [
          { videoId: 't1', title: 'Track 1', subtitle: 'Artist 1', isVideo: false },
          { videoId: 'v2', title: 'Video Upload 2', subtitle: 'Artist 2', isVideo: true },
        ],
      },
    ];

    const cleaned = HomeFeedEngine.filterVideoShelves(rawShelves);
    expect(cleaned).toHaveLength(1);
    expect(cleaned[0]?.title).toBe('Trending Charts');
    expect(cleaned[0]?.items).toHaveLength(1);
    expect(cleaned[0]?.items[0]?.videoId).toBe('t1');
  });

  it('detects looping continuation tokens to prevent infinite scroll hangs', () => {
    const tracker = new HomeFeedEngine.ContinuationTracker();
    tracker.recordShelfTitles(['Quick Picks', 'Made For You']);
    
    // Page with new shelves
    expect(tracker.shouldContinue(['Mood Mixes'], 'token_1')).toBe(true);
    tracker.recordShelfTitles(['Mood Mixes']);

    // Page with duplicate/looped shelves
    expect(tracker.shouldContinue(['Quick Picks', 'Mood Mixes'], 'token_2')).toBe(false);
  });
});
