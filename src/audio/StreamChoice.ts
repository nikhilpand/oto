/**
 * StreamChoice — Container Format Continuity & Stream Choice Memory
 *
 * Clean-room TypeScript implementation referencing BitChord StreamChoice.kt.
 *
 * The promise StreamChoice makes: a track being served from one copy keeps
 * being served from that copy.
 *
 * Every live entry stands behind a half-filled cache entry on disk, and the
 * cost of breaking one is not a wrong bitrate but a corrupt file — e.g. the
 * middle of an MP4 appended to a WebM chunk stream.
 *
 * Under memory pressure, overflow drops the oldest choice rather than emptying
 * the map wholesale, ensuring active and read-ahead streams are protected.
 *
 * @see BitChord/app/src/main/java/com/music/bitchord/playback/StreamChoice.kt
 */

export interface SourceStreamFormat {
  readonly codec?: string;
  readonly kbps?: number;
  readonly summary?: string;
}

export interface CachedStreamChoice {
  readonly url: string;
  readonly format?: SourceStreamFormat;
  readonly headers?: Record<string, string>;
  readonly is2MbChunked?: boolean;
}

interface ChoiceRecord {
  readonly stream: CachedStreamChoice;
  readonly at: number;
  readonly substituted: boolean;
}

export class StreamChoiceRegistry {
  private readonly choices = new Map<string, ChoiceRecord>();
  private readonly refusedSubstitutes = new Map<string, number>();

  /** Max active streams remembered before bounded LRU eviction. */
  private readonly maxRemembered: number;
  /** TTL for stream choices (15 minutes). */
  private readonly ttlMs: number;
  /** Refusal cooldown before a failed substitute can be tried again (10 minutes). */
  private readonly refusalMs: number;

  constructor(
    maxRemembered = 32,
    ttlMs = 15 * 60 * 1000,
    refusalMs = 10 * 60 * 1000
  ) {
    this.maxRemembered = maxRemembered;
    this.ttlMs = ttlMs;
    this.refusalMs = refusalMs;
  }

  /**
   * The stream already serving [trackId], or null if this is the first read
   * for it or the previous choice has expired.
   */
  of(trackId: string): CachedStreamChoice | null {
    const choice = this.choices.get(trackId);
    if (!choice) return null;

    const now = Date.now();
    if (now - choice.at > this.ttlMs) {
      this.choices.delete(trackId);
      return null;
    }

    return choice.stream;
  }

  /**
   * Records [stream] as the authoritative copy of [trackId] for this playback.
   *
   * @param trackId Canonical track or video identifier
   * @param stream Resolved stream details
   * @param substituted Whether this copy came from a substitute source (e.g. JioSaavn/Piped)
   */
  remember(
    trackId: string,
    stream: CachedStreamChoice,
    substituted = false
  ): void {
    const now = Date.now();

    if (this.choices.size >= this.maxRemembered) {
      // 1. Purge expired entries
      for (const [key, value] of this.choices.entries()) {
        if (now - value.at > this.ttlMs) {
          this.choices.delete(key);
        }
      }

      // 2. If still at or over capacity, evict the oldest entry (LRU)
      if (this.choices.size >= this.maxRemembered) {
        let oldestKey: string | null = null;
        let oldestTime = Infinity;

        for (const [key, value] of this.choices.entries()) {
          if (value.at < oldestTime) {
            oldestTime = value.at;
            oldestKey = key;
          }
        }

        if (oldestKey !== null) {
          this.choices.delete(oldestKey);
        }
      }
    }

    this.choices.set(trackId, {
      stream,
      at: now,
      substituted,
    });
  }

  /**
   * Whether the copy currently serving [trackId] came from a substitute source.
   */
  isSubstitute(trackId: string): boolean {
    return this.choices.get(trackId)?.substituted === true;
  }

  /**
   * Releases [trackId] to be resolved afresh.
   */
  forget(trackId: string): void {
    this.choices.delete(trackId);
  }

  /**
   * Marks a track whose substituted stream failed, ensuring retries fall back
   * to canonical streams rather than looping the failing substitute.
   */
  refuseSubstitutes(trackId: string): void {
    this.refusedSubstitutes.set(trackId, Date.now());
  }

  /**
   * Whether substitutes are currently refused for this track.
   */
  substitutesRefused(trackId: string): boolean {
    const at = this.refusedSubstitutes.get(trackId);
    if (!at) return false;

    if (Date.now() - at <= this.refusalMs) {
      return true;
    }

    this.refusedSubstitutes.delete(trackId);
    return false;
  }

  /**
   * Clears all remembered choices.
   */
  clear(): void {
    this.choices.clear();
    this.refusedSubstitutes.clear();
  }
}

/** Singleton instance matching BitChord's StreamChoice companion object. */
export const StreamChoice = new StreamChoiceRegistry();
