/**
 * EnhancedLrcParser — Syllable-Level Enhanced LRC Parser
 *
 * Clean-room implementation based on BitChord's EnhancedLrc.kt.
 * Parses rich sync format served by Musixmatch, SimpMusic, and LrcLib:
 * [00:27.39]<00:27.39>I <00:27.54>been <00:27.74>tryna <00:28.07>call
 *
 * Each word carries precise millisecond start/end timestamps,
 * with full HTML entity decoding (&#x27; -> ') to eliminate raw entity bugs.
 *
 * @see docs/SPEC.md
 * @see BitChord/app/src/main/java/com/music/bitchord/data/lyrics/EnhancedLrc.kt
 */

import type { LyricLine, LyricWord } from './types';

const LINE_REGEX = /^\[(\d{1,3}):(\d{2})[.:](\d{2,3})\](.*)$/;
const WORD_REGEX = /<(\d{1,3}):(\d{2})[.:](\d{2,3})>([^<]*)/g;
const TAIL_MS = 800;
const MIN_GAP_MS = 3500;

function parseTimestamp(minutes: string, seconds: string, fraction: string): number {
  const m = parseInt(minutes, 10);
  const s = parseInt(seconds, 10);
  const fractionMs = fraction.length === 2 ? parseInt(fraction, 10) * 10 : parseInt(fraction, 10);
  return m * 60000 + s * 1000 + fractionMs;
}

/**
 * Decodes HTML entities commonly escaped in syllable lyrics payloads
 * (e.g. &#x27; for apostrophes, &amp; for ampersands).
 */
export function decodeHtmlEntities(text: string): string {
  if (!text.includes('&')) return text;
  return text
    .replace(/&#x([0-9a-fA-F]+);/g, (_, hex) => String.fromCharCode(parseInt(hex, 16)))
    .replace(/&#(\d+);/g, (_, dec) => String.fromCharCode(parseInt(dec, 10)))
    .replace(/&apos;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&nbsp;/g, ' ')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    // Must be last to avoid double-decoding &amp;#x27;
    .replace(/&amp;/g, '&');
}

interface ParsedWordMatch {
  startMs: number;
  rawText: string;
}

interface RawParsedRow {
  timeMs: number;
  words: ParsedWordMatch[];
  plain: string;
}

/**
 * Inserts instrumental break rows (isGap = true) when there is a significant
 * musical interlude (>= 3500ms) between lyric lines.
 */
export function withInstrumentalGaps(lines: LyricLine[]): LyricLine[] {
  if (lines.length === 0) return [];

  const result: LyricLine[] = [];

  for (let i = 0; i < lines.length; i++) {
    const current = lines[i];
    if (!current) continue;

    result.push(current);

    const next = lines[i + 1];
    if (next) {
      const silenceMs = next.timeMs - current.endMs;
      if (silenceMs >= MIN_GAP_MS) {
        result.push({
          id: `gap-${current.endMs}-${next.timeMs}`,
          timeMs: current.endMs,
          endMs: next.timeMs,
          text: '',
          words: [],
          isWordSynced: false,
          alignment: 'start',
          isGap: true,
        });
      }
    }
  }

  return result;
}

/**
 * Parses an Enhanced LRC string. Returns an empty array if the string
 * does not contain any word-level timestamps (<mm:ss.xx>).
 */
export function parseEnhancedLrc(lrc: string): LyricLine[] {
  if (!lrc || typeof lrc !== 'string') return [];

  const lines = lrc.split('\n');
  const rows: RawParsedRow[] = [];

  for (const rawLine of lines) {
    const trimmed = rawLine.trim();
    if (!trimmed) continue;

    const lineMatch = trimmed.match(LINE_REGEX);
    if (!lineMatch || !lineMatch[1] || !lineMatch[2] || !lineMatch[3] || lineMatch[4] === undefined) {
      continue;
    }

    const timeMs = parseTimestamp(lineMatch[1], lineMatch[2], lineMatch[3]);
    const remainder = lineMatch[4];

    const words: ParsedWordMatch[] = [];
    const wordMatches = remainder.matchAll(WORD_REGEX);

    for (const match of wordMatches) {
      if (match[1] && match[2] && match[3] && match[4] !== undefined) {
        const wordStart = parseTimestamp(match[1], match[2], match[3]);
        words.push({ startMs: wordStart, rawText: match[4] });
      }
    }

    rows.push({
      timeMs,
      words,
      plain: remainder.trim(),
    });
  }

  // If no lines contain word-level stamps, this is standard LRC, not Enhanced LRC
  if (rows.every((r) => r.words.length === 0)) {
    return [];
  }

  rows.sort((a, b) => a.timeMs - b.timeMs);

  const parsedLines: LyricLine[] = [];

  for (let index = 0; index < rows.length; index++) {
    const row = rows[index];
    if (!row) continue;

    if (row.words.length === 0) {
      const text = decodeHtmlEntities(row.plain);
      if (text.length > 0) {
        const nextTime = rows[index + 1]?.timeMs ?? row.timeMs + 4000;
        parsedLines.push({
          id: `elrc-line-${index}-${row.timeMs}`,
          timeMs: row.timeMs,
          endMs: nextTime,
          text,
          words: [],
          isWordSynced: false,
          alignment: 'start',
        });
      }
      continue;
    }

    // A word runs until the next word starts; the last word runs until the next line starts
    const lineEndMs = rows[index + 1]?.timeMs ?? (row.words[row.words.length - 1]!.startMs + TAIL_MS);

    const lyricWords: LyricWord[] = [];
    for (let i = 0; i < row.words.length; i++) {
      const match = row.words[i]!;
      const text = decodeHtmlEntities(match.rawText).trim();
      if (!text) continue;

      const wordStart = match.startMs;
      const nextWord = row.words[i + 1];
      const wordEnd = nextWord ? nextWord.startMs : lineEndMs;

      lyricWords.push({
        startMs: wordStart,
        endMs: Math.max(wordStart, wordEnd),
        text,
      });
    }

    if (lyricWords.length === 0) continue;

    const fullText = lyricWords.map((w) => w.text).join(' ');
    const lineStart = Math.min(row.timeMs, lyricWords[0]!.startMs);
    const lineEnd = lyricWords[lyricWords.length - 1]!.endMs;

    parsedLines.push({
      id: `elrc-${index}-${lineStart}`,
      timeMs: lineStart,
      endMs: lineEnd,
      text: fullText,
      words: lyricWords,
      isWordSynced: true,
      alignment: 'start',
    });
  }

  return withInstrumentalGaps(parsedLines);
}
