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
import { useQueueStore } from './useQueueStore';

import { QueueItem } from '@/domain/queue/types';

function toTrack(item: QueueItem): Track {
  return {
    id: item.id,
    title: item.title,
    artist: item.artist,
    artists: item.artists,
    album: item.album,
    durationMs: item.durationMs,
    artworkUrl: item.artworkUrl,
    thumbhash: item.thumbhash,
    isExplicit: item.isExplicit,
    ...(item.audioFormat ? { audioFormat: item.audioFormat } : {}),
    ...(item.bitrate !== undefined ? { bitrate: item.bitrate } : {}),
    ...(item.lyricsId ? { lyricsId: item.lyricsId } : {}),
    ...(item.bpm !== undefined ? { bpm: item.bpm } : {}),
    ...(item.camelotKey ? { camelotKey: item.camelotKey } : {}),
  };
}

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

  setShuffle: (isShuffled) => {
    set({ isShuffled });
    useQueueStore.getState().toggleShuffle(isShuffled);
  },

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

    if (queue.length > 0) {
      useQueueStore.getState().playContext(queue, validIndex, {
        id: 'playback_queue',
        title: 'Playback Queue',
        type: 'album',
      });
    } else {
      useQueueStore.getState().reset();
    }
  },

  nextTrack: () => {
    const { queue, repeatMode } = get();
    const nextItem = useQueueStore.getState().popNext(repeatMode);
    if (!nextItem) {
      set({
        currentTrack: null,
        queueIndex: -1,
        status: 'idle',
      });
      return null;
    }

    const matchedTrack = queue.find((t) => t.id === nextItem.id);
    const resolvedTrack: Track = matchedTrack ?? toTrack(nextItem);

    const newIndex = useQueueStore.getState().currentIndex;
    set({
      queueIndex: newIndex,
      currentTrack: resolvedTrack,
      status: 'loading',
    });
    return resolvedTrack;
  },

  prevTrack: () => {
    const { queue } = get();
    const prevItem = useQueueStore.getState().popPrevious();
    if (!prevItem) return null;

    const matchedTrack = queue.find((t) => t.id === prevItem.id);
    const resolvedTrack: Track = matchedTrack ?? toTrack(prevItem);

    const newIndex = useQueueStore.getState().currentIndex;
    set({
      queueIndex: newIndex,
      currentTrack: resolvedTrack,
      status: 'loading',
    });
    return resolvedTrack;
  },

  reset: () => {
    useQueueStore.getState().reset();
    set(INITIAL_STATE);
  },
}));
