/**
 * ContextActionSheet — Bottom sheet with track context actions.
 *
 * Actions: Play Next, Add to Queue, Add to Playlist, Like, Download, Share.
 * Uses a simple Reanimated-driven sheet (no @gorhom/bottom-sheet dependency added).
 * Dismisses via backdrop tap or swipe down.
 */
import React, { useCallback, useEffect } from 'react';
import {
  View,
  StyleSheet,
  Pressable,
  Modal,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  runOnJS,
} from 'react-native-reanimated';
import {
  GestureDetector,
  Gesture,
  GestureHandlerRootView,
} from 'react-native-gesture-handler';
import { OTOText } from '@/design/components/OTOText';
import { OTOArtwork } from '@/design/components/OTOArtwork';
import { color, space, radius, spring, duration } from '@/design/tokens';
import type { Track } from '@/domain/types';
import type { ContextAction } from '../types';

interface ActionItem {
  action: ContextAction;
  label: string;
  icon: string;
}

const ACTIONS: ActionItem[] = [
  { action: 'play_next', label: 'Play Next', icon: '▶︎' },
  { action: 'add_to_queue', label: 'Add to Queue', icon: '↓' },
  { action: 'add_to_playlist', label: 'Add to Playlist', icon: '+' },
  { action: 'like', label: 'Like', icon: '♥' },
  { action: 'download', label: 'Download', icon: '⬇' },
  { action: 'share', label: 'Share', icon: '↗' },
];

const SHEET_HEIGHT = 480;

export interface ContextActionSheetProps {
  track: Track | null;
  visible: boolean;
  onDismiss: () => void;
  onAction: (track: Track, action: ContextAction) => void;
}

export function ContextActionSheet({
  track,
  visible,
  onDismiss,
  onAction,
}: ContextActionSheetProps): React.JSX.Element | null {
  const translateY = useSharedValue(SHEET_HEIGHT);
  const backdropOpacity = useSharedValue(0);

  const open = useCallback(() => {
    backdropOpacity.value = withTiming(1, { duration: duration.standard });
    translateY.value = withSpring(0, spring.spatial.default);
  }, [backdropOpacity, translateY]);

  const close = useCallback(() => {
    backdropOpacity.value = withTiming(0, { duration: duration.standard });
    translateY.value = withSpring(SHEET_HEIGHT, spring.spatial.fast, () => {
      runOnJS(onDismiss)();
    });
  }, [backdropOpacity, translateY, onDismiss]);

  useEffect(() => {
    if (visible) open();
  }, [visible, open]);

  const sheetStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
  }));

  const backdropStyle = useAnimatedStyle(() => ({
    opacity: backdropOpacity.value,
  }));

  const panGesture = Gesture.Pan()
    .onUpdate((e) => {
      if (e.translationY > 0) {
        translateY.value = e.translationY;
      }
    })
    .onEnd((e) => {
      if (e.translationY > SHEET_HEIGHT * 0.35) {
        runOnJS(close)();
      } else {
        translateY.value = withSpring(0, spring.spatial.default);
      }
    });

  if (!visible || !track) return null;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      statusBarTranslucent
      onRequestClose={close}
    >
      <GestureHandlerRootView style={styles.overlay}>
        {/* Backdrop */}
        <Animated.View style={[styles.backdrop, backdropStyle]}>
          <Pressable
            style={styles.backdropPressable}
            onPress={close}
            accessible
            accessibilityRole="button"
            accessibilityLabel="Close action menu"
          />
        </Animated.View>

        {/* Sheet */}
        <GestureDetector gesture={panGesture}>
          <Animated.View style={[styles.sheet, sheetStyle]}>
            {/* Handle */}
            <View style={styles.handle} />

            {/* Track header */}
            <View style={styles.trackHeader}>
              <OTOArtwork
                uri={track.artworkUrl}
                thumbhash={track.thumbhash}
                size={52}
                borderRadius={radius.sm}
              />
              <View style={styles.trackInfo}>
                <OTOText variant="body" colorRole="primary" numberOfLines={1}>
                  {track.title}
                </OTOText>
                <OTOText variant="artist" colorRole="secondary" numberOfLines={1}>
                  {track.artist}
                </OTOText>
              </View>
            </View>

            <View style={styles.divider} />

            {/* Actions */}
            {ACTIONS.map((item) => (
              <Pressable
                key={item.action}
                style={styles.actionRow}
                onPress={() => {
                  onAction(track, item.action);
                  close();
                }}
                accessible
                accessibilityRole="button"
                accessibilityLabel={item.label}
              >
                <View style={styles.actionIcon}>
                  <OTOText variant="body" colorRole="secondary">{item.icon}</OTOText>
                </View>
                <OTOText variant="body" colorRole="primary">{item.label}</OTOText>
              </Pressable>
            ))}
          </Animated.View>
        </GestureDetector>
      </GestureHandlerRootView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  backdrop: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(0,0,0,0.6)',
  },
  backdropPressable: {
    flex: 1,
  },
  sheet: {
    backgroundColor: color.bg.s2,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    paddingBottom: space[8],
    maxHeight: SHEET_HEIGHT,
  },
  handle: {
    alignSelf: 'center',
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: color.glass.highlight,
    marginTop: space[2],
    marginBottom: space[3],
  },
  trackHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: space[4],
    paddingBottom: space[4],
    gap: space[3],
  },
  trackInfo: {
    flex: 1,
    gap: 2,
  },
  divider: {
    height: 1,
    backgroundColor: color.hairline,
    marginHorizontal: space[4],
    marginBottom: space[2],
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: space[4],
    paddingVertical: space[3],
    minHeight: 52,
    gap: space[4],
  },
  actionIcon: {
    width: 32,
    alignItems: 'center',
  },
});
