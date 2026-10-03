import React, { useMemo, useEffect } from 'react';
import { View, StyleSheet, Pressable } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  interpolateColor,
  type SharedValue,
} from 'react-native-reanimated';
import { color, space, radius } from '@/design/tokens';
import { clampOklchContrast, hexToRgb, oklabToOklch, rgbToOklab } from '@/design/color/oklch';
import {
  OTOIconButton,
  PlayIcon,
  PauseIcon,
  SkipForwardIcon,
  SkipBackIcon,
  ShuffleIcon,
  RepeatIcon,
} from '@/design/components';
import { OTOProgressBar } from './OTOProgressBar';
import { NowPlayingVolumeRow } from './NowPlayingVolumeRow';

export interface NowPlayingControlsProps {
  durationMs: number;
  progress: SharedValue<number>;
  positionMs: SharedValue<number>;
  isPlaying: boolean;
  isShuffled: boolean;
  repeatMode: 'off' | 'all' | 'one';
  activeAccent?: string;
  minTouchSize: number;
  onTogglePlay: () => void;
  onSkipNext: () => void;
  onSkipPrev: () => void;
  onToggleShuffle: () => void;
  onToggleRepeat: () => void;
  onSeek: (targetMs: number) => void;
}

export function NowPlayingControls({
  durationMs,
  progress,
  positionMs,
  isPlaying,
  isShuffled,
  repeatMode,
  activeAccent,
  minTouchSize,
  onTogglePlay,
  onSkipNext,
  onSkipPrev,
  onToggleShuffle,
  onToggleRepeat,
  onSeek,
}: NowPlayingControlsProps): React.JSX.Element {
  const playButtonColorProgress = useSharedValue(activeAccent ? 1 : 0);

  useEffect(() => {
    playButtonColorProgress.value = withTiming(activeAccent ? 1 : 0, { duration: 600 });
  }, [activeAccent, playButtonColorProgress]);

  const playFill = useMemo(() => {
    if (!activeAccent || !/^#[0-9a-fA-F]{6}$/.test(activeAccent)) {
      return color.text.primary;
    }
    const [r, g, b] = hexToRgb(activeAccent);
    const [L, a, bb] = rgbToOklab(r, g, b);
    return clampOklchContrast(oklabToOklch(L, a, bb), 3, color.bg.base);
  }, [activeAccent]);

  const playButtonAnimatedStyle = useAnimatedStyle(() => {
    const bg = interpolateColor(
      playButtonColorProgress.value,
      [0, 1],
      [color.text.primary, playFill]
    );
    return { backgroundColor: bg };
  });

  return (
    <View style={styles.container}>
      <View style={styles.scrubberRow}>
        <OTOProgressBar
          progress={progress}
          positionMs={positionMs}
          durationMs={durationMs}
          onSeek={onSeek}
        />
      </View>

      <View style={styles.transportRow}>
        <OTOIconButton
          icon={<ShuffleIcon size={22} active={isShuffled} />}
          accessibilityLabel={isShuffled ? 'Shuffle active' : 'Shuffle off'}
          onPress={onToggleShuffle}
          size={minTouchSize}
        />
        <OTOIconButton
          icon={<SkipBackIcon size={26} />}
          accessibilityLabel="Previous track"
          onPress={onSkipPrev}
          size={minTouchSize}
        />
        <Animated.View
          style={[
            styles.playButtonWrapper,
            playButtonAnimatedStyle,
            { shadowColor: activeAccent || color.accent.signature },
          ]}
        >
          <Pressable
            accessible
            accessibilityRole="button"
            accessibilityLabel={isPlaying ? 'Pause' : 'Play'}
            onPress={onTogglePlay}
            style={({ pressed }) => [
              styles.playButton,
              pressed && { transform: [{ scale: 0.93 }], opacity: 0.92 },
            ]}
          >
            {isPlaying ? (
              <PauseIcon size={28} color={color.bg.base} />
            ) : (
              <PlayIcon size={30} color={color.bg.base} />
            )}
          </Pressable>
        </Animated.View>
        <OTOIconButton
          icon={<SkipForwardIcon size={26} />}
          accessibilityLabel="Next track"
          onPress={onSkipNext}
          size={minTouchSize}
        />
        <OTOIconButton
          icon={<RepeatIcon size={22} mode={repeatMode} />}
          accessibilityLabel={`Repeat mode: ${repeatMode}`}
          onPress={onToggleRepeat}
          size={minTouchSize}
        />
      </View>

      <NowPlayingVolumeRow />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: space[1],
  },
  scrubberRow: {
    marginVertical: space[1],
  },
  transportRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  playButtonWrapper: {
    width: 72,
    height: 72,
    borderRadius: radius.full,
    justifyContent: 'center',
    alignItems: 'center',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 14,
    elevation: 8,
  },
  playButton: {
    width: 72,
    height: 72,
    borderRadius: radius.full,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
