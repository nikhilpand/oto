/**
 * OTOQueue Component
 *
 * Full two-tier queue management interface:
 * - Now Playing highlighted card
 * - User-added priority queue ("Next in Queue") with reordering & clear
 * - Standard context queue ("Up Next")
 * - Collapsible listening history
 * - Floating undo toast on removal
 * - Strict adherence to design tokens and glass surfaces
 */

import { useState, useRef, useEffect } from 'react';
import {
  LayoutAnimation,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  UIManager,
  View,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { useQueueStore } from '@/store/useQueueStore';
import { usePlaybackStore } from '@/store/usePlaybackStore';
import { QueueItem, QueueTier } from '@/domain/queue/types';
import { color, radius, space } from '@/design/tokens';
import { OTOText } from '@/design/components/OTOText';
import { OTOGlassSurface } from '@/design/components/OTOGlassSurface';
import { OTOIconButton } from '@/design/components/OTOIconButton';
import { OTOArtwork } from '@/design/components/OTOArtwork';
import { ShuffleIcon, ChevronDownIcon } from '@/design/components/OTOIcon';
import { usePalette } from '@/design/context/PaletteContext';
import { OTOQueueItem } from './OTOQueueItem';

if (
  Platform.OS === 'android' &&
  UIManager.setLayoutAnimationEnabledExperimental
) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

export interface OTOQueueProps {
  onClose?: () => void;
  onTrackSelect?: (item: QueueItem) => void;
}

interface UndoItemState {
  item: QueueItem;
  tier: QueueTier;
  index: number;
}

export function OTOQueue({ onClose, onTrackSelect }: OTOQueueProps) {
  const { activePalette } = usePalette();
  const activeColor = activePalette.dominant || color.accent.signature;

  const currentTrack = useQueueStore((s) => s.currentTrack);
  const priorityQueue = useQueueStore((s) => s.priorityQueue);
  const standardQueue = useQueueStore((s) => s.standardQueue);
  const currentIndex = useQueueStore((s) => s.currentIndex);
  const history = useQueueStore((s) => s.history);
  const isShuffled = useQueueStore((s) => s.isShuffled);

  const reorder = useQueueStore((s) => s.reorder);
  const remove = useQueueStore((s) => s.remove);
  const restoreItem = useQueueStore((s) => s.restoreItem);
  const clearPriorityQueue = useQueueStore((s) => s.clearPriorityQueue);
  const toggleShuffle = useQueueStore((s) => s.toggleShuffle);
  const jumpToTrack = useQueueStore((s) => s.jumpToTrack);

  const isPlaying = usePlaybackStore((s) => s.isPlaying);

  const [isHistoryExpanded, setIsHistoryExpanded] = useState(false);
  const [undoState, setUndoState] = useState<UndoItemState | null>(null);
  const undoTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Clear timeout on unmount
  useEffect(() => {
    return () => {
      if (undoTimeoutRef.current) clearTimeout(undoTimeoutRef.current);
    };
  }, []);

  const handleRemove = (tier: QueueTier, index: number) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    const removed = remove(tier, index);
    if (removed) {
      if (undoTimeoutRef.current) clearTimeout(undoTimeoutRef.current);
      setUndoState({ item: removed, tier, index });
      undoTimeoutRef.current = setTimeout(() => {
        setUndoState(null);
      }, 4500);
    }
  };

  const handleUndo = () => {
    if (!undoState) return;
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    restoreItem(undoState.item, undoState.tier, undoState.index);
    setUndoState(null);
    if (undoTimeoutRef.current) clearTimeout(undoTimeoutRef.current);
  };

  const handleMoveUp = (tier: QueueTier, index: number) => {
    if (index <= 0) return;
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    reorder(tier, index, index - 1);
  };

  const handleMoveDown = (tier: QueueTier, index: number, maxCount: number) => {
    if (index >= maxCount - 1) return;
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    reorder(tier, index, index + 1);
  };

  const handleTrackPress = (tier: QueueTier, index: number) => {
    const selected = jumpToTrack(tier, index);
    if (selected) {
      onTrackSelect?.(selected);
    }
  };

  // Up Next standard tracks strictly following currentIndex
  const upcomingStandard = standardQueue.slice(currentIndex + 1);

  return (
    <View style={styles.rootContainer}>
      {/* Header bar */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <OTOText variant="title" weight="bold">
            Queue
          </OTOText>
        </View>

        <View style={styles.headerActions}>
          {priorityQueue.length > 0 && (
            <Pressable
              accessible
              accessibilityRole="button"
              accessibilityLabel="Clear user priority queue"
              onPress={() => {
                void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
                clearPriorityQueue();
              }}
              style={styles.clearButton}
            >
              <OTOText variant="caption" weight="semibold" style={{ color: activeColor }}>
                Clear
              </OTOText>
            </Pressable>
          )}

          <OTOIconButton
            icon={
              <ShuffleIcon
                active={isShuffled}
                size={18}
                color={isShuffled ? activeColor : color.text.secondary}
              />
            }
            accessibilityLabel={isShuffled ? 'Shuffle on, tap to turn off' : 'Shuffle off, tap to turn on'}
            onPress={() => {
              void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
              toggleShuffle();
            }}
            size={40}
          />

          {onClose && (
            <OTOIconButton
              icon={<ChevronDownIcon color={color.text.primary} />}
              accessibilityLabel="Close queue"
              onPress={onClose}
              size={40}
            />
          )}
        </View>
      </View>

      <ScrollView
        style={styles.scrollList}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Section 1: Now Playing */}
        {currentTrack && (
          <View style={styles.section}>
            <OTOText variant="caption" weight="bold" colorRole="tertiary" style={styles.sectionHeader}>
              NOW PLAYING
            </OTOText>
            <OTOGlassSurface
              borderRadius={radius.lg}
              style={[styles.nowPlayingCard, { borderColor: activeColor + '30' }]}
            >
              <View style={styles.nowPlayingContent}>
                <OTOArtwork
                  uri={currentTrack.artworkUrl}
                  thumbhash={currentTrack.thumbhash}
                  size={52}
                  borderRadius={radius.sm}
                  alt={`${currentTrack.title} artwork`}
                />
                <View style={styles.nowPlayingMeta}>
                  <OTOText variant="body" weight="bold" numberOfLines={1} style={{ color: activeColor }}>
                    {currentTrack.title}
                  </OTOText>
                  <OTOText variant="caption" colorRole="secondary" numberOfLines={1}>
                    {currentTrack.artist}
                  </OTOText>
                  <View style={styles.formatTag}>
                    <OTOText variant="meta" weight="bold" colorRole="tertiary">
                      {isPlaying ? 'PLAYING' : 'PAUSED'}
                      {currentTrack.audioFormat ? ` • ${currentTrack.audioFormat.toUpperCase()}` : ''}
                    </OTOText>
                  </View>
                </View>
              </View>
            </OTOGlassSurface>
          </View>
        )}

        {/* Section 2: Next in Queue (User Priority Tier) */}
        <View style={styles.section}>
          <View style={styles.sectionTitleRow}>
            <OTOText variant="caption" weight="bold" colorRole="tertiary" style={styles.sectionHeader}>
              NEXT IN QUEUE
            </OTOText>
            {priorityQueue.length > 0 && (
              <View style={styles.countBadge}>
                <OTOText variant="meta" weight="bold" colorRole="primary">
                  {priorityQueue.length}
                </OTOText>
              </View>
            )}
          </View>

          {priorityQueue.length === 0 ? (
            <View style={styles.emptyPriorityBox}>
              <OTOText variant="caption" colorRole="tertiary" style={styles.emptyText}>
                No tracks added to queue yet. Use &apos;Play Next&apos; or swipe right on songs.
              </OTOText>
            </View>
          ) : (
            priorityQueue.map((item, index) => (
              <OTOQueueItem
                key={item.queueEntryId}
                item={item}
                isDraggable
                canMoveUp={index > 0}
                canMoveDown={index < priorityQueue.length - 1}
                onPress={() => handleTrackPress('priority', index)}
                onRemove={() => handleRemove('priority', index)}
                onMoveUp={() => handleMoveUp('priority', index)}
                onMoveDown={() => handleMoveDown('priority', index, priorityQueue.length)}
              />
            ))
          )}
        </View>

        {/* Section 3: Up Next (Standard Context Queue) */}
        <View style={styles.section}>
          <View style={styles.sectionTitleRow}>
            <OTOText variant="caption" weight="bold" colorRole="tertiary" style={styles.sectionHeader}>
              UP NEXT
            </OTOText>
            {upcomingStandard.length > 0 && (
              <View style={styles.countBadge}>
                <OTOText variant="meta" weight="bold" colorRole="primary">
                  {upcomingStandard.length}
                </OTOText>
              </View>
            )}
          </View>

          {upcomingStandard.length === 0 ? (
            <View style={styles.emptyPriorityBox}>
              <OTOText variant="caption" colorRole="tertiary" style={styles.emptyText}>
                End of context queue.
              </OTOText>
            </View>
          ) : (
            upcomingStandard.map((item, relIndex) => {
              const actualIndex = currentIndex + 1 + relIndex;
              return (
                <OTOQueueItem
                  key={item.queueEntryId}
                  item={item}
                  canMoveUp={relIndex > 0}
                  canMoveDown={relIndex < upcomingStandard.length - 1}
                  onPress={() => handleTrackPress('standard', actualIndex)}
                  onRemove={() => handleRemove('standard', actualIndex)}
                  onMoveUp={() => handleMoveUp('standard', actualIndex)}
                  onMoveDown={() =>
                    handleMoveDown('standard', actualIndex, standardQueue.length)
                  }
                />
              );
            })
          )}
        </View>

        {/* Section 4: History (Recently Played) */}
        {history.length > 0 && (
          <View style={styles.section}>
            <Pressable
              accessible
              accessibilityRole="button"
              accessibilityLabel={`Recently played tracks, ${history.length} songs. ${isHistoryExpanded ? 'Collapse' : 'Expand'}`}
              onPress={() => {
                void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
                setIsHistoryExpanded((prev) => !prev);
              }}
              style={styles.historyToggleRow}
            >
              <View style={styles.sectionTitleRow}>
                <OTOText variant="caption" weight="bold" colorRole="tertiary" style={styles.sectionHeader}>
                  RECENTLY PLAYED
                </OTOText>
                <View style={styles.countBadge}>
                  <OTOText variant="meta" weight="bold" colorRole="primary">
                    {history.length}
                  </OTOText>
                </View>
              </View>

              <View
                style={{
                  transform: [{ rotate: isHistoryExpanded ? '180deg' : '0deg' }],
                }}
              >
                <ChevronDownIcon color={color.text.tertiary} />
              </View>
            </Pressable>

            {isHistoryExpanded &&
              [...history].reverse().map((item) => (
                <OTOQueueItem
                  key={item.queueEntryId}
                  item={item}
                  onPress={() => {
                    useQueueStore.getState().playOneOff(item);
                    onTrackSelect?.(item);
                  }}
                />
              ))}
          </View>
        )}
      </ScrollView>

      {/* Floating Undo Snackbar */}
      {undoState && (
        <View style={styles.snackbarWrapper}>
          <OTOGlassSurface borderRadius={radius.full} style={styles.snackbarSurface}>
            <View style={styles.snackbarContent}>
              <OTOText variant="caption" colorRole="primary" numberOfLines={1} style={styles.snackbarText}>
                Removed &quot;{undoState.item.title}&quot;
              </OTOText>
              <Pressable
                accessible
                accessibilityRole="button"
                accessibilityLabel="Undo removing song from queue"
                onPress={handleUndo}
                style={[styles.undoButton, { backgroundColor: activeColor + '20' }]}
              >
                <OTOText variant="caption" weight="bold" style={{ color: activeColor }}>
                  Undo
                </OTOText>
              </Pressable>
            </View>
          </OTOGlassSurface>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  rootContainer: {
    flex: 1,
    backgroundColor: color.bg.base,
  },
  header: {
    height: 56,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: space[4],
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(255, 255, 255, 0.08)',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space[2],
  },
  clearButton: {
    minHeight: 44,
    minWidth: 44,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: space[2],
  },
  scrollList: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: space[3],
    paddingTop: space[3],
    paddingBottom: 80,
  },
  section: {
    marginBottom: space[4],
  },
  sectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space[2],
    marginBottom: space[2],
  },
  sectionHeader: {
    letterSpacing: 1.2,
  },
  countBadge: {
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: radius.full,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  nowPlayingCard: {
    padding: space[3],
    borderWidth: 1,
  },
  nowPlayingContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  nowPlayingMeta: {
    flex: 1,
    marginLeft: space[3],
    justifyContent: 'center',
  },
  formatTag: {
    alignSelf: 'flex-start',
    marginTop: 4,
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 3,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
  },
  emptyPriorityBox: {
    padding: space[4],
    borderRadius: radius.md,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: 'rgba(255, 255, 255, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: {
    textAlign: 'center',
  },
  historyToggleRow: {
    minHeight: 44,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: space[1],
  },
  snackbarWrapper: {
    position: 'absolute',
    bottom: space[4],
    left: space[4],
    right: space[4],
    alignItems: 'center',
  },
  snackbarSurface: {
    width: '100%',
    maxWidth: 400,
    paddingVertical: space[2],
    paddingHorizontal: space[4],
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
    backgroundColor: 'rgba(20, 20, 24, 0.92)',
  },
  snackbarContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  snackbarText: {
    flex: 1,
    marginRight: space[2],
  },
  undoButton: {
    minHeight: 36,
    paddingHorizontal: space[3],
    borderRadius: radius.full,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
