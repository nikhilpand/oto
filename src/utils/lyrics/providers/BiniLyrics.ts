/**
 * BiniLyrics Provider (Apple Music TTML via Binimum API)
 *
 * Reverse engineered from BitChord (BiniLyrics.kt).
 * Returns syllable-level (word-synced) Apple Music TTML lyrics with duet alignment.
 */

import { parseTtml } from '@/utils/lyrics/TtmlParser';
import type { ParsedLyrics } from '@/utils/lyrics/types';

const BASE_URL = 'https://lyrics-api.binimum.org/';
const TIMEOUT_MS = 6000;

interface BiniResult {
  track_name?: string;
  artist_name?: string;
  duration?: number;
  isrc?: string;
  timing_type?: string;
  lyricsUrl?: string;
}

interface BiniResponse {
  results?: BiniResult[];
}

export async function fetchBiniLyrics(
  title: string,
  artist: string,
  durationMs?: number,
  album?: string,
  isrc?: string
): Promise<ParsedLyrics | null> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const url = new URL(BASE_URL);
    if (isrc && isrc.trim().length > 0) {
      url.searchParams.set('isrc', isrc.trim());
    } else {
      url.searchParams.set('track', title);
      url.searchParams.set('artist', artist);
      if (album && album.trim().length > 0) {
        url.searchParams.set('album', album.trim());
      }
      if (durationMs && durationMs > 0) {
        url.searchParams.set('duration', String(Math.round(durationMs / 1000)));
      }
    }

    const res = await fetch(url.toString(), {
      signal: controller.signal,
      headers: {
        Accept: 'application/json',
        'User-Agent': 'OTO-Music/1.0',
      },
    });

    if (!res.ok) return null;
    const data = (await res.json()) as BiniResponse;
    const hit = data.results?.[0];
    if (!hit || !hit.lyricsUrl) return null;

    // Fetch TTML document
    const ttmlRes = await fetch(hit.lyricsUrl, {
      signal: controller.signal,
      headers: {
        Accept: 'application/xml, text/xml, */*',
      },
    });

    if (!ttmlRes.ok) return null;
    const ttmlXml = await ttmlRes.text();
    if (!ttmlXml || ttmlXml.trim().length === 0) return null;

    const parsed = parseTtml(ttmlXml);
    if (parsed.lines.length === 0) return null;

    return {
      ...parsed,
      provider: 'BiniLyrics',
    };
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}
