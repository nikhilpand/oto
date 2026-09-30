import React from 'react';
import {
  View,
  StyleSheet,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, {
  useAnimatedStyle,
  interpolate,
  type SharedValue,
} from 'react-native-reanimated';
import { GestureDetector, type Gesture } from 'react-native-gesture-handler';
import { color, space } from '@/design/tokens';
import { usePlaybackStore } from '@/store/usePlaybackStore';
import { OTODynamicBackground } from './OTODynamicBackground';

export interface OTONowPlayingShellProps {
  playerProgress: SharedValue<number>;
  onCollapse: () => void;
  screenHeight: number;
  panGesture?: ReturnType<typeof Gesture.Pan>;
  children?: React.ReactNode;
}

/**
 * OTONowPlayingShell — Full-screen expandable container for the active player.
 *
 * Driven by the single shared value `playerProgress` (0 = collapsed, 1 = full).
 * Contains the atmospheric liquid background (4 quality tiers) and wraps
 * the interactive Now Playing content hierarchy.
 */
export function OTONowPlayingShell({
  playerProgress,
  screenHeight,
  panGesture,
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
      pointerEvents: playerProgress.value < 0.05 ? 'none' : 'auto',
    };
  });

  if (!currentTrack) {
    return null;
  }

  const content = (
    <Animated.View
      style={[
        styles.container,
        {
          paddingTop: Math.max(insets.top, space[4]),
          paddingBottom: Math.max(insets.bottom, space[6]),
        },
        containerAnimatedStyle,
      ]}
      accessible={false}
    >
      {/* 1. Atmospheric liquid background layer (4 Quality Tiers) */}
      <OTODynamicBackground />

      {/* 2. Now Playing interactive content */}
      <View style={styles.content}>
        {children}
      </View>
    </Animated.View>
  );

  if (panGesture) {
    return <GestureDetector gesture={panGesture}>{content}</GestureDetector>;
  }

  return content;
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: color.bg.base,
    zIndex: 200,
    paddingHorizontal: space[5],
  },
  content: {
    flex: 1,
  },
});

