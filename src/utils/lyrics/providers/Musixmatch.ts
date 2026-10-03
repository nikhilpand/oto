/**
 * BitChord Musixmatch Reverse-Engineered Signed API Provider
 *
 * Re-implemented cleanly in TypeScript without external libraries.
 * Signs requests to Musixmatch's desktop app endpoint with HMAC-SHA256
 * using the embedded BitChord secret key.
 *
 * Supports syllable-level timing (RichSync) with line-level (Subtitle) fallback.
 */

import { hmacSha256Base64 } from '@/utils/crypto/hmacSha256';
import type { LyricLine, LyricWord, ParsedLyrics } from '@/utils/lyrics/types';
import { detectScript } from '@/utils/lyrics/scriptDetector';
import { parseLrc } from '@/api/directLyrics';

export interface MusixmatchQuery {
  title: string;
  artist: string;
  durationMs?: number;
  apiKey?: string;
}

export function buildMusixmatchUrl(query: MusixmatchQuery & { apiKey: string }): string {
  const params = new URLSearchParams({
    q_track: query.title,
    q_artist: query.artist,
    subtitle_format: 'lrc',
    apikey: query.apiKey,
  });
  if (query.durationMs && query.durationMs > 0) {
    params.set('f_subtitle_length', String(Math.round(query.durationMs / 1000)));
    params.set('f_subtitle_length_max_deviation', '3');
  }
  return `https://api.musixmatch.com/ws/1.1/matcher.subtitle.get?${params.toString()}`;
}

export function parseMusixmatchResponse(payload: unknown): Array<{ timeMs: number; durationMs: number; text: string }> | null {
  if (!payload || typeof payload !== 'object') return null;
  const anyPayload = payload as {
    message?: {
      header?: { status_code?: number };
      body?: { subtitle?: { subtitle_body?: string } } | unknown[];
    };
  };
  const header = anyPayload.message?.header;
  const body = anyPayload.message?.body;
  if (!header || header.status_code !== 200 || !body || Array.isArray(body)) {
    return null;
  }
  const subtitleBody = (body as { subtitle?: { subtitle_body?: string } }).subtitle?.subtitle_body;
  if (!subtitleBody) return null;
  const lines = parseLrc(subtitleBody);
  return lines.length > 0 ? lines : null;
}

const BASE_URL = 'https://apic.musixmatch.com/ws/1.1';
const APP_ID = 'mobile-app-v1.0';
const FALLBACK_SECRET = 'f09016176ba43a1cfd1031fbd6b3d26c';
const TIMEOUT_MS = 6000;

let cachedUserToken: string | null = null;
const sessionGuid = `oto-${Math.random().toString(36).slice(2, 10)}-${Date.now().toString(36)}`;

function getUtcDateString(): string {
  const d = new Date();
  const year = d.getUTCFullYear();
  const month = String(d.getUTCMonth() + 1).padStart(2, '0');
  const day = String(d.getUTCDate()).padStart(2, '0');
  return `${year}${month}${day}`;
}

function signUrl(url: string, secret = FALLBACK_SECRET): string {
  const normalized = url.replace(/%20/g, '+').replace(/ /g, '+');
  const dateStr = getUtcDateString();
  const signature = hmacSha256Base64(`${normalized}${dateStr}`, secret);
  return `${normalized}&signature=${encodeURIComponent(signature)}&signature_protocol=sha256`;
}

async function signedFetch(url: string, timeoutMs = TIMEOUT_MS): Promise<unknown | null> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const signed = signUrl(url);
    const res = await fetch(signed, {
      signal: controller.signal,
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
        Accept: 'application/json, text/plain, */*',
        'Accept-Language': 'en-US,en;q=0.9',
      },
    });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

async function getOrFetchToken(): Promise<string | null> {
  if (cachedUserToken) return cachedUserToken;

  const url = `${BASE_URL}/token.get?app_id=${APP_ID}&guid=${sessionGuid}&format=json`;
  const data = (await signedFetch(url)) as {
    message?: {
      header?: { status_code?: number };
      body?: { user_token?: string };
    };
  } | null;

  const token = data?.message?.body?.user_token;
  if (token) {
    cachedUserToken = token;
    return token;
  }
  return null;
}

interface MusixmatchTrackItem {
  track_id: number;
  track_name: string;
  artist_name: string;
  track_length?: number;
  has_subtitles?: number;
  has_richsync?: number;
}

interface RichSyncFragment {
  c: string;
  o: number;
}

interface RichSyncEntry {
  ts: number;
  te: number;
  l?: RichSyncFragment[];
  x?: string;
}

interface SubtitleLine {
  text: string;
  time: { total: number };
}

function scoreTrack(
  track: MusixmatchTrackItem,
  targetTitle: string,
  targetArtist: string,
  durationSec: number
): number {
  let score = 0;
  const name = track.track_name.trim().toLowerCase();
  const queryTitle = targetTitle.trim().toLowerCase();

  if (name === queryTitle) {
    score += 80;
  } else if (name.includes(queryTitle) || queryTitle.includes(name)) {
    score += 40;
  }

  if (
    track.artist_name.trim().toLowerCase().includes(targetArtist.trim().toLowerCase())
  ) {
    score += 40;
  }

  if (track.track_length && durationSec > 0) {
    const diff = Math.abs(track.track_length - durationSec);
    if (diff <= 2) score += 30;
    else if (diff <= 5) score += 15;
    else if (diff <= 10) score += 5;
    else score -= 20;
  }

  return score;
}

function parseRichSync(bodyStr: string): LyricLine[] {
  try {
    const entries = JSON.parse(bodyStr) as RichSyncEntry[];
    if (!Array.isArray(entries)) return [];

    const lines: LyricLine[] = [];

    for (let i = 0; i < entries.length; i++) {
      const entry = entries[i];
      if (!entry) continue;

      const lineStart = Math.round(entry.ts * 1000);
      const lineEnd = Math.max(lineStart, Math.round(entry.te * 1000));
      const words: LyricWord[] = [];

      let currentText = '';
      let currentStart = lineStart;
      let currentEnd = lineStart;
      let previousStart = lineStart;

      const fragments = entry.l || [];

      for (let j = 0; j < fragments.length; j++) {
        const frag = fragments[j];
        if (!frag) continue;

        const raw = frag.c;
        if (!raw) continue;

        const start = Math.max(
          lineStart,
          previousStart,
          Math.round((entry.ts + frag.o) * 1000)
        );
        const nextFrag = fragments[j + 1];
        const next = nextFrag ? Math.round((entry.ts + nextFrag.o) * 1000) : lineEnd;
        const end = Math.max(start, Math.min(lineEnd, next));
        previousStart = start;

        if (raw.startsWith(' ') && currentText.trim().length > 0) {
          words.push({
            startMs: currentStart,
            endMs: Math.max(currentStart, currentEnd),
            text: currentText.trim(),
          });
          currentText = '';
        }

        const trimmed = raw.trim();
        if (trimmed.length > 0) {
          if (currentText.length === 0) currentStart = start;
          currentText += trimmed;
          currentEnd = end;
        }

        if (raw.endsWith(' ') && currentText.trim().length > 0) {
          words.push({
            startMs: currentStart,
            endMs: Math.max(currentStart, currentEnd),
            text: currentText.trim(),
          });
          currentText = '';
        }
      }

      if (currentText.trim().length > 0) {
        words.push({
          startMs: currentStart,
          endMs: Math.max(currentStart, currentEnd),
          text: currentText.trim(),
        });
      }

      const fullText =
        (entry.x || '').trim() || words.map((w) => w.text).join(' ');
      if (!fullText) continue;

      lines.push({
        id: `mxm-${i}`,
        timeMs: Math.min(lineStart, words[0]?.startMs ?? lineStart),
        endMs: lineEnd,
        text: fullText,
        words,
        isWordSynced: words.length > 0,
        alignment: 'start',
      });
    }

    return lines.sort((a, b) => a.timeMs - b.timeMs);
  } catch {
    return [];
  }
}

function parseMxmSubtitles(bodyStr: string): LyricLine[] {
  try {
    const raw = JSON.parse(bodyStr) as SubtitleLine[];
    if (!Array.isArray(raw)) return [];

    const lines: LyricLine[] = [];
    for (let i = 0; i < raw.length; i++) {
      const item = raw[i];
      if (!item || !item.text || item.text.trim().length === 0) continue;

      const timeMs = Math.round(item.time.total * 1000);
      lines.push({
        id: `mxm-sub-${i}`,
        timeMs,
        endMs: timeMs + 4000,
        text: item.text.trim(),
        words: [],
        isWordSynced: false,
        alignment: 'start',
      });
    }

    for (let i = 0; i < lines.length - 1; i++) {
      const cur = lines[i];
      const next = lines[i + 1];
      if (cur && next) {
        cur.endMs = next.timeMs;
      }
    }

    return lines;
  } catch {
    return [];
  }
}

export function fetchMusixmatchLyrics(
  query: MusixmatchQuery
): Promise<Array<{ timeMs: number; durationMs: number; text: string }> | null>;
export function fetchMusixmatchLyrics(
  title: string,
  artist?: string,
  durationMs?: number
): Promise<ParsedLyrics | null>;
export async function fetchMusixmatchLyrics(
  titleOrQuery: string | MusixmatchQuery,
  artist?: string,
  durationMs?: number
): Promise<ParsedLyrics | Array<{ timeMs: number; durationMs: number; text: string }> | null> {
  if (typeof titleOrQuery === 'object') {
    if (!titleOrQuery.apiKey) {
      return null;
    }
    const url = buildMusixmatchUrl(titleOrQuery as MusixmatchQuery & { apiKey: string });
    try {
      const res = await fetch(url);
      if (!res.ok) return null;
      return parseMusixmatchResponse(await res.json());
    } catch {
      return null;
    }
  }

  const title = titleOrQuery;
  const targetArtist = artist || '';
  const token = await getOrFetchToken();
  if (!token) return null;

  const durationSec = durationMs ? Math.round(durationMs / 1000) : 0;

  // 1. Search for best matching track
  const searchUrl = `${BASE_URL}/track.search?app_id=${APP_ID}&format=json&q_track=${encodeURIComponent(
    title
  )}&q_artist=${encodeURIComponent(
    targetArtist
  )}&f_has_lyrics=1&s_track_rating=desc&quorum_factor=1&page_size=8&page=1&usertoken=${token}`;

  const searchData = (await signedFetch(searchUrl)) as {
    message?: {
      body?: {
        track_list?: Array<{ track: MusixmatchTrackItem }>;
      };
    };
  } | null;

  const trackList = searchData?.message?.body?.track_list?.map((t) => t.track) || [];
  if (trackList.length === 0) return null;

  let best: MusixmatchTrackItem | null = null;
  let maxScore = -999;
  for (const t of trackList) {
    const s = scoreTrack(t, title, targetArtist, durationSec);
    if (s > maxScore) {
      maxScore = s;
      best = t;
    }
  }

  if (!best || maxScore < 40) return null;

  // 2. Prefer RichSync (Word-level syllable synchronization)
  if (best.has_richsync !== 0) {
    const richUrl = `${BASE_URL}/track.richsync.get?app_id=${APP_ID}&format=json&track_id=${best.track_id}&usertoken=${token}`;
    const richData = (await signedFetch(richUrl)) as {
      message?: {
        body?: {
          richsync?: { richsync_body?: string };
        };
      };
    } | null;

    const richBody = richData?.message?.body?.richsync?.richsync_body;
    if (richBody) {
      const lines = parseRichSync(richBody);
      if (lines.length > 0 && lines.some((l) => l.isWordSynced)) {
        return {
          lines,
          isWordSynced: true,
          isLineSynced: true,
          hasDuet: false,
          script: detectScript(lines.map((l) => l.text).join(' ')),
          provider: 'Musixmatch',
        };
      }
    }
  }

  // 3. Fallback to Subtitles (Line-level synchronization)
  if (best.has_subtitles !== 0) {
    const subUrl = `${BASE_URL}/track.subtitle.get?app_id=${APP_ID}&format=json&track_id=${best.track_id}&subtitle_format=mxm&usertoken=${token}`;
    const subData = (await signedFetch(subUrl)) as {
      message?: {
        body?: {
          subtitle?: { subtitle_body?: string };
        };
      };
    } | null;

    const subBody = subData?.message?.body?.subtitle?.subtitle_body;
    if (subBody) {
      const lines = parseMxmSubtitles(subBody);
      if (lines.length > 0) {
        return {
          lines,
          isWordSynced: false,
          isLineSynced: true,
          hasDuet: false,
          script: detectScript(lines.map((l) => l.text).join(' ')),
          provider: 'Musixmatch',
        };
      }
    }
  }

  return null;
}
