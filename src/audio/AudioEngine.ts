/**
 * Platform-Agnostic AudioEngine Contract
 *
 * Defines the strict interface for audio playback in OTO.
 * UI components must NEVER import an audio library directly;
 * all interactions proceed through this abstraction.
 *
 * @see docs/SPEC.md and BITCHORD_RE/03_PLAYBACK.md
 */

import { Track } from '@/domain/types';

export type PlaybackStatus =
  | 'idle'
  | 'loading'
  | 'buffering'
  | 'ready'
  | 'playing'
  | 'paused'
  | 'error';

export type RepeatMode = 'off' | 'all' | 'one';

export type StatusChangeCallback = (status: PlaybackStatus) => void;
export type TrackChangeCallback = (track: Track | null) => void;
export type PositionTickCallback = (
  positionMs: number,
  timestampMs: number,
  rate: number
) => void;
export type ErrorCallback = (error: Error) => void;

export interface AudioEngine {
  /** Loads a track and optionally starts immediate playback. */
  load(track: Track, autoplay: boolean): Promise<void>;

  /** Resumes or begins playback. */
  play(): Promise<void>;

  /** Pauses active playback without resetting position. */
  pause(): Promise<void>;

  /** Seeks to a specific millisecond position in the active track. */
  seekTo(positionMs: number): Promise<void>;

  /** Skips to next track in the active queue. */
  skipToNext(): Promise<void>;

  /** Skips to previous track or restarts if position > 3000ms. */
  skipToPrevious(): Promise<void>;

  /** Sets the tempo playback rate (e.g. 1.0 = normal, 1.25, 1.5). */
  setPlaybackRate(rate: number): Promise<void>;

  /** Sets repeat mode ('off', 'all', 'one'). */
  setRepeatMode(mode: RepeatMode): Promise<void>;

  /** Toggles or sets shuffle mode. */
  setShuffle(enabled: boolean): Promise<void>;

  /** Sets the equal-power crossfade duration in milliseconds (0 to 12000). */
  setCrossfadeDuration(ms: number): Promise<void>;

  /** Gets current status. */
  getStatus(): PlaybackStatus;

  /** Gets current active track or null if idle. */
  getCurrentTrack(): Track | null;

  /** Gets current position in milliseconds. */
  getPosition(): number;

  /** Gets total track duration in milliseconds. */
  getDuration(): number;

  /** Gets current playback rate. */
  getPlaybackRate(): number;

  /** Gets current repeat mode. */
  getRepeatMode(): RepeatMode;

  /** Checks if shuffle is active. */
  isShuffleEnabled(): boolean;

  // ─── Discrete Event Subscriptions ─────────────────────────────────

  onStatusChange(callback: StatusChangeCallback): () => void;
  onTrackChange(callback: TrackChangeCallback): () => void;
  onPositionTick(callback: PositionTickCallback): () => void;
  onError(callback: ErrorCallback): () => void;

  /** Cleans up all background timers, listeners, and audio resources. */
  destroy(): void;
}
