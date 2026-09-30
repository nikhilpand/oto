/**
 * Two-Tier Queue Coordinator
 *
 * Clean-room TypeScript implementation of BitChord's QueueCoordinator
 * (BITCHORD_RE/03_PLAYBACK.md & QueueCoordinator.kt).
 *
 * Invariants:
 * 1. Two-Tier Scheduling: USER_QUEUE ("Play Next" & "Add to Queue") tracks
 *    always execute before standard context (album/playlist/artist) tracks.
 * 2. Immutable Identity: queueEntryId is generated once on enqueue.
 * 3. Un-shuffle Fidelity: Shuffling tracks records originalIndices; toggling
 *    shuffle off restores the pristine context sequence.
 * 4. Bounded History: Maintains up to 50 recently played tracks for backward seeking.
 */

import { Track } from '@/domain/types';
import { ContextQueueResult, QueueItem, QueueSource, QueueState, QueueTier } from './types';
import { RepeatMode } from '@/audio/AudioEngine';

const MAX_HISTORY_ITEMS = 50;

let idCounter = 0;
function generateQueueEntryId(trackId: string): string {
  idCounter += 1;
  return `q_${trackId}_${Date.now()}_${idCounter}_${Math.random().toString(36).slice(2, 7)}`;
}

export class QueueCoordinator {
  /**
   * Creates an empty, initialized QueueState.
   */
  static createEmptyState(): QueueState {
    return {
      priorityQueue: [],
      standardQueue: [],
      originalIndices: [],
      currentIndex: -1,
      currentTrack: null,
      history: [],
    };
  }

  /**
   * Converts a Track into a unique QueueItem with immutable queueEntryId.
   */
  static asQueueEntry(
    track: Track,
    tier: QueueTier,
    source?: QueueSource,
  ): QueueItem {
    return {
      ...track,
      queueEntryId: generateQueueEntryId(track.id),
      queueTier: tier,
      source,
      addedAt: Date.now(),
    };
  }

  /**
   * Constructs an interleaved queue for starting a Context (Album, Playlist, Artist):
   *
   * Invariant: [Preceding Context] + [Selected Track] + [Preserved USER_QUEUE] + [Following Context Tracks].
   * Playback starts at selectedIndex.
   */
  static buildContextQueue(params: {
    currentState?: QueueState;
    newTracks: Track[];
    selectedIndex: number;
    source: QueueSource;
  }): ContextQueueResult {
    const { currentState, newTracks, selectedIndex, source } = params;

    if (!newTracks || newTracks.length === 0) {
      return {
        state: QueueCoordinator.createEmptyState(),
        startIndex: 0,
      };
    }

    // Preserve upcoming user priority queue
    const upcomingUserQueue = currentState ? [...currentState.priorityQueue] : [];

    const contextEntries: QueueItem[] = newTracks.map((track) =>
      QueueCoordinator.asQueueEntry(track, 'standard', source),
    );

    const safeIndex = Math.max(0, Math.min(contextEntries.length - 1, selectedIndex));
    const selectedTrack = contextEntries[safeIndex] ?? null;

    const originalIndices = contextEntries.map((_, i) => i);

    const state: QueueState = {
      priorityQueue: upcomingUserQueue,
      standardQueue: contextEntries,
      originalIndices,
      currentIndex: safeIndex,
      currentTrack: selectedTrack,
      history: currentState?.history ? [...currentState.history] : [],
    };

    return {
      state,
      startIndex: safeIndex,
    };
  }

  /**
   * "Play Next": inserts track at the HEAD of priorityQueue (LIFO for successive "Play Next").
   */
  static enqueuePlayNext(
    state: QueueState,
    track: Track,
    source?: QueueSource,
  ): QueueState {
    const entry = QueueCoordinator.asQueueEntry(track, 'priority', source);
    return {
      ...state,
      priorityQueue: [entry, ...state.priorityQueue],
    };
  }

  /**
   * "Add to Queue": appends track at the TAIL of priorityQueue (FIFO order).
   */
  static enqueueAddToQueue(
    state: QueueState,
    track: Track,
    source?: QueueSource,
  ): QueueState {
    const entry = QueueCoordinator.asQueueEntry(track, 'priority', source);
    return {
      ...state,
      priorityQueue: [...state.priorityQueue, entry],
    };
  }

  /**
   * Advances to next track following the Two-Tier priority rule:
   * 1. If priorityQueue is non-empty, pop first priority track.
   * 2. Else advance standardQueue.
   * 3. Previous currentTrack is appended to history.
   */
  static popNext(
    state: QueueState,
    repeatMode: RepeatMode = 'off',
  ): { nextTrack: QueueItem | null; updatedState: QueueState } {
    const newHistory = state.currentTrack
      ? [...state.history, state.currentTrack].slice(-MAX_HISTORY_ITEMS)
      : state.history;

    // 1. Pop from priorityQueue first
    if (state.priorityQueue.length > 0) {
      const [nextTrack, ...remainingPriority] = state.priorityQueue;
      return {
        nextTrack: nextTrack ?? null,
        updatedState: {
          ...state,
          priorityQueue: remainingPriority,
          currentTrack: nextTrack ?? null,
          history: newHistory,
        },
      };
    }

    // 2. Standard Context queue
    if (state.standardQueue.length > 0) {
      let nextIndex = state.currentIndex + 1;
      if (nextIndex >= state.standardQueue.length) {
        if (repeatMode === 'all') {
          nextIndex = 0;
        } else {
          return {
            nextTrack: null,
            updatedState: {
              ...state,
              currentTrack: null,
              history: newHistory,
            },
          };
        }
      }

      const nextTrack = state.standardQueue[nextIndex] ?? null;
      return {
        nextTrack,
        updatedState: {
          ...state,
          currentIndex: nextIndex,
          currentTrack: nextTrack,
          history: newHistory,
        },
      };
    }

    return {
      nextTrack: null,
      updatedState: {
        ...state,
        currentTrack: null,
        history: newHistory,
      },
    };
  }

  /**
   * Backward navigation: pops the most recently played track from history.
   */
  static popPrevious(state: QueueState): {
    prevTrack: QueueItem | null;
    updatedState: QueueState;
  } {
    if (state.history.length > 0) {
      const prevTrack = state.history[state.history.length - 1] ?? null;
      const updatedHistory = state.history.slice(0, -1);

      let newCurrentIndex = state.currentIndex;
      if (prevTrack && prevTrack.queueTier === 'standard') {
        const foundIndex = state.standardQueue.findIndex(
          (t) => t.queueEntryId === prevTrack.queueEntryId || t.id === prevTrack.id,
        );
        if (foundIndex >= 0) {
          newCurrentIndex = foundIndex;
        }
      }

      return {
        prevTrack,
        updatedState: {
          ...state,
          currentTrack: prevTrack,
          history: updatedHistory,
          currentIndex: newCurrentIndex,
        },
      };
    }

    // If history is empty but standardQueue can go back
    if (state.currentIndex > 0 && state.standardQueue.length > 0) {
      const prevIndex = state.currentIndex - 1;
      const prevTrack = state.standardQueue[prevIndex] ?? null;
      return {
        prevTrack,
        updatedState: {
          ...state,
          currentIndex: prevIndex,
          currentTrack: prevTrack,
        },
      };
    }

    return {
      prevTrack: null,
      updatedState: state,
    };
  }

  /**
   * Shuffles or un-shuffles standardQueue while maintaining originalIndices mapping.
   */
  static toggleShuffle(state: QueueState, enableShuffle: boolean): QueueState {
    if (enableShuffle) {
      if (state.standardQueue.length <= 1) {
        return {
          ...state,
          originalIndices: state.standardQueue.map((_, i) => i),
        };
      }

      const activeTrack = state.currentTrack;
      // Pair tracks with their current index
      const paired = state.standardQueue.map((track, originalIdx) => ({
        track,
        originalIdx,
      }));

      // Find active track index in paired
      const activeIdx = activeTrack
        ? paired.findIndex((p) => p.track.queueEntryId === activeTrack.queueEntryId)
        : -1;

      // Extract active track and shuffle the remaining tracks
      const toShuffle = paired.filter((_, idx) => idx !== activeIdx);

      // Fisher-Yates shuffle
      for (let i = toShuffle.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        const temp = toShuffle[i]!;
        toShuffle[i] = toShuffle[j]!;
        toShuffle[j] = temp;
      }

      // Reconstruct: place active track at the current position or head
      const shuffledPaired = activeIdx >= 0 && activeTrack
        ? [paired[activeIdx]!, ...toShuffle]
        : toShuffle;

      return {
        ...state,
        standardQueue: shuffledPaired.map((p) => p.track),
        originalIndices: shuffledPaired.map((p) => p.originalIdx),
        currentIndex: activeIdx >= 0 ? 0 : state.currentIndex,
      };
    }

    // Un-shuffle: restore original order using originalIndices
    if (state.originalIndices.length === state.standardQueue.length) {
      const restored = new Array<QueueItem>(state.standardQueue.length);
      for (let i = 0; i < state.standardQueue.length; i++) {
        const origIdx = state.originalIndices[i];
        const item = state.standardQueue[i];
        if (origIdx !== undefined && item && origIdx >= 0 && origIdx < restored.length) {
          restored[origIdx] = item;
        }
      }

      // Fill any potential sparse gaps defensively
      const cleanRestored: QueueItem[] = [];
      for (let i = 0; i < restored.length; i++) {
        const item = restored[i] ?? state.standardQueue[i];
        if (item) cleanRestored.push(item);
      }

      // Recalculate currentIndex for active track
      const activeTrack = state.currentTrack;
      const newIndex = activeTrack
        ? cleanRestored.findIndex((t) => t.queueEntryId === activeTrack.queueEntryId)
        : -1;

      return {
        ...state,
        standardQueue: cleanRestored,
        originalIndices: cleanRestored.map((_, i) => i),
        currentIndex: newIndex >= 0 ? newIndex : state.currentIndex,
      };
    }

    return state;
  }

  /**
   * Reorders an item within a specific tier.
   */
  static reorder(
    state: QueueState,
    tier: QueueTier,
    fromIndex: number,
    toIndex: number,
  ): QueueState {
    if (fromIndex === toIndex) return state;

    if (tier === 'priority') {
      const list = [...state.priorityQueue];
      if (fromIndex < 0 || fromIndex >= list.length || toIndex < 0 || toIndex >= list.length) {
        return state;
      }
      const [moved] = list.splice(fromIndex, 1);
      if (!moved) return state;
      list.splice(toIndex, 0, moved);
      return { ...state, priorityQueue: list };
    }

    if (tier === 'standard') {
      const list = [...state.standardQueue];
      if (fromIndex < 0 || fromIndex >= list.length || toIndex < 0 || toIndex >= list.length) {
        return state;
      }
      const [moved] = list.splice(fromIndex, 1);
      if (!moved) return state;
      list.splice(toIndex, 0, moved);

      // Adjust currentIndex if necessary
      let newCurrentIndex = state.currentIndex;
      if (state.currentIndex === fromIndex) {
        newCurrentIndex = toIndex;
      } else if (fromIndex < state.currentIndex && toIndex >= state.currentIndex) {
        newCurrentIndex -= 1;
      } else if (fromIndex > state.currentIndex && toIndex <= state.currentIndex) {
        newCurrentIndex += 1;
      }

      return {
        ...state,
        standardQueue: list,
        currentIndex: newCurrentIndex,
      };
    }

    return state;
  }

  /**
   * Removes an item by index from a tier with undo metadata.
   */
  static remove(
    state: QueueState,
    tier: QueueTier,
    index: number,
  ): { updatedState: QueueState; removedItem: QueueItem | null } {
    if (tier === 'priority') {
      const list = [...state.priorityQueue];
      if (index < 0 || index >= list.length) {
        return { updatedState: state, removedItem: null };
      }
      const [removed] = list.splice(index, 1);
      return {
        updatedState: { ...state, priorityQueue: list },
        removedItem: removed ?? null,
      };
    }

    if (tier === 'standard') {
      const list = [...state.standardQueue];
      if (index < 0 || index >= list.length) {
        return { updatedState: state, removedItem: null };
      }
      const [removed] = list.splice(index, 1);

      let newCurrentIndex = state.currentIndex;
      if (index < state.currentIndex) {
        newCurrentIndex = Math.max(0, state.currentIndex - 1);
      } else if (index === state.currentIndex) {
        newCurrentIndex = Math.min(newCurrentIndex, list.length - 1);
      }

      return {
        updatedState: {
          ...state,
          standardQueue: list,
          currentIndex: newCurrentIndex,
        },
        removedItem: removed ?? null,
      };
    }

    return { updatedState: state, removedItem: null };
  }

  /**
   * Clears the user priority queue ("Clear Queue").
   * Context and standard tracks are preserved.
   */
  static clearPriorityQueue(state: QueueState): QueueState {
    return {
      ...state,
      priorityQueue: [],
    };
  }
}
