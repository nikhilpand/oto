import type { LyricLine } from './types';

/**
 * Clean-room implementation of standard line-synchronized LRC parser.
 * Reverse-engineered from BitChord (BITCHORD_RE/18_REUSABLE_CODE.md Candidate A.1).
 *
 * Handles industry standard timestamps:
 * [mm:ss.xx] (centiseconds, e.g. 10ms intervals)
 * [mm:ss.xxx] (milliseconds, e.g. 1ms intervals)
 */
export function parseLrc(content: string): LyricLine[] {
  if (!content || typeof content !== 'string') {
    return [];
  }

  const regex = /\[(\d{2}):(\d{2})\.(\d{2,3})\](.*)/;
  const rawLines = content.split('\n');
  const parsedLines: { timeMs: number; text: string }[] = [];

  for (const rawLine of rawLines) {
    const trimmed = rawLine.trim();
    if (!trimmed) continue;

    const match = trimmed.match(regex);
    if (match && match[1] && match[2] && match[3] && match[4] !== undefined) {
      const minutes = parseInt(match[1], 10);
      const seconds = parseInt(match[2], 10);
      const fractionStr = match[3];
      // 2 digits = centiseconds (multiply by 10), 3 digits = exact milliseconds
      const millis =
        fractionStr.length === 2
          ? parseInt(fractionStr, 10) * 10
          : parseInt(fractionStr, 10);
      const timeMs = minutes * 60000 + seconds * 1000 + millis;
      const text = match[4].trim();

      if (text.length > 0) {
        parsedLines.push({ timeMs, text });
      }
    }
  }

  // Sort chronologically
  parsedLines.sort((a, b) => a.timeMs - b.timeMs);

  // Map to full LyricLine domain model with estimated end times
  return parsedLines.map((item, index) => {
    const nextItem = parsedLines[index + 1];
    const endMs = nextItem ? nextItem.timeMs : item.timeMs + 4000;

    return {
      id: `lrc-${index}-${item.timeMs}`,
      timeMs: item.timeMs,
      endMs,
      text: item.text,
      words: [],
      isWordSynced: false,
      alignment: 'start',
    };
  });
}
