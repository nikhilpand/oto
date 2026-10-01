/**
 * OTO Queue Item Component
 *
 * High-performance queue row with:
 * - 48dp touch target
 * - Scale lift (1.02x) on active touch / drag
 * - Now Playing soundwave indicator
 * - Drag handle for reordering
 * - WCAG-compliant custom accessibility actions (Move Up, Move Down, Remove, Play Next)
 */

import {
  AccessibilityActionEvent,
  Pressable,
  StyleSheet,
  View,
} from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { QueueItem } from '@/domain/queue/types';
import { color, radius, space } from '@/design/tokens';
import { OTOText } from '@/design/components/OTOText';
import { OTOArtwork } from '@/design/components/OTOArtwork';
import { DragHandleIcon, TrashIcon } from '@/design/components/OTOIcon';
import { usePalette } from '@/design/context/PaletteContext';

export interface OTOQueueItemProps {
  item: QueueItem;
  isCurrent?: boolean;
  isPlaying?: boolean;
  isDraggable?: boolean;
  canMoveUp?: boolean;
  canMoveDown?: boolean;
  onPress?: () => void;
  onRemove?: () => void;
  onMoveUp?: () => void;
  onMoveDown?: () => void;
  onPlayNext?: () => void;
}

function PlayingWaveIndicator({ activeColor }: { activeColor: string }) {
  return (
    <View style={styles.waveContainer}>
      <View style={[styles.waveBar, { height: 14, backgroundColor: activeColor }]} />
      <View style={[styles.waveBar, { height: 8, backgroundColor: activeColor }]} />
      <View style={[styles.waveBar, { height: 16, backgroundColor: activeColor }]} />
      <View style={[styles.waveBar, { height: 11, backgroundColor: activeColor }]} />
    </View>
  );
}

export function OTOQueueItem({
  item,
  isCurrent = false,
  isPlaying = false,
  isDraggable = false,
  canMoveUp = false,
  canMoveDown = false,
  onPress,
  onRemove,
  onMoveUp,
  onMoveDown,
  onPlayNext,
}: OTOQueueItemProps) {
  const { activePalette } = usePalette();
  const activeColor = activePalette.dominant || color.accent.signature;

  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePressIn = () => {
    scale.value = withSpring(1.02, { damping: 15, stiffness: 250 });
  };

  const handlePressOut = () => {
    scale.value = withSpring(1, { damping: 15, stiffness: 250 });
  };

  const handleAccessibilityAction = (event: AccessibilityActionEvent) => {
    const actionName = event.nativeEvent.actionName;
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    switch (actionName) {
      case 'moveUp':
        onMoveUp?.();
        break;
      case 'moveDown':
        onMoveDown?.();
        break;
      case 'remove':
        onRemove?.();
        break;
      case 'playNext':
        onPlayNext?.();
        break;
      case 'activate':
        onPress?.();
        break;
    }
  };

  const accessibilityActions = [
    { name: 'activate', label: isCurrent ? 'Currently Playing' : 'Play' },
    ...(canMoveUp && onMoveUp ? [{ name: 'moveUp', label: 'Move Up in Queue' }] : []),
    ...(canMoveDown && onMoveDown ? [{ name: 'moveDown', label: 'Move Down in Queue' }] : []),
    ...(onRemove ? [{ name: 'remove', label: 'Remove from Queue' }] : []),
    ...(onPlayNext ? [{ name: 'playNext', label: 'Play Next' }] : []),
  ];

  return (
    <Animated.View style={[styles.wrapper, animatedStyle]}>
      <Pressable
        accessible
        accessibilityRole="button"
        accessibilityLabel={`${item.title} by ${item.artist}${isCurrent ? ', currently playing' : ''}`}
        accessibilityHint="Double tap to play or use custom actions to reorder"
        accessibilityActions={accessibilityActions}
        onAccessibilityAction={handleAccessibilityAction}
        onPress={() => {
          void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          onPress?.();
        }}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        style={[
          styles.container,
          isCurrent && [styles.currentContainer, { borderColor: activeColor + '40' }],
        ]}
      >
        {/* Artwork / Playing state */}
        <View style={styles.artworkContainer}>
          <OTOArtwork
            uri={item.artworkUrl}
            thumbhash={item.thumbhash}
            size={44}
            borderRadius={radius.sm}
            alt={`${item.title} album art`}
          />
          {isCurrent && isPlaying && (
            <View style={styles.playingOverlay}>
              <PlayingWaveIndicator activeColor={activeColor} />
            </View>
          )}
        </View>

        {/* Track Title and Artist */}
        <View style={styles.infoContainer}>
          <OTOText
            variant="body"
            weight={isCurrent ? 'bold' : 'medium'}
            colorRole={isCurrent ? 'primary' : 'primary'}
            numberOfLines={1}
            style={isCurrent ? { color: activeColor } : undefined}
          >
            {item.title}
          </OTOText>
          <View style={styles.subRow}>
            {item.isExplicit && (
              <View style={styles.explicitBadge}>
                <OTOText variant="meta" weight="bold" colorRole="tertiary" style={styles.explicitText}>
                  E
                </OTOText>
              </View>
            )}
            <OTOText variant="caption" colorRole="secondary" numberOfLines={1}>
              {item.artist}
            </OTOText>
          </View>
        </View>

        {/* Reorder / Action handle */}
        <View style={styles.actionsContainer}>
          {onRemove && (
            <Pressable
              accessible
              accessibilityRole="button"
              accessibilityLabel={`Remove ${item.title} from queue`}
              onPress={(e) => {
                e.stopPropagation();
                void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                onRemove();
              }}
              style={styles.iconButton}
            >
              <TrashIcon />
            </Pressable>
          )}
          {isDraggable && (
            <View style={styles.dragGripContainer}>
              <DragHandleIcon />
            </View>
          )}
        </View>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    marginVertical: 2,
  },
  container: {
    minHeight: 56,
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: space[2],
    paddingHorizontal: space[3],
    borderRadius: radius.md,
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
  },
  currentContainer: {
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderWidth: 1,
  },
  artworkContainer: {
    width: 44,
    height: 44,
    borderRadius: radius.sm,
    overflow: 'hidden',
    position: 'relative',
    marginRight: space[3],
  },
  playingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.55)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  waveContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 2,
    height: 16,
  },
  waveBar: {
    width: 3,
    borderRadius: 1.5,
  },
  infoContainer: {
    flex: 1,
    justifyContent: 'center',
  },
  subRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
  },
  explicitBadge: {
    width: 14,
    height: 14,
    borderRadius: 2,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: space[1],
  },
  explicitText: {
    fontSize: 9,
    lineHeight: 11,
  },
  actionsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space[2],
    marginLeft: space[2],
  },
  iconButton: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  dragGripContainer: {
    width: 32,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
