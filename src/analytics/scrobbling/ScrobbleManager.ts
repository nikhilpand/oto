/**
 * ScrobbleManager — Last.fm & ListenBrainz Real-Time Scrobbling Engine
 *
 * Clean-room implementation inspired by BitChord's ScrobbleManager.kt.
 *
 * Automatically tracks listening lifecycle:
 * 1. Broadcasts "Now Playing" immediately when playback begins.
 * 2. Accurately tracks accumulated listening time across pause/resume cycles.
 * 3. Submits "Scrobble" once 50% or 4 minutes of the track has been heard.
 * 4. Gated qualification: ignores short tracks (<30s).
 * 5. Queues failed scrobbles for offline retry.
 *
 * @see BitChord/app/src/main/java/com/music/bitchord/data/scrobbling/ScrobbleManager.kt
 */

import type { Track } from '@/domain/types';
import type {
  ScrobbleTrackPayload,
  ScrobbleAccountConfig,
  QueuedScrobble,
} from './ScrobbleTypes';

export type ScrobbleDispatcher = (payload: ScrobbleTrackPayload) => Promise<boolean>;
export type NowPlayingDispatcher = (payload: ScrobbleTrackPayload) => Promise<boolean>;

export class ScrobbleManager {
  private config: ScrobbleAccountConfig;
  private nowPlayingDispatcher: NowPlayingDispatcher | null = null;
  private scrobbleDispatcher: ScrobbleDispatcher | null = null;

  private currentTrack: Track | null = null;
  private trackStartedAtSeconds = 0;
  private accumulatedMs = 0;
  private lastSessionStartMs = 0;
  private isCurrentlyPlaying = false;
  private hasScrobbledCurrent = false;
  private timerHandle: ReturnType<typeof setTimeout> | null = null;

  private offlineQueue: QueuedScrobble[] = [];

  constructor(config: Partial<ScrobbleAccountConfig> = {}) {
    this.config = {
      isEnabled: true,
      scrobbleDelayPercent: 0.5,
      maxDelaySeconds: 240,
      minDurationSeconds: 30,
      ...config,
    };
  }

  public setConfig(updated: Partial<ScrobbleAccountConfig>): void {
    this.config = { ...this.config, ...updated };
  }

  public setDispatchers(
    nowPlaying: NowPlayingDispatcher | null,
    scrobble: ScrobbleDispatcher | null
  ): void {
    this.nowPlayingDispatcher = nowPlaying;
    this.scrobbleDispatcher = scrobble;
  }

  public getOfflineQueue(): readonly QueuedScrobble[] {
    return this.offlineQueue;
  }

  public clearOfflineQueue(): void {
    this.offlineQueue = [];
  }

  /**
   * Called when a track starts playing from the beginning or switches.
   */
  public onSongStart(track: Track): void {
    this.resetTimer();

    if (!this.config.isEnabled) return;

    this.currentTrack = track;
    this.trackStartedAtSeconds = Math.floor(Date.now() / 1000);
    this.accumulatedMs = 0;
    this.lastSessionStartMs = Date.now();
    this.isCurrentlyPlaying = true;
    this.hasScrobbledCurrent = false;

    const payload = this.buildPayload(track);

    // 1. Dispatch Now Playing immediately
    if (this.nowPlayingDispatcher) {
      void this.nowPlayingDispatcher(payload);
    }

    // 2. Schedule qualifying scrobble
    this.scheduleScrobble(track);
  }

  /**
   * Called when playback is paused.
   */
  public onSongPause(): void {
    if (!this.isCurrentlyPlaying || !this.currentTrack) return;

    this.resetTimer();
    const now = Date.now();
    this.accumulatedMs += Math.max(0, now - this.lastSessionStartMs);
    this.isCurrentlyPlaying = false;
  }

  /**
   * Called when playback is resumed for the same track.
   */
  public onSongResume(): void {
    if (this.isCurrentlyPlaying || !this.currentTrack || this.hasScrobbledCurrent) return;

    this.isCurrentlyPlaying = true;
    this.lastSessionStartMs = Date.now();
    this.scheduleScrobble(this.currentTrack);
  }

  /**
   * Called when playback stops or skips to another track.
   */
  public onSongStop(): void {
    this.resetTimer();
    this.currentTrack = null;
    this.isCurrentlyPlaying = false;
    this.hasScrobbledCurrent = false;
    this.accumulatedMs = 0;
  }

  /**
   * Master playback state coordinator.
   */
  public onPlayerStateChanged(isPlaying: boolean, track: Track | null): void {
    if (!track) {
      this.onSongStop();
      return;
    }

    if (this.currentTrack?.id !== track.id) {
      if (isPlaying) {
        this.onSongStart(track);
      } else {
        this.onSongStop();
      }
    } else {
      if (isPlaying && !this.isCurrentlyPlaying) {
        this.onSongResume();
      } else if (!isPlaying && this.isCurrentlyPlaying) {
        this.onSongPause();
      }
    }
  }

  private scheduleScrobble(track: Track): void {
    const durationSeconds = Math.floor(track.durationMs / 1000);
    const minDur = this.config.minDurationSeconds ?? 30;

    // Under min duration threshold — do not scrobble
    if (durationSeconds < minDur) return;

    const targetPercent = this.config.scrobbleDelayPercent ?? 0.5;
    const maxDelaySeconds = this.config.maxDelaySeconds ?? 240;

    const qualifyingMs = Math.min(
      durationSeconds * 1000 * targetPercent,
      maxDelaySeconds * 1000
    );

    const remainingMs = Math.max(0, qualifyingMs - this.accumulatedMs);

    if (remainingMs === 0) {
      this.executeScrobble(track);
      return;
    }

    this.timerHandle = setTimeout(() => {
      this.executeScrobble(track);
    }, remainingMs);
  }

  private executeScrobble(track: Track): void {
    if (this.hasScrobbledCurrent) return;
    this.hasScrobbledCurrent = true;

    const payload = this.buildPayload(track);

    if (this.scrobbleDispatcher) {
      this.scrobbleDispatcher(payload).then((success) => {
        if (!success) {
          this.enqueueOffline(payload);
        }
      }).catch(() => {
        this.enqueueOffline(payload);
      });
    } else {
      this.enqueueOffline(payload);
    }
  }

  private enqueueOffline(payload: ScrobbleTrackPayload): void {
    this.offlineQueue.push({
      payload,
      targetService: 'both',
      retryCount: 0,
      queuedAt: Date.now(),
    });
  }

  /**
   * Retries all queued offline scrobbles when connection is restored.
   */
  public async flushOfflineQueue(): Promise<number> {
    if (!this.scrobbleDispatcher || this.offlineQueue.length === 0) {
      return 0;
    }

    const items = [...this.offlineQueue];
    this.offlineQueue = [];
    let flushedCount = 0;

    for (const item of items) {
      try {
        const success = await this.scrobbleDispatcher(item.payload);
        if (success) {
          flushedCount++;
        } else {
          this.offlineQueue.push({
            ...item,
            retryCount: item.retryCount + 1,
          });
        }
      } catch {
        this.offlineQueue.push({
          ...item,
          retryCount: item.retryCount + 1,
        });
      }
    }

    return flushedCount;
  }

  private resetTimer(): void {
    if (this.timerHandle) {
      clearTimeout(this.timerHandle);
      this.timerHandle = null;
    }
  }

  private buildPayload(track: Track): ScrobbleTrackPayload {
    return {
      trackId: track.id,
      title: track.title,
      artist: track.artist,
      album: track.album,
      durationSeconds: Math.floor(track.durationMs / 1000),
      timestampSeconds: this.trackStartedAtSeconds,
    };
  }

  public destroy(): void {
    this.resetTimer();
    this.currentTrack = null;
    this.isCurrentlyPlaying = false;
  }
}
