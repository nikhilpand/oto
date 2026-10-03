/**
 * Pure mathematical utilities for Now Playing scrubber, time display,
 * and pause-scale animations.
 *
 * All functions are pure and worklet-safe (no React state or side effects).
 */

/**
 * Formats a millisecond duration into "m:ss" format.
 * Bounded to 0 for negative, NaN, or non-finite inputs.
 */
export function formatMsToTime(ms: number): string {
  'worklet';
  if (!Number.isFinite(ms) || ms <= 0) {
    return '0:00';
  }

  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;

  const paddedSeconds = seconds < 10 ? `0${seconds}` : `${seconds}`;
  return `${minutes}:${paddedSeconds}`;
}

/**
 * Formats remaining duration into "-m:ss" format.
 */
export function formatRemainingMsToTime(currentMs: number, durationMs: number): string {
  'worklet';
  if (!Number.isFinite(durationMs) || durationMs <= 0) {
    return '-0:00';
  }
  const safeCurrent = Math.max(0, Number.isFinite(currentMs) ? currentMs : 0);
  const remaining = Math.max(0, durationMs - safeCurrent);
  return `-${formatMsToTime(remaining)}`;
}

/**
 * Clamps a horizontal drag touch coordinate within the scrubber track bounds [0, 1].
 */
export function clampScrubProgress(dragX: number, trackWidth: number): number {
  'worklet';
  if (!Number.isFinite(trackWidth) || trackWidth <= 0 || !Number.isFinite(dragX)) {
    return 0;
  }
  const ratio = dragX / trackWidth;
  return Math.max(0, Math.min(1, ratio));
}

/**
 * Calculates the exact target seek millisecond position from a scrub progress ratio.
 */
export function calculateSeekTargetMs(ratio: number, durationMs: number): number {
  'worklet';
  if (!Number.isFinite(durationMs) || durationMs <= 0 || !Number.isFinite(ratio)) {
    return 0;
  }
  const clampedRatio = Math.max(0, Math.min(1, ratio));
  return Math.round(clampedRatio * durationMs);
}

/**
 * Calculates a new position after an accessible increment/decrement step (+/- 10s).
 */
export function calculateAdjustedPosition(
  currentMs: number,
  durationMs: number,
  stepMs: number
): number {
  'worklet';
  const target = currentMs + stepMs;
  return Math.max(0, Math.min(durationMs, target));
}

/**
 * Computes artwork scale based on playback state (Apple Music / OTO specification).
 * Playing: 1.0
 * Paused: 0.92
 */
export function getPauseScale(isPlaying: boolean): number {
  'worklet';
  return isPlaying ? 1.0 : 0.92;
}
