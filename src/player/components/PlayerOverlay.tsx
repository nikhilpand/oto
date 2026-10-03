import { useMemo, useEffect, useState, useCallback } from 'react';
import {
  View,
  StyleSheet,
  useWindowDimensions,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, {
  useAnimatedStyle,
  interpolate,
  useAnimatedReaction,
  runOnJS,
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
  tabBarHeight,
}: PlayerOverlayProps): React.JSX.Element | null {
  const { width: screenWidth, height: screenHeight } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const floatingBarBottom = Math.max(insets.bottom, Platform.OS === 'android' ? space[3] : space[2]);
  const resolvedTabBarHeight = tabBarHeight ?? (floatingBarBottom + 64);
  const isReducedMotion = useReducedMotion();
  const { extractAndApplyPalette } = usePalette();

  const currentTrack = usePlaybackStore((s) => s.currentTrack);
  const engine = useAudioEngine();

  // Sync atmosphere palette whenever track changes — pass artworkUrl for Skia extraction
  useEffect(() => {
    if (currentTrack?.id) {
      void extractAndApplyPalette(currentTrack.id, currentTrack.artworkUrl ?? undefined);
    }
  }, [currentTrack?.id, currentTrack?.artworkUrl, extractAndApplyPalette]);

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

  const [isExpanded, setIsExpanded] = useState(false);
  const [activeSheetMode, setActiveSheetMode] = useState<'player' | 'lyrics' | 'queue'>('player');

  const onExpansionStateChange = useCallback((expanded: boolean) => {
    setIsExpanded(expanded);
    if (!expanded) {
      setActiveSheetMode('player');
    }
  }, []);

  // Keep isExpanded in lockstep with UI-thread gesture / spring snaps
  useAnimatedReaction(
    () => playerProgress.value > 0.1,
    (expanded, prev) => {
      if (expanded !== prev) {
        runOnJS(onExpansionStateChange)(expanded);
      }
    }
  );

  const handleExpand = useCallback(() => {
    setIsExpanded(true);
    expand();
  }, [expand]);

  const handleCollapse = useCallback(() => {
    setIsExpanded(false);
    setActiveSheetMode('player');
    collapse();
  }, [collapse]);

  // Compute precise spatial bounds for continuous artwork travel
  const miniRect: Rect = useMemo(() => {
    const miniPlayerBottom = resolvedTabBarHeight + space[2];
    const miniPlayerHeight = 58;
    return {
      x: space[3] + space[3], // outer margin + inner padding
      y: screenHeight - miniPlayerBottom - miniPlayerHeight + 7,
      width: 44,
      height: 44,
    };
  }, [screenHeight, resolvedTabBarHeight]);

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
      return {
        position: 'absolute',
        left: fullRect.x,
        top: fullRect.y,
        width: fullRect.width,
        height: fullRect.height,
        opacity: 0,
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

    const isTransitioning = playerProgress.value > 0.02 && playerProgress.value < 0.98;
    const opacity = interpolate(playerProgress.value, [0, 0.04, 0.96, 1], [0, 1, 1, 0]);

    return {
      position: 'absolute',
      left: currentBounds.x,
      top: currentBounds.y,
      width: currentBounds.width,
      height: currentBounds.height,
      borderRadius,
      opacity: isTransitioning ? opacity : 0,
      zIndex: isTransitioning ? 250 : -10,
    };
  });

  if (!currentTrack) {
    return null;
  }

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
      {/* 1. Mini Player (Active only when collapsed) */}
      <View
        style={StyleSheet.absoluteFill}
        pointerEvents={isExpanded ? 'none' : 'box-none'}
      >
        <OTOMiniPlayer
          playerProgress={playerProgress}
          onExpand={handleExpand}
          tabBarHeight={resolvedTabBarHeight}
        />
      </View>

      {/* 2. Full-Screen Now Playing Shell (Active only when expanded) */}
      <View
        style={StyleSheet.absoluteFill}
        pointerEvents={isExpanded ? 'box-none' : 'none'}
      >
        <OTONowPlayingShell
          playerProgress={playerProgress}
          onCollapse={handleCollapse}
          screenHeight={screenHeight}
          panGesture={panGesture}
          panGestureEnabled={activeSheetMode === 'player'}
        >
          <OTONowPlayingContent
            onCollapse={handleCollapse}
            artworkSize={fullRect.width}
            progress={progress}
            positionMs={positionMs}
            onSheetModeChange={setActiveSheetMode}
          />
        </OTONowPlayingShell>
      </View>

      {/* 3. Continuous Traveling Artwork Layer (touches pass through, zero elevation when idle) */}
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
  },
});
