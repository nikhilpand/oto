/**
 * Storybook Stories for Two-Tier Reorderable Queue (P7)
 *
 * Demonstrates:
 * - Full interactive OTOQueue container
 * - Priority queue reordering
 * - Swipe-to-remove with undo toast
 * - Populating with 200+ items to verify 60/120 fps list performance constraint
 * - Various OTOQueueItem states (Playing, Standard, Explicit, Draggable)
 */

import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import { OTOText } from '@/design/components/OTOText';
import { OTOButton } from '@/design/components/OTOButton';
import { OTOQueue } from '@/queue/components/OTOQueue';
import { OTOQueueItem } from '@/queue/components/OTOQueueItem';
import { useQueueStore } from '@/store/useQueueStore';
import { usePlaybackStore } from '@/store/usePlaybackStore';
import { Track } from '@/domain/types';
import { QueueCoordinator } from '@/domain/queue/QueueCoordinator';
import { radius, space } from '@/design/tokens';

const MOCK_TRACKS: Track[] = [
  {
    id: 'track-1',
    title: 'Starboy',
    artist: 'The Weeknd, Daft Punk',
    artists: ['The Weeknd', 'Daft Punk'],
    album: 'Starboy',
    durationMs: 230000,
    artworkUrl: 'https://images.unsplash.com/photo-1614613535308-eb5fbd3d2c17?w=300',
    thumbhash: '3OcRJYB4d3h/iIeHeEh3eIh4h4iH',
    isExplicit: true,
    audioFormat: 'flac',
  },
  {
    id: 'track-2',
    title: 'Blinding Lights',
    artist: 'The Weeknd',
    artists: ['The Weeknd'],
    album: 'After Hours',
    durationMs: 200000,
    artworkUrl: 'https://images.unsplash.com/photo-1518609878373-06d740f60d8b?w=300',
    thumbhash: '3OcRJYB4d3h/iIeHeEh3eIh4h4iH',
    isExplicit: false,
    audioFormat: 'flac',
  },
  {
    id: 'track-3',
    title: 'Die For You',
    artist: 'The Weeknd, Ariana Grande',
    artists: ['The Weeknd', 'Ariana Grande'],
    album: 'Starboy (Deluxe)',
    durationMs: 232000,
    artworkUrl: 'https://images.unsplash.com/photo-1508700115892-45ecd05ae2ad?w=300',
    thumbhash: '3OcRJYB4d3h/iIeHeEh3eIh4h4iH',
    isExplicit: false,
    audioFormat: 'opus',
  },
  {
    id: 'track-4',
    title: 'Save Your Tears',
    artist: 'The Weeknd',
    artists: ['The Weeknd'],
    album: 'After Hours',
    durationMs: 215000,
    artworkUrl: 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=300',
    thumbhash: '3OcRJYB4d3h/iIeHeEh3eIh4h4iH',
    isExplicit: false,
    audioFormat: 'flac',
  },
  {
    id: 'track-5',
    title: 'In Your Eyes',
    artist: 'The Weeknd, Doja Cat',
    artists: ['The Weeknd', 'Doja Cat'],
    album: 'After Hours (Remixes)',
    durationMs: 237000,
    artworkUrl: 'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=300',
    thumbhash: '3OcRJYB4d3h/iIeHeEh3eIh4h4iH',
    isExplicit: true,
    audioFormat: 'aac',
  },
];

export function QueueStory() {
  const playContext = useQueueStore((s) => s.playContext);
  const playNext = useQueueStore((s) => s.playNext);
  const addToQueue = useQueueStore((s) => s.addToQueue);
  const popNext = useQueueStore((s) => s.popNext);
  const reset = useQueueStore((s) => s.reset);

  const setPlaying = usePlaybackStore((s) => s.setPlaying);

  useEffect(() => {
    // Populate with default context tracks on mount
    playContext(MOCK_TRACKS, 0, {
      id: 'album-starboy',
      title: 'Starboy (Album)',
      type: 'album',
    });
    setPlaying(true);
  }, [playContext, setPlaying]);

  const handleAdd200Tracks = () => {
    const bulkTracks: Track[] = Array.from({ length: 200 }, (_, idx) => ({
      id: `bulk-track-${idx + 1}`,
      title: `Context Symphony Track #${idx + 1}`,
      artist: `Artist ${(idx % 10) + 1}`,
      artists: [`Artist ${(idx % 10) + 1}`],
      album: 'The 200 Opus Collection',
      durationMs: 180000 + (idx % 60) * 1000,
      artworkUrl: 'https://images.unsplash.com/photo-1518609878373-06d740f60d8b?w=300',
      thumbhash: '3OcRJYB4d3h/iIeHeEh3eIh4h4iH',
      isExplicit: idx % 7 === 0,
      audioFormat: idx % 2 === 0 ? 'flac' : 'opus',
    }));

    playContext(bulkTracks, 0, {
      id: 'playlist-200',
      title: '200+ Track Virtualized Load Test',
      type: 'playlist',
    });
  };

  const samplePriorityItem = QueueCoordinator.asQueueEntry(
    {
      id: 'priority-sample',
      title: 'Priority User Pick',
      artist: 'Guest Feature',
      artists: ['Guest Feature'],
      album: 'Single',
      durationMs: 195000,
      artworkUrl: 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=300',
      thumbhash: '3OcRJYB4d3h/iIeHeEh3eIh4h4iH',
      isExplicit: true,
      audioFormat: 'flac',
    },
    'priority',
  );

  return (
    <View style={styles.storyRoot}>
      {/* Test Controls */}
      <View style={styles.controlsSection}>
        <OTOText variant="title" weight="bold">
          Queue Controller
        </OTOText>
        <OTOText variant="caption" colorRole="secondary" style={styles.subtitle}>
          Two-Tier Priority Scheduling with MMKV Hydration
        </OTOText>

        <View style={styles.buttonRow}>
          <OTOButton
            label="Play Next"
            variant="secondary"
            size="sm"
            onPress={() => {
              playNext({
                id: `next-${Date.now()}`,
                title: `Play Next #${Math.floor(Math.random() * 100)}`,
                artist: 'Priority Artist',
                artists: ['Priority Artist'],
                album: 'Singles',
                durationMs: 210000,
                artworkUrl: 'https://images.unsplash.com/photo-1518609878373-06d740f60d8b?w=300',
                thumbhash: '3OcRJYB4d3h/iIeHeEh3eIh4h4iH',
                isExplicit: false,
              });
            }}
          />
          <OTOButton
            label="Add to Queue"
            variant="secondary"
            size="sm"
            onPress={() => {
              addToQueue({
                id: `queue-${Date.now()}`,
                title: `Added #${Math.floor(Math.random() * 100)}`,
                artist: 'Queued Artist',
                artists: ['Queued Artist'],
                album: 'Singles',
                durationMs: 190000,
                artworkUrl: 'https://images.unsplash.com/photo-1508700115892-45ecd05ae2ad?w=300',
                thumbhash: '3OcRJYB4d3h/iIeHeEh3eIh4h4iH',
                isExplicit: true,
              });
            }}
          />
          <OTOButton
            label="Pop Next"
            variant="primary"
            size="sm"
            onPress={() => {
              popNext();
            }}
          />
        </View>

        <View style={styles.buttonRow}>
          <OTOButton
            label="Load 200 Tracks (Perf Test)"
            variant="secondary"
            size="sm"
            onPress={handleAdd200Tracks}
          />
          <OTOButton
            label="Reset Queue"
            variant="ghost"
            size="sm"
            onPress={() => {
              reset();
            }}
          />
        </View>
      </View>

      {/* Component State Previews */}
      <View style={styles.previewSection}>
        <OTOText variant="caption" weight="bold" colorRole="tertiary" style={styles.previewTitle}>
          QUEUE ROW STATES
        </OTOText>
        <OTOQueueItem
          item={samplePriorityItem}
          isCurrent
          isPlaying
          onPress={() => {}}
        />
        <OTOQueueItem
          item={samplePriorityItem}
          isDraggable
          canMoveUp
          canMoveDown
          onPress={() => {}}
          onRemove={() => {}}
          onMoveUp={() => {}}
          onMoveDown={() => {}}
        />
      </View>

      {/* Embedded Live OTOQueue */}
      <View style={styles.embeddedQueueContainer}>
        <OTOQueue />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  storyRoot: {
    paddingVertical: space[3],
    paddingHorizontal: space[2],
  },
  controlsSection: {
    padding: space[4],
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderRadius: radius.lg,
    marginBottom: space[4],
  },
  subtitle: {
    marginTop: space[1],
    marginBottom: space[3],
  },
  buttonRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: space[2],
    marginBottom: space[2],
  },
  previewSection: {
    padding: space[3],
    backgroundColor: 'rgba(255, 255, 255, 0.02)',
    borderRadius: radius.md,
    marginBottom: space[4],
  },
  previewTitle: {
    letterSpacing: 1.2,
    marginBottom: space[2],
  },
  embeddedQueueContainer: {
    height: 600,
    borderRadius: radius.lg,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
});
