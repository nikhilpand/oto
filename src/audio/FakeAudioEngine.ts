/**
 * FakeAudioEngine — Realistic Timer-Based Audio Engine Simulator
 *
 * Emits position ticks at ~4 Hz (250ms intervals) mimicking native ExoPlayer
 * / AVAudioEngine behavior. Used for UI development and unit testing without
 * native binary dependencies.
 *
 * @see docs/prompts/P03_audio_engine_and_fake.md
 */

import { Track } from '@/domain/types';
import {
  AudioEngine,
  PlaybackStatus,
  RepeatMode,
  StatusChangeCallback,
  TrackChangeCallback,
  PositionTickCallback,
  ErrorCallback,
} from './AudioEngine';

export class FakeAudioEngine implements AudioEngine {
  private currentTrack: Track | null = null;
  private status: PlaybackStatus = 'idle';
  private positionMs = 0;
  private durationMs = 0;
  private playbackRate = 1.0;
  private repeatMode: RepeatMode = 'off';
  private shuffleEnabled = false;
  private crossfadeDurationMs = 3000;

  private timer: ReturnType<typeof setInterval> | null = null;
  private lastTickTimestamp = 0;

  private statusListeners = new Set<StatusChangeCallback>();
  private trackListeners = new Set<TrackChangeCallback>();
  private tickListeners = new Set<PositionTickCallback>();
  private errorListeners = new Set<ErrorCallback>();

  // ─── Lifecycle & Playback Controls ──────────────────────────────────

  async load(track: Track, autoplay = true): Promise<void> {
    this.stopTimer();
    this.currentTrack = track;
    this.positionMs = 0;
    this.durationMs = track.durationMs;
    this.emitTrackChange(track);

    this.setStatus('loading');

    // Simulate realistic 50ms buffer/decode preparation
    await new Promise((resolve) => setTimeout(resolve, 50));

    if (autoplay) {
      this.setStatus('playing');
      this.startTimer();
    } else {
      this.setStatus('ready');
    }
  }

  async play(): Promise<void> {
    if (!this.currentTrack) return;
    if (this.status === 'playing') return;

    this.setStatus('playing');
    this.startTimer();
  }

  async pause(): Promise<void> {
    if (this.status !== 'playing') return;

    this.stopTimer();
    this.setStatus('paused');
  }

  async seekTo(targetPositionMs: number): Promise<void> {
    const clamped = Math.max(0, Math.min(this.durationMs, targetPositionMs));
    this.positionMs = clamped;
    this.lastTickTimestamp = Date.now();
    this.emitPositionTick(this.positionMs, this.lastTickTimestamp, this.playbackRate);
  }

  async skipToNext(): Promise<void> {
    // If repeat one is on, loop track
    if (this.repeatMode === 'one' && this.currentTrack) {
      await this.seekTo(0);
      return;
    }
    // Default fake implementation restarts or clears
    this.stopTimer();
    this.positionMs = 0;
    this.setStatus('idle');
  }

  async skipToPrevious(): Promise<void> {
    // If playing for >3s, restart current song
    if (this.positionMs > 3000) {
      await this.seekTo(0);
      return;
    }
    this.positionMs = 0;
    this.emitPositionTick(0, Date.now(), this.playbackRate);
  }

  async setPlaybackRate(rate: number): Promise<void> {
    this.playbackRate = Math.max(0.25, Math.min(3.0, rate));
    if (this.status === 'playing') {
      this.emitPositionTick(this.positionMs, Date.now(), this.playbackRate);
    }
  }

  async setRepeatMode(mode: RepeatMode): Promise<void> {
    this.repeatMode = mode;
  }

  async setShuffle(enabled: boolean): Promise<void> {
    this.shuffleEnabled = enabled;
  }

  async setCrossfadeDuration(ms: number): Promise<void> {
    this.crossfadeDurationMs = Math.max(0, Math.min(12000, ms));
  }

  // ─── Getters ────────────────────────────────────────────────────────

  getStatus(): PlaybackStatus {
    return this.status;
  }

  getCurrentTrack(): Track | null {
    return this.currentTrack;
  }

  getPosition(): number {
    return this.positionMs;
  }

  getDuration(): number {
    return this.durationMs;
  }

  getPlaybackRate(): number {
    return this.playbackRate;
  }

  getRepeatMode(): RepeatMode {
    return this.repeatMode;
  }

  isShuffleEnabled(): boolean {
    return this.shuffleEnabled;
  }

  getCrossfadeDuration(): number {
    return this.crossfadeDurationMs;
  }

  // ─── Subscriptions ──────────────────────────────────────────────────

  onStatusChange(callback: StatusChangeCallback): () => void {
    this.statusListeners.add(callback);
    callback(this.status);
    return () => this.statusListeners.delete(callback);
  }

  onTrackChange(callback: TrackChangeCallback): () => void {
    this.trackListeners.add(callback);
    callback(this.currentTrack);
    return () => this.trackListeners.delete(callback);
  }

  onPositionTick(callback: PositionTickCallback): () => void {
    this.tickListeners.add(callback);
    return () => this.tickListeners.delete(callback);
  }

  onError(callback: ErrorCallback): () => void {
    this.errorListeners.add(callback);
    return () => this.errorListeners.delete(callback);
  }

  destroy(): void {
    this.stopTimer();
    this.statusListeners.clear();
    this.trackListeners.clear();
    this.tickListeners.clear();
    this.errorListeners.clear();
  }

  // ─── Internal Timer & Event Emission ────────────────────────────────

  private setStatus(newStatus: PlaybackStatus): void {
    this.status = newStatus;
    this.statusListeners.forEach((fn) => fn(newStatus));
  }

  private emitTrackChange(track: Track | null): void {
    this.trackListeners.forEach((fn) => fn(track));
  }

  private emitPositionTick(pos: number, timestamp: number, rate: number): void {
    this.tickListeners.forEach((fn) => fn(pos, timestamp, rate));
  }

  private startTimer(): void {
    this.stopTimer();
    this.lastTickTimestamp = Date.now();

    // 250ms interval (~4 Hz native audio tick rate)
    this.timer = setInterval(() => {
      if (this.status !== 'playing' || !this.currentTrack) return;

      const now = Date.now();
      const elapsedMs = (now - this.lastTickTimestamp) * this.playbackRate;
      this.positionMs = Math.min(this.durationMs, this.positionMs + elapsedMs);
      this.lastTickTimestamp = now;

      this.emitPositionTick(this.positionMs, now, this.playbackRate);

      // Track completion check
      if (this.positionMs >= this.durationMs) {
        if (this.repeatMode === 'one') {
          this.positionMs = 0;
          this.emitPositionTick(0, now, this.playbackRate);
        } else {
          this.skipToNext();
        }
      }
    }, 250);
  }

  private stopTimer(): void {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }
}
