/**
 * AppleLyricsSweep — Progressive Character Sweep & Karaoke Swell Engine
 *
 * Clean-room implementation based on binimum's am-lyrics architecture and
 * BitChord's LyricLine.kt algorithms.
 *
 * Provides:
 * 1. revealedChars(line, positionMs): Exact fractional character reveal across words
 *    and trailing spaces for smooth, stutter-free progressive gradient wipes.
 * 2. wordLift(word, positionMs): 0..1 elevation curve where active sung words
 *    rise smoothly from the baseline and settle back down over 250ms.
 * 3. Note-held letter swell waves (GrowingWord): Sustained vocal notes
 *    ("golden", "hold", "ah") swell progressively letter by letter.
 *
 * @see BitChord/app/src/main/java/com/music/bitchord/data/lyrics/LyricLine.kt
 * @see https://github.com/binimum/am-lyrics
 */

import type { LyricLine, LyricWord } from './types';

const RISE_MS = 250;
const GROW_MAX_CHARS = 7;
const GROW_STAGGER = 0.08;
const GROW_SPAN = 0.35;

/**
 * Calculates how far through the line singing has progressed at positionMs,
 * represented as a fractional index into line.text (0.0 to line.text.length).
 */
export function revealedChars(line: LyricLine, positionMs: number): number {
  if (!line.words || line.words.length === 0) {
    return positionMs >= line.timeMs ? line.text.length : 0;
  }

  let offset = 0;

  for (let index = 0; index < line.words.length; index++) {
    const word = line.words[index]!;
    const startIdx = line.text.indexOf(word.text, offset);
    const start = startIdx >= 0 ? startIdx : offset;
    const end = start + word.text.length;

    if (positionMs < word.startMs) {
      return start;
    }

    if (positionMs < word.endMs) {
      const span = Math.max(1, word.endMs - word.startMs);
      const through = (positionMs - word.startMs) / span;
      return start + through * word.text.length;
    }

    // Trailing whitespace between this word and the next word
    const nextWord = line.words[index + 1];
    if (nextWord && positionMs < nextWord.startMs) {
      const nextIdx = line.text.indexOf(nextWord.text, end);
      const gapStart = nextIdx >= 0 ? nextIdx : end;
      const pause = Math.max(1, nextWord.startMs - word.endMs);
      const through = (positionMs - word.endMs) / pause;
      return end + through * (gapStart - end);
    }

    offset = end;
  }

  return line.text.length;
}

/**
 * Calculates the vertical lift factor (0.0 to 1.0) for a sung word,
 * rising over 250ms from start and falling over 250ms past end.
 */
export function wordLift(word: LyricWord, positionMs: number, riseMs = RISE_MS): number {
  if (positionMs <= word.startMs - riseMs || positionMs >= word.endMs + riseMs) {
    return 0;
  }

  const rising = Math.max(0, Math.min(1, (positionMs - word.startMs) / riseMs));
  const falling = Math.max(0, Math.min(1, 1 - (positionMs - word.endMs) / riseMs));
  const factor = Math.min(rising, falling);

  // Smooth Hermite interpolation: 3x^2 - 2x^3
  return factor * factor * (3 - 2 * factor);
}

/**
 * Checks whether a word qualifies for the letter-by-letter karaoke swell animation.
 * Requires the vocal note to be held for a significant duration relative to word length.
 */
export function canWordGrow(word: LyricWord): boolean {
  const len = word.text.length;
  if (len === 0 || len > GROW_MAX_CHARS) return false;
  if (word.text.includes('-')) return false;

  // Exclude CJK ideographs and Arabic/Hebrew cursive joining scripts
  for (let i = 0; i < len; i++) {
    const code = word.text.charCodeAt(i);
    // CJK Unified Ideographs or Kana/Hangul
    if (code >= 0x4e00 && code <= 0x9fff) return false;
    if (code >= 0x3040 && code <= 0x30ff) return false;
    if (code >= 0xac00 && code <= 0xd7af) return false;
    // Arabic / Hebrew
    if (code >= 0x0590 && code <= 0x06ff) return false;
  }

  const held = word.endMs - word.startMs;

  if (len === 1) return held >= 1100;
  if (len <= 3) return held >= 1360 + (len - 2) * 140;
  if (len === 4) return held >= 1050;
  return held >= 900 && held >= len * 200;
}

export interface CharGrowthState {
  scale: number;
  bloom: number;
  rise: number;
}

/**
 * Samples the progressive letter swell for a held note word at a specific character.
 */
export function sampleCharGrowth(
  word: LyricWord,
  charIndex: number,
  positionMs: number
): CharGrowthState {
  if (!canWordGrow(word) || positionMs < word.startMs || positionMs > word.endMs + 800) {
    return { scale: 1.0, bloom: 0.0, rise: 0.0 };
  }

  const held = Math.max(1, word.endMs - word.startMs);
  const chars = word.text.length;
  const clampedIndex = Math.max(0, Math.min(chars - 1, charIndex));

  // Staggered onset: each letter begins GROW_STAGGER after the preceding one
  const onsetFraction = clampedIndex * GROW_STAGGER;
  const onsetMs = word.startMs + held * onsetFraction;
  const letterDurationMs = held * GROW_SPAN;

  if (positionMs < onsetMs) {
    return { scale: 1.0, bloom: 0.0, rise: 0.0 };
  }

  const progress = Math.min(1.0, (positionMs - onsetMs) / letterDurationMs);
  // Sine bell curve: 0 -> peak (at 0.5) -> 0
  const wave = Math.sin(progress * Math.PI);

  const maxScale = 1.15;
  const scale = 1.0 + wave * (maxScale - 1.0);
  const bloom = wave * 0.8;
  const rise = wave * 4.0; // 4px upward lift

  return { scale, bloom, rise };
}
