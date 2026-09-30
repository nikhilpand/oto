/**
 * Discrete Playback State Store (Zustand)
 *
 * Stores ONLY discrete audio state (track changes, play/pause, modes, queue).
 * High-frequency playhead position ticks are strictly forbidden here to prevent
 * triggering React component re-renders.
 *
 * @see docs/SPEC.md §2 and docs/prompts/P03_audio_engine_and_fake.md
 */

import { create } from 'zustand';
import { Track } from '@/domain/types';
import { PlaybackStatus, RepeatMode } from '@/audio/AudioEngine';

export interface PlaybackState {
  currentTrack: Track | null;
  status: PlaybackStatus;
  isPlaying: boolean;
  repeatMode: RepeatMode;
  isShuffled: boolean;
  queue: Track[];
  queueIndex: number;

  // Actions
  setTrack: (track: Track | null) => void;
  setStatus: (status: PlaybackStatus) => void;
  setPlaying: (playing: boolean) => void;
  setRepeatMode: (mode: RepeatMode) => void;
  setShuffle: (shuffled: boolean) => void;
  setQueue: (queue: Track[], startIndex?: number) => void;
  nextTrack: () => Track | null;
  prevTrack: () => Track | null;
  reset: () => void;
}

const INITIAL_STATE = {
  currentTrack: null,
  status: 'idle' as PlaybackStatus,
  isPlaying: false,
  repeatMode: 'off' as RepeatMode,
  isShuffled: false,
  queue: [] as Track[],
  queueIndex: -1,
};

export const usePlaybackStore = create<PlaybackState>((set, get) => ({
  ...INITIAL_STATE,

  setTrack: (track) =>
    set({
      currentTrack: track,
      isPlaying: track !== null,
    }),

  setStatus: (status) =>
    set({
      status,
      isPlaying: status === 'playing',
    }),

  setPlaying: (isPlaying) => set({ isPlaying }),

  setRepeatMode: (repeatMode) => set({ repeatMode }),

  setShuffle: (isShuffled) => set({ isShuffled }),

  setQueue: (queue, startIndex = 0) => {
    const validIndex =
      queue.length > 0 ? Math.max(0, Math.min(queue.length - 1, startIndex)) : -1;
    const currentTrack = validIndex >= 0 ? queue[validIndex] ?? null : null;

    set({
      queue,
      queueIndex: validIndex,
      currentTrack,
      status: currentTrack ? 'ready' : 'idle',
      isPlaying: false,
    });
  },

  nextTrack: () => {
    const { queue, queueIndex, repeatMode } = get();
    if (queue.length === 0) return null;

    let nextIndex = queueIndex + 1;
    if (nextIndex >= queue.length) {
      if (repeatMode === 'all') {
        nextIndex = 0;
      } else {
        return null;
      }
    }

    const nextTrack = queue[nextIndex] ?? null;
    set({
      queueIndex: nextIndex,
      currentTrack: nextTrack,
      status: nextTrack ? 'loading' : 'idle',
    });
    return nextTrack;
  },

  prevTrack: () => {
    const { queue, queueIndex } = get();
    if (queue.length === 0) return null;

    const prevIndex = Math.max(0, queueIndex - 1);
    const prevTrack = queue[prevIndex] ?? null;

    set({
      queueIndex: prevIndex,
      currentTrack: prevTrack,
      status: prevTrack ? 'loading' : 'idle',
    });
    return prevTrack;
  },

  reset: () => set(INITIAL_STATE),
}));
