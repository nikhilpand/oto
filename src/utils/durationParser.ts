/**
 * Song Duration Parser
 *
 * Safe parsing of duration display strings (e.g. "3:45", "1:02", "1:02:33")
 * into numeric milliseconds and seconds.
 *
 * Clean-room TypeScript implementation referencing BitChord SongDurationTest.kt.
 *
 * A track's duration frequently arrives as a display string, and downstream components
 * (lyrics matching, quality upgrade, cache range negotiation) need it back as a quantity.
 * Every way of getting this wrong is silent: lyrics providers match and rank on track length,
 * so a duration that parses to zero or NaN silently matches the shortest edit of the song
 * and embeds timings for a different recording.
 *
 * Any input that is not a valid duration returns 0 rather than NaN, null, or throwing.
 */

/**
 * Parses a display duration string into total milliseconds.
 *
 * @param durationText Duration string such as "3:45", "1:02", "1:02:33", or " 3 : 45 "
 * @returns Milliseconds as a non-negative integer, or 0 if unparseable / negative.
 */
export function parseDurationMillis(durationText: string | null | undefined): number {
  if (!durationText || typeof durationText !== 'string') {
    return 0;
  }

  const trimmed = durationText.trim();
  if (trimmed.length === 0) {
    return 0;
  }

  const parts = trimmed.split(':');
  if (parts.length !== 2 && parts.length !== 3) {
    return 0;
  }

  const numbers: number[] = [];
  for (const part of parts) {
    const pTrim = part.trim();
    // Negative numbers or non-digits are strictly disallowed
    if (!/^\d+$/.test(pTrim)) {
      return 0;
    }
    const val = parseInt(pTrim, 10);
    if (isNaN(val) || val < 0) {
      return 0;
    }
    numbers.push(val);
  }

  let totalSeconds = 0;
  if (numbers.length === 2 && numbers[0] !== undefined && numbers[1] !== undefined) {
    const min = numbers[0];
    const sec = numbers[1];
    totalSeconds = min * 60 + sec;
  } else if (
    numbers.length === 3 &&
    numbers[0] !== undefined &&
    numbers[1] !== undefined &&
    numbers[2] !== undefined
  ) {
    const hours = numbers[0];
    const min = numbers[1];
    const sec = numbers[2];
    totalSeconds = hours * 3600 + min * 60 + sec;
  } else {
    return 0;
  }

  return Math.max(0, totalSeconds * 1000);
}

/**
 * Parses a display duration string into total seconds.
 *
 * @param durationText Duration string such as "3:45", "1:02", "1:02:33"
 * @returns Seconds as a non-negative integer, or 0 if unparseable.
 */
export function parseDurationSec(durationText: string | null | undefined): number {
  return Math.floor(parseDurationMillis(durationText) / 1000);
}

/**
 * Formats a duration in seconds or milliseconds into "M:SS" or "H:MM:SS".
 *
 * @param value Duration in seconds or milliseconds
 * @param isMillis If true, value is in milliseconds (default: false)
 * @returns Formatted string (e.g. "3:45", "1:02:33")
 */
export function formatDuration(value: number, isMillis = false): string {
  const totalSec = Math.max(0, Math.floor(isMillis ? value / 1000 : value));
  const hours = Math.floor(totalSec / 3600);
  const minutes = Math.floor((totalSec % 3600) / 60);
  const seconds = totalSec % 60;

  const paddedSec = seconds.toString().padStart(2, '0');

  if (hours > 0) {
    const paddedMin = minutes.toString().padStart(2, '0');
    return `${hours}:${paddedMin}:${paddedSec}`;
  }

  return `${minutes}:${paddedSec}`;
}
