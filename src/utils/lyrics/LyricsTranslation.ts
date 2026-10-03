/**
 * Lyrics Translation Service
 *
 * Reverse engineered from BitChord (LyricsTranslation.kt).
 * Translates lyric lines using lightweight batching via Google Translate API.
 * Uses unicode boundary markers (\uE000...\uE001) to translate full songs in 1-2 network calls.
 */

import type { LyricLine, ParsedLyrics } from './types';

const ENDPOINT = 'https://translate.googleapis.com/translate_a/single';
const MARKER_START = '\uE000';
const MARKER_END = '\uE001';
const MARKER_REGEX = /\uE000[^\uE001]*\uE001/;

const translationMemoryCache = new Map<string, string[]>();

export class LyricsTranslationService {
  /**
   * Translates an array of lyric lines to target language (default 'en').
   */
  static async translate(
    trackId: string,
    lines: LyricLine[],
    targetLang = 'en'
  ): Promise<ParsedLyrics | null> {
    if (!lines || lines.length === 0) return null;

    const cacheKey = `${trackId}:${targetLang}:${lines.length}`;
    const cached = translationMemoryCache.get(cacheKey);
    if (cached && cached.length === lines.length) {
      return {
        lines: lines.map((l, i) => ({
          ...l,
          text: cached[i] || l.text,
        })),
        isWordSynced: false,
        isLineSynced: true,
        hasDuet: false,
        script: 'latin',
        isTranslated: true,
      };
    }

    try {
      // Build batch payload with markers
      const validLines = lines.map((l) => l.text.trim());
      const payload = validLines
        .map((text, i) => `${MARKER_START}${i}${MARKER_END} ${text}`)
        .join('\n');

      const url = new URL(ENDPOINT);
      url.searchParams.set('client', 'gtx');
      url.searchParams.set('sl', 'auto');
      url.searchParams.set('tl', targetLang);
      url.searchParams.set('dt', 't');
      url.searchParams.set('q', payload);

      const res = await fetch(url.toString(), {
        headers: {
          'User-Agent': 'OTO-Music/1.0',
          Accept: 'application/json',
        },
      });

      if (!res.ok) return null;
      const data = (await res.json()) as unknown[];
      if (!Array.isArray(data) || !Array.isArray(data[0])) return null;

      const segments = data[0] as [string][];
      const translatedBody = segments.map((s) => s[0] || '').join('');

      const parts = translatedBody
        .split(MARKER_REGEX)
        .map((p) => p.trim())
        .filter((p) => p.length > 0);

      if (parts.length !== lines.length) {
        return null;
      }

      translationMemoryCache.set(cacheKey, parts);

      return {
        lines: lines.map((line, i) => ({
          ...line,
          text: parts[i] || line.text,
        })),
        isWordSynced: false,
        isLineSynced: true,
        hasDuet: false,
        script: 'latin',
        isTranslated: true,
      };
    } catch {
      return null;
    }
  }
}
