import { useEffect } from 'react';
import {
  useSharedValue,
  useFrameCallback,
  type SharedValue,
} from 'react-native-reanimated';
import type { AudioEngine } from './AudioEngine';

/**
 * Pure mathematical interpolation function for playhead position.
 * UI thread worklets and unit tests both rely on this exact logic.
 */
export function interpolatePlayhead(
  lastPositionMs: number,
  lastTimestampMs: number,
  nowMs: number,
  rate: number,
  durationMs: number,
  isPlaying: boolean
): number {
  'worklet';
  if (!isPlaying) {
    return Math.max(0, Math.min(lastPositionMs, durationMs));
  }
  const elapsed = Math.max(0, nowMs - lastTimestampMs);
  const interpolated = lastPositionMs + elapsed * rate;
  return Math.max(0, Math.min(interpolated, durationMs));
}

export interface PlayheadProgress {
  /** High-frequency interpolated playback position in milliseconds (0 to durationMs) */
  positionMs: SharedValue<number>;
  /** High-frequency normalized playback progress (0.0 to 1.0) */
  progress: SharedValue<number>;
  /** Manually jump or scrub the playhead */
  seekUI: (targetPositionMs: number) => void;
}

/**
 * High-performance UI-thread playhead interpolation hook.
 *
 * Driven by Reanimated 4 worklets at native display refresh rates (60Hz / 120Hz).
 * Never causes React component re-renders while audio is actively playing.
 */
export function usePlayheadProgress(
  engine: AudioEngine,
  durationMs: number
): PlayheadProgress {
  const positionMs = useSharedValue(0);
  const progress = useSharedValue(0);

  // Calibration shared values updated by ~4Hz native ticks
  const lastPositionMs = useSharedValue(0);
  const lastTimestampMs = useSharedValue(0);
  const playbackRate = useSharedValue(1.0);
  const isPlaying = useSharedValue(false);
  const totalDuration = useSharedValue(durationMs);

  useEffect(() => {
    totalDuration.value = Math.max(1, durationMs);
  }, [durationMs, totalDuration]);

  useEffect(() => {
    const unsubStatus = engine.onStatusChange((status) => {
      isPlaying.value = status === 'playing';
      if (status === 'paused' || status === 'idle' || status === 'error') {
        lastPositionMs.value = engine.getPosition();
        lastTimestampMs.value = Date.now();
        positionMs.value = lastPositionMs.value;
        progress.value =
          totalDuration.value > 0 ? lastPositionMs.value / totalDuration.value : 0;
      }
    });

    const unsubTick = engine.onPositionTick((posMs, tsMs, rate) => {
      lastPositionMs.value = posMs;
      lastTimestampMs.value = tsMs;
      playbackRate.value = rate;
      positionMs.value = posMs;
      progress.value =
        totalDuration.value > 0 ? Math.min(1, posMs / totalDuration.value) : 0;
    });

    return () => {
      unsubStatus();
      unsubTick();
    };
  }, [engine, isPlaying, lastPositionMs, lastTimestampMs, playbackRate, positionMs, progress, totalDuration]);

  // UI-thread 120Hz frame callback
  useFrameCallback(() => {
    'worklet';
    if (!isPlaying.value) return;

    const now = Date.now();
    const dur = totalDuration.value;
    const interpolated = interpolatePlayhead(
      lastPositionMs.value,
      lastTimestampMs.value,
      now,
      playbackRate.value,
      dur,
      true
    );

    positionMs.value = interpolated;
    progress.value = dur > 0 ? Math.min(1, interpolated / dur) : 0;
  });

  const seekUI = (targetPositionMs: number) => {
    const clamped = Math.max(0, Math.min(targetPositionMs, totalDuration.value));
    lastPositionMs.value = clamped;
    lastTimestampMs.value = Date.now();
    positionMs.value = clamped;
    progress.value = totalDuration.value > 0 ? clamped / totalDuration.value : 0;
    void engine.seekTo(clamped);
  };

  return {
    positionMs,
    progress,
    seekUI,
  };
}
