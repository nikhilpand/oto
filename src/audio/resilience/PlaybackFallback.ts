/**
 * PlaybackFallback — Stream Resilience Engine
 *
 * When a primary stream fails mid-playback (network error, CDN timeout,
 * 403 token expiry), this module orchestrates the retry/fallback waterfall
 * to find an alternative source transparently.
 *
 * @classification ALGORITHM_PORT
 * @priority P1
 * @portedFrom BitChord: playback/PlaybackFallback.kt
 *
 * CLEAN-ROOM IMPLEMENTATION
 * Algorithm port — retry with next source from StreamResolver waterfall.
 */

import { Track, ResolvedStream } from '@/domain/types';

// ─── Types ────────────────────────────────────────────────────────────

export type StreamResolver = (
  track: Track,
  excludeSources: string[]
) => Promise<ResolvedStream | null>;

export interface FallbackResult {
  /** Whether a fallback stream was found */
  success: boolean;
  /** The fallback stream (null if all sources exhausted) */
  stream: ResolvedStream | null;
  /** Number of sources attempted before success/failure */
  attemptsCount: number;
  /** Source IDs that were tried and failed */
  failedSources: string[];
}

export interface FallbackConfig {
  /** Maximum number of retry attempts per track */
  maxRetries: number;
  /** Delay between retries in ms (exponential backoff base) */
  baseDelayMs: number;
  /** Maximum delay between retries in ms */
  maxDelayMs: number;
  /** Whether to attempt the same source again after delay */
  retrySameSource: boolean;
}

// ─── Default Config ───────────────────────────────────────────────────

const DEFAULT_CONFIG: FallbackConfig = {
  maxRetries: 3,
  baseDelayMs: 500,
  maxDelayMs: 5000,
  retrySameSource: false,
};

// ─── State ────────────────────────────────────────────────────────────

let config: FallbackConfig = { ...DEFAULT_CONFIG };
let resolver: StreamResolver | null = null;

// ─── Helpers ──────────────────────────────────────────────────────────

function computeDelay(attempt: number): number {
  // Exponential backoff with jitter
  const exponential = Math.min(
    config.maxDelayMs,
    config.baseDelayMs * Math.pow(2, attempt)
  );
  const jitter = exponential * 0.2 * Math.random();
  return exponential + jitter;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// ─── Public API ───────────────────────────────────────────────────────

export const PlaybackFallback = {
  /**
   * Register the stream resolver function (called once at app init).
   * This is typically the SourceRegistry's resolve method.
   */
  registerResolver(fn: StreamResolver): void {
    resolver = fn;
  },

  /**
   * Update fallback configuration.
   */
  configure(partial: Partial<FallbackConfig>): void {
    config = { ...config, ...partial };
  },

  /**
   * Attempt to find an alternative stream for a track after a failure.
   *
   * Flow:
   * 1. If retrySameSource is false, exclude the failed source
   * 2. Try next source in the waterfall
   * 3. On failure, apply exponential backoff and retry
   * 4. After maxRetries, return failure result
   */
  async attemptFallback(params: {
    track: Track;
    failedSourceId: string;
    failedError?: Error;
  }): Promise<FallbackResult> {
    if (!resolver) {
      return {
        success: false,
        stream: null,
        attemptsCount: 0,
        failedSources: [params.failedSourceId],
      };
    }

    const failedSources: string[] = [params.failedSourceId];
    let attempts = 0;

    while (attempts < config.maxRetries) {
      attempts++;

      // Determine which sources to exclude
      const excludeSources = config.retrySameSource
        ? [] // Allow retry of same source
        : [...failedSources];

      try {
        const stream = await resolver(params.track, excludeSources);

        if (stream) {
          return {
            success: true,
            stream,
            attemptsCount: attempts,
            failedSources,
          };
        }

        // No stream returned — source exhausted, but not an error
        // This means all available sources have been tried
        break;
      } catch (err) {
        // Source threw an error — record the failed source for exclusion.
        // The resolver may attach a sourceId to the error; fall back to
        // a synthetic ID so we still expand the exclusion set each loop.
        const errSourceId =
          err instanceof Error && 'sourceId' in err
            ? String((err as Error & { sourceId: string }).sourceId)
            : `unknown_source_${attempts}`;
        if (!failedSources.includes(errSourceId)) {
          failedSources.push(errSourceId);
        }
      }

      // Backoff before next attempt
      if (attempts < config.maxRetries) {
        const delay = computeDelay(attempts - 1);
        await sleep(delay);
      }
    }

    return {
      success: false,
      stream: null,
      attemptsCount: attempts,
      failedSources,
    };
  },

  /**
   * Quick check if a stream URL has likely expired.
   * CDN tokens typically embed expiry timestamps.
   */
  isStreamExpired(stream: ResolvedStream): boolean {
    if (stream.expiresAt <= 0) return false;
    // Add 30s buffer before actual expiry
    return Date.now() > stream.expiresAt - 30_000;
  },

  /**
   * Pre-emptively refresh a stream before it expires.
   * Called by the crossfade arming window.
   */
  async refreshIfNeeded(
    track: Track,
    currentStream: ResolvedStream
  ): Promise<ResolvedStream> {
    if (!PlaybackFallback.isStreamExpired(currentStream)) {
      return currentStream;
    }

    if (!resolver) return currentStream;

    try {
      const fresh = await resolver(track, []);
      return fresh ?? currentStream;
    } catch {
      return currentStream;
    }
  },
} as const;
