import { useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import { color, space, radius } from '@/design/tokens';

const SKELETON_BLOCKS = [
  [0.92, 0.58],
  [0.85, 0.96, 0.42],
  [0.65],
  [0.94, 0.76],
  [0.88, 0.92, 0.35],
];

export function LyricsSkeleton(): React.JSX.Element {
  const shimmer = useSharedValue(0.25);

  useEffect(() => {
    shimmer.value = withRepeat(
      withTiming(0.65, { duration: 1200, easing: Easing.inOut(Easing.ease) }),
      -1,
      true
    );
  }, [shimmer]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: shimmer.value,
  }));

  return (
    <View style={styles.container} accessible accessibilityLabel="Loading lyrics">
      {SKELETON_BLOCKS.map((block, blockIndex) => (
        <View key={`block-${blockIndex}`} style={styles.block}>
          {block.map((widthRatio, lineIndex) => (
            <Animated.View
              key={`line-${blockIndex}-${lineIndex}`}
              style={[
                styles.line,
                { width: `${Math.round(widthRatio * 100)}%` },
                animatedStyle,
              ]}
            />
          ))}
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingVertical: space[4],
    paddingHorizontal: space[3],
    gap: space[5],
  },
  block: {
    gap: space[2],
  },
  line: {
    height: 28,
    borderRadius: radius.sm,
    backgroundColor: color.bg.s3,
  },
});
