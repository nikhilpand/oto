# Prompt Slice P7: Two-Tier Reorderable Queue

## Required Skills to Activate
- `reverse-engineer`: Clean-room adaptation of BitChord `QueueCoordinator.kt` (two-tier priority vs standard queue, un-shuffle index preservation).
- `react-state-management`: Zustand store + MMKV fast hydration for queue state persistence.
- `react-native-architecture`: Gesture-driven lift-and-drop reordering, swipe removal with undo, FlashList v2 virtualization.
- `screen-reader-testing`: Custom accessibility actions ("Move Up", "Move Down", "Remove from Queue") for screen readers.
- `test-driven-development`: TDD test suite for queue pop priority, shuffle/unshuffle, history rollover, and empty bounds.

```text
Read AGENTS.md, docs/SPEC.md, and docs/DESIGN.md. Then execute the task below. Post a plan before editing.

Task:
Build `OTOQueue` utilizing BitChord's two-tier queue architecture (`QueueCoordinator.kt` from BITCHORD_RE/03_PLAYBACK.md):
1. Data Model (`src/domain/queue/QueueManager.ts`):
   ```typescript
   export interface QueueState {
     priorityQueue: Track[];    // User-enqueued "Play Next" tracks (popped first)
     standardQueue: Track[];    // Standard sequence (album, playlist, artist)
     originalIndices: number[]; // Preserves original order when un-shuffling
     currentIndex: number;
     history: Track[];          // Recently played tracks
   }
   ```
   - When user chooses "Play Next", unshift into `priorityQueue`.
   - When song ends: if `priorityQueue` is non-empty, shift next from `priorityQueue`; else advance `standardQueue`.
   - When shuffle is toggled, shuffle `standardQueue` while preserving `originalIndices`.
2. UI Sections:
   - Now Playing (visually dominant row with playing indicator).
   - Next in Queue (user-added priority songs, draggable reorder).
   - Autoplay / Up Next (recommended tracks, clearly separated).
   - History (recently played, collapsed by default).
3. Gestures & Interactivity:
   - Lift-and-drop reordering with scale lift (1.02) and haptic feedback on pickup and drop.
   - Swipe row to remove with undo snackbar.
   - Swipe row to "Play Next" (pushes to top of priority tier).
4. Accessibility:
   - Drag-and-drop is backed by custom accessibility actions ("Move Up", "Move Down", "Remove from Queue") for screen readers.

Constraints:
- List performance must remain smooth with 200+ queue items.
- Document whether FlashList v2 or a bounded virtualized list was selected for drag-and-drop reordering.

Acceptance Criteria:
- Screen-reader user can reorder items using custom actions.
- Reordering emits zero unhandled state errors and persists cleanly in MMKV.
```
