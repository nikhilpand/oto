import { memo } from 'react';
import { View, StyleSheet, Pressable, Platform, Text } from 'react-native';
import Animated, {
  useAnimatedStyle,
  withSpring,
  type SharedValue,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { color, space, spring, touchTarget } from '@/design/tokens';
import type { LyricLine, LyricWord, SupportedScript } from '@/utils/lyrics/types';

export interface OTOLyricLineProps {
  line: LyricLine;
  index: number;
  activeIndex: number;
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
  const animatedFillStyle = useAnimatedStyle(() => {
    'worklet';
    if (!isActiveLine) {
      return { width: '0%' };
    }
    const pos = positionMs.value;
    if (pos >= word.endMs) {
      return { width: '100%' };
    }
    if (pos <= word.startMs) {
      return { width: '0%' };
    }
    const progress = (pos - word.startMs) / Math.max(1, word.endMs - word.startMs);
    return {
      width: `${Math.min(100, Math.max(0, progress * 100))}%`,
    };
  });

  return (
    <View style={styles.wordContainer}>
      {/* Base Dim Text */}
      <Text style={[styles.wordBaseText, { color: color.text.tertiary }]}>
        {word.text}
      </Text>
      {/* Swept Glowing Text Overlay */}
      <Animated.View style={[styles.wordSweptOverlay, animatedFillStyle]}>
        <Text
          style={[
            styles.wordSweptText,
            {
              color: '#FFFFFF',
              textShadowColor: activeColor,
              textShadowRadius: 8,
              textShadowOffset: { width: 0, height: 0 },
            },
          ]}
          numberOfLines={1}
        >
          {word.text}
        </Text>
      </Animated.View>
    </View>
  );
});

export const OTOLyricLine = memo(function OTOLyricLine({
  line,
  index,
  activeIndex,
  positionMs,
  onSeek,
  activeColor = color.accent.signature,
  reducedMotion = false,
  script = 'latin',
}: OTOLyricLineProps): React.JSX.Element {
  const distance = Math.abs(index - activeIndex);
  const isActive = distance === 0;

  // Scale: +20% on active line (scale: 1.2), normal on inactive (scale: 1.0)
  // Zero layout thrashing: uses GPU matrix transform rather than changing fontSize
  const lineAnimatedStyle = useAnimatedStyle(() => {
    'worklet';
    const targetScale = isActive ? 1.2 : 1.0;
    const targetOpacity = isActive ? 1.0 : distance === 1 ? 0.45 : 0.25;

    if (reducedMotion) {
      return {
        opacity: targetOpacity,
        transform: [{ scale: targetScale }],
      };
    }

    return {
      opacity: withSpring(targetOpacity, spring.spatial.default),
      transform: [
        {
          scale: withSpring(targetScale, spring.spatial.playful),
        },
      ],
    };
  }, [isActive, distance, reducedMotion]);

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
      <Animated.View
        style={[
          styles.lineContainer,
          isEndAligned ? styles.alignEnd : styles.alignStart,
          lineAnimatedStyle,
        ]}
      >
        {line.isWordSynced && line.words.length > 0 ? (
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
                color: isActive ? '#FFFFFF' : color.text.secondary,
                textAlign: isEndAligned ? 'right' : isRtl ? 'right' : 'left',
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
      </Animated.View>
    </Pressable>
  );
});

const styles = StyleSheet.create({
  touchable: {
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
    maxWidth: '90%',
  },
  wordsWrapper: {
    flexDirection: 'row',
    flexWrap: 'wrap',
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
  wordBaseText: {
    fontSize: 26,
    fontWeight: '700',
    lineHeight: 34,
    letterSpacing: -0.4,
  },
  wordSweptOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    bottom: 0,
    overflow: 'hidden',
  },
  wordSweptText: {
    fontSize: 26,
    fontWeight: '700',
    lineHeight: 34,
    letterSpacing: -0.4,
  },
  plainLineText: {
    fontSize: 26,
    fontWeight: '700',
    lineHeight: 34,
    letterSpacing: -0.4,
  },
  backgroundVocalContainer: {
    marginTop: space[1],
  },
  backgroundVocalText: {
    fontSize: 18,
    fontWeight: '500',
    lineHeight: 24,
    color: color.text.tertiary,
    fontStyle: 'italic',
  },
});
