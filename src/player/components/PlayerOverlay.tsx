import { useMemo, useEffect } from 'react';
import {
  View,
  StyleSheet,
  useWindowDimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, {
  useAnimatedStyle,
  interpolate,
} from 'react-native-reanimated';
import { space, radius } from '@/design/tokens';
import { OTOArtwork } from '@/design/components/OTOArtwork';
import { usePalette } from '@/design/context/PaletteContext';
import { usePlaybackStore } from '@/store/usePlaybackStore';
import { useAudioEngine } from '@/audio/AudioContext';
import { usePlayheadProgress } from '@/audio/usePlayheadProgress';
import { useReducedMotion } from '@/design/hooks/useReducedMotion';
import { usePlayerMotion } from '../usePlayerMotion';
import { interpolateArtworkBounds, type Rect } from '../motionMath';
import { OTOMiniPlayer } from './OTOMiniPlayer';
import { OTONowPlayingShell } from './OTONowPlayingShell';
import { OTONowPlayingContent } from './OTONowPlayingContent';

export interface PlayerOverlayProps {
  tabBarHeight?: number;
}

/**
 * PlayerOverlay — Single Persistent Player Shell.
 *
 * Coordinates continuous traveling artwork and interruptible pan gestures
 * between the floating Mini Player and the full Now Playing screen.
 */
export function PlayerOverlay({
  tabBarHeight = 56,
}: PlayerOverlayProps): React.JSX.Element | null {
  const { width: screenWidth, height: screenHeight } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const isReducedMotion = useReducedMotion();
  const { extractAndApplyPalette } = usePalette();

  const currentTrack = usePlaybackStore((s) => s.currentTrack);
  const engine = useAudioEngine();

  // Sync atmosphere palette whenever track changes
  useEffect(() => {
    if (currentTrack?.id) {
      void extractAndApplyPalette(currentTrack.id);
    }
  }, [currentTrack?.id, extractAndApplyPalette]);

  const {
    playerProgress,
    expand,
    collapse,
    panGesture,
  } = usePlayerMotion({ screenHeight });

  const { progress, positionMs } = usePlayheadProgress(
    engine,
    currentTrack?.durationMs ?? 0
  );

  // Compute precise spatial bounds for continuous artwork travel
  const miniRect: Rect = useMemo(() => {
    const miniPlayerBottom = tabBarHeight + space[2];
    const miniPlayerHeight = 58;
    return {
      x: space[3] + space[3], // outer margin + inner padding
      y: screenHeight - miniPlayerBottom - miniPlayerHeight + 7,
      width: 44,
      height: 44,
    };
  }, [screenHeight, tabBarHeight]);

  const fullRect: Rect = useMemo(() => {
    const fullSize = screenWidth - space[5] * 2;
    const topOffset = Math.max(insets.top, space[4]) + 48 + space[4];
    return {
      x: space[5],
      y: topOffset,
      width: fullSize,
      height: fullSize,
    };
  }, [insets.top, screenWidth]);

  // Continuous traveling artwork animated style
  const travelingArtworkStyle = useAnimatedStyle(() => {
    if (isReducedMotion) {
      // Reduced motion: crossfade without spatial travel
      const opacity = interpolate(playerProgress.value, [0, 0.4, 0.6, 1], [0, 0, 1, 1]);
      return {
        position: 'absolute',
        left: fullRect.x,
        top: fullRect.y,
        width: fullRect.width,
        height: fullRect.height,
        opacity,
        borderRadius: radius.lg,
      };
    }

    const currentBounds = interpolateArtworkBounds(
      playerProgress.value,
      miniRect,
      fullRect
    );
    const borderRadius = interpolate(
      playerProgress.value,
      [0, 1],
      [radius.sm, radius.lg]
    );

    // Visible only during transition (0.02 to 0.98)
    // When fully collapsed (0), mini player displays artwork.
    // When fully expanded (1), now playing container displays artwork with pause-scale.
    const isTransitioning = playerProgress.value > 0.01 && playerProgress.value < 0.99;
    const opacity = interpolate(playerProgress.value, [0, 0.04, 0.96, 1], [0, 1, 1, 0]);

    return {
      position: 'absolute',
      left: currentBounds.x,
      top: currentBounds.y,
      width: currentBounds.width,
      height: currentBounds.height,
      borderRadius,
      opacity,
      zIndex: 250,
      display: isTransitioning ? 'flex' : 'none',
    };
  });

  if (!currentTrack) {
    return null;
  }

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
      {/* 1. Mini Player (Fades out when expanding) */}
      <OTOMiniPlayer
        playerProgress={playerProgress}
        onExpand={expand}
        tabBarHeight={tabBarHeight}
      />

      {/* 2. Full-Screen Now Playing Shell (Translates upward, catches pan down) */}
      <OTONowPlayingShell
        playerProgress={playerProgress}
        onCollapse={collapse}
        screenHeight={screenHeight}
        panGesture={panGesture}
      >
        <OTONowPlayingContent
          onCollapse={collapse}
          artworkSize={fullRect.width}
          progress={progress}
          positionMs={positionMs}
        />
      </OTONowPlayingShell>

      {/* 3. Continuous Traveling Artwork Layer (touches pass through) */}
      <Animated.View
        pointerEvents="none"
        style={[travelingArtworkStyle, styles.travelingArtwork]}
      >
        <OTOArtwork
          uri={currentTrack.artworkUrl}
          thumbhash={currentTrack.thumbhash}
          style={StyleSheet.absoluteFill}
          borderRadius={radius.lg}
          alt={`${currentTrack.title} album artwork`}
        />
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  travelingArtwork: {
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 16 },
    shadowOpacity: 0.45,
    shadowRadius: 24,
    elevation: 12,
  },
});
