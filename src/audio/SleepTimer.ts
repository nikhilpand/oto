/**
 * SleepTimer — Smooth Cosine Fade-Out Sleep Timer
 *
 * Clean-room implementation inspired by BitChord's SleepTimer.kt architecture.
 * Prevents abruptly jolting sleeping listeners awake by fading audio volume
 * smoothly along a quarter-cosine curve: V(t) = cos((pi * t) / (2 * T))
 * over the final 15 seconds before pausing.
 *
 * @see docs/SPEC.md
 * @see BitChord/.ua knowledge graph (SleepTimer.kt)
 */

import { create } from 'zustand';
import type { AudioEngine } from './AudioEngine';
import { getGlobalAudioEngine } from './engineHolder';

export type SleepTimerMode = 'minutes' | 'end_of_track';

export interface SleepTimerState {
  isActive: boolean;
  mode: SleepTimerMode | null;
  remainingSeconds: number;
  totalSeconds: number;
  isFading: boolean;
  targetEndTime: number | null;
}

interface SleepTimerStore extends SleepTimerState {
  start: (minutes: number, engine?: AudioEngine | null) => void;
  startEndOfTrack: (engine?: AudioEngine | null) => void;
  cancel: () => void;
  extendMinutes: (minutes: number) => void;
  // internal actions
  _updateTick: (remaining: number, isFading: boolean) => void;
  _finish: () => void;
}

const FADE_OUT_SECONDS = 15;
export const SLEEP_TIMER_PRESETS = [15, 30, 45, 60] as const;

let activeEngineRef: AudioEngine | null = null;
let timerInterval: ReturnType<typeof setInterval> | null = null;
let trackChangeUnsub: (() => void) | null = null;
let savedInitialVolume = 1.0;

function resolveEngine(engine?: AudioEngine | null): AudioEngine | null {
  return engine ?? activeEngineRef ?? getGlobalAudioEngine();
}

/**
 * Calculates quarter-cosine volume attenuation factor from 1.0 (start of fade)
 * down to 0.0 (silence at 0s remaining).
 *
 * @param secondsRemaining Number of seconds left in fade window (0 to 15)
 * @param fadeWindowTotal Total fade window length in seconds (default: 15)
 */
export function calculateCosineFadeVolume(
  secondsRemaining: number,
  fadeWindowTotal = FADE_OUT_SECONDS
): number {
  if (secondsRemaining <= 0) return 0;
  if (secondsRemaining >= fadeWindowTotal) return 1.0;

  // Fraction elapsed: 0.0 (fade start) -> 1.0 (fade end)
  const elapsedFraction = (fadeWindowTotal - secondsRemaining) / fadeWindowTotal;
  // Quarter-cosine: cos(0) = 1.0 -> cos(pi / 2) = 0.0
  const attenuation = Math.cos((Math.PI * elapsedFraction) / 2);
  return Math.max(0, Math.min(1, attenuation));
}

function clearActiveTimerResources(): void {
  if (timerInterval) {
    clearInterval(timerInterval);
    timerInterval = null;
  }
  if (trackChangeUnsub) {
    trackChangeUnsub();
    trackChangeUnsub = null;
  }
}

export const useSleepTimerStore = create<SleepTimerStore>((set, get) => ({
  isActive: false,
  mode: null,
  remainingSeconds: 0,
  totalSeconds: 0,
  isFading: false,
  targetEndTime: null,

  start: (minutes: number, engine?: AudioEngine | null) => {
    clearActiveTimerResources();
    const activeEngine = resolveEngine(engine);
    activeEngineRef = activeEngine;

    if (activeEngine) {
      savedInitialVolume = activeEngine.getVolume();
    }

    const durationSeconds = Math.max(1, Math.round(minutes * 60));
    const targetEnd = Date.now() + durationSeconds * 1000;

    set({
      isActive: true,
      mode: 'minutes',
      remainingSeconds: durationSeconds,
      totalSeconds: durationSeconds,
      isFading: false,
      targetEndTime: targetEnd,
    });

    timerInterval = setInterval(() => {
      const now = Date.now();
      const currentTarget = get().targetEndTime;
      if (!currentTarget) return;

      const remaining = Math.max(0, Math.round((currentTarget - now) / 1000));
      const isFading = remaining <= FADE_OUT_SECONDS;

      if (isFading && activeEngineRef) {
        const fadeFactor = calculateCosineFadeVolume(remaining, FADE_OUT_SECONDS);
        void activeEngineRef.setVolume(savedInitialVolume * fadeFactor);
      }

      set({
        remainingSeconds: remaining,
        isFading,
      });

      if (remaining <= 0) {
        get()._finish();
      }
    }, 1000);
  },

  startEndOfTrack: (engine?: AudioEngine | null) => {
    clearActiveTimerResources();
    const activeEngine = resolveEngine(engine);
    activeEngineRef = activeEngine;

    if (activeEngine) {
      savedInitialVolume = activeEngine.getVolume();
    }

    const initialTrack = activeEngine?.getCurrentTrack();
    const duration = activeEngine?.getDuration() ?? 0;
    const position = activeEngine?.getPosition() ?? 0;
    const estSeconds = duration > position ? Math.round((duration - position) / 1000) : 180;

    set({
      isActive: true,
      mode: 'end_of_track',
      remainingSeconds: estSeconds,
      totalSeconds: estSeconds,
      isFading: false,
      targetEndTime: Date.now() + estSeconds * 1000,
    });

    if (activeEngine) {
      // Listen for track transition
      trackChangeUnsub = activeEngine.onTrackChange((newTrack) => {
        if (!newTrack || newTrack.id !== initialTrack?.id) {
          get()._finish();
        }
      });
    }

    // Secondary safety interval
    timerInterval = setInterval(() => {
      const currentEngine = resolveEngine();
      if (!currentEngine) return;

      const status = currentEngine.getStatus();
      const pos = currentEngine.getPosition();
      const dur = currentEngine.getDuration();

      if (status === 'paused' || status === 'idle' || status === 'error') {
        return;
      }

      if (dur > 0 && pos >= dur - 1000) {
        get()._finish();
      }
    }, 1000);
  },

  cancel: () => {
    clearActiveTimerResources();
    if (activeEngineRef) {
      void activeEngineRef.setVolume(savedInitialVolume);
    }
    set({
      isActive: false,
      mode: null,
      remainingSeconds: 0,
      totalSeconds: 0,
      isFading: false,
      targetEndTime: null,
    });
  },

  extendMinutes: (minutes: number) => {
    const state = get();
    if (!state.isActive || !state.targetEndTime) return;

    const addedMs = minutes * 60 * 1000;
    const newTarget = state.targetEndTime + addedMs;
    const newRemaining = Math.max(0, Math.round((newTarget - Date.now()) / 1000));

    // Restore volume if we were in the middle of fading
    if (state.isFading && activeEngineRef) {
      void activeEngineRef.setVolume(savedInitialVolume);
    }

    set({
      targetEndTime: newTarget,
      remainingSeconds: newRemaining,
      totalSeconds: state.totalSeconds + minutes * 60,
      isFading: false,
    });
  },

  _updateTick: (remaining: number, isFading: boolean) => {
    set({ remainingSeconds: remaining, isFading });
  },

  _finish: () => {
    clearActiveTimerResources();
    const engine = activeEngineRef ?? resolveEngine();
    if (engine) {
      void engine.pause();
      // Restore volume so the user isn't on 0 volume next time they play
      void engine.setVolume(savedInitialVolume);
    }

    set({
      isActive: false,
      mode: null,
      remainingSeconds: 0,
      totalSeconds: 0,
      isFading: false,
      targetEndTime: null,
    });
  },
}));
