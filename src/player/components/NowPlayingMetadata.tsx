import React from 'react';
import { View, StyleSheet, Pressable } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { color, space, spring } from '@/design/tokens';
import { OTOText, HeartIcon } from '@/design/components';
import type { Track } from '@/domain/types';

export interface NowPlayingMetadataProps {
  track: Track;
  isLiked: boolean;
  onToggleLike: () => void;
  minTouchSize: number;
  accentColor?: string;
  onOptionsPress?: () => void;
}

export function NowPlayingMetadata({
  track,
  isLiked,
  onToggleLike,
  minTouchSize,
  accentColor,
  onOptionsPress,
}: NowPlayingMetadataProps): React.JSX.Element {
  const likeScale = useSharedValue(1);

  const handlePressLike = () => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    likeScale.value = withSpring(1.35, spring.spatial.fast, () => {
      likeScale.value = withSpring(1, spring.spatial.playful);
    });
    onToggleLike();
  };

  const handlePressMore = () => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onOptionsPress?.();
  };

  const likeAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: likeScale.value }],
  }));

  const buttonSize = Math.max(minTouchSize, 40);

  return (
    <View style={styles.metaRow}>
      <View style={styles.metaTextContainer}>
        <OTOText variant="headline" weight="bold" numberOfLines={1}>
          {track.title}
        </OTOText>
        <OTOText variant="body" colorRole="secondary" numberOfLines={1}>
          {track.artist}
        </OTOText>
      </View>
      <View style={styles.actionButtons}>
        <Pressable
          accessible
          accessibilityRole="button"
          accessibilityLabel={isLiked ? 'Unlike track' : 'Like track'}
          onPress={handlePressLike}
          style={[styles.circleButton, { width: buttonSize, height: buttonSize }]}
        >
          <Animated.View style={likeAnimatedStyle}>
            <HeartIcon
              size={20}
              filled={isLiked}
              color={isLiked ? (accentColor || color.accent.signature) : color.text.primary}
            />
          </Animated.View>
        </Pressable>
        <Pressable
          accessible
          accessibilityRole="button"
          accessibilityLabel="More options"
          onPress={handlePressMore}
          style={[styles.circleButton, { width: buttonSize, height: buttonSize }]}
        >
          <OTOText variant="body" weight="bold" colorRole="primary" style={styles.dotsText}>
            •••
          </OTOText>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: space[1],
  },
  metaTextContainer: {
    flex: 1,
    gap: space[1],
  },
  actionButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space[2],
  },
  circleButton: {
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 999,
  },
  dotsText: {
    fontSize: 14,
    lineHeight: 18,
    letterSpacing: 1.5,
  },
});
