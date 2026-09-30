import React from 'react';
import {
  View,
  StyleSheet,
  Pressable,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, {
  useAnimatedStyle,
  interpolate,
  type SharedValue,
} from 'react-native-reanimated';
import { color, space, radius, touchTarget } from '@/design/tokens';
import { OTOText } from '@/design/components/OTOText';
import { usePlaybackStore } from '@/store/usePlaybackStore';

export interface OTONowPlayingShellProps {
  playerProgress: SharedValue<number>;
  onCollapse: () => void;
  screenHeight: number;
  children?: React.ReactNode;
}

/**
 * OTONowPlayingShell — Full-screen expandable container for the active player.
 *
 * Driven by the single shared value `playerProgress` (0 = collapsed, 1 = full).
 * Translates and fades smoothly from bottom of screen upward without hitching.
 */
export function OTONowPlayingShell({
  playerProgress,
  onCollapse,
  screenHeight,
  children,
}: OTONowPlayingShellProps): React.JSX.Element | null {
  const insets = useSafeAreaInsets();
  const currentTrack = usePlaybackStore((s) => s.currentTrack);

  const containerAnimatedStyle = useAnimatedStyle(() => {
    const translateY = interpolate(
      playerProgress.value,
      [0, 1],
      [screenHeight, 0]
    );
    const opacity = interpolate(
      playerProgress.value,
      [0, 0.05, 1],
      [0, 1, 1]
    );

    return {
      transform: [{ translateY }],
      opacity,
    };
  });

  if (!currentTrack) {
    return null;
  }

  return (
    <Animated.View
      style={[
        styles.container,
        {
          paddingTop: Math.max(insets.top, space[4]),
          paddingBottom: Math.max(insets.bottom, space[6]),
        },
        containerAnimatedStyle,
      ]}
      pointerEvents={playerProgress.value < 0.05 ? 'none' : 'auto'}
      accessible={false}
    >
      {/* Top Grabber & Collapse Header */}
      <View style={styles.header}>
        <Pressable
          accessible
          accessibilityRole="button"
          accessibilityLabel="Collapse now playing"
          accessibilityHint="Returns to the mini player"
          onPress={onCollapse}
          style={styles.grabberTouchTarget}
        >
          <View style={styles.grabberBar} />
        </Pressable>

        <View style={styles.headerTitleContainer}>
          <OTOText variant="meta" weight="semibold" colorRole="tertiary" numberOfLines={1}>
            PLAYING FROM
          </OTOText>
          <OTOText variant="caption" weight="medium" colorRole="primary" numberOfLines={1}>
            {currentTrack.album ?? 'Now Playing'}
          </OTOText>
        </View>

        {/* Balance spacer matching grabber width */}
        <View style={styles.headerSpacer} />
      </View>

      {/* Main Content Area (Artwork & Controls) */}
      <View style={styles.content}>
        {children}
      </View>
    </Animated.View>
  );
}

const MIN_TOUCH_SIZE = Platform.select({
  ios: touchTarget.ios,
  default: touchTarget.android,
});

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFill,
    backgroundColor: color.bg.base,
    zIndex: 200,
    paddingHorizontal: space[5],
  },
  header: {
    height: 48,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: space[4],
  },
  grabberTouchTarget: {
    width: MIN_TOUCH_SIZE,
    height: MIN_TOUCH_SIZE,
    justifyContent: 'center',
    alignItems: 'center',
  },
  grabberBar: {
    width: 36,
    height: 5,
    borderRadius: radius.full,
    backgroundColor: color.hairline,
  },
  headerTitleContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
  },
  headerSpacer: {
    width: MIN_TOUCH_SIZE,
  },
  content: {
    flex: 1,
  },
});
