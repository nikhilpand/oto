/**
 * TDD Test Suite for Two-Tier Queue Coordinator
 *
 * Verifies BitChord two-tier priority scheduling, shuffle un-shuffle preservation,
 * history rollover, and edge boundaries.
 */

import { Track } from '@/domain/types';
import { QueueCoordinator } from '../QueueCoordinator';
import { QueueStorage } from '../queueStorage';
import { QueueState } from '../types';

const createMockTrack = (id: string, title: string): Track => ({
  id,
  title,
  artist: 'Test Artist',
  artists: ['Test Artist'],
  album: 'Test Album',
  durationMs: 180000,
  artworkUrl: 'https://example.com/art.jpg',
  thumbhash: '3OcRJYB4d3h/iIeHeEh3eIh4h4iH',
  isExplicit: false,
});

describe('QueueCoordinator', () => {
  const trackA = createMockTrack('track-a', 'Track A');
  const trackB = createMockTrack('track-b', 'Track B');
  const trackC = createMockTrack('track-c', 'Track C');
  const trackD = createMockTrack('track-d', 'Track D');
  const trackE = createMockTrack('track-e', 'Track E');

  describe('asQueueEntry', () => {
    it('assigns unique queueEntryId and correct tier', () => {
      const entry1 = QueueCoordinator.asQueueEntry(trackA, 'priority');
      const entry2 = QueueCoordinator.asQueueEntry(trackA, 'priority');

      expect(entry1.id).toBe('track-a');
      expect(entry1.queueTier).toBe('priority');
      expect(entry1.queueEntryId).toBeDefined();
      expect(entry2.queueEntryId).toBeDefined();
      // Invariant: duplicate track in queue has unique queueEntryId
      expect(entry1.queueEntryId).not.toBe(entry2.queueEntryId);
    });
  });

  describe('buildContextQueue', () => {
    it('interleaves context tracks, selected track, and preserves upcoming user priority queue', () => {
      const existingState: QueueState = {
        priorityQueue: [QueueCoordinator.asQueueEntry(trackE, 'priority')],
        standardQueue: [
          QueueCoordinator.asQueueEntry(trackA, 'standard'),
        ],
        originalIndices: [0],
        currentIndex: 0,
        currentTrack: QueueCoordinator.asQueueEntry(trackA, 'standard'),
        history: [],
      };

      const newSongs = [trackA, trackB, trackC, trackD];
      const result = QueueCoordinator.buildContextQueue({
        currentState: existingState,
        newTracks: newSongs,
        selectedIndex: 1, // select Track B
        source: { id: 'album-1', title: 'Greatest Hits', type: 'album' },
      });

      expect(result.startIndex).toBe(1);
      expect(result.state.currentTrack?.id).toBe('track-b');
      expect(result.state.standardQueue.length).toBe(4);
      expect(result.state.standardQueue[1]?.id).toBe('track-b');
      // Preserved priority user queue
      expect(result.state.priorityQueue.length).toBe(1);
      expect(result.state.priorityQueue[0]?.id).toBe('track-e');
    });

    it('handles empty context songs gracefully', () => {
      const result = QueueCoordinator.buildContextQueue({
        newTracks: [],
        selectedIndex: 0,
        source: { id: 'empty', title: 'Empty', type: 'playlist' },
      });

      expect(result.state.currentTrack).toBeNull();
      expect(result.state.standardQueue).toEqual([]);
      expect(result.state.currentIndex).toBe(-1);
    });
  });

  describe('enqueuePlayNext and enqueueAddToQueue', () => {
    it('enqueuePlayNext inserts at the head of priorityQueue (LIFO for Play Next)', () => {
      let state = QueueCoordinator.createEmptyState();
      state = QueueCoordinator.enqueueAddToQueue(state, trackA);
      state = QueueCoordinator.enqueuePlayNext(state, trackB);

      expect(state.priorityQueue.length).toBe(2);
      expect(state.priorityQueue[0]?.id).toBe('track-b');
      expect(state.priorityQueue[1]?.id).toBe('track-a');
    });

    it('enqueueAddToQueue appends to the tail of priorityQueue', () => {
      let state = QueueCoordinator.createEmptyState();
      state = QueueCoordinator.enqueueAddToQueue(state, trackA);
      state = QueueCoordinator.enqueueAddToQueue(state, trackB);

      expect(state.priorityQueue.length).toBe(2);
      expect(state.priorityQueue[0]?.id).toBe('track-a');
      expect(state.priorityQueue[1]?.id).toBe('track-b');
    });
  });

  describe('popNext: Two-Tier Scheduling Priority', () => {
    it('pops from priorityQueue BEFORE advancing standardQueue', () => {
      const itemA = QueueCoordinator.asQueueEntry(trackA, 'standard');
      const itemB = QueueCoordinator.asQueueEntry(trackB, 'standard');
      const itemPriority = QueueCoordinator.asQueueEntry(trackC, 'priority');

      const initialState: QueueState = {
        priorityQueue: [itemPriority],
        standardQueue: [itemA, itemB],
        originalIndices: [0, 1],
        currentIndex: 0,
        currentTrack: itemA,
        history: [],
      };

      const { nextTrack, updatedState } = QueueCoordinator.popNext(initialState);

      // Invariant: Priority queue track is popped first
      expect(nextTrack?.id).toBe('track-c');
      expect(updatedState.priorityQueue).toHaveLength(0);
      // standardQueue currentIndex does NOT advance yet
      expect(updatedState.currentIndex).toBe(0);
      // History receives previous currentTrack
      expect(updatedState.history).toHaveLength(1);
      expect(updatedState.history[0]?.id).toBe('track-a');
    });

    it('advances standardQueue when priorityQueue is empty', () => {
      const itemA = QueueCoordinator.asQueueEntry(trackA, 'standard');
      const itemB = QueueCoordinator.asQueueEntry(trackB, 'standard');

      const initialState: QueueState = {
        priorityQueue: [],
        standardQueue: [itemA, itemB],
        originalIndices: [0, 1],
        currentIndex: 0,
        currentTrack: itemA,
        history: [],
      };

      const { nextTrack, updatedState } = QueueCoordinator.popNext(initialState);

      expect(nextTrack?.id).toBe('track-b');
      expect(updatedState.currentIndex).toBe(1);
      expect(updatedState.history).toHaveLength(1);
      expect(updatedState.history[0]?.id).toBe('track-a');
    });

    it('returns null when both queues are exhausted and repeat is off', () => {
      const itemA = QueueCoordinator.asQueueEntry(trackA, 'standard');

      const initialState: QueueState = {
        priorityQueue: [],
        standardQueue: [itemA],
        originalIndices: [0],
        currentIndex: 0,
        currentTrack: itemA,
        history: [],
      };

      const { nextTrack, updatedState } = QueueCoordinator.popNext(initialState, 'off');

      expect(nextTrack).toBeNull();
      expect(updatedState.history).toHaveLength(1);
      expect(updatedState.history[0]?.id).toBe('track-a');
    });

    it('loops to start of standardQueue when repeatMode is all', () => {
      const itemA = QueueCoordinator.asQueueEntry(trackA, 'standard');
      const itemB = QueueCoordinator.asQueueEntry(trackB, 'standard');

      const initialState: QueueState = {
        priorityQueue: [],
        standardQueue: [itemA, itemB],
        originalIndices: [0, 1],
        currentIndex: 1,
        currentTrack: itemB,
        history: [],
      };

      const { nextTrack, updatedState } = QueueCoordinator.popNext(initialState, 'all');

      expect(nextTrack?.id).toBe('track-a');
      expect(updatedState.currentIndex).toBe(0);
    });
  });

  describe('popPrevious: Backward Navigation', () => {
    it('pops from history and restores previous track', () => {
      const itemA = QueueCoordinator.asQueueEntry(trackA, 'standard');
      const itemB = QueueCoordinator.asQueueEntry(trackB, 'standard');

      const stateWithHistory: QueueState = {
        priorityQueue: [],
        standardQueue: [itemA, itemB],
        originalIndices: [0, 1],
        currentIndex: 1,
        currentTrack: itemB,
        history: [itemA],
      };

      const { prevTrack, updatedState } = QueueCoordinator.popPrevious(stateWithHistory);

      expect(prevTrack?.id).toBe('track-a');
      expect(updatedState.currentTrack?.id).toBe('track-a');
      expect(updatedState.history).toHaveLength(0);
      expect(updatedState.currentIndex).toBe(0);
    });

    it('returns null if history is empty and current index is 0', () => {
      const itemA = QueueCoordinator.asQueueEntry(trackA, 'standard');
      const state: QueueState = {
        priorityQueue: [],
        standardQueue: [itemA],
        originalIndices: [0],
        currentIndex: 0,
        currentTrack: itemA,
        history: [],
      };

      const { prevTrack } = QueueCoordinator.popPrevious(state);
      expect(prevTrack).toBeNull();
    });
  });

  describe('Shuffle & Un-shuffle Preservation', () => {
    it('shuffles standardQueue while recording originalIndices, and un-shuffle restores exact order', () => {
      const tracks = [trackA, trackB, trackC, trackD, trackE];
      const result = QueueCoordinator.buildContextQueue({
        newTracks: tracks,
        selectedIndex: 0,
        source: { id: 'test', title: 'Test', type: 'album' },
      });

      const originalOrder = result.state.standardQueue.map((t) => t.id);

      // Shuffle
      const shuffledState = QueueCoordinator.toggleShuffle(result.state, true);
      expect(shuffledState.originalIndices.length).toBe(tracks.length);
      // Current track remains in place
      expect(shuffledState.currentTrack?.id).toBe('track-a');

      // Un-shuffle
      const unShuffledState = QueueCoordinator.toggleShuffle(shuffledState, false);
      const restoredOrder = unShuffledState.standardQueue.map((t) => t.id);

      expect(restoredOrder).toEqual(originalOrder);
    });
  });

  describe('Reordering & Removal', () => {
    it('reorders priority queue correctly', () => {
      let state = QueueCoordinator.createEmptyState();
      state = QueueCoordinator.enqueueAddToQueue(state, trackA);
      state = QueueCoordinator.enqueueAddToQueue(state, trackB);
      state = QueueCoordinator.enqueueAddToQueue(state, trackC);

      const reordered = QueueCoordinator.reorder(state, 'priority', 0, 2);
      expect(reordered.priorityQueue.map((t) => t.id)).toEqual(['track-b', 'track-c', 'track-a']);
    });

    it('removes item from queue by index', () => {
      let state = QueueCoordinator.createEmptyState();
      state = QueueCoordinator.enqueueAddToQueue(state, trackA);
      state = QueueCoordinator.enqueueAddToQueue(state, trackB);

      const { updatedState, removedItem } = QueueCoordinator.remove(state, 'priority', 0);
      expect(removedItem?.id).toBe('track-a');
      expect(updatedState.priorityQueue).toHaveLength(1);
      expect(updatedState.priorityQueue[0]?.id).toBe('track-b');
    });
  });

  describe('QueueStorage', () => {
    it('persists, reloads, and clears queue state cleanly', () => {
      const state: QueueState = {
        priorityQueue: [QueueCoordinator.asQueueEntry(trackA, 'priority')],
        standardQueue: [QueueCoordinator.asQueueEntry(trackB, 'standard')],
        originalIndices: [0],
        currentIndex: 0,
        currentTrack: QueueCoordinator.asQueueEntry(trackB, 'standard'),
        history: [],
      };

      QueueStorage.save(state);
      const loaded = QueueStorage.load();

      expect(loaded).not.toBeNull();
      expect(loaded?.priorityQueue[0]?.id).toBe('track-a');
      expect(loaded?.standardQueue[0]?.id).toBe('track-b');

      QueueStorage.clear();
      const cleared = QueueStorage.load();
      expect(cleared).toBeNull();
    });
  });
});
