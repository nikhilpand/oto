/**
 * RealAudioEngine — Native ExoPlayer / Media3 Audio Engine via expo-audio
 *
 * Implements the OTO AudioEngine interface for low-latency, real CDN streaming
 * resolved dynamically from the complete-streaming backend.
 * Zero hardcoded fallback URLs or mock streams.
 *
 * Emits ~4 Hz position updates to drive 120 Hz UI-thread playhead interpolation
 * without triggering React re-renders.
 *
 * @see docs/prompts/P03_audio_engine_and_fake.md
 * @see BITCHORD_RE/03_PLAYBACK.md
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
import { useQueueStore } from '@/store/useQueueStore';
import { usePlaybackStore } from '@/store/usePlaybackStore';
import { resolveLiveStream } from '@/api/otoBackend';
import { useDownloadStore } from '@/downloads/DownloadStore';
import { localUriForTrack } from '@/downloads/DownloadEngine';
import { getCachedStreamUri, cacheStreamInBackground } from './cache/StreamCache';
import { FakeAudioEngine } from './FakeAudioEngine';
import { ListeningRecorder } from '@/analytics/ListeningRecorder';
import { useStreamDiagnosticsStore, type DeliverySource } from '@/player/diagnostics/StreamDiagnosticsStore';
import { jioSaavnCircuitBreaker } from '@/api/resilience/circuitBreaker';

// Safely require expo-audio to prevent test crashes in Node.js test runners
let ExpoAudio: typeof import('expo-audio') | null = null;
try {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  ExpoAudio = require('expo-audio');
  if (ExpoAudio?.setAudioModeAsync) {
    void ExpoAudio.setAudioModeAsync({
      playsInSilentMode: true,
      interruptionMode: 'doNotMix',
      shouldPlayInBackground: true,
    });
  }
} catch {
  ExpoAudio = null;
}

export class RealAudioEngine implements AudioEngine {
  private currentTrack: Track | null = null;
  private status: PlaybackStatus = 'idle';
  private positionMs = 0;
  private durationMs = 0;
  private playbackRate = 1.0;
  private repeatMode: RepeatMode = 'off';
  private shuffleEnabled = false;
  private crossfadeDurationMs = 3000;
  private volume = 1.0;

  // Native player instance
  private player: any = null;
  private playerSubscription: { remove: () => void } | null = null;

  // Fallback simulator for unit tests or environments without native binary
  private fallbackEngine: FakeAudioEngine | null = null;

  private statusListeners = new Set<StatusChangeCallback>();
  private trackListeners = new Set<TrackChangeCallback>();
  private tickListeners = new Set<PositionTickCallback>();
  private errorListeners = new Set<ErrorCallback>();

  constructor() {
    if (!ExpoAudio || !ExpoAudio.createAudioPlayer) {
      this.fallbackEngine = new FakeAudioEngine();
    }
  }

  // ─── Lifecycle & Playback Controls ──────────────────────────────────

  async load(track: Track, autoplay = true): Promise<void> {
    if (this.fallbackEngine) {
      return this.fallbackEngine.load(track, autoplay);
    }

    this.currentTrack = track;
    this.positionMs = 0;
    this.durationMs = track.durationMs;
    this.emitTrackChange(track);
    this.setStatus('loading');

    try {
      const startTime = Date.now();
      let streamUrl: string | null = null;
      let headers: Record<string, string> | undefined = undefined;
      let deliverySource: DeliverySource = 'unknown';
      let bitrateKbps = 320;
      let codec = 'AAC';

      // 1. Check user explicit download first (0ms latency, zero data consumption)
      try {
        if (useDownloadStore.getState().isDownloaded(track.id)) {
          streamUrl = localUriForTrack(track.id);
          deliverySource = 'offline_download';
        }
      } catch {
        // Fall through
      }

      // 2. Check transparent LRU stream cache (previously streamed tracks)
      if (!streamUrl) {
        try {
          const cachedStream = await getCachedStreamUri(track.id);
          if (cachedStream) {
            streamUrl = cachedStream;
            deliverySource = 'stream_cache';
          }
        } catch {
          // Fall through
        }
      }

      // 3. Resolve real live stream directly on-device if not cached
      if (!streamUrl) {
        const resolved = await resolveLiveStream(track.id, {
          title: track.title,
          artist: track.artist,
          durationMs: track.durationMs,
        });

        if (!resolved || !resolved.streamUrl) {
          throw new Error(
            `Could not resolve stream for "${track.title}" by ${track.artist} (${track.id})`
          );
        }

        streamUrl = resolved.streamUrl;
        headers = resolved.headers;
        deliverySource = resolved.sourceId === 'saavn' ? 'direct_saavn_cdn' : 'federated_fallback';
        bitrateKbps = resolved.bitrate || 320;
        codec = (resolved.format || 'AAC').toUpperCase();

        // 4. Background write-through to transparent stream cache
        cacheStreamInBackground(track.id, resolved.streamUrl, resolved.headers);
      }

      const resolutionLatencyMs = Date.now() - startTime;
      useStreamDiagnosticsStore.getState().setDiagnostics({
        trackId: track.id,
        title: track.title,
        artist: track.artist,
        deliverySource,
        bitrateKbps,
        codec,
        resolutionLatencyMs,
        circuitBreakerStatus: jioSaavnCircuitBreaker.getState(),
        resolvedAt: Date.now(),
        uri: streamUrl,
      });

      // 5. Clean up existing subscription
      if (this.playerSubscription) {
        this.playerSubscription.remove();
        this.playerSubscription = null;
      }

      const source = {
        uri: streamUrl,
        headers,
      };

      if (!this.player) {
        this.player = ExpoAudio!.createAudioPlayer(source, {
          updateInterval: 250, // 4 Hz emission for UI interpolation
          preferredForwardBufferDuration: 15,
        });
      } else {
        this.player.replace(source);
      }

      try {
        this.player.volume = this.volume;
      } catch {
        // ignore
      }

      this.setupPlayerListeners();

      if (autoplay) {
        this.player.play();
        this.setStatus('playing');
      } else {
        this.setStatus('ready');
      }
    } catch (err: any) {
      const error = err instanceof Error ? err : new Error(String(err));
      console.error('[RealAudioEngine] Load error:', error.message);
      this.emitError(error);
      this.setStatus('error');
    }
  }

  async play(): Promise<void> {
    if (this.fallbackEngine) {
      return this.fallbackEngine.play();
    }

    // If player is not initialized yet, load the active track
    if (!this.player) {
      const trackToPlay = this.currentTrack || usePlaybackStore.getState().currentTrack;
      if (trackToPlay) {
        await this.load(trackToPlay, true);
        return;
      }
      return;
    }

    try {
      this.player.play();
      this.setStatus('playing');
    } catch (err: any) {
      this.emitError(err instanceof Error ? err : new Error(String(err)));
    }
  }

  async pause(): Promise<void> {
    if (this.fallbackEngine) {
      return this.fallbackEngine.pause();
    }
    if (!this.player) return;

    try {
      this.player.pause();
      this.setStatus('paused');
    } catch (err: any) {
      this.emitError(err instanceof Error ? err : new Error(String(err)));
    }
  }

  async seekTo(targetPositionMs: number): Promise<void> {
    if (this.fallbackEngine) {
      return this.fallbackEngine.seekTo(targetPositionMs);
    }
    if (!this.player) return;

    const clamped = Math.max(0, Math.min(this.durationMs || 999999, targetPositionMs));
    this.positionMs = clamped;

    try {
      await this.player.seekTo(clamped / 1000);
      this.emitPositionTick(this.positionMs, Date.now(), this.playbackRate);
    } catch (err: any) {
      this.emitError(err instanceof Error ? err : new Error(String(err)));
    }
  }

  async skipToNext(): Promise<void> {
    if (this.fallbackEngine) {
      return this.fallbackEngine.skipToNext();
    }

    const activeRepeat =
      this.repeatMode !== 'off'
        ? this.repeatMode
        : usePlaybackStore.getState().repeatMode;

    if (activeRepeat === 'one' && this.currentTrack) {
      await this.seekTo(0);
      await this.play();
      return;
    }

    const nextItem = useQueueStore.getState().popNext(activeRepeat);
    if (nextItem) {
      await this.load(nextItem, true);
    } else {
      await this.pause();
      await this.seekTo(0);
      this.setStatus('ready');
    }
  }

  async skipToPrevious(): Promise<void> {
    if (this.fallbackEngine) {
      return this.fallbackEngine.skipToPrevious();
    }

    if (this.positionMs > 3000) {
      await this.seekTo(0);
      return;
    }

    const prevItem = useQueueStore.getState().popPrevious();
    if (prevItem) {
      await this.load(prevItem, true);
    } else {
      await this.seekTo(0);
    }
  }

  async setPlaybackRate(rate: number): Promise<void> {
    if (this.fallbackEngine) {
      return this.fallbackEngine.setPlaybackRate(rate);
    }
    this.playbackRate = Math.max(0.5, Math.min(2.0, rate));
    if (this.player) {
      this.player.setPlaybackRate(this.playbackRate);
    }
  }

  async setRepeatMode(mode: RepeatMode): Promise<void> {
    if (this.fallbackEngine) {
      return this.fallbackEngine.setRepeatMode(mode);
    }
    this.repeatMode = mode;
    usePlaybackStore.getState().setRepeatMode(mode);
  }

  async setShuffle(enabled: boolean): Promise<void> {
    if (this.fallbackEngine) {
      return this.fallbackEngine.setShuffle(enabled);
    }
    this.shuffleEnabled = enabled;
    usePlaybackStore.getState().setShuffle(enabled);
  }

  async setCrossfadeDuration(ms: number): Promise<void> {
    this.crossfadeDurationMs = Math.max(0, Math.min(12000, ms));
  }

  async setVolume(volume: number): Promise<void> {
    const clamped = Math.max(0, Math.min(1, volume));
    this.volume = clamped;
    if (this.fallbackEngine) {
      return this.fallbackEngine.setVolume(clamped);
    }
    if (this.player) {
      try {
        this.player.volume = clamped;
      } catch {
        // ignore
      }
    }
  }

  getVolume(): number {
    return this.fallbackEngine ? this.fallbackEngine.getVolume() : this.volume;
  }

  // ─── Getters ────────────────────────────────────────────────────────

  getCurrentTrack(): Track | null {
    return this.fallbackEngine ? this.fallbackEngine.getCurrentTrack() : this.currentTrack;
  }

  getStatus(): PlaybackStatus {
    return this.fallbackEngine ? this.fallbackEngine.getStatus() : this.status;
  }

  getDuration(): number {
    return this.fallbackEngine ? this.fallbackEngine.getDuration() : this.durationMs;
  }

  getPosition(): number {
    return this.fallbackEngine ? this.fallbackEngine.getPosition() : this.positionMs;
  }

  getPlaybackRate(): number {
    return this.fallbackEngine ? this.fallbackEngine.getPlaybackRate() : this.playbackRate;
  }

  getRepeatMode(): RepeatMode {
    return this.fallbackEngine ? this.fallbackEngine.getRepeatMode() : this.repeatMode;
  }

  isShuffleEnabled(): boolean {
    return this.fallbackEngine ? this.fallbackEngine.isShuffleEnabled() : this.shuffleEnabled;
  }

  getCrossfadeDuration(): number {
    return this.crossfadeDurationMs;
  }

  // ─── Subscriptions ──────────────────────────────────────────────────

  onStatusChange(callback: StatusChangeCallback): () => void {
    if (this.fallbackEngine) return this.fallbackEngine.onStatusChange(callback);
    this.statusListeners.add(callback);
    return () => this.statusListeners.delete(callback);
  }

  onTrackChange(callback: TrackChangeCallback): () => void {
    if (this.fallbackEngine) return this.fallbackEngine.onTrackChange(callback);
    this.trackListeners.add(callback);
    return () => this.trackListeners.delete(callback);
  }

  onPositionTick(callback: PositionTickCallback): () => void {
    if (this.fallbackEngine) return this.fallbackEngine.onPositionTick(callback);
    this.tickListeners.add(callback);
    return () => this.tickListeners.delete(callback);
  }

  onError(callback: ErrorCallback): () => void {
    if (this.fallbackEngine) return this.fallbackEngine.onError(callback);
    this.errorListeners.add(callback);
    return () => this.errorListeners.delete(callback);
  }

  destroy(): void {
    if (this.fallbackEngine) {
      this.fallbackEngine.destroy();
      return;
    }
    if (this.playerSubscription) {
      this.playerSubscription.remove();
      this.playerSubscription = null;
    }
    if (this.player) {
      try {
        this.player.remove();
      } catch {
        // ignore
      }
      this.player = null;
    }
    this.statusListeners.clear();
    this.trackListeners.clear();
    this.tickListeners.clear();
    this.errorListeners.clear();
  }

  // ─── Private Event Setup ────────────────────────────────────────────

  private setupPlayerListeners(): void {
    if (!this.player) return;

    this.playerSubscription = this.player.addListener(
      'playbackStatusUpdate',
      (nativeStatus: any) => {
        if (!nativeStatus) return;

        // Position tick update in ms
        const posMs = Math.round((nativeStatus.currentTime || 0) * 1000);
        this.positionMs = posMs;

        if (nativeStatus.duration && nativeStatus.duration > 0) {
          this.durationMs = Math.round(nativeStatus.duration * 1000);
        }

        // Emit ~4Hz tick for 120Hz worklet interpolation
        this.emitPositionTick(this.positionMs, Date.now(), this.playbackRate);

        // Map status accurately based on playing / buffering / paused states
        if (nativeStatus.isBuffering) {
          this.setStatus('buffering');
        } else if (nativeStatus.playing) {
          this.setStatus('playing');
          ListeningRecorder.onSample(this.currentTrack, true);
        } else if (nativeStatus.didJustFinish || nativeStatus.playbackState === 'ended') {
          ListeningRecorder.onStopped();
          void this.skipToNext();
        } else if (!nativeStatus.playing) {
          if (this.status === 'playing' || this.status === 'buffering') {
            this.setStatus('paused');
            ListeningRecorder.onStopped();
          }
        }
      }
    );
  }

  private setStatus(newStatus: PlaybackStatus): void {
    if (this.status === newStatus) return;
    this.status = newStatus;
    this.statusListeners.forEach((cb) => cb(newStatus));
  }

  private emitTrackChange(track: Track | null): void {
    this.trackListeners.forEach((cb) => cb(track));
  }

  private emitPositionTick(positionMs: number, timestampMs: number, rate: number): void {
    this.tickListeners.forEach((cb) => cb(positionMs, timestampMs, rate));
  }

  private emitError(error: Error): void {
    this.errorListeners.forEach((cb) => cb(error));
  }
}
