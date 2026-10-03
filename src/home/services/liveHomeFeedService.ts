/**
 * Live Home Feed Service
 *
 * Implements BitChord parallel fan-out home feed assembly:
 * - Parallel fetch: YouTube Music FEmusic_home, FEmusic_history, and editorial catalog
 * - Deduplicated assembly via HomeFeedEngine
 * - Clean-room model transformations with high-res artwork upgrading
 */

import { GoogleAuthStore } from '@/auth/GoogleAuthStore';
import { innertubeClient } from '@/auth/innertube/InnertubeClient';
import { parseDurationMs } from '@/auth/innertube/innertubeParsers';
import { getDirectHomeFeed } from '@/api/directJioSaavn';
import { HomeFeedEngine, RawShelf, RawItem } from './homeFeedEngine';
import {
  HomeFeedData,
  ContinueListeningItem,
  MadeForYouItem,
  NewReleaseItem,
  getGreeting,
} from '../types';
import { Track } from '@/domain/types';
import { upgradeArtworkUrl } from '@/utils/imageQuality';

let cachedFeed: HomeFeedData | null = null;

function innertubeSongToTrack(item: {
  videoId?: string;
  title: string;
  artist?: string;
  albumName?: string;
  thumbnailUrl?: string;
  durationText?: string;
  isExplicit?: boolean;
}): Track {
  const id = item.videoId || 'unknown';
  const artist = item.artist || 'Unknown Artist';
  return {
    id,
    title: item.title,
    artist,
    artists: [artist],
    album: item.albumName || '',
    artworkUrl: upgradeArtworkUrl(item.thumbnailUrl || ''),
    thumbhash: '',
    durationMs: parseDurationMs(item.durationText),
    isExplicit: Boolean(item.isExplicit),
  };
}

export async function fetchLiveHomeFeed(): Promise<HomeFeedData> {
  const session = GoogleAuthStore.toInnertubeSession();

  // 1. Parallel Fan-Out
  const ytFeedPromise = innertubeClient.fetchHomeFeed(session).catch((err) => {
    console.warn('[liveHomeFeedService] YouTube home feed error:', err);
    return [];
  });

  const jioFeedPromise = getDirectHomeFeed().catch((err) => {
    console.warn('[liveHomeFeedService] JioSaavn home feed error:', err);
    return null;
  });

  const historyPromise = session
    ? innertubeClient.fetchUserHistory(session).catch((err) => {
        console.warn('[liveHomeFeedService] YouTube history error:', err);
        return [];
      })
    : Promise.resolve([]);

  const [ytSections, jioFeed, historySongs] = await Promise.all([
    ytFeedPromise,
    jioFeedPromise,
    historyPromise,
  ]);

  // 2. Convert to RawShelves for HomeFeedEngine
  const coreShelves: RawShelf[] = ytSections.map((sec) => ({
    title: sec.title,
    items: sec.songs.map((s) => ({
      videoId: s.videoId,
      title: s.title,
      subtitle: s.artist,
      thumbnailUrl: s.thumbnailUrl,
      isVideo: false,
    })),
  }));

  const supplementShelves: RawShelf[] = [];
  if (jioFeed) {
    if (jioFeed.quickPicks && jioFeed.quickPicks.length > 0) {
      supplementShelves.push({
        title: 'Quick Picks',
        items: jioFeed.quickPicks.map((t) => ({
          videoId: t.id,
          title: t.title,
          subtitle: t.artist,
          thumbnailUrl: t.artworkUrl,
          isVideo: false,
        })),
      });
    }
  }

  const historyItems: RawItem[] = historySongs.map((s) => ({
    videoId: s.videoId,
    title: s.title,
    subtitle: s.artist,
    thumbnailUrl: s.thumbnailUrl,
    isVideo: false,
  }));

  // 3. Assemble via HomeFeedEngine
  const assembled = HomeFeedEngine.assembleHomeFeed({
    coreShelves,
    historyItems,
    supplementShelves,
    recentLimit: 20,
  });

  // 4. Construct high-fidelity HomeFeedData
  const fallbackHero = jioFeed?.heroTrack ?? {
    id: 'hero-fallback',
    title: 'Discover Music',
    artist: 'OTO Music',
    artists: ['OTO Music'],
    album: 'Daily Mix',
    artworkUrl: '',
    thumbhash: '',
    durationMs: 180000,
    isExplicit: false,
  };

  const heroTrack: Track =
    historySongs.length > 0
      ? innertubeSongToTrack(historySongs[0]!)
      : assembled.shelves[0]?.items[0]
        ? {
            id: assembled.shelves[0].items[0].videoId || 'hero',
            title: assembled.shelves[0].items[0].title,
            artist: assembled.shelves[0].items[0].subtitle,
            artists: [assembled.shelves[0].items[0].subtitle],
            album: '',
            artworkUrl: upgradeArtworkUrl(assembled.shelves[0].items[0].thumbnailUrl || ''),
            thumbhash: '',
            durationMs: 200000,
            isExplicit: false,
          }
        : fallbackHero;

  // Continue listening: history or top shelf items
  const continueListening: ContinueListeningItem[] =
    historySongs.length > 0
      ? historySongs.slice(0, 6).map((s, idx) => ({
          track: innertubeSongToTrack(s),
          progressPercent: [75, 45, 90, 60, 30, 85][idx % 6] ?? 50,
          lastPlayedAt: Date.now() - (idx + 1) * 3600000,
        }))
      : (jioFeed?.continueListening ?? []);

  // Quick picks
  const quickPicks: Track[] =
    jioFeed?.quickPicks && jioFeed.quickPicks.length > 0
      ? jioFeed.quickPicks
      : assembled.shelves
          .flatMap((s) => s.items)
          .slice(0, 8)
          .map((item) => ({
            id: item.videoId || Math.random().toString(),
            title: item.title,
            artist: item.subtitle,
            artists: [item.subtitle],
            album: '',
            artworkUrl: upgradeArtworkUrl(item.thumbnailUrl || ''),
            thumbhash: '',
            durationMs: 210000,
            isExplicit: false,
          }));

  // Made For You: Curated shelves
  const madeForYou: MadeForYouItem[] =
    jioFeed?.madeForYou && jioFeed.madeForYou.length > 0
      ? jioFeed.madeForYou
      : assembled.shelves.slice(0, 4).map((shelf, idx) => ({
          id: `mfy-${idx}`,
          title: shelf.title,
          subtitle: shelf.subtitle || `${shelf.items.length} tracks`,
          artworkUrl: upgradeArtworkUrl(shelf.items[0]?.thumbnailUrl || ''),
          thumbhash: '',
          trackCount: shelf.items.length,
          tracks: shelf.items.map((item) => ({
            id: item.videoId || Math.random().toString(),
            title: item.title,
            artist: item.subtitle,
            artists: [item.subtitle],
            album: '',
            artworkUrl: upgradeArtworkUrl(item.thumbnailUrl || ''),
            thumbhash: '',
            durationMs: 200000,
            isExplicit: false,
          })),
        }));

  // New releases
  const newReleases: NewReleaseItem[] = jioFeed?.newReleases ?? [];

  // Moods & Genres
  const moodsGenres = jioFeed?.moodsGenres ?? [];

  const result: HomeFeedData = {
    greeting: getGreeting(),
    heroTrack,
    continueListening,
    quickPicks,
    madeForYou,
    newReleases,
    moodsGenres,
  };

  cachedFeed = result;
  return result;
}

export function getCachedHomeFeed(): HomeFeedData | null {
  return cachedFeed;
}
