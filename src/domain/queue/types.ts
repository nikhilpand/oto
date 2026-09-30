/**
 * Two-Tier Queue Domain Types
 *
 * Implements the domain contract specified in docs/prompts/P07_queue.md
 * and BitChord reverse engineering (BITCHORD_RE/03_PLAYBACK.md).
 */

import { Track } from '@/domain/types';

/**
 * Queue tiers:
 * - 'priority': User-added tracks ("Play Next" or "Add to Queue") - always popped first
 * - 'standard': Album, playlist, or artist playback sequence
 * - 'history': Played tracks retained for backward traversal
 */
export type QueueTier = 'priority' | 'standard' | 'history';

/**
 * Queue entry with immutable unique identity.
 * Invariant: queueEntryId is assigned ONCE on queue entry, allowing the same track
 * to appear multiple times in a queue without key collisions or gesture ambiguity.
 */
export interface QueueItem extends Track {
  /** Unique instance ID for this specific queue occurrence */
  queueEntryId: string;
  /** Tier assignment */
  queueTier: QueueTier;
  /** Optional origin of this item */
  source?: QueueSource;
  /** Timestamp in ms when track was added to queue */
  addedAt?: number;
}

/**
 * The origin context from which the queue was populated.
 */
export interface QueueSource {
  id: string;
  title: string;
  type: 'album' | 'playlist' | 'artist' | 'search' | 'radio';
}

/**
 * Complete serializable snapshot of the two-tier queue.
 */
export interface QueueState {
  /** User-enqueued "Play Next" tracks (popped first, LIFO/FIFO managed) */
  priorityQueue: QueueItem[];
  /** Standard sequence (album, playlist, artist) */
  standardQueue: QueueItem[];
  /** Preserves original order when un-shuffling */
  originalIndices: number[];
  /** Current index in standardQueue (-1 if active track is from priorityQueue or none) */
  currentIndex: number;
  /** Currently active track playing in the audio engine */
  currentTrack: QueueItem | null;
  /** Recently played tracks retained for previous track navigation */
  history: QueueItem[];
}

/**
 * Result returned when a new context (e.g. album or playlist) is played.
 */
export interface ContextQueueResult {
  state: QueueState;
  startIndex: number;
}
