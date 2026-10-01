import React, { useCallback } from 'react';
import {
  View,
  StyleSheet,
  Pressable,
  Platform,
} from 'react-native';
import Animated, {
  useAnimatedStyle,
  interpolate,
  type SharedValue,
  runOnJS,
  SlideInDown,
} from 'react-native-reanimated';
import { GestureDetector, Gesture } from 'react-native-gesture-handler';
import * as Haptics from 'expo-haptics';
import { color, space, radius, touchTarget } from '@/design/tokens';
import { OTOGlassSurface } from '@/design/components/OTOGlassSurface';
import { OTOText } from '@/design/components/OTOText';
import { OTOArtwork } from '@/design/components/OTOArtwork';
import { OTOIconButton } from '@/design/components/OTOIconButton';
import { PlayIcon, PauseIcon } from '@/design/components/OTOIcon';
import { usePlaybackStore } from '@/store/usePlaybackStore';
import { useAudioEngine } from '@/audio/AudioContext';
import { usePlayheadProgress } from '@/audio/usePlayheadProgress';

export interface OTOMiniPlayerProps {
  playerProgress: SharedValue<number>;
  onExpand: () => void;
  tabBarHeight?: number;
}

/**
 * OTOMiniPlayer — Floating glass transport bar above Native Tabs.
 *
 * - Artwork: 44x44 rounded thumbnail.
 * - Title & artist with typography tokens.
 * - Play/Pause transport toggle with haptics.
 * - 120Hz Reanimated UI-thread progress line.
 * - Swipe left/right skips track; swipe up or tap expands to full player.
 */
export function OTOMiniPlayer({
  playerProgress,
  onExpand,
  tabBarHeight = 56,
}: OTOMiniPlayerProps): React.JSX.Element | null {
  const currentTrack = usePlaybackStore((s) => s.currentTrack);
  const isPlaying = usePlaybackStore((s) => s.isPlaying);
  const engine = useAudioEngine();

  const { progress } = usePlayheadProgress(
    engine,
    currentTrack?.durationMs ?? 0
  );

  const handleTogglePlay = useCallback(() => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (isPlaying) {
      void engine.pause();
    } else {
      void engine.play();
    }
  }, [engine, isPlaying]);

  const handleSkipNext = useCallback(() => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    void engine.skipToNext();
  }, [engine]);

  const handleSkipPrev = useCallback(() => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    void engine.skipToPrevious();
  }, [engine]);

  // Gestures: horizontal swipe skips track, vertical swipe up or tap expands
  const panGesture = Gesture.Pan()
    .onEnd((event) => {
      'worklet';
      if (event.translationY < -30) {
        runOnJS(onExpand)();
      } else if (event.translationX < -40) {
        runOnJS(handleSkipNext)();
      } else if (event.translationX > 40) {
        runOnJS(handleSkipPrev)();
      }
    });

  const tapGesture = Gesture.Tap().onEnd(() => {
    'worklet';
    runOnJS(onExpand)();
  });

  const composedGesture = Gesture.Race(panGesture, tapGesture);

  // Pure UI-thread opacity and translation interpolations
  const containerAnimatedStyle = useAnimatedStyle(() => {
    const opacity = interpolate(playerProgress.value, [0, 0.15], [1, 0]);
    const translateY = interpolate(playerProgress.value, [0, 0.15], [0, 20]);
    return {
      opacity,
      transform: [{ translateY }],
      pointerEvents: playerProgress.value > 0.15 ? 'none' : 'auto',
    };
  });

  const progressBarAnimatedStyle = useAnimatedStyle(() => {
    return {
      transform: [{ scaleX: Math.max(0, Math.min(1, progress.value)) }],
    };
  });

  if (!currentTrack) {
    return null;
  }

  const accessibilityLabel = `Now playing: ${currentTrack.title} by ${currentTrack.artist}. Double tap to expand player.`;

  return (
    <Animated.View
      entering={SlideInDown.duration(420).springify().damping(22)}
      style={[
        styles.positionWrapper,
        { bottom: tabBarHeight + space[2] },
        containerAnimatedStyle,
      ]}
    >
      <GestureDetector gesture={composedGesture}>
        <Pressable
          accessible
          accessibilityRole="button"
          accessibilityLabel={accessibilityLabel}
          accessibilityHint="Expands the full-screen player"
          onPress={onExpand}
        >
          <OTOGlassSurface borderRadius={radius.md} style={styles.glassContainer}>
            {/* Top edge 120Hz progress line */}
            <View style={styles.progressTrack}>
              <Animated.View style={[styles.progressFill, progressBarAnimatedStyle]} />
            </View>

            <View style={styles.contentRow}>
              {/* 44x44 Artwork */}
              <View style={styles.artworkContainer}>
                <OTOArtwork
                  uri={currentTrack.artworkUrl}
                  thumbhash={currentTrack.thumbhash}
                  size={44}
                  borderRadius={radius.sm}
                  alt={`${currentTrack.title} cover art`}
                />
              </View>

              {/* Title & Artist */}
              <View style={styles.metadataContainer}>
                <OTOText
                  variant="caption"
                  weight="semibold"
                  numberOfLines={1}
                  colorRole="primary"
                >
                  {currentTrack.title}
                </OTOText>
                <OTOText
                  variant="caption"
                  numberOfLines={1}
                  colorRole="secondary"
                >
                  {currentTrack.artist}
                </OTOText>
              </View>

              {/* Play/Pause Button */}
              <View style={styles.controlsContainer}>
                <OTOIconButton
                  icon={isPlaying ? <PauseIcon /> : <PlayIcon />}
                  accessibilityLabel={isPlaying ? 'Pause' : 'Play'}
                  size={Platform.select({ ios: touchTarget.ios, default: touchTarget.android })}
                  onPress={handleTogglePlay}
                />
              </View>
            </View>
          </OTOGlassSurface>
        </Pressable>
      </GestureDetector>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  positionWrapper: {
    position: 'absolute',
    left: space[3],
    right: space[3],
    zIndex: 100,
  },
  glassContainer: {
    height: 58,
    justifyContent: 'center',
  },
  progressTrack: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 2,
    backgroundColor: color.bg.s3,
    overflow: 'hidden',
  },
  progressFill: {
    width: '100%',
    height: '100%',
    backgroundColor: color.accent.signature,
    transformOrigin: 'left',
  },
  contentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: space[3],
    gap: space[3],
  },
  artworkContainer: {
    width: 44,
    height: 44,
    borderRadius: radius.sm,
    overflow: 'hidden',
  },
  metadataContainer: {
    flex: 1,
    justifyContent: 'center',
    gap: 2,
  },
  controlsContainer: {
    justifyContent: 'center',
    alignItems: 'center',
  },
});
