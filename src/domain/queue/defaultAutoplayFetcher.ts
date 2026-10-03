/**
 * Default Autoplay Fetcher
 *
 * Implements continuous radio streaming reverse-engineered from BitChord:
 * 1. Queries YouTube Music `next` endpoint with `RDAMVM<videoId>` watch queue.
 * 2. Parses watch queue and strips the seed track using RecommendationEngine.
 * 3. Gracefully falls back to federated related tracks on network/geo restrictions.
 */

import { Track } from '@/domain/types';
import { GoogleAuthStore } from '@/auth/GoogleAuthStore';
import { innertubeClient } from '@/auth/innertube/InnertubeClient';
import { parseDurationMs } from '@/auth/innertube/innertubeParsers';
import { RecommendationEngine } from './RecommendationEngine';
import { searchJioSaavn } from '@/api/directJioSaavn';
import { upgradeArtworkUrl } from '@/utils/imageQuality';

function cleanVideoId(id: string): string {
  if (id.startsWith('youtube:') || id.startsWith('yt:')) {
    return id.split(':')[1] || id;
  }
  return id;
}

export async function defaultAutoplayFetcher(
  seedTrack: Track,
  count: number,
  excludeIds: string[] = []
): Promise<Track[]> {
  const excludeSet = new Set(excludeIds);
  excludeSet.add(seedTrack.id);

  const videoId = cleanVideoId(seedTrack.id);

  // 1. YouTube Music RDAMVM Radio Mix (Primary)
  if (videoId && videoId.length === 11) {
    try {
      const session = GoogleAuthStore.toInnertubeSession();
      const rawSongs = await innertubeClient.fetchRadioQueue(videoId, session);
      const filteredRaw = RecommendationEngine.parseRadioQueue(rawSongs, videoId);
      const seenIds = new Set<string>(excludeSet);
      const seenSignatures = new Set<string>();
      if (seedTrack.title && seedTrack.artist) {
        seenSignatures.add(
          `${seedTrack.title.toLowerCase().trim()}::${seedTrack.artist.toLowerCase().trim()}`
        );
      }

      const tracks: Track[] = [];
      for (const s of filteredRaw) {
        if (!s.videoId || seenIds.has(s.videoId)) continue;
        const sig = `${s.title.toLowerCase().trim()}::${s.artist.toLowerCase().trim()}`;
        if (seenSignatures.has(sig)) continue;

        seenIds.add(s.videoId);
        seenSignatures.add(sig);

        tracks.push({
          id: s.videoId,
          title: s.title,
          artist: s.artist,
          artists: [s.artist],
          album: s.albumName || '',
          artworkUrl: upgradeArtworkUrl(s.thumbnailUrl || ''),
          thumbhash: '',
          durationMs: parseDurationMs(s.durationText),
          isExplicit: Boolean(s.isExplicit),
        });
      }

      if (tracks.length > 0) {
        return tracks.slice(0, count);
      }
    } catch (err) {
      console.warn('[defaultAutoplayFetcher] YouTube radio fetch error, falling back:', err);
    }
  }

  // 2. Secondary Federated Related Artist Fallback
  try {
    const query = seedTrack.artist ? `${seedTrack.artist} radio` : seedTrack.title;
    const fallbackResults = await searchJioSaavn(query, Math.max(count + 5, 10));
    if (fallbackResults && fallbackResults.tracks.length > 0) {
      const seenFallbackIds = new Set<string>(excludeSet);
      const seenFallbackSignatures = new Set<string>();
      if (seedTrack.title && seedTrack.artist) {
        seenFallbackSignatures.add(
          `${seedTrack.title.toLowerCase().trim()}::${seedTrack.artist.toLowerCase().trim()}`
        );
      }

      const fallbackTracks: Track[] = [];
      for (const t of fallbackResults.tracks) {
        if (!t.id || t.id === seedTrack.id || seenFallbackIds.has(t.id)) continue;
        const sig = `${t.title.toLowerCase().trim()}::${t.artist.toLowerCase().trim()}`;
        if (seenFallbackSignatures.has(sig)) continue;

        seenFallbackIds.add(t.id);
        seenFallbackSignatures.add(sig);
        fallbackTracks.push(t);
      }

      if (fallbackTracks.length > 0) {
        return fallbackTracks.slice(0, count);
      }
    }
  } catch (err) {
    console.warn('[defaultAutoplayFetcher] Fallback related search error:', err);
  }

  return [];
}
