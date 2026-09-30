import React, { useMemo } from 'react';
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
import { GestureDetector } from 'react-native-gesture-handler';
import { color, space, radius } from '@/design/tokens';
import { OTOArtwork } from '@/design/components/OTOArtwork';
import { OTOText } from '@/design/components/OTOText';
import { OTOIconButton } from '@/design/components/OTOIconButton';
import { usePlaybackStore } from '@/store/usePlaybackStore';
import { useAudioEngine } from '@/audio/AudioContext';
import { usePlayheadProgress } from '@/audio/usePlayheadProgress';
import { useReducedMotion } from '@/design/hooks/useReducedMotion';
import { usePlayerMotion } from '../usePlayerMotion';
import { interpolateArtworkBounds, type Rect } from '../motionMath';
import { OTOMiniPlayer } from './OTOMiniPlayer';
import { OTONowPlayingShell } from './OTONowPlayingShell';

export interface PlayerOverlayProps {
  tabBarHeight?: number;
}

function PlayLargeIcon({ color: iconColor = color.bg.base, size = 22 }: { color?: string; size?: number }) {
  return (
    <View
      style={{
        width: 0,
        height: 0,
        borderLeftWidth: size,
        borderTopWidth: size * 0.65,
        borderBottomWidth: size * 0.65,
        borderLeftColor: iconColor,
        borderTopColor: 'transparent',
        borderBottomColor: 'transparent',
        marginLeft: 4,
      }}
    />
  );
}

function PauseLargeIcon({ color: iconColor = color.bg.base, size = 20 }: { color?: string; size?: number }) {
  return (
    <View style={{ flexDirection: 'row', gap: size * 0.35 }}>
      <View style={{ width: size * 0.32, height: size * 1.1, backgroundColor: iconColor, borderRadius: 2 }} />
      <View style={{ width: size * 0.32, height: size * 1.1, backgroundColor: iconColor, borderRadius: 2 }} />
    </View>
  );
}

function SkipForwardIcon({ color: iconColor = color.text.primary, size = 18 }: { color?: string; size?: number }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
      <View
        style={{
          width: 0,
          height: 0,
          borderLeftWidth: size * 0.7,
          borderTopWidth: size * 0.5,
          borderBottomWidth: size * 0.5,
          borderLeftColor: iconColor,
          borderTopColor: 'transparent',
          borderBottomColor: 'transparent',
        }}
      />
      <View
        style={{
          width: 0,
          height: 0,
          borderLeftWidth: size * 0.7,
          borderTopWidth: size * 0.5,
          borderBottomWidth: size * 0.5,
          borderLeftColor: iconColor,
          borderTopColor: 'transparent',
          borderBottomColor: 'transparent',
        }}
      />
    </View>
  );
}

function SkipBackIcon({ color: iconColor = color.text.primary, size = 18 }: { color?: string; size?: number }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
      <View
        style={{
          width: 0,
          height: 0,
          borderRightWidth: size * 0.7,
          borderTopWidth: size * 0.5,
          borderBottomWidth: size * 0.5,
          borderRightColor: iconColor,
          borderTopColor: 'transparent',
          borderBottomColor: 'transparent',
        }}
      />
      <View
        style={{
          width: 0,
          height: 0,
          borderRightWidth: size * 0.7,
          borderTopWidth: size * 0.5,
          borderBottomWidth: size * 0.5,
          borderRightColor: iconColor,
          borderTopColor: 'transparent',
          borderBottomColor: 'transparent',
        }}
      />
    </View>
  );
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

  const currentTrack = usePlaybackStore((s) => s.currentTrack);
  const isPlaying = usePlaybackStore((s) => s.isPlaying);
  const engine = useAudioEngine();

  const {
    playerProgress,
    expand,
    collapse,
    panGesture,
  } = usePlayerMotion({ screenHeight });

  const { progress } = usePlayheadProgress(
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

    // Visible only during transition or when expanded
    const opacity = interpolate(playerProgress.value, [0, 0.05, 1], [0, 1, 1]);

    return {
      position: 'absolute',
      left: currentBounds.x,
      top: currentBounds.y,
      width: currentBounds.width,
      height: currentBounds.height,
      borderRadius,
      opacity,
      zIndex: 250,
    };
  });

  const controlsFadeStyle = useAnimatedStyle(() => {
    const opacity = interpolate(playerProgress.value, [0.4, 1], [0, 1]);
    const translateY = interpolate(playerProgress.value, [0.4, 1], [30, 0]);
    return {
      opacity,
      transform: [{ translateY }],
    };
  });

  const fullProgressBarAnimatedStyle = useAnimatedStyle(() => {
    return {
      width: `${Math.max(0, Math.min(100, progress.value * 100))}%`,
    };
  });

  if (!currentTrack) {
    return null;
  }

  const handleTogglePlay = () => {
    if (isPlaying) {
      void engine.pause();
    } else {
      void engine.play();
    }
  };

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
      {/* 1. Mini Player (Fades out when expanding) */}
      <OTOMiniPlayer
        playerProgress={playerProgress}
        onExpand={expand}
        tabBarHeight={tabBarHeight}
      />

      {/* 2. Full-Screen Now Playing Shell (Translates upward) */}
      <GestureDetector gesture={panGesture}>
        <Animated.View style={StyleSheet.absoluteFill} pointerEvents="box-none">
          <OTONowPlayingShell
            playerProgress={playerProgress}
            onCollapse={collapse}
            screenHeight={screenHeight}
          >
            {/* Space reserved for traveling artwork */}
            <View style={{ width: fullRect.width, height: fullRect.height, marginBottom: space[6] }} />

            {/* Now Playing Controls Area */}
            <Animated.View style={[styles.controlsContainer, controlsFadeStyle]}>
              {/* Metadata */}
              <View style={styles.trackInfo}>
                <OTOText variant="headline" weight="bold" numberOfLines={1}>
                  {currentTrack.title}
                </OTOText>
                <OTOText variant="body" colorRole="secondary" numberOfLines={1}>
                  {currentTrack.artist}
                </OTOText>
              </View>

              {/* Progress Scrubber */}
              <View style={styles.scrubberRow}>
                <View style={styles.scrubberTrack}>
                  <Animated.View style={[styles.scrubberFill, fullProgressBarAnimatedStyle]} />
                </View>
              </View>

              {/* Transport Controls */}
              <View style={styles.transportRow}>
                <OTOIconButton
                  icon={<SkipBackIcon />}
                  accessibilityLabel="Previous track"
                  onPress={() => engine.skipToPrevious()}
                />
                <View style={styles.playButtonWrapper}>
                  <OTOIconButton
                    icon={isPlaying ? <PauseLargeIcon /> : <PlayLargeIcon />}
                    accessibilityLabel={isPlaying ? 'Pause' : 'Play'}
                    size={64}
                    style={styles.playButton}
                    onPress={handleTogglePlay}
                  />
                </View>
                <OTOIconButton
                  icon={<SkipForwardIcon />}
                  accessibilityLabel="Next track"
                  onPress={() => engine.skipToNext()}
                />
              </View>
            </Animated.View>
          </OTONowPlayingShell>
        </Animated.View>
      </GestureDetector>

      {/* 3. Continuous Traveling Artwork Layer */}
      <Animated.View style={[travelingArtworkStyle, styles.travelingArtwork]}>
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
  controlsContainer: {
    flex: 1,
    justifyContent: 'space-between',
    paddingBottom: space[4],
  },
  trackInfo: {
    gap: space[1],
  },
  scrubberRow: {
    marginVertical: space[4],
  },
  scrubberTrack: {
    height: 4,
    borderRadius: radius.full,
    backgroundColor: color.bg.s3,
    overflow: 'hidden',
  },
  scrubberFill: {
    height: '100%',
    backgroundColor: color.accent.signature,
    borderRadius: radius.full,
  },
  transportRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-evenly',
  },
  playButtonWrapper: {
    width: 64,
    height: 64,
    borderRadius: radius.full,
    backgroundColor: color.accent.signature,
    justifyContent: 'center',
    alignItems: 'center',
  },
  playButton: {
    width: 64,
    height: 64,
  },
});
