/**
 * SimpMusic Lyrics Provider
 *
 * Reverse-engineered from BitChord (SimpMusicLyrics.kt).
 * Direct community database lookup keyed on the YouTube videoId.
 * Immune to title/artist edit drift because it queries the exact video recording.
 */

import { parseEnhancedLrc } from '@/utils/lyrics/EnhancedLrcParser';
import { parseLrc } from '@/api/directLyrics';
import type { ParsedLyrics } from '@/utils/lyrics/types';
import { detectScript } from '@/utils/lyrics/scriptDetector';

const BASE_URL = 'https://api-lyrics.simpmusic.org/v1/';
const TIMEOUT_MS = 6000;
const DURATION_TOLERANCE_SECONDS = 10;

interface SimpTrack {
  duration?: number;
  richSyncLyrics?: string;
  syncedLyrics?: string;
  plainLyrics?: string;
}

interface SimpResponse {
  success?: boolean;
  data?: SimpTrack[];
}

export async function fetchSimpMusicLyrics(
  videoId: string,
  durationMs?: number
): Promise<ParsedLyrics | null> {
  if (!videoId || videoId.trim().length === 0) return null;

  const cleanVideoId = videoId.replace(/^(youtube:|yt:)/, '');
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const res = await fetch(`${BASE_URL}${encodeURIComponent(cleanVideoId)}`, {
      signal: controller.signal,
      headers: {
        Accept: 'application/json',
        'User-Agent': 'OTO-Music/1.0',
      },
    });

    if (!res.ok) return null;
    const body = (await res.json()) as SimpResponse;
    if (!body || !body.success || !body.data || body.data.length === 0) {
      return null;
    }

    const durationSec = durationMs ? Math.round(durationMs / 1000) : 0;
    const tracks = body.data.filter((t) => {
      if (durationSec <= 0 || !t.duration) return true;
      return Math.abs(t.duration - durationSec) <= DURATION_TOLERANCE_SECONDS;
    });

    const chosen = tracks.sort((a, b) => {
      const diffA = Math.abs((a.duration || 0) - durationSec);
      const diffB = Math.abs((b.duration || 0) - durationSec);
      return diffA - diffB;
    })[0];

    if (!chosen) return null;

    // 1. Syllable-level enhanced sync
    if (chosen.richSyncLyrics && chosen.richSyncLyrics.trim().length > 0) {
      const lines = parseEnhancedLrc(chosen.richSyncLyrics);
      if (lines.length > 0 && lines.some((l) => l.isWordSynced)) {
        return {
          lines,
          isWordSynced: true,
          isLineSynced: true,
          hasDuet: false,
          script: detectScript(lines.map((l) => l.text).join(' ')),
          provider: 'SimpMusic',
        };
      }
    }

    // 2. Line-level sync fallback
    if (chosen.syncedLyrics && chosen.syncedLyrics.trim().length > 0) {
      const rawLines = parseLrc(chosen.syncedLyrics);
      if (rawLines.length > 0) {
        return {
          lines: rawLines.map((l, i) => ({
            id: `simp-${i}`,
            timeMs: l.timeMs,
            endMs: l.timeMs + (l.durationMs || 4000),
            text: l.text,
            words: [],
            isWordSynced: false,
            alignment: 'start',
          })),
          isWordSynced: false,
          isLineSynced: true,
          hasDuet: false,
          script: detectScript(rawLines.map((l) => l.text).join(' ')),
          provider: 'SimpMusic',
        };
      }
    }

    return null;
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}
