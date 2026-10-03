/**
 * KuGou Lyrics Provider
 *
 * Reverse engineered from BitChord (KuGou.kt).
 * Comprehensive line-synced database with extensive coverage for global,
 * Asian, and Bollywood / Punjabi releases.
 */

import { parseLrc } from '@/api/directLyrics';
import type { ParsedLyrics } from '@/utils/lyrics/types';
import { detectScript } from '@/utils/lyrics/scriptDetector';

const TIMEOUT_MS = 6000;
const DURATION_TOLERANCE_SECONDS = 8;

function base64ToUtf8(base64: string): string {
  try {
    if (typeof atob === 'function') {
      const binary = atob(base64);
      const bytes = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i++) {
        bytes[i] = binary.charCodeAt(i);
      }
      return new TextDecoder('utf-8').decode(bytes);
    }
  } catch {
    // fallback
  }
  return '';
}

function stripCredits(lrc: string): string {
  return lrc
    .split('\n')
    .filter((line) => {
      const lower = line.toLowerCase();
      return (
        !lower.includes('歌词制作') &&
        !lower.includes('酷狗') &&
        !lower.includes('qq音乐') &&
        !lower.includes('kugou') &&
        !lower.includes('lrc by')
      );
    })
    .join('\n');
}

function cleanQuery(str: string): string {
  return str.replace(/\([^)]*\)|\[[^\]]*\]/g, '').trim();
}

export async function fetchKuGouLyrics(
  title: string,
  artist: string,
  durationMs?: number,
  album?: string
): Promise<ParsedLyrics | null> {
  const durationSec = durationMs ? Math.round(durationMs / 1000) : 0;
  const keyword = `${cleanQuery(title)} - ${cleanQuery(artist)}${album ? ' ' + album : ''}`;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    // 1. Search song to get hash
    const searchUrl = `https://mobileservice.kugou.com/api/v3/search/song?version=9108&plat=0&pagesize=8&showtype=0&keyword=${encodeURIComponent(
      keyword
    )}`;

    const searchRes = await fetch(searchUrl, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
      },
    });

    if (!searchRes.ok) return null;
    const searchJson = (await searchRes.json()) as {
      data?: {
        info?: { hash?: string; duration?: number }[];
      };
    };

    const songs = (searchJson.data?.info || []).filter((s) => {
      if (!s.hash) return false;
      if (durationSec <= 0 || !s.duration) return true;
      return Math.abs(s.duration - durationSec) <= DURATION_TOLERANCE_SECONDS;
    });

    const chosenSong = songs.sort((a, b) => {
      const diffA = Math.abs((a.duration || 0) - durationSec);
      const diffB = Math.abs((b.duration || 0) - durationSec);
      return diffA - diffB;
    })[0];

    // 2. Search lyrics candidate
    const lyricSearchUrl = new URL('https://lyrics.kugou.com/search');
    lyricSearchUrl.searchParams.set('ver', '1');
    lyricSearchUrl.searchParams.set('man', 'yes');
    lyricSearchUrl.searchParams.set('client', 'pc');

    if (chosenSong?.hash) {
      lyricSearchUrl.searchParams.set('hash', chosenSong.hash);
    } else {
      lyricSearchUrl.searchParams.set('keyword', keyword);
      if (durationSec > 0) {
        lyricSearchUrl.searchParams.set('duration', String(durationSec * 1000));
      }
    }

    const lyricRes = await fetch(lyricSearchUrl.toString(), {
      signal: controller.signal,
    });
    if (!lyricRes.ok) return null;

    const lyricJson = (await lyricRes.json()) as {
      candidates?: { id?: string; accesskey?: string }[];
    };

    const candidate = lyricJson.candidates?.[0];
    if (!candidate?.id || !candidate?.accesskey) return null;

    // 3. Download lyric
    const downloadUrl = `https://lyrics.kugou.com/download?fmt=lrc&charset=utf8&client=pc&ver=1&id=${encodeURIComponent(
      candidate.id
    )}&accesskey=${encodeURIComponent(candidate.accesskey)}`;

    const downRes = await fetch(downloadUrl, {
      signal: controller.signal,
    });
    if (!downRes.ok) return null;

    const downJson = (await downRes.json()) as { content?: string };
    if (!downJson.content) return null;

    const rawLrc = base64ToUtf8(downJson.content);
    if (!rawLrc || rawLrc.trim().length === 0) return null;

    const cleanLrc = stripCredits(rawLrc);
    const parsed = parseLrc(cleanLrc);
    if (parsed.length === 0) return null;

    const lines = parsed.map((l, i) => ({
      id: `kugou-${i}`,
      timeMs: l.timeMs,
      endMs: l.timeMs + (l.durationMs || 4000),
      text: l.text,
      words: [],
      isWordSynced: false,
      alignment: 'start' as const,
    }));

    return {
      lines,
      isWordSynced: false,
      isLineSynced: true,
      hasDuet: false,
      script: detectScript(lines.map((l) => l.text).join(' ')),
      provider: 'KuGou',
    };
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}
