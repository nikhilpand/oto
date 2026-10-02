/**
 * Direct On-Device Synchronized Lyrics Client
 *
 * Communicates directly with the LRCLIB public API (https://lrclib.net/api)
 * to fetch millisecond-precision synchronized LRC lyrics.
 * Runs completely serverless on-device without any backend proxy.
 */

import { LyricLine } from '@/domain/types';
import { circuitBreakers } from './resilience/circuitBreaker';

/**
 * Parses raw LRC string into typed, ordered LyricLine array.
 */
export function parseLrc(lrcText: string): LyricLine[] {
  const lines: LyricLine[] = [];
  const rawLines = lrcText.split('\n');
  const timeRegex = /\[(\d{2}):(\d{2})\.(\d{2,3})\](.*)/;

  const tempParsed: { timeMs: number; text: string }[] = [];

  for (const rawLine of rawLines) {
    const match = timeRegex.exec(rawLine.trim());
    if (match && match[1] && match[2] && match[3] && match[4] !== undefined) {
      const minutes = parseInt(match[1], 10);
      const seconds = parseInt(match[2], 10);
      const millisStr = match[3];
      const millis =
        millisStr.length === 2
          ? parseInt(millisStr, 10) * 10
          : parseInt(millisStr, 10);
      const timeMs = minutes * 60000 + seconds * 1000 + millis;
      const text = match[4].trim();
      if (text) {
        tempParsed.push({ timeMs, text });
      }
    }
  }

  tempParsed.sort((a, b) => a.timeMs - b.timeMs);

  for (let i = 0; i < tempParsed.length; i++) {
    const curr = tempParsed[i];
    if (!curr) continue;
    const next = tempParsed[i + 1];
    const durationMs = next ? Math.max(next.timeMs - curr.timeMs, 1000) : 4000;
    lines.push({
      timeMs: curr.timeMs,
      durationMs,
      text: curr.text,
    });
  }

  return lines;
}

/**
 * Fetches real synchronized millisecond LRC lyrics directly from LRCLIB.
 */
export async function fetchDirectLyrics(
  title: string,
  artist: string,
  durationMs?: number,
  _album?: string
): Promise<LyricLine[] | null> {
  const cleanTitle = title
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'")
    .replace(/&amp;/g, '&')
    .replace(/\s*\(from\s+.*?\)/gi, ' ')
    .replace(/\s*from\s+["'].*?["']/gi, ' ')
    .replace(/\s*\(.*?\)\s*/g, ' ')
    .replace(/\s*\[.*?\]\s*/g, ' ')
    .trim();
  const firstArtist = artist.split(/[,&/]/)[0];
  const cleanArtist = (firstArtist ?? artist)
    .replace(/\s*\(.*?\)\s*/g, ' ')
    .replace(/\s*\[.*?\]\s*/g, ' ')
    .trim();

  return circuitBreakers.lyrics.execute(async () => {
    // 1. Direct LRCLIB exact match lookup
    try {
      let url = `https://lrclib.net/api/get?track_name=${encodeURIComponent(
        cleanTitle
      )}&artist_name=${encodeURIComponent(cleanArtist)}`;
      if (durationMs) {
        url += `&duration=${Math.round(durationMs / 1000)}`;
      }

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 4000);
      const res = await fetch(url, {
        signal: controller.signal,
        headers: { 'User-Agent': 'OTO Music Mobile (https://oto.music)' },
      });
      clearTimeout(timeoutId);

      if (res.ok) {
        const data = (await res.json()) as { syncedLyrics?: string };
        if (data.syncedLyrics) {
          return parseLrc(data.syncedLyrics);
        }
      }
    } catch {
      // Continue to fuzzy search fallback
    }

    // 2. LRCLIB fuzzy query search fallback
    try {
      const query = `${cleanTitle} ${cleanArtist}`.trim();
      const searchUrl = `https://lrclib.net/api/search?q=${encodeURIComponent(query)}`;
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 4000);
      const res = await fetch(searchUrl, {
        signal: controller.signal,
        headers: { 'User-Agent': 'OTO Music Mobile (https://oto.music)' },
      });
      clearTimeout(timeoutId);

      if (res.ok) {
        const items = (await res.json()) as {
          syncedLyrics?: string;
          duration?: number;
        }[];
        if (Array.isArray(items) && items.length > 0) {
          for (const item of items) {
            if (!item.syncedLyrics) continue;
            if (durationMs && typeof item.duration === 'number' && item.duration > 0) {
              const deltaSec = Math.abs(Math.round(durationMs / 1000) - item.duration);
              if (deltaSec > 3) continue; // Reject mismatched versions
            }
            return parseLrc(item.syncedLyrics);
          }
        }
      }
    } catch {
      // Return null if unreachable
    }

    return null;
  }, null);
}
