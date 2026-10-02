import React from 'react';
import {
  View,
  StyleSheet,
  Platform,
  useWindowDimensions,
} from 'react-native';
import { Image } from 'expo-image';
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
  panGestureEnabled?: boolean;
  children?: React.ReactNode;
}

/**
 * OTONowPlayingShell - Full-screen expandable container for the active player.
 *
 * Driven by the single shared value `playerProgress` (0 = collapsed, 1 = full).
 * Contains:
 *   - Full-bleed blurred artwork background (BitChord-style)
 *   - Dark scrim for text legibility
 *   - Atmospheric Skia gradient overlay (4 quality tiers)
 *   - Interactive Now Playing content hierarchy
 */
export function OTONowPlayingShell({
  playerProgress,
  screenHeight,
  panGesture,
  panGestureEnabled = true,
  children,
}: OTONowPlayingShellProps): React.JSX.Element | null {
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
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
      accessible={false}
    >
      {/* Layer 1: Full-bleed blurred artwork background */}
      {currentTrack.artworkUrl ? (
        <Image
          source={{ uri: currentTrack.artworkUrl }}
          style={[StyleSheet.absoluteFill, { width, height }]}
          blurRadius={Platform.OS === 'android' ? 28 : 40}
          contentFit="cover"
          accessibilityIgnoresInvertColors
          pointerEvents="none"
        />
      ) : (
        <View style={[StyleSheet.absoluteFill, { backgroundColor: color.bg.base }]} />
      )}

      {/* Layer 2: Dark scrim for legibility */}
      <View style={styles.scrim} pointerEvents="none" />

      {/* Layer 3: Atmospheric Skia gradient overlay (4 Quality Tiers) */}
      <View style={StyleSheet.absoluteFill} pointerEvents="none">
        <OTODynamicBackground />
      </View>

      {/* Layer 4 & 5: Interactive Now Playing hierarchy */}
      {panGesture && panGestureEnabled ? (
        <GestureDetector gesture={panGesture}>
          <View style={styles.interactiveArea}>
            <View style={styles.dragHandleArea} pointerEvents="none">
              <View style={styles.dragHandle} />
            </View>
            <View style={styles.content}>
              {children}
            </View>
          </View>
        </GestureDetector>
      ) : (
        <View style={styles.interactiveArea}>
          <View style={styles.dragHandleArea} pointerEvents="none">
            <View style={styles.dragHandle} />
          </View>
          <View style={styles.content}>
            {children}
          </View>
        </View>
      )}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 200,
    paddingHorizontal: space[5],
    overflow: 'hidden',
  },
  interactiveArea: {
    flex: 1,
  },
  scrim: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(0, 0, 0, 0.52)',
  },
  dragHandleArea: {
    width: '100%',
    alignItems: 'center',
    paddingTop: space[1],
    paddingBottom: space[2],
  },
  dragHandle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(255, 255, 255, 0.28)',
  },
  content: {
    flex: 1,
  },
});
