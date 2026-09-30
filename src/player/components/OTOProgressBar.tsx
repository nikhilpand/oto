import { useState, useCallback, useMemo } from 'react';
import {
  View,
  StyleSheet,
  Pressable,
  LayoutChangeEvent,
  AccessibilityActionEvent,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  useFrameCallback,
  withSpring,
  runOnJS,
  type SharedValue,
} from 'react-native-reanimated';
import { GestureDetector, Gesture } from 'react-native-gesture-handler';
import * as Haptics from 'expo-haptics';
import { color, space, radius, spring } from '@/design/tokens';
import { OTOText } from '@/design/components/OTOText';
import {
  formatMsToTime,
  formatRemainingMsToTime,
  clampScrubProgress,
  calculateSeekTargetMs,
  calculateAdjustedPosition,
} from '../math/nowPlayingMath';

export interface OTOProgressBarProps {
  /** 120Hz normalized UI-thread progress (0 to 1) */
  progress: SharedValue<number>;
  /** High-frequency position in milliseconds */
  positionMs: SharedValue<number>;
  /** Total duration in milliseconds */
  durationMs: number;
  /** Seek callback invoked when user releases the scrubber or performs an accessibility action */
  onSeek: (targetMs: number) => void;
}

/**
 * OTOProgressBar — High-performance 120Hz Interactive Scrubber.
 *
 * - Zero React re-renders during playhead progression and scrubbing.
 * - Expands from 4pt to 6pt during active dragging.
 * - Haptic feedback on grab and release.
 * - Accessible slider role with +/- 10s increment/decrement actions.
 */
export function OTOProgressBar({
  progress,
  positionMs,
  durationMs,
  onSeek,
}: OTOProgressBarProps): React.JSX.Element {
  const [trackWidth, setTrackWidth] = useState(0);
  const isDragging = useSharedValue(false);
  const dragRatio = useSharedValue(0);

  const handleLayout = useCallback((e: LayoutChangeEvent) => {
    setTrackWidth(e.nativeEvent.layout.width);
  }, []);

  const triggerHaptic = useCallback(() => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }, []);

  const handleSeekCommit = useCallback(
    (ratio: number) => {
      const targetMs = calculateSeekTargetMs(ratio, durationMs);
      onSeek(targetMs);
    },
    [durationMs, onSeek]
  );

  // Scrubber pan gesture runs 100% on the UI thread
  const panGesture = useMemo(() => {
    return Gesture.Pan()
      .onBegin((e) => {
        'worklet';
        isDragging.value = true;
        dragRatio.value = clampScrubProgress(e.x, trackWidth);
        runOnJS(triggerHaptic)();
      })
      .onUpdate((e) => {
        'worklet';
        dragRatio.value = clampScrubProgress(e.x, trackWidth);
      })
      .onEnd(() => {
        'worklet';
        const finalRatio = dragRatio.value;
        isDragging.value = false;
        runOnJS(triggerHaptic)();
        runOnJS(handleSeekCommit)(finalRatio);
      })
      .onFinalize(() => {
        'worklet';
        isDragging.value = false;
      });
  }, [trackWidth, isDragging, dragRatio, triggerHaptic, handleSeekCommit]);

  // Track height expands smoothly from 4pt to 6pt when scrubbing
  const trackAnimatedStyle = useAnimatedStyle(() => {
    const height = isDragging.value ? withSpring(6, spring.spatial.playful) : withSpring(4, spring.spatial.fast);
    return { height };
  });

  // Fill bar follows drag position when dragging, or 120Hz interpolated playhead when playing
  const fillAnimatedStyle = useAnimatedStyle(() => {
    const currentProgress = isDragging.value ? dragRatio.value : progress.value;
    const clampedPercent = Math.max(0, Math.min(100, currentProgress * 100));
    return {
      width: `${clampedPercent}%`,
    };
  });

  // Scrub thumb / knob animated position and scale
  const thumbAnimatedStyle = useAnimatedStyle(() => {
    const currentProgress = isDragging.value ? dragRatio.value : progress.value;
    const scale = isDragging.value ? withSpring(1.4, spring.spatial.playful) : withSpring(1, spring.spatial.fast);
    const opacity = isDragging.value ? 1 : 0.8;
    return {
      left: `${Math.max(0, Math.min(100, currentProgress * 100))}%`,
      opacity,
      transform: [{ scale }],
    };
  });

  // Accessible action handler (+/- 10s increments)
  const handleAccessibilityAction = useCallback(
    (event: AccessibilityActionEvent) => {
      const currentMs = positionMs.value;
      if (event.nativeEvent.actionName === 'increment') {
        const nextMs = calculateAdjustedPosition(currentMs, durationMs, 10000);
        onSeek(nextMs);
        triggerHaptic();
      } else if (event.nativeEvent.actionName === 'decrement') {
        const prevMs = calculateAdjustedPosition(currentMs, durationMs, -10000);
        onSeek(prevMs);
        triggerHaptic();
      }
    },
    [durationMs, onSeek, positionMs, triggerHaptic]
  );

  return (
    <View style={styles.container}>
      {/* Hit target container ensures >= 44pt touchable area */}
      <GestureDetector gesture={panGesture}>
        <View
          style={styles.touchArea}
          onLayout={handleLayout}
          accessible
          accessibilityRole="adjustable"
          accessibilityLabel="Playback progress scrubber"
          accessibilityValue={{
            min: 0,
            max: 100,
            now: Math.round(progress.value * 100),
          }}
          accessibilityActions={[
            { name: 'increment', label: 'Forward 10 seconds' },
            { name: 'decrement', label: 'Rewind 10 seconds' },
          ]}
          onAccessibilityAction={handleAccessibilityAction}
        >
          {/* Background track */}
          <Animated.View style={[styles.track, trackAnimatedStyle]}>
            <Animated.View style={[styles.fill, fillAnimatedStyle]} />
          </Animated.View>

          {/* Draggable thumb */}
          <Animated.View style={[styles.thumb, thumbAnimatedStyle]} pointerEvents="none" />
        </View>
      </GestureDetector>

      {/* Time labels (Elapsed and Total / Remaining) */}
      <View style={styles.timeRow}>
        <ElapsedLabel
          positionMs={positionMs}
          isDragging={isDragging}
          dragRatio={dragRatio}
          durationMs={durationMs}
        />
        <RemainingLabel
          positionMs={positionMs}
          isDragging={isDragging}
          dragRatio={dragRatio}
          durationMs={durationMs}
        />
      </View>
    </View>
  );
}

/** Lightweight subcomponent updating only itself on 1Hz cadence */
function ElapsedLabel({
  positionMs,
  isDragging,
  dragRatio,
  durationMs,
}: {
  positionMs: SharedValue<number>;
  isDragging: SharedValue<boolean>;
  dragRatio: SharedValue<number>;
  durationMs: number;
}) {
  const [displayText, setDisplayText] = useState(() => formatMsToTime(positionMs.value));
  const lastSecond = useSharedValue(-1);

  useFrameCallback(() => {
    'worklet';
    const currentMs = isDragging.value ? dragRatio.value * durationMs : positionMs.value;
    const sec = Math.floor(currentMs / 1000);
    if (sec !== lastSecond.value) {
      lastSecond.value = sec;
      runOnJS(setDisplayText)(formatMsToTime(currentMs));
    }
  });

  return (
    <OTOText variant="caption" colorRole="tertiary">
      {displayText}
    </OTOText>
  );
}

/** Lightweight subcomponent supporting toggle between total duration and remaining time */
function RemainingLabel({
  positionMs,
  isDragging,
  dragRatio,
  durationMs,
}: {
  positionMs: SharedValue<number>;
  isDragging: SharedValue<boolean>;
  dragRatio: SharedValue<number>;
  durationMs: number;
}) {
  const [showRemaining, setShowRemaining] = useState(false);
  const [displayText, setDisplayText] = useState(() => formatMsToTime(durationMs));
  const lastSecond = useSharedValue(-1);

  const toggleMode = useCallback(() => {
    setShowRemaining((prev) => !prev);
  }, []);

  useFrameCallback(() => {
    'worklet';
    if (!showRemaining) return;
    const currentMs = isDragging.value ? dragRatio.value * durationMs : positionMs.value;
    const sec = Math.floor(currentMs / 1000);
    if (sec !== lastSecond.value) {
      lastSecond.value = sec;
      runOnJS(setDisplayText)(formatRemainingMsToTime(currentMs, durationMs));
    }
  });

  return (
    <Pressable
      onPress={toggleMode}
      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
      accessibilityRole="button"
      accessibilityLabel={showRemaining ? 'Remaining time. Tap to show total.' : 'Total duration. Tap to show remaining.'}
    >
      <OTOText variant="caption" colorRole="tertiary">
        {showRemaining ? displayText : formatMsToTime(durationMs)}
      </OTOText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    paddingVertical: space[1],
  },
  touchArea: {
    height: 44, // Meets touch target minimum
    justifyContent: 'center',
    position: 'relative',
  },
  track: {
    width: '100%',
    height: 4,
    borderRadius: radius.full,
    backgroundColor: color.bg.s3,
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    backgroundColor: color.accent.signature,
    borderRadius: radius.full,
  },
  thumb: {
    position: 'absolute',
    width: 12,
    height: 12,
    marginLeft: -6,
    borderRadius: radius.full,
    backgroundColor: color.text.primary,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.35,
    shadowRadius: 4,
    elevation: 4,
  },
  timeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: -space[1],
  },
});
