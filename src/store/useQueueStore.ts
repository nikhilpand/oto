/**
 * Two-Tier Queue Store (Zustand)
 *
 * Implements react-state-management best practices with selective subscriptions,
 * zero bridge overhead, and automatic sub-millisecond MMKV hydration.
 */

import { create } from 'zustand';
import { Track } from '@/domain/types';
import { QueueCoordinator } from '@/domain/queue/QueueCoordinator';
import { QueueStorage } from '@/domain/queue/queueStorage';
import { Autoplay } from '@/domain/queue/Autoplay';
import { QueueItem, QueueSource, QueueState, QueueTier } from '@/domain/queue/types';
import { RepeatMode } from '@/audio/AudioEngine';

export interface QueueStoreState extends QueueState {
  isShuffled: boolean;

  // Actions
  playContext: (tracks: Track[], startIndex: number, source: QueueSource) => QueueItem | null;
  playOneOff: (track: Track, source?: QueueSource) => QueueItem;
  playNext: (track: Track, source?: QueueSource) => void;
  addToQueue: (track: Track, source?: QueueSource) => void;
  popNext: (repeatMode?: RepeatMode) => QueueItem | null;
  popPrevious: () => QueueItem | null;
  reorder: (tier: QueueTier, fromIndex: number, toIndex: number) => void;
  remove: (tier: QueueTier, index: number) => QueueItem | null;
  restoreItem: (item: QueueItem, tier: QueueTier, index: number) => void;
  clearPriorityQueue: () => void;
  toggleShuffle: (enable?: boolean) => void;
  jumpToTrack: (tier: QueueTier, index: number) => QueueItem | null;
  reset: () => void;
}

const hydrated = QueueStorage.load();
const INITIAL_QUEUE_STATE: QueueState = hydrated ?? QueueCoordinator.createEmptyState();

export const useQueueStore = create<QueueStoreState>((set, get) => ({
  ...INITIAL_QUEUE_STATE,
  isShuffled: false,

  playContext: (tracks, startIndex, source) => {
    const currentState = get();
    const result = QueueCoordinator.buildContextQueue({
      currentState,
      newTracks: tracks,
      selectedIndex: startIndex,
      source,
    });

    set({
      ...result.state,
      isShuffled: false,
    });
    QueueStorage.save(result.state);
    return result.state.currentTrack;
  },

  playOneOff: (track, source) => {
    const currentState = get();
    const entry = QueueCoordinator.asQueueEntry(track, 'standard', source);
    const newStandard = [entry];
    const newState: QueueState = {
      ...currentState,
      standardQueue: newStandard,
      originalIndices: [0],
      currentIndex: 0,
      currentTrack: entry,
      history: currentState.currentTrack
        ? [...currentState.history, currentState.currentTrack].slice(-50)
        : currentState.history,
    };

    set(newState);
    QueueStorage.save(newState);
    return entry;
  },

  playNext: (track, source) => {
    const currentState = get();
    const newState = QueueCoordinator.enqueuePlayNext(currentState, track, source);
    set(newState);
    QueueStorage.save(newState);
  },

  addToQueue: (track, source) => {
    const currentState = get();
    const newState = QueueCoordinator.enqueueAddToQueue(currentState, track, source);
    set(newState);
    QueueStorage.save(newState);
  },

  popNext: (repeatMode = 'off') => {
    const currentState = get();
    const { nextTrack, updatedState } = QueueCoordinator.popNext(currentState, repeatMode);
    set(updatedState);
    QueueStorage.save(updatedState);

    // Continuous Autoplay trigger: when remaining tracks <= 2, fetch follow-up radio tracks
    const remaining =
      updatedState.priorityQueue.length +
      Math.max(0, updatedState.standardQueue.length - (updatedState.currentIndex + 1));

    if (updatedState.currentTrack && remaining <= 2) {
      const allQueueIds = [
        ...updatedState.priorityQueue.map((item) => item.id),
        ...updatedState.standardQueue.map((item) => item.id),
      ];

      void Autoplay.checkAndFetch({
        currentTrack: updatedState.currentTrack,
        remainingInQueue: remaining,
        allQueueIds,
      }).then((newTracks) => {
        if (!newTracks || newTracks.length === 0) return;
        const newItems = Autoplay.toQueueItems(newTracks);
        const stateNow = get();
        const appended = {
          ...stateNow,
          standardQueue: [...stateNow.standardQueue, ...newItems],
        };
        set(appended);
        QueueStorage.save(appended);
      });
    }

    return nextTrack;
  },

  popPrevious: () => {
    const currentState = get();
    const { prevTrack, updatedState } = QueueCoordinator.popPrevious(currentState);
    set(updatedState);
    QueueStorage.save(updatedState);
    return prevTrack;
  },

  reorder: (tier, fromIndex, toIndex) => {
    const currentState = get();
    const newState = QueueCoordinator.reorder(currentState, tier, fromIndex, toIndex);
    set(newState);
    QueueStorage.save(newState);
  },

  remove: (tier, index) => {
    const currentState = get();
    const { updatedState, removedItem } = QueueCoordinator.remove(currentState, tier, index);
    set(updatedState);
    QueueStorage.save(updatedState);
    return removedItem;
  },

  restoreItem: (item, tier, index) => {
    const currentState = get();
    if (tier === 'priority') {
      const list = [...currentState.priorityQueue];
      const targetIndex = Math.max(0, Math.min(list.length, index));
      list.splice(targetIndex, 0, item);
      const newState = { ...currentState, priorityQueue: list };
      set(newState);
      QueueStorage.save(newState);
    } else if (tier === 'standard') {
      const list = [...currentState.standardQueue];
      const targetIndex = Math.max(0, Math.min(list.length, index));
      list.splice(targetIndex, 0, item);
      const newState = { ...currentState, standardQueue: list };
      set(newState);
      QueueStorage.save(newState);
    }
  },

  clearPriorityQueue: () => {
    const currentState = get();
    const newState = QueueCoordinator.clearPriorityQueue(currentState);
    set(newState);
    QueueStorage.save(newState);
  },

  toggleShuffle: (enable) => {
    const currentState = get();
    const shouldShuffle = enable ?? !currentState.isShuffled;
    const newState = QueueCoordinator.toggleShuffle(currentState, shouldShuffle);
    set({
      ...newState,
      isShuffled: shouldShuffle,
    });
    QueueStorage.save(newState);
  },

  jumpToTrack: (tier, index) => {
    const currentState = get();
    if (tier === 'priority') {
      const target = currentState.priorityQueue[index];
      if (!target) return null;
      // Remove clicked target from priority queue and set as currentTrack
      const remaining = currentState.priorityQueue.filter((_, i) => i !== index);
      const newHistory = currentState.currentTrack
        ? [...currentState.history, currentState.currentTrack].slice(-50)
        : currentState.history;
      const newState: QueueState = {
        ...currentState,
        priorityQueue: remaining,
        currentTrack: target,
        history: newHistory,
      };
      set(newState);
      QueueStorage.save(newState);
      return target;
    }

    if (tier === 'standard') {
      const target = currentState.standardQueue[index];
      if (!target) return null;
      const newHistory = currentState.currentTrack
        ? [...currentState.history, currentState.currentTrack].slice(-50)
        : currentState.history;
      const newState: QueueState = {
        ...currentState,
        currentIndex: index,
        currentTrack: target,
        history: newHistory,
      };
      set(newState);
      QueueStorage.save(newState);
      return target;
    }

    return null;
  },

  reset: () => {
    const empty = QueueCoordinator.createEmptyState();
    set({ ...empty, isShuffled: false });
    QueueStorage.clear();
  },
}));
