# BitChord Algorithms Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement BitChord's reverse-engineered algorithms for Home feed parallel fan-out, privacy-preserving two-phase search with multi-source federation, album-to-playlist expansion with ownership detection, and 4-stage waterfall recommendations with radio autoplay in TypeScript for the OTO music app.

**Architecture:** A clean-room TypeScript service layer adhering to the AudioEngine and domain contracts: `HomeFeedEngine` coordinates parallel shelf fetching and recents injection; `FederatedSearchEngine` executes privacy-isolated typeahead, protobuf-filtered searches, and source-priority ranking; `PlaylistEngine` handles `MPREb` album expansion and 3-stage ownership heuristics; `RecommendationEngine` provides the 4-stage waterfall `quickPicks` and `RDAMVM` watch queue radio autoplay.

**Tech Stack:** TypeScript (strict), React Native / Expo, Zod domain validation, Jest for unit testing.

**Spec:** [`BITCHORD_RE/`](file:///c:/Users/nikhil/Desktop/projects/music-mobile/BITCHORD_RE/) and BitChord reverse-engineering source analysis (`YtMusicRepository.kt`, `Innertube.kt`, `InnertubeParser.kt`, `MainViewModel.kt`).

## Global Constraints
- Clean-room implementation: Zero copying of GPL/AGPL source code tokens. Re-architect algorithms cleanly in TypeScript.
- TypeScript Strict: No `any` without explicit typing or comment.
- No UI-thread blocking: All parsing and transformations must run async with strict bounds.
- Full test coverage with zero regressions: All 429+ existing unit tests must continue to pass.

---

### Task 1: Home Feed Engine (Parallel Fan-out, Recents Fix & Video Scrubbing)

**Files:**
- Create: `src/home/services/homeFeedEngine.ts`
- Create: `src/home/services/__tests__/homeFeedEngine.test.ts`

**Interfaces:**
- Consumes: `RawShelf`, `RawItem`, `HomeAssemblyParams`.
- Produces: `HomeFeedEngine` with `assembleHomeFeed`, `filterVideoShelves`, `ContinuationTracker`.

- [ ] **Step 1: Write the failing tests for Home Feed Engine**

Create `src/home/services/__tests__/homeFeedEngine.test.ts`:
```typescript
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

    expect(result.shelves[0].title).toBe('Recents');
    expect(result.shelves[0].items).toHaveLength(2);
    expect(result.shelves[0].items[0].videoId).toBe('rec1');
    expect(result.shelves[0].items[1].videoId).toBe('rec2');
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
    expect(cleaned[0].title).toBe('Trending Charts');
    expect(cleaned[0].items).toHaveLength(1);
    expect(cleaned[0].items[0].videoId).toBe('t1');
  });

  it('detects looping continuation tokens to prevent infinite scroll hangs', () => {
    const tracker = new HomeFeedEngine.ContinuationTracker();
    tracker.recordShelfTitles(['Quick Picks', 'Made For You']);
    
    expect(tracker.shouldContinue(['Mood Mixes'], 'token_1')).toBe(true);
    tracker.recordShelfTitles(['Mood Mixes']);

    expect(tracker.shouldContinue(['Quick Picks', 'Mood Mixes'], 'token_2')).toBe(false);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx jest src/home/services/__tests__/homeFeedEngine.test.ts`
Expected: FAIL (Cannot find module `../homeFeedEngine`)

- [ ] **Step 3: Implement HomeFeedEngine**

Create `src/home/services/homeFeedEngine.ts`:
```typescript
export interface RawItem {
  videoId?: string;
  browseId?: string;
  title: string;
  subtitle: string;
  thumbnailUrl?: string;
  isVideo?: boolean;
}

export interface RawShelf {
  title: string;
  subtitle?: string;
  items: RawItem[];
}

export interface HomeAssemblyParams {
  coreShelves: RawShelf[];
  historyItems?: RawItem[];
  supplementShelves?: RawShelf[];
  recentLimit?: number;
}

export interface AssembledFeed {
  shelves: RawShelf[];
}

const VIDEO_WORD_REGEX = /\b(video|videos)\b/i;

export class HomeFeedEngine {
  static filterVideoShelves(shelves: RawShelf[]): RawShelf[] {
    return shelves
      .filter((shelf) => !VIDEO_WORD_REGEX.test(shelf.title))
      .map((shelf) => ({
        ...shelf,
        items: shelf.items.filter((item) => !item.isVideo),
      }))
      .filter((shelf) => shelf.items.length > 0);
  }

  static assembleHomeFeed(params: HomeAssemblyParams): AssembledFeed {
    const recentLimit = params.recentLimit ?? 20;
    const cleanCore = this.filterVideoShelves(params.coreShelves);
    const cleanSupplements = this.filterVideoShelves(params.supplementShelves ?? []);

    let shelves = [...cleanCore, ...cleanSupplements];

    if (params.historyItems && params.historyItems.length > 0) {
      const seen = new Set<string>();
      const dedupedHistory: RawItem[] = [];

      for (const item of params.historyItems) {
        if (item.videoId && !seen.has(item.videoId)) {
          seen.add(item.videoId);
          dedupedHistory.push(item);
          if (dedupedHistory.length >= recentLimit) break;
        }
      }

      if (dedupedHistory.length > 0) {
        const recentsShelf: RawShelf = {
          title: 'Recents',
          subtitle: 'Recently played',
          items: dedupedHistory,
        };

        shelves = shelves.filter((s) => {
          const lower = s.title.toLowerCase();
          return lower !== 'listen again' && lower !== 'recents' && lower !== 'recently played';
        });

        shelves.unshift(recentsShelf);
      }
    }

    return { shelves };
  }

  static ContinuationTracker = class {
    private seenTitles = new Set<string>();

    recordShelfTitles(titles: string[]): void {
      for (const title of titles) {
        this.seenTitles.add(title.toLowerCase().trim());
      }
    }

    shouldContinue(newTitles: string[], token: string | null | undefined): boolean {
      if (!token) return false;
      return newTitles.some((title) => !this.seenTitles.has(title.toLowerCase().trim()));
    }
  };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx jest src/home/services/__tests__/homeFeedEngine.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/home/services/homeFeedEngine.ts src/home/services/__tests__/homeFeedEngine.test.ts
git commit -m "feat(home): add BitChord-style parallel feed engine and recents replacement"
```

---

### Task 2: Search Engine (Two-Phase Live Typeahead, Privacy Cookie Stripping & Protobuf Filters)

**Files:**
- Create: `src/search/services/federatedSearchEngine.ts`
- Create: `src/search/services/__tests__/federatedSearchEngine.test.ts`

**Interfaces:**
- Consumes: `SearchFilterType`, `RawSearchHit`.
- Produces: `FederatedSearchEngine` with `prepareTypeaheadRequest`, `prepareConfirmedSearchRequest`, `assembleSearchResults`.

- [ ] **Step 1: Write the failing tests for FederatedSearchEngine**

Create `src/search/services/__tests__/federatedSearchEngine.test.ts`:
```typescript
import {
  FederatedSearchEngine,
  SearchFilterType,
  SEARCH_PROTOBUF_PARAMS,
  RawSearchHit,
} from '../federatedSearchEngine';

describe('FederatedSearchEngine', () => {
  it('maps all SearchFilter types to exact BitChord protobuf base64 strings', () => {
    expect(SEARCH_PROTOBUF_PARAMS[SearchFilterType.ALL]).toBeNull();
    expect(SEARCH_PROTOBUF_PARAMS[SearchFilterType.SONGS]).toBe('EgWKAQIIAWoKEAkQChAFEAMQBA==');
    expect(SEARCH_PROTOBUF_PARAMS[SearchFilterType.VIDEOS]).toBe('EgWKAQIQAWoKEAkQChAFEAMQBA==');
    expect(SEARCH_PROTOBUF_PARAMS[SearchFilterType.ALBUMS]).toBe('EgWKAQIYAWoKEAkQChAFEAMQBA==');
    expect(SEARCH_PROTOBUF_PARAMS[SearchFilterType.ARTISTS]).toBe('EgWKAQIgAWoKEAkQChAFEAMQBA==');
    expect(SEARCH_PROTOBUF_PARAMS[SearchFilterType.PLAYLISTS]).toBe('EgWKAQIoAWoKEAkQChAFEAMQBA==');
  });

  it('prepares typeahead request with cookies explicitly stripped for privacy', () => {
    const userCookie = 'SAPISID=abcd1234; HSID=xyz9876';
    const req = FederatedSearchEngine.prepareTypeaheadRequest({
      query: 'coldplay',
      userCookie,
    });

    expect(req.headers['Cookie']).toBeUndefined();
    expect(req.isAnonymous).toBe(true);
    expect(req.body.query).toBe('coldplay');
  });

  it('prepares confirmed search request with user auth headers intact', () => {
    const userCookie = 'SAPISID=abcd1234; HSID=xyz9876';
    const req = FederatedSearchEngine.prepareConfirmedSearchRequest({
      query: 'coldplay',
      filter: SearchFilterType.SONGS,
      userCookie,
    });

    expect(req.headers['Cookie']).toBe(userCookie);
    expect(req.isAnonymous).toBe(false);
    expect(req.body.params).toBe('EgWKAQIIAWoKEAkQChAFEAMQBA==');
  });

  it('promotes musicCardShelfRenderer to TopTrack and deduplicates rows', () => {
    const topCard: RawSearchHit = {
      kind: 'card_shelf',
      videoId: 'top_1',
      title: 'Yellow',
      artist: 'Coldplay',
      isVideo: false,
    };

    const regularRows: RawSearchHit[] = [
      { kind: 'row', videoId: 'top_1', title: 'Yellow', artist: 'Coldplay' },
      { kind: 'row', videoId: 'song_2', title: 'Fix You', artist: 'Coldplay' },
      { kind: 'browse', browseId: 'b_coldplay', title: 'Coldplay', subtitle: 'Artist' },
      { kind: 'browse', browseId: 'b_coldplay', title: 'Coldplay Dup', subtitle: 'Artist' },
    ];

    const results = FederatedSearchEngine.assembleSearchResults({
      topCard,
      rows: regularRows,
      filter: SearchFilterType.ALL,
    });

    expect(results.topResult?.videoId).toBe('top_1');
    expect(results.tracks.filter((t) => t.videoId === 'top_1')).toHaveLength(0);
    expect(results.tracks).toHaveLength(1);
    expect(results.tracks[0].videoId).toBe('song_2');
    expect(results.browseItems).toHaveLength(1);
    expect(results.browseItems[0].browseId).toBe('b_coldplay');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx jest src/search/services/__tests__/federatedSearchEngine.test.ts`
Expected: FAIL (Cannot find module `../federatedSearchEngine`)

- [ ] **Step 3: Implement FederatedSearchEngine**

Create `src/search/services/federatedSearchEngine.ts`:
```typescript
export enum SearchFilterType {
  ALL = 'ALL',
  SONGS = 'SONGS',
  VIDEOS = 'VIDEOS',
  ALBUMS = 'ALBUMS',
  ARTISTS = 'ARTISTS',
  PLAYLISTS = 'PLAYLISTS',
}

export const SEARCH_PROTOBUF_PARAMS: Record<SearchFilterType, string | null> = {
  [SearchFilterType.ALL]: null,
  [SearchFilterType.SONGS]: 'EgWKAQIIAWoKEAkQChAFEAMQBA==',
  [SearchFilterType.VIDEOS]: 'EgWKAQIQAWoKEAkQChAFEAMQBA==',
  [SearchFilterType.ALBUMS]: 'EgWKAQIYAWoKEAkQChAFEAMQBA==',
  [SearchFilterType.ARTISTS]: 'EgWKAQIgAWoKEAkQChAFEAMQBA==',
  [SearchFilterType.PLAYLISTS]: 'EgWKAQIoAWoKEAkQChAFEAMQBA==',
};

export interface RawSearchHit {
  kind: 'card_shelf' | 'row' | 'browse';
  videoId?: string;
  browseId?: string;
  title: string;
  artist?: string;
  subtitle?: string;
  thumbnailUrl?: string;
  isVideo?: boolean;
}

export interface PreparedRequest {
  url: string;
  headers: Record<string, string>;
  body: {
    query: string;
    params?: string;
  };
  isAnonymous: boolean;
}

export interface AssembledSearchResults {
  topResult: RawSearchHit | null;
  tracks: RawSearchHit[];
  browseItems: RawSearchHit[];
}

export class FederatedSearchEngine {
  static prepareTypeaheadRequest(params: {
    query: string;
    userCookie?: string;
  }): PreparedRequest {
    return {
      url: 'https://music.youtube.com/youtubei/v1/search',
      headers: {
        'Content-Type': 'application/json',
      },
      body: {
        query: params.query,
      },
      isAnonymous: true,
    };
  }

  static prepareConfirmedSearchRequest(params: {
    query: string;
    filter: SearchFilterType;
    userCookie?: string;
  }): PreparedRequest {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    if (params.userCookie) {
      headers['Cookie'] = params.userCookie;
    }

    const protoParam = SEARCH_PROTOBUF_PARAMS[params.filter];
    return {
      url: 'https://music.youtube.com/youtubei/v1/search',
      headers,
      body: {
        query: params.query,
        ...(protoParam ? { params: protoParam } : {}),
      },
      isAnonymous: !params.userCookie,
    };
  }

  static assembleSearchResults(params: {
    topCard: RawSearchHit | null;
    rows: RawSearchHit[];
    filter: SearchFilterType;
  }): AssembledSearchResults {
    const seen = new Set<string>();
    let topResult: RawSearchHit | null = null;

    if (params.topCard && params.topCard.videoId && !params.topCard.isVideo) {
      topResult = params.topCard;
      seen.add(`v:${params.topCard.videoId}`);
    }

    const tracks: RawSearchHit[] = [];
    const browseItems: RawSearchHit[] = [];

    for (const row of params.rows) {
      if (row.browseId) {
        const key = `b:${row.browseId}`;
        if (!seen.has(key)) {
          seen.add(key);
          browseItems.push(row);
        }
      } else if (row.videoId) {
        const key = `v:${row.videoId}`;
        if (!seen.has(key) && !row.isVideo) {
          seen.add(key);
          tracks.push(row);
        }
      }
    }

    return { topResult, tracks, browseItems };
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx jest src/search/services/__tests__/federatedSearchEngine.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/search/services/federatedSearchEngine.ts src/search/services/__tests__/federatedSearchEngine.test.ts
git commit -m "feat(search): implement BitChord two-phase search, cookie stripping and protobuf filters"
```

---

### Task 3: Multi-Source Search Federation & Stream URL Pre-warming

**Files:**
- Create: `src/search/services/searchFederator.ts`
- Create: `src/search/services/__tests__/searchFederator.test.ts`

**Interfaces:**
- Consumes: `SourceSearchProvider`, `Track`.
- Produces: `SearchFederator.federate`, `SearchFederator.prewarmTopResult`.

- [ ] **Step 1: Write the failing tests for SearchFederator**

Create `src/search/services/__tests__/searchFederator.test.ts`:
```typescript
import { SearchFederator, SourceSearchProvider } from '../searchFederator';
import { Track } from '@/domain/types';

describe('SearchFederator', () => {
  it('federates searches and orders higher-ranked external sources above YouTube', async () => {
    const mockTrack = (id: string, title: string): Track => ({
      id,
      title,
      artist: 'Artist',
      album: 'Album',
      durationMs: 180000,
      artworkUri: 'https://art',
      source: 'jiosaavn',
    });

    const jioSaavnProvider: SourceSearchProvider = {
      id: 'jiosaavn',
      rank: 1,
      search: jest.fn().mockResolvedValue([mockTrack('js1', 'JioSaavn Hit')]),
    };

    const navidromeProvider: SourceSearchProvider = {
      id: 'navidrome',
      rank: 3,
      search: jest.fn().mockResolvedValue([mockTrack('navi1', 'Self-hosted Track')]),
    };

    const youtubeTracks = [mockTrack('yt1', 'YouTube Track')];

    const results = await SearchFederator.federate({
      query: 'test query',
      youtubeRank: 2,
      youtubeTracks,
      externalSources: [jioSaavnProvider, navidromeProvider],
      timeoutMs: 1000,
    });

    expect(results.map((t) => t.id)).toEqual(['js1', 'yt1', 'navi1']);
  });

  it('gracefully handles slow external sources via strict timeout', async () => {
    const hangingProvider: SourceSearchProvider = {
      id: 'hanging',
      rank: 1,
      search: () => new Promise((resolve) => setTimeout(resolve, 5000)),
    };

    const youtubeTracks: Track[] = [{
      id: 'yt1',
      title: 'YouTube Track',
      artist: 'Artist',
      album: 'Album',
      durationMs: 180000,
      artworkUri: 'https://art',
      source: 'youtube',
    }];

    const start = Date.now();
    const results = await SearchFederator.federate({
      query: 'fast',
      youtubeRank: 2,
      youtubeTracks,
      externalSources: [hangingProvider],
      timeoutMs: 50,
    });
    const elapsed = Date.now() - start;

    expect(elapsed).toBeLessThan(500);
    expect(results).toHaveLength(1);
    expect(results[0].id).toBe('yt1');
  });

  it('pre-warms the stream URL for the top result without blocking', async () => {
    const resolver = jest.fn().mockResolvedValue('https://stream.audio/320k');
    const warmed = SearchFederator.prewarmTopResult('js1', resolver);

    expect(resolver).toHaveBeenCalledWith('js1');
    await expect(warmed).resolves.toBe('https://stream.audio/320k');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx jest src/search/services/__tests__/searchFederator.test.ts`
Expected: FAIL (Cannot find module `../searchFederator`)

- [ ] **Step 3: Implement SearchFederator**

Create `src/search/services/searchFederator.ts`:
```typescript
import { Track } from '@/domain/types';

export interface SourceSearchProvider {
  id: string;
  rank: number;
  search(query: string, limit?: number): Promise<Track[]>;
}

export interface FederationParams {
  query: string;
  youtubeRank: number;
  youtubeTracks: Track[];
  externalSources: SourceSearchProvider[];
  timeoutMs?: number;
  limitPerSource?: number;
}

export class SearchFederator {
  static async federate(params: FederationParams): Promise<Track[]> {
    const timeoutMs = params.timeoutMs ?? 1500;
    const limit = params.limitPerSource ?? 10;

    const queryPromise = (provider: SourceSearchProvider): Promise<{ provider: SourceSearchProvider; tracks: Track[] }> => {
      const searchWithTimeout = Promise.race([
        provider.search(params.query, limit),
        new Promise<Track[]>((_, reject) =>
          setTimeout(() => reject(new Error('Source search timed out')), timeoutMs)
        ),
      ]);

      return searchWithTimeout
        .then((tracks) => ({ provider, tracks }))
        .catch(() => ({ provider, tracks: [] }));
    };

    const externalResults = await Promise.all(params.externalSources.map(queryPromise));

    const aboveYoutube: Track[] = [];
    const belowYoutube: Track[] = [];

    for (const res of externalResults) {
      if (res.provider.rank < params.youtubeRank) {
        aboveYoutube.push(...res.tracks);
      } else {
        belowYoutube.push(...res.tracks);
      }
    }

    return [...aboveYoutube, ...params.youtubeTracks, ...belowYoutube];
  }

  static prewarmTopResult(
    trackId: string,
    resolveStreamUrl: (id: string) => Promise<string | null>
  ): Promise<string | null> {
    return resolveStreamUrl(trackId).catch(() => null);
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx jest src/search/services/__tests__/searchFederator.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/search/services/searchFederator.ts src/search/services/__tests__/searchFederator.test.ts
git commit -m "feat(search): add multi-source search federation and stream pre-warming"
```

---

### Task 4: Playlist Engine (Album Expansion, Ownership Heuristics & SetVideoId Mutations)

**Files:**
- Create: `src/library/services/playlistEngine.ts`
- Create: `src/library/services/__tests__/playlistEngine.test.ts`

**Interfaces:**
- Consumes: `RawPlaylistResponse`, `OwnershipSignals`, `RemoveEntry`.
- Produces: `PlaylistEngine` with `resolveAlbumBackingPlaylist`, `determineOwnership`, `partitionTracks`, `buildRemovePayload`.

- [ ] **Step 1: Write the failing tests for PlaylistEngine**

Create `src/library/services/__tests__/playlistEngine.test.ts`:
```typescript
import { PlaylistEngine } from '../playlistEngine';

describe('PlaylistEngine', () => {
  it('detects truncated catalogue album and resolves backing playlist ID', () => {
    const albumBrowseId = 'MPREb_98765';
    const albumResponse = {
      header: {
        title: 'Random Access Memories',
        playButtonPlaylistId: 'OLAK5uy_k123456789',
      },
      previewTracksCount: 3,
    };

    const resolution = PlaylistEngine.resolveAlbumBackingPlaylist(albumBrowseId, albumResponse);
    expect(resolution.isAlbum).toBe(true);
    expect(resolution.backingPlaylistBrowseId).toBe('VLOLAK5uy_k123456789');
  });

  it('determines playlist ownership using BitChord 3-stage heuristic', () => {
    expect(
      PlaylistEngine.determineOwnership({
        hasEditableHeader: true,
        menuIcons: [],
        hasSaveToggle: true,
      })
    ).toBe(true);

    expect(
      PlaylistEngine.determineOwnership({
        hasEditableHeader: false,
        menuIcons: ['DELETE', 'SHARE'],
        hasSaveToggle: true,
      })
    ).toBe(true);

    expect(
      PlaylistEngine.determineOwnership({
        hasEditableHeader: false,
        menuIcons: ['SHARE'],
        hasSaveToggle: false,
      })
    ).toBe(true);

    expect(
      PlaylistEngine.determineOwnership({
        hasEditableHeader: false,
        menuIcons: ['SHARE'],
        hasSaveToggle: true,
      })
    ).toBe(false);
  });

  it('isolates Suggested tracks shelf from user playlist tracks', () => {
    const rawItems = [
      { videoId: 't1', title: 'User Song 1', isSuggested: false },
      { videoId: 't2', title: 'User Song 2', isSuggested: false },
      { videoId: 's1', title: 'Suggested Song 1', isSuggested: true },
    ];

    const partitioned = PlaylistEngine.partitionTracks(rawItems);
    expect(partitioned.playlistTracks).toHaveLength(2);
    expect(partitioned.playlistTracks.map((t) => t.videoId)).toEqual(['t1', 't2']);
    expect(partitioned.suggestedTracks).toHaveLength(1);
    expect(partitioned.suggestedTracks[0].videoId).toBe('s1');
  });

  it('generates remove mutation requiring setVideoId for duplicate-safe deletion', () => {
    const payload = PlaylistEngine.buildRemovePayload('VLPL12345', [
      { videoId: 'v1', setVideoId: 'set_abc_1' },
      { videoId: 'v1', setVideoId: 'set_abc_2' },
    ]);

    expect(payload.playlistId).toBe('PL12345');
    expect(payload.actions).toHaveLength(2);
    expect(payload.actions[0]).toEqual({
      action: 'ACTION_REMOVE_VIDEO',
      removedVideoId: 'v1',
      setVideoId: 'set_abc_1',
    });
    expect(payload.actions[1]).toEqual({
      action: 'ACTION_REMOVE_VIDEO',
      removedVideoId: 'v1',
      setVideoId: 'set_abc_2',
    });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx jest src/library/services/__tests__/playlistEngine.test.ts`
Expected: FAIL (Cannot find module `../playlistEngine`)

- [ ] **Step 3: Implement PlaylistEngine**

Create `src/library/services/playlistEngine.ts`:
```typescript
export interface RawPlaylistResponse {
  header?: {
    title?: string;
    playButtonPlaylistId?: string;
  };
  previewTracksCount?: number;
}

export interface OwnershipSignals {
  hasEditableHeader: boolean;
  menuIcons: string[];
  hasSaveToggle: boolean;
}

export interface PartitionedTracks<T> {
  playlistTracks: T[];
  suggestedTracks: T[];
}

export interface RemoveEntry {
  videoId: string;
  setVideoId: string;
}

export class PlaylistEngine {
  static resolveAlbumBackingPlaylist(
    browseId: string,
    response: RawPlaylistResponse
  ): { isAlbum: boolean; backingPlaylistBrowseId: string | null } {
    if (!browseId.startsWith('MPREb')) {
      return { isAlbum: false, backingPlaylistBrowseId: null };
    }

    const playPlaylistId = response.header?.playButtonPlaylistId;
    if (!playPlaylistId) {
      return { isAlbum: true, backingPlaylistBrowseId: null };
    }

    const clean = playPlaylistId.replace(/^VL/, '');
    return {
      isAlbum: true,
      backingPlaylistBrowseId: `VL${clean}`,
    };
  }

  static determineOwnership(signals: OwnershipSignals): boolean {
    if (signals.hasEditableHeader) return true;
    if (signals.menuIcons.some((icon) => icon === 'DELETE' || icon === 'EDIT')) return true;
    if (!signals.hasSaveToggle) return true;
    return false;
  }

  static partitionTracks<T extends { isSuggested?: boolean }>(
    items: T[]
  ): PartitionedTracks<T> {
    const playlistTracks: T[] = [];
    const suggestedTracks: T[] = [];

    for (const item of items) {
      if (item.isSuggested) {
        suggestedTracks.push(item);
      } else {
        playlistTracks.push(item);
      }
    }

    return { playlistTracks, suggestedTracks };
  }

  static buildRemovePayload(playlistBrowseId: string, entries: RemoveEntry[]) {
    const playlistId = playlistBrowseId.replace(/^VL/, '');
    const actions = entries.map((entry) => ({
      action: 'ACTION_REMOVE_VIDEO',
      setVideoId: entry.setVideoId,
      removedVideoId: entry.videoId,
    }));

    return { playlistId, actions };
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx jest src/library/services/__tests__/playlistEngine.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/library/services/playlistEngine.ts src/library/services/__tests__/playlistEngine.test.ts
git commit -m "feat(library): implement album-to-playlist expansion, ownership heuristics and setVideoId mutations"
```

---

### Task 5: Recommendations & Autoplay Engine (4-Stage Waterfall & Radio Autoplay)

**Files:**
- Create: `src/domain/queue/RecommendationEngine.ts`
- Create: `src/domain/queue/__tests__/RecommendationEngine.test.ts`

**Interfaces:**
- Consumes: `CandidateTrack`, `HomeCandidateShelf`.
- Produces: `RecommendationEngine.quickPicks`, `RecommendationEngine.buildRadioPayload`, `RecommendationEngine.parseRadioQueue`.

- [ ] **Step 1: Write the failing tests for RecommendationEngine**

Create `src/domain/queue/__tests__/RecommendationEngine.test.ts`:
```typescript
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

    const rawQueue = [
      { videoId: 'seed_xyz_123', title: 'Seed Song' },
      { videoId: 'radio_1', title: 'Radio Track 1' },
      { videoId: 'radio_2', title: 'Radio Track 2' },
    ];

    const autoplayTracks = RecommendationEngine.parseRadioQueue(rawQueue, seedTrackId);
    expect(autoplayTracks).toHaveLength(2);
    expect(autoplayTracks[0].videoId).toBe('radio_1');
    expect(autoplayTracks[1].videoId).toBe('radio_2');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx jest src/domain/queue/__tests__/RecommendationEngine.test.ts`
Expected: FAIL (Cannot find module `../RecommendationEngine`)

- [ ] **Step 3: Implement RecommendationEngine**

Create `src/domain/queue/RecommendationEngine.ts`:
```typescript
export interface CandidateTrack {
  id: string;
  title: string;
  artist?: string;
  thumbnailUrl?: string;
}

export interface HomeCandidateShelf {
  title: string;
  tracks: CandidateTrack[];
}

export class RecommendationEngine {
  static quickPicks(
    shelves: HomeCandidateShelf[],
    excludeIds: Set<string>,
    exploreFallback: CandidateTrack[] = []
  ): CandidateTrack[] {
    const directShelf = shelves.find((shelf) => {
      const lower = shelf.title.toLowerCase();
      return (
        lower.includes('quick') ||
        lower.includes('pick') ||
        lower.includes('mix') ||
        lower.includes('recommend')
      );
    });

    if (directShelf) {
      const filtered = directShelf.tracks.filter((t) => !excludeIds.has(t.id));
      if (filtered.length > 0) return filtered;
    }

    const candidateShelves = shelves.length > 1 ? shelves.slice(1) : shelves;
    const cleanShelves = candidateShelves.filter((shelf) => {
      const lower = shelf.title.toLowerCase();
      return (
        !lower.includes('recent') &&
        !lower.includes('history') &&
        !lower.includes('listen again')
      );
    });

    const shelfTracks: CandidateTrack[] = [];
    const seen = new Set<string>();

    for (const shelf of cleanShelves) {
      for (const track of shelf.tracks) {
        if (!excludeIds.has(track.id) && !seen.has(track.id)) {
          seen.add(track.id);
          shelfTracks.push(track);
        }
      }
    }
    if (shelfTracks.length > 0) return shelfTracks;

    for (const shelf of shelves) {
      for (const track of shelf.tracks) {
        if (!excludeIds.has(track.id) && !seen.has(track.id)) {
          seen.add(track.id);
          shelfTracks.push(track);
        }
      }
    }
    if (shelfTracks.length > 0) return shelfTracks;

    return exploreFallback.filter((t) => !excludeIds.has(t.id));
  }

  static buildRadioPayload(videoId: string) {
    return {
      videoId,
      playlistId: `RDAMVM${videoId}`,
      isAudioOnly: true,
    };
  }

  static parseRadioQueue<T extends { videoId: string }>(
    queue: T[],
    seedVideoId: string
  ): T[] {
    return queue.filter((item) => item.videoId !== seedVideoId);
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx jest src/domain/queue/__tests__/RecommendationEngine.test.ts`
Expected: PASS

- [ ] **Step 5: Run full test suite across the repository**

Run: `npm test`
Expected: PASS (All test suites pass)

- [ ] **Step 6: Commit**

```bash
git add src/domain/queue/RecommendationEngine.ts src/domain/queue/__tests__/RecommendationEngine.test.ts
git commit -m "feat(recommendations): implement BitChord 4-stage waterfall and RDAMVM radio autoplay"
```
