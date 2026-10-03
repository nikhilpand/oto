/**
 * Multi-Provider Lyrics Waterfall Repository
 *
 * Reverse-engineered from BitChord (LyricsRepository.kt).
 * Runs multi-provider parallel racing across:
 * 1. BiniLyrics (Apple Music TTML syllable sync with duet alignment)
 * 2. Musixmatch (HMAC-SHA256 signed RichSync syllable timing)
 * 3. SimpMusic (Enhanced LRC syllable sync keyed on videoId)
 * 4. LrcLib (Millisecond synchronized line LRC)
 * 5. KuGou (Extensive global/Asian synchronized LRC)
 *
 * Prioritizes syllable/word-level sync over line sync.
 * Includes in-memory caching to eliminate redundant network requests.
 */

import { fetchBiniLyrics } from './providers/BiniLyrics';
import { fetchMusixmatchLyrics } from './providers/Musixmatch';
import { fetchSimpMusicLyrics } from './providers/SimpMusic';
import { fetchKuGouLyrics } from './providers/KuGou';
import { fetchDirectLyrics } from '@/api/directLyrics';
import type { ParsedLyrics } from './types';
import { detectScript } from './scriptDetector';

export type LyricsProviderName =
  | 'BiniLyrics'
  | 'Musixmatch'
  | 'SimpMusic'
  | 'LrcLib'
  | 'KuGou';

export interface LyricsQueryOptions {
  title: string;
  artist: string;
  durationMs?: number;
  album?: string;
  videoId?: string;
  isrc?: string;
  prioritizeWordSync?: boolean;
}

const lyricsCache = new Map<string, ParsedLyrics>();

function getCacheKey(opt: LyricsQueryOptions): string {
  if (opt.videoId && opt.videoId.trim().length > 0) {
    return `vid:${opt.videoId.trim()}`;
  }
  return `meta:${opt.title.trim().toLowerCase()}:${opt.artist.trim().toLowerCase()}`;
}

async function fetchFromLrcLib(
  title: string,
  artist: string,
  durationMs?: number,
  album?: string
): Promise<ParsedLyrics | null> {
  const lines = await fetchDirectLyrics(title, artist, durationMs, album);
  if (!lines || lines.length === 0) return null;

  const parsedLines = lines.map((l, i) => ({
    id: `lrclib-${i}`,
    timeMs: l.timeMs,
    endMs: l.timeMs + (l.durationMs || 4000),
    text: l.text,
    words: [],
    isWordSynced: false,
    alignment: 'start' as const,
  }));

  return {
    lines: parsedLines,
    isWordSynced: false,
    isLineSynced: true,
    hasDuet: false,
    script: detectScript(parsedLines.map((l) => l.text).join(' ')),
    provider: 'LrcLib',
  };
}

export class LyricsRepository {
  /**
   * Fetches best synchronized lyrics by racing all active providers in parallel.
   */
  static async getLyrics(options: LyricsQueryOptions): Promise<ParsedLyrics | null> {
    const key = getCacheKey(options);
    const cached = lyricsCache.get(key);
    if (cached) {
      return cached;
    }

    const {
      title,
      artist,
      durationMs,
      album,
      videoId,
      isrc,
      prioritizeWordSync = true,
    } = options;

    const promises: Array<Promise<{ provider: LyricsProviderName; lyrics: ParsedLyrics | null }>> = [
      // 1. BiniLyrics (TTML word-synced)
      fetchBiniLyrics(title, artist, durationMs, album, isrc).then((lyrics) => ({
        provider: 'BiniLyrics' as const,
        lyrics,
      })),

      // 2. Musixmatch (RichSync word-synced)
      fetchMusixmatchLyrics(title, artist, durationMs).then((lyrics) => ({
        provider: 'Musixmatch' as const,
        lyrics,
      })),

      // 3. SimpMusic (Enhanced LRC word-synced by videoId)
      videoId
        ? fetchSimpMusicLyrics(videoId, durationMs).then((lyrics) => ({
            provider: 'SimpMusic' as const,
            lyrics,
          }))
        : Promise.resolve({ provider: 'SimpMusic' as const, lyrics: null }),

      // 4. LrcLib (Line synced)
      fetchFromLrcLib(title, artist, durationMs, album).then((lyrics) => ({
        provider: 'LrcLib' as const,
        lyrics,
      })),

      // 5. KuGou (Line synced)
      fetchKuGouLyrics(title, artist, durationMs, album).then((lyrics) => ({
        provider: 'KuGou' as const,
        lyrics,
      })),
    ];

    // Wait for all to finish, then evaluate results in priority order
    const results = await Promise.allSettled(promises);
    const resolved: Array<{ provider: LyricsProviderName; lyrics: ParsedLyrics }> = [];

    for (const res of results) {
      if (res.status === 'fulfilled' && res.value.lyrics && res.value.lyrics.lines.length > 0) {
        resolved.push({
          provider: res.value.provider,
          lyrics: res.value.lyrics,
        });
      }
    }

    if (resolved.length === 0) {
      return null;
    }

    // If word-sync prioritized, pick the highest-priority word-synced result
    if (prioritizeWordSync) {
      const wordSynced = resolved.find((r) => r.lyrics.isWordSynced);
      if (wordSynced) {
        lyricsCache.set(key, wordSynced.lyrics);
        return wordSynced.lyrics;
      }
    }

    // Otherwise pick the highest-priority result available
    const top = resolved[0]?.lyrics ?? null;
    if (top) {
      lyricsCache.set(key, top);
    }
    return top;
  }

  /**
   * Fetches specifically from a single requested provider.
   */
  static async getLyricsFromProvider(
    provider: LyricsProviderName,
    options: LyricsQueryOptions
  ): Promise<ParsedLyrics | null> {
    const { title, artist, durationMs, album, videoId, isrc } = options;

    switch (provider) {
      case 'BiniLyrics':
        return fetchBiniLyrics(title, artist, durationMs, album, isrc);
      case 'Musixmatch':
        return fetchMusixmatchLyrics(title, artist, durationMs);
      case 'SimpMusic':
        return videoId ? fetchSimpMusicLyrics(videoId, durationMs) : null;
      case 'LrcLib':
        return fetchFromLrcLib(title, artist, durationMs, album);
      case 'KuGou':
        return fetchKuGouLyrics(title, artist, durationMs, album);
      default:
        return null;
    }
  }

  /**
   * Clear cache for testing or manual refresh.
   */
  static clearCache(): void {
    lyricsCache.clear();
  }
}
