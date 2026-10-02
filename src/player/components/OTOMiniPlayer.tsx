import React, { useCallback, useRef, useState } from 'react';
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
  withSpring,
  useSharedValue,
} from 'react-native-reanimated';
import { GestureDetector, Gesture } from 'react-native-gesture-handler';
import * as Haptics from 'expo-haptics';
import { color, space, radius, touchTarget, shadow, spring } from '@/design/tokens';
import { OTOGlassSurface } from '@/design/components/OTOGlassSurface';
import { OTOText } from '@/design/components/OTOText';
import { OTOArtwork } from '@/design/components/OTOArtwork';
import { PlayIcon, PauseIcon, SkipForwardIcon } from '@/design/components/OTOIcon';
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
 * - Skip-next button for quick browsing.
 * - 120Hz Reanimated UI-thread progress line.
 * - Swipe left skips track; swipe up or tap expands to full player.
 */
export function OTOMiniPlayer({
  playerProgress,
  onExpand,
  tabBarHeight = 56,
}: OTOMiniPlayerProps): React.JSX.Element | null {
  const currentTrack = usePlaybackStore((s) => s.currentTrack);
  const isPlaying = usePlaybackStore((s) => s.isPlaying);
  const engine = useAudioEngine();

  // A11y: coarse progress percent (0–100) updated at ~4Hz from native ticks
  const [a11yPercent, setA11yPercent] = useState(0);
  const lastReportedPercent = useRef(0);

  const { progress } = usePlayheadProgress(
    engine,
    currentTrack?.durationMs ?? 0
  );

  // Update a11y percent only when it changes by ≥1% to avoid spurious re-renders
  const updateA11yPercent = useCallback((pct: number) => {
    const rounded = Math.round(pct);
    if (Math.abs(rounded - lastReportedPercent.current) >= 1) {
      lastReportedPercent.current = rounded;
      setA11yPercent(rounded);
    }
  }, []);

  React.useEffect(() => {
    if (!currentTrack?.durationMs) return;
    const dur = currentTrack.durationMs;
    const unsub = engine.onPositionTick((posMs: number) => {
      updateA11yPercent((posMs / dur) * 100);
    });
    return () => { unsub(); };
  }, [engine, currentTrack, updateA11yPercent]);

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

  // Skip-next button spring scale animation
  const skipScale = useSharedValue(1);
  const skipStyle = useAnimatedStyle(() => ({
    transform: [{ scale: skipScale.value }],
  }));

  // Play/pause button spring scale animation
  const playScale = useSharedValue(1);
  const playButtonStyle = useAnimatedStyle(() => ({
    transform: [{ scale: playScale.value }],
  }));

  // Gestures: horizontal swipe skips track, vertical swipe up or tap expands
  const panGesture = Gesture.Pan()
    .onEnd((event) => {
      'worklet';
      if (event.translationY < -30) {
        runOnJS(onExpand)();
      } else if (event.translationX < -50) {
        runOnJS(handleSkipNext)();
      } else if (event.translationX > 50) {
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
      <OTOGlassSurface borderRadius={radius.xl} style={styles.glassContainer}>
        {/* Top edge 120Hz progress line */}
        <View
          style={styles.progressTrack}
          accessible
          accessibilityRole="progressbar"
          accessibilityLabel={`Playback progress: ${a11yPercent}%`}
          accessibilityValue={{ min: 0, max: 100, now: a11yPercent }}
        >
          <Animated.View style={[styles.progressFill, progressBarAnimatedStyle]} />
        </View>

        <View style={styles.contentRow}>
          {/* Tap / swipe gesture on artwork & metadata to expand */}
          <GestureDetector gesture={composedGesture}>
            <Pressable
              accessible
              accessibilityRole="button"
              accessibilityLabel={accessibilityLabel}
              accessibilityHint="Expands the full-screen player"
              onPress={onExpand}
              style={styles.expandArea}
            >
              {/* 44x44 Artwork with subtle shadow */}
              <View style={styles.artworkContainer}>
                <OTOArtwork
                  uri={currentTrack.artworkUrl}
                  thumbhash={currentTrack.thumbhash}
                  size={40}
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
                  variant="meta"
                  numberOfLines={1}
                  colorRole="secondary"
                >
                  {currentTrack.artist}
                </OTOText>
              </View>
            </Pressable>
          </GestureDetector>

          {/* Transport Controls — fully isolated from onExpand */}
          <View style={styles.controlsContainer}>
            {/* Play/Pause */}
            <Animated.View style={playButtonStyle}>
              <Pressable
                accessible
                accessibilityRole="button"
                accessibilityLabel={isPlaying ? 'Pause' : 'Play'}
                accessibilityHint={isPlaying ? 'Pauses current track' : 'Resumes current track'}
                onPress={handleTogglePlay}
                onPressIn={() => { playScale.value = withSpring(0.88, spring.spatial.fast); }}
                onPressOut={() => { playScale.value = withSpring(1, spring.spatial.playful); }}
                style={styles.playPauseButton}
              >
                {isPlaying ? (
                  <PauseIcon size={18} color={color.text.primary} />
                ) : (
                  <PlayIcon size={18} color={color.text.primary} focused />
                )}
              </Pressable>
            </Animated.View>

            {/* Skip Next */}
            <Animated.View style={skipStyle}>
              <Pressable
                accessible
                accessibilityRole="button"
                accessibilityLabel="Next track"
                onPress={handleSkipNext}
                onPressIn={() => {
                  skipScale.value = withSpring(0.88, spring.spatial.fast);
                }}
                onPressOut={() => {
                  skipScale.value = withSpring(1, spring.spatial.playful);
                }}
                style={({ pressed }) => [
                  styles.skipButton,
                  pressed && styles.buttonPressed,
                ]}
              >
                <SkipForwardIcon size={18} color={color.text.secondary} />
              </Pressable>
            </Animated.View>
          </View>
        </View>
      </OTOGlassSurface>
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
    height: 62,
    justifyContent: 'center',
    backgroundColor: color.glass.solidFallback,
    ...shadow.sheet,
  },
  progressTrack: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 2,
    backgroundColor: color.bg.s3,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
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
    gap: space[2],
  },
  expandArea: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: space[3],
    paddingVertical: space[2],
  },
  artworkContainer: {
    width: 40,
    height: 40,
    borderRadius: radius.sm,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },
  metadataContainer: {
    flex: 1,
    justifyContent: 'center',
    gap: 1,
  },
  controlsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space[1],
  },
  playPauseButton: {
    width: Platform.select({ ios: touchTarget.ios, default: touchTarget.android }),
    height: Platform.select({ ios: touchTarget.ios, default: touchTarget.android }),
    alignItems: 'center',
    justifyContent: 'center',
  },
  skipButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonPressed: {
    opacity: 0.6,
  },
});
