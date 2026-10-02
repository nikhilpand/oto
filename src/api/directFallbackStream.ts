/**
 * Direct On-Device Fallback Stream Resolver
 *
 * Clean-room adaptation of BITCHORD_RE/05_STREAM_RESOLUTION.md & 10_SOURCES.md.
 *
 * When a track is unavailable in the primary catalog (e.g. rare indie, international,
 * anime, or unreleased live cuts), this fallback resolves high-bitrate audio streams
 * (Opus/AAC ~160kbps) using a resilient pool of federated streaming endpoints.
 *
 * Runs 100% on-device. Zero API key, zero proprietary backend required.
 */

import { ResolvedStream } from '@/domain/types';
import { findBestMatch, MatchCandidate, MatchTarget } from './matching/trackMatcher';
import { circuitBreakers } from './resilience/circuitBreaker';

const FALLBACK_INSTANCES = [
  'https://pipedapi.kavin.rocks',
  'https://api.piped.privacydev.net',
  'https://piped-api.lunar.icu',
];

interface PipedAudioStream {
  url: string;
  bitrate: number;
  mimeType: string;
  format: string;
}

interface PipedStreamResponse {
  audioStreams?: PipedAudioStream[];
  title?: string;
  duration?: number;
}

interface PipedSearchResult {
  url?: string;
  title?: string;
  uploaderName?: string;
  duration?: number;
}

/**
 * Attempts to resolve a stream from a single instance.
 */
async function fetchFromInstance(
  baseUrl: string,
  videoId: string
): Promise<ResolvedStream | null> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 4000);

  try {
    const res = await fetch(`${baseUrl}/streams/${encodeURIComponent(videoId)}`, {
      signal: controller.signal,
      headers: { 'User-Agent': 'Mozilla/5.0 OTO Music Mobile' },
    });
    clearTimeout(timer);

    if (!res.ok) return null;
    const data = (await res.json()) as PipedStreamResponse;

    const streams = data.audioStreams;
    if (!Array.isArray(streams) || streams.length === 0) return null;

    // Sort by highest bitrate descending
    const sorted = [...streams].sort((a, b) => (b.bitrate || 0) - (a.bitrate || 0));
    const best = sorted[0];
    if (!best || !best.url) return null;

    return {
      streamUrl: best.url,
      sourceId: 'piped',
      format: best.mimeType.includes('mp4') || best.mimeType.includes('m4a') ? 'aac' : 'opus',
      bitrate: best.bitrate > 200000 ? 256 : 160,
      expiresAt: Date.now() + 2 * 60 * 60 * 1000,
      is2MbChunked: false,
    };
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Searches federated instances for a video ID matching title and artist.
 */
async function searchForCandidate(
  baseUrl: string,
  target: MatchTarget
): Promise<string | null> {
  const query = `${target.title} ${target.artist || ''}`.trim();
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 4000);

  try {
    const res = await fetch(
      `${baseUrl}/search?q=${encodeURIComponent(query)}&filter=music_songs`,
      {
        signal: controller.signal,
        headers: { 'User-Agent': 'Mozilla/5.0 OTO Music Mobile' },
      }
    );
    clearTimeout(timer);

    if (!res.ok) return null;
    const data = (await res.json()) as { items?: PipedSearchResult[] };
    const items = data.items;
    if (!Array.isArray(items) || items.length === 0) return null;

    const candidates: MatchCandidate[] = items
      .filter((i) => i.url && i.url.includes('/watch?v='))
      .map((i) => ({
        id: i.url!.split('/watch?v=')[1]!.split('&')[0]!,
        title: i.title || '',
        artist: i.uploaderName,
        durationMs: i.duration ? i.duration * 1000 : undefined,
      }));

    if (candidates.length === 0) return null;

    const best = findBestMatch(target, candidates, 0.60);
    return best ? best.id : candidates[0]!.id;
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Resolves an audio stream from the secondary federated fallback pool.
 */
export async function resolveFallbackStream(
  trackId: string,
  meta?: { title?: string; artist?: string; durationMs?: number }
): Promise<ResolvedStream | null> {
  if (!meta?.title && !trackId) return null;

  return circuitBreakers.secondary.execute(async () => {
    const target: MatchTarget = {
      title: meta?.title || trackId,
      artist: meta?.artist,
      durationMs: meta?.durationMs,
    };

    // Iterate through instances for resilience
    for (const instance of FALLBACK_INSTANCES) {
      try {
        let videoId: string | null = null;
        if (trackId.length === 11 && !trackId.includes(' ')) {
          videoId = trackId;
        } else {
          videoId = await searchForCandidate(instance, target);
        }

        if (!videoId) continue;

        const resolved = await fetchFromInstance(instance, videoId);
        if (resolved) {
          return resolved;
        }
      } catch {
        // Try next instance
      }
    }
    return null;
  }, null);
}
