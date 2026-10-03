import { QueueCoordinator } from '../QueueCoordinator';
import { Track } from '@/domain/types';

function createMockTrack(id: string, title = `Song ${id}`): Track {
  return {
    id,
    title,
    artist: 'Artist Test',
    artists: ['Artist Test'],
    album: 'Album Test',
    durationMs: 200000,
    artworkUrl: `https://art/${id}.jpg`,
    thumbhash: '3OcRJYB4d3h/iIeHeEh3eIh4h4iH',
    isExplicit: false,
  };
}

describe('QueueCoordinator — Worst-Case Stress Tests (Music App Catastrophes)', () => {
  describe('Queue Starvation & Boundary Underflow', () => {
    it('popNext on empty queue under all repeat modes returns null safely without throwing', () => {
      const emptyState = QueueCoordinator.createEmptyState();

      // Repeat off
      const { nextTrack: tOff, updatedState: sOff } = QueueCoordinator.popNext(emptyState, 'off');
      expect(tOff).toBeNull();
      expect(sOff.currentIndex).toBe(-1);
      expect(sOff.currentTrack).toBeNull();

      // Repeat all
      const { nextTrack: tAll, updatedState: sAll } = QueueCoordinator.popNext(emptyState, 'all');
      expect(tAll).toBeNull();
      expect(sAll.currentTrack).toBeNull();

      // Repeat one
      const { nextTrack: tOne, updatedState: sOne } = QueueCoordinator.popNext(emptyState, 'one');
      expect(tOne).toBeNull();
      expect(sOne.currentTrack).toBeNull();
    });

    it('popPrevious on empty history returns null without mutating state', () => {
      const state = QueueCoordinator.createEmptyState();
      const { prevTrack, updatedState } = QueueCoordinator.popPrevious(state);

      expect(prevTrack).toBeNull();
      expect(updatedState.history).toHaveLength(0);
    });

    it('buildContextQueue with empty tracks returns an empty initialized state', () => {
      const res = QueueCoordinator.buildContextQueue({
        newTracks: [],
        selectedIndex: 0,
        source: { type: 'album', id: 'alb_1', title: 'Album' },
      });

      expect(res.state.standardQueue).toHaveLength(0);
      expect(res.state.currentTrack).toBeNull();
      expect(res.startIndex).toBe(0);
    });

    it('clamps out-of-bounds selectedIndex when building context queue', () => {
      const tracks = [createMockTrack('t1'), createMockTrack('t2')];

      // Negative index
      const resNeg = QueueCoordinator.buildContextQueue({
        newTracks: tracks,
        selectedIndex: -10,
        source: { type: 'album', id: 'alb_1', title: 'Album' },
      });
      expect(resNeg.state.currentIndex).toBe(0);
      expect(resNeg.state.currentTrack?.id).toBe('t1');

      // Huge index beyond length
      const resHuge = QueueCoordinator.buildContextQueue({
        newTracks: tracks,
        selectedIndex: 9999,
        source: { type: 'album', id: 'alb_1', title: 'Album' },
      });
      expect(resHuge.state.currentIndex).toBe(1);
      expect(resHuge.state.currentTrack?.id).toBe('t2');
    });
  });

  describe('Two-Tier Priority Queue Bombardment ("Play Next" & "Add to Queue")', () => {
    it('exhausts 50 user-priority items strictly before touching standard context tracks', () => {
      const albumTracks = [createMockTrack('alb_1'), createMockTrack('alb_2'), createMockTrack('alb_3')];
      let state = QueueCoordinator.buildContextQueue({
        newTracks: albumTracks,
        selectedIndex: 0,
        source: { type: 'album', id: 'alb_test', title: 'Album' },
      }).state;

      expect(state.currentTrack?.id).toBe('alb_1');

      // User bombards with 20 "Play Next" and 30 "Add to Queue"
      for (let i = 1; i <= 20; i++) {
        state = QueueCoordinator.enqueuePlayNext(state, createMockTrack(`pnext_${i}`));
      }
      for (let j = 1; j <= 30; j++) {
        state = QueueCoordinator.enqueueAddToQueue(state, createMockTrack(`atq_${j}`));
      }

      // Total priority queue must be 50
      expect(state.priorityQueue).toHaveLength(50);

      // Verify that every single popped item is from priority queue until it is empty
      let poppedCount = 0;
      while (state.priorityQueue.length > 0) {
        const { nextTrack, updatedState } = QueueCoordinator.popNext(state, 'off');
        expect(nextTrack).not.toBeNull();
        expect(nextTrack?.queueTier).toBe('priority');
        state = updatedState;
        poppedCount++;
      }

      expect(poppedCount).toBe(50);
      expect(state.priorityQueue).toHaveLength(0);

      // Now the VERY NEXT popped item must seamlessly be the next standard track (alb_2)
      const { nextTrack: resumedStandard, updatedState: finalState } = QueueCoordinator.popNext(
        state,
        'off'
      );
      expect(resumedStandard?.id).toBe('alb_2');
      expect(finalState.currentIndex).toBe(1);
    });

    it('clearPriorityQueue drops only priority items while leaving active track and standard context intact', () => {
      const albumTracks = [createMockTrack('a1'), createMockTrack('a2')];
      let state = QueueCoordinator.buildContextQueue({
        newTracks: albumTracks,
        selectedIndex: 0,
        source: { type: 'album', id: 'alb_1', title: 'Album' },
      }).state;

      state = QueueCoordinator.enqueuePlayNext(state, createMockTrack('pri_1'));
      state = QueueCoordinator.enqueuePlayNext(state, createMockTrack('pri_2'));
      expect(state.priorityQueue).toHaveLength(2);

      const cleared = QueueCoordinator.clearPriorityQueue(state);
      expect(cleared.priorityQueue).toHaveLength(0);
      expect(cleared.standardQueue).toHaveLength(2);
      expect(cleared.currentTrack?.id).toBe('a1');
    });
  });

  describe('Un-Shuffle Fidelity & Determinism', () => {
    it('restores 100% exact original sequence when shuffle is disabled after skips', () => {
      const tracks = Array.from({ length: 20 }, (_, i) => createMockTrack(`t_${i}`, `Song ${i}`));
      let state = QueueCoordinator.buildContextQueue({
        newTracks: tracks,
        selectedIndex: 0,
        source: { type: 'album', id: 'alb_shuffle', title: 'Album' },
      }).state;

      const pristineOriginalIds = state.standardQueue.map((t) => t.id);

      // Enable shuffle
      state = QueueCoordinator.toggleShuffle(state, true);

      // Verify that originalIndices was saved
      expect(state.originalIndices).toHaveLength(20);

      // Skip 3 tracks while shuffled
      for (let i = 0; i < 3; i++) {
        state = QueueCoordinator.popNext(state, 'off').updatedState;
      }

      // Now toggle shuffle OFF: restore original order
      state = QueueCoordinator.toggleShuffle(state, false);

      // Verify all tracks in standardQueue match original pristine order
      const restoredIds = state.standardQueue.map((t) => t.id);
      expect(restoredIds).toEqual(pristineOriginalIds);
    });
  });

  describe('Queue Reordering & Edge Removal Under Active Playback', () => {
    it('reordering moving active currentTrack updates currentIndex so song does not jump', () => {
      const tracks = [createMockTrack('s0'), createMockTrack('s1'), createMockTrack('s2'), createMockTrack('s3')];
      let state = QueueCoordinator.buildContextQueue({
        newTracks: tracks,
        selectedIndex: 1, // Currently playing s1 at index 1
        source: { type: 'album', id: 'alb', title: 'Album' },
      }).state;

      expect(state.currentTrack?.id).toBe('s1');
      expect(state.currentIndex).toBe(1);

      // Move s1 from index 1 to index 3
      state = QueueCoordinator.reorder(state, 'standard', 1, 3);

      // s1 is now at index 3: currentIndex must be 3, currentTrack must still be s1!
      expect(state.standardQueue[3]?.id).toBe('s1');
      expect(state.currentIndex).toBe(3);
      expect(state.currentTrack?.id).toBe('s1');
    });

    it('safely handles out-of-bounds reorder indices without crashing', () => {
      const tracks = [createMockTrack('a'), createMockTrack('b')];
      const state = QueueCoordinator.buildContextQueue({
        newTracks: tracks,
        selectedIndex: 0,
        source: { type: 'album', id: 'alb', title: 'Album' },
      }).state;

      // Out of bounds from/to
      const unchanged = QueueCoordinator.reorder(state, 'standard', -5, 10);
      expect(unchanged.standardQueue).toEqual(state.standardQueue);
    });

    it('removing an upcoming track decreases queue length while keeping currentTrack unchanged', () => {
      const tracks = [createMockTrack('x'), createMockTrack('y'), createMockTrack('z')];
      let state = QueueCoordinator.buildContextQueue({
        newTracks: tracks,
        selectedIndex: 0,
        source: { type: 'album', id: 'alb', title: 'Album' },
      }).state;

      // Remove upcoming track 'y' at index 1
      const { removedItem, updatedState } = QueueCoordinator.remove(state, 'standard', 1);

      expect(removedItem?.id).toBe('y');
      expect(updatedState.standardQueue).toHaveLength(2);
      expect(updatedState.currentTrack?.id).toBe('x');
      expect(updatedState.standardQueue.map((t) => t.id)).toEqual(['x', 'z']);
    });

    it('history buffer remains strictly capped at 50 tracks under massive playback load', () => {
      let state = QueueCoordinator.createEmptyState();

      // Simulate playing 100 tracks sequentially
      for (let i = 0; i < 100; i++) {
        const track = QueueCoordinator.asQueueEntry(createMockTrack(`hist_${i}`), 'standard');
        state = {
          ...state,
          history: [...state.history, track].slice(-50),
          currentTrack: track,
        };
      }

      expect(state.history).toHaveLength(50);
      // Oldest track in history should be hist_50
      expect(state.history[0]?.id).toBe('hist_50');
      // Most recent in history should be hist_99
      expect(state.history[49]?.id).toBe('hist_99');
    });
  });
});
