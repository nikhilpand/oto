/**
 * Player Motion Mathematics (UI Thread Worklet Compatible)
 *
 * Implements pure mathematical functions for translating vertical pan gesture
 * deltas into normalized playerProgress (0..1), velocity-based snap selection,
 * and continuous rect bounds travel between mini and full player states.
 *
 * @see docs/prompts/P04_player_shell_mini_full.md
 */

export interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

/**
 * Calculates normalized player progress from gesture translation.
 * Upward drag (-Y) increases progress toward full (1.0).
 * Downward drag (+Y) decreases progress toward mini (0.0).
 */
export function calculateProgressFromTranslation(
  translationY: number,
  screenHeight: number,
  initialProgress: number
): number {
  'worklet';
  if (screenHeight <= 0) return initialProgress;
  const deltaProgress = -translationY / screenHeight;
  const target = initialProgress + deltaProgress;
  return Math.max(0, Math.min(1, target));
}

/**
 * Determines whether to snap to 0 (mini) or 1 (full) based on
 * gesture release velocity (dp/s) and current progress.
 *
 * @param currentProgress Current progress between 0 and 1
 * @param velocityY Vertical release velocity in dp/s (negative = upward)
 * @param flingThreshold Fling threshold in dp/s (default 1200 dp/s per design spec)
 */
export function determineSnapTarget(
  currentProgress: number,
  velocityY: number,
  flingThreshold = 1200
): 0 | 1 {
  'worklet';
  // Upward fling: snap to full player
  if (velocityY < -flingThreshold) {
    return 1;
  }
  // Downward fling: snap to mini player
  if (velocityY > flingThreshold) {
    return 0;
  }
  // Position threshold: snap to whichever side it's closest to
  return currentProgress > 0.5 ? 1 : 0;
}

/**
 * Computes intermediate Rect bounds for artwork travel.
 * Continuous interpolation with zero jumps or visual snapping.
 */
export function interpolateArtworkBounds(
  progress: number,
  miniRect: Rect,
  fullRect: Rect
): Rect {
  'worklet';
  const clampedProgress = Math.max(0, Math.min(1, progress));
  return {
    x: miniRect.x + (fullRect.x - miniRect.x) * clampedProgress,
    y: miniRect.y + (fullRect.y - miniRect.y) * clampedProgress,
    width: miniRect.width + (fullRect.width - miniRect.width) * clampedProgress,
    height: miniRect.height + (fullRect.height - miniRect.height) * clampedProgress,
  };
}
