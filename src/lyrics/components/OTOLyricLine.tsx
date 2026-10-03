import React, { memo } from 'react';
import { View, StyleSheet, Pressable, Platform, Text } from 'react-native';
import Animated, {
  useAnimatedStyle,
  type SharedValue,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { color, space, touchTarget } from '@/design/tokens';
import type { LyricLine, LyricWord, SupportedScript } from '@/utils/lyrics/types';

// BitChord-verified typography & focus constants (BITCHORD_RE/09_LYRICS.md & PlayerLyrics.kt)
const UNSUNG_ALPHA = 0.45;
const SUNG_ALPHA = 0.95;
const ACTIVE_ALPHA = 1.0;
const WORD_RISE = -2.5; // BitChord 2.dp lift on sung word
const GLOW_RADIUS = 6;  // BitChord tight 6.dp bloom

export interface OTOLyricLineProps {
  line: LyricLine;
  index: number;
  activeIndex?: number;
  isActive?: boolean;
  isNearby?: boolean;
  positionMs: SharedValue<number>;
  onSeek: (timeMs: number) => void;
  activeColor?: string;
  reducedMotion?: boolean;
  script?: SupportedScript;
}

interface LyricWordViewProps {
  word: LyricWord;
  positionMs: SharedValue<number>;
  isActiveLine: boolean;
  activeColor: string;
}

const LyricWordView = memo(function LyricWordView({
  word,
  positionMs,
  isActiveLine,
  activeColor,
}: LyricWordViewProps) {
  // Pure UI-thread GPU opacity and vertical lift — ZERO Yoga layout width reflow
  const animatedWordStyle = useAnimatedStyle(() => {
    'worklet';
    if (!isActiveLine) {
      return {
        opacity: UNSUNG_ALPHA,
        transform: [{ translateY: 0 }],
      };
    }

    const pos = positionMs.value;
    if (pos >= word.endMs) {
      return {
        opacity: SUNG_ALPHA,
        transform: [{ translateY: 0 }],
      };
    }

    if (pos >= word.startMs) {
      const duration = Math.max(1, word.endMs - word.startMs);
      const progress = Math.min(1, Math.max(0, (pos - word.startMs) / duration));
      const lift = Math.sin(progress * Math.PI) * WORD_RISE;
      return {
        opacity: ACTIVE_ALPHA,
        transform: [{ translateY: lift }],
      };
    }

    return {
      opacity: UNSUNG_ALPHA,
      transform: [{ translateY: 0 }],
    };
  });

  return (
    <Animated.View style={[styles.wordContainer, animatedWordStyle]}>
      <Text
        style={[
          styles.wordText,
          isActiveLine && {
            color: color.text.primary,
            textShadowColor: activeColor,
            textShadowRadius: GLOW_RADIUS,
            textShadowOffset: { width: 0, height: 0 },
          },
        ]}
      >
        {word.text}
      </Text>
    </Animated.View>
  );
});

interface InstrumentalGapViewProps {
  line: LyricLine;
  positionMs: SharedValue<number>;
  isActiveLine: boolean;
  activeColor: string;
}

const InstrumentalGapView = memo(function InstrumentalGapView({
  line,
  positionMs,
  isActiveLine,
  activeColor,
}: InstrumentalGapViewProps) {
  const animatedDotStyle = useAnimatedStyle(() => {
    'worklet';
    if (!isActiveLine) {
      return { opacity: 0.3, transform: [{ scale: 0.9 }] };
    }
    const pos = positionMs.value;
    const progress = (pos - line.timeMs) / Math.max(1, line.endMs - line.timeMs);
    const wave = Math.sin(progress * Math.PI * 6);
    const pulse = 0.5 + 0.5 * Math.max(0, wave);
    return {
      opacity: Math.max(0.3, Math.min(1.0, pulse)),
      transform: [{ scale: 0.95 + 0.15 * pulse }],
    };
  });

  return (
    <View style={styles.gapContainer} accessible accessibilityLabel="Instrumental break">
      <Animated.View style={[styles.gapRow, animatedDotStyle]}>
        <View style={[styles.gapDot, { backgroundColor: activeColor }]} />
        <View style={[styles.gapDot, { backgroundColor: activeColor }]} />
        <View style={[styles.gapDot, { backgroundColor: activeColor }]} />
      </Animated.View>
    </View>
  );
});

export const OTOLyricLine = memo(
  function OTOLyricLine({
    line,
    index,
    activeIndex,
    isActive: propIsActive,
    isNearby: propIsNearby,
    positionMs,
    onSeek,
    activeColor = color.accent.signature,
    script = 'latin',
  }: OTOLyricLineProps): React.JSX.Element {
    const isActive =
      propIsActive !== undefined
        ? propIsActive
        : activeIndex !== undefined
          ? index === activeIndex
          : false;

    const isNearby =
      propIsNearby !== undefined
        ? propIsNearby
        : activeIndex !== undefined
          ? Math.abs(index - activeIndex) === 1
          : false;

    // BitChord focus alpha falloff: active = 1.0, adjacent = 0.70, distant = 0.35
    // Zero scale transform ensures text never exceeds viewport boundaries
    const lineOpacity = isActive ? 1.0 : isNearby ? 0.70 : 0.35;

    const handlePress = () => {
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      onSeek(line.timeMs);
    };

    const isRtl = script === 'arabic';
    const isEndAligned = line.alignment === 'end';

    const formatTimestamp = (ms: number): string => {
      const mins = Math.floor(ms / 60000);
      const secs = Math.floor((ms % 60000) / 1000);
      return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    const minTouchHeight = Platform.select({
      ios: touchTarget.ios,
      default: touchTarget.android,
    });

    return (
      <Pressable
        accessible
        accessibilityRole="button"
        accessibilityLabel={`${line.text}. Start time ${formatTimestamp(line.timeMs)}`}
        accessibilityHint="Double tap to play from this lyric line"
        onPress={handlePress}
        style={[
          styles.touchable,
          { minHeight: minTouchHeight },
          isEndAligned ? styles.alignEnd : styles.alignStart,
        ]}
      >
        <View
          style={[
            styles.lineContainer,
            isEndAligned ? styles.alignEnd : styles.alignStart,
            { opacity: lineOpacity },
          ]}
        >
          {line.isGap ? (
            <InstrumentalGapView
              line={line}
              positionMs={positionMs}
              isActiveLine={isActive}
              activeColor={activeColor}
            />
          ) : line.isWordSynced && line.words.length > 0 ? (
            <View
              style={[
                styles.wordsWrapper,
                isEndAligned ? styles.wordsAlignEnd : styles.wordsAlignStart,
                isRtl && styles.rtlRow,
              ]}
            >
              {line.words.map((word, wIdx) => (
                <LyricWordView
                  key={`word-${index}-${wIdx}-${word.startMs}`}
                  word={word}
                  positionMs={positionMs}
                  isActiveLine={isActive}
                  activeColor={activeColor}
                />
              ))}
            </View>
          ) : (
            <Text
              style={[
                styles.plainLineText,
                {
                  color: isActive ? color.text.primary : color.text.secondary,
                  textAlign: isEndAligned ? 'right' : isRtl ? 'right' : 'left',
                  textShadowColor: isActive ? activeColor : 'transparent',
                  textShadowRadius: isActive ? GLOW_RADIUS : 0,
                  textShadowOffset: { width: 0, height: 0 },
                },
              ]}
            >
              {line.text}
            </Text>
          )}

          {/* Backing vocal secondary line */}
          {line.background && (
            <View style={[styles.backgroundVocalContainer, isEndAligned && styles.alignEnd]}>
              <Text
                style={[
                  styles.backgroundVocalText,
                  { textAlign: isEndAligned ? 'right' : isRtl ? 'right' : 'left' },
                ]}
              >
                {line.background.text}
              </Text>
            </View>
          )}
        </View>
      </Pressable>
    );
  },
  (prev, next) => {
    return (
      prev.line.id === next.line.id &&
      prev.line.text === next.line.text &&
      prev.isActive === next.isActive &&
      prev.isNearby === next.isNearby &&
      prev.activeColor === next.activeColor &&
      prev.script === next.script
    );
  }
);

const styles = StyleSheet.create({
  touchable: {
    width: '100%',
    paddingVertical: space[2],
    paddingHorizontal: space[3],
    justifyContent: 'center',
  },
  alignStart: {
    alignItems: 'flex-start',
  },
  alignEnd: {
    alignItems: 'flex-end',
  },
  lineContainer: {
    width: '100%',
  },
  wordsWrapper: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    width: '100%',
    gap: space[2],
  },
  wordsAlignStart: {
    justifyContent: 'flex-start',
  },
  wordsAlignEnd: {
    justifyContent: 'flex-end',
  },
  rtlRow: {
    flexDirection: 'row-reverse',
  },
  wordContainer: {
    position: 'relative',
    justifyContent: 'center',
  },
  wordText: {
    fontSize: 22,
    fontWeight: '700',
    lineHeight: 32,
    letterSpacing: -0.3,
    color: color.text.primary,
  },
  plainLineText: {
    fontSize: 22,
    fontWeight: '700',
    lineHeight: 32,
    letterSpacing: -0.3,
    flexWrap: 'wrap',
    width: '100%',
  },
  backgroundVocalContainer: {
    marginTop: space[1],
    width: '100%',
  },
  backgroundVocalText: {
    fontSize: 18,
    fontWeight: '500',
    lineHeight: 24,
    color: color.text.tertiary,
    fontStyle: 'italic',
  },
  gapContainer: {
    paddingVertical: space[3],
    justifyContent: 'center',
  },
  gapRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space[2],
  },
  gapDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
});
