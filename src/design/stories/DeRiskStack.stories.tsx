import { useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import { Canvas, Rect, vec, LinearGradient } from '@shopify/react-native-skia';
import { color, space, radius } from '@/design/tokens';
import { OTOText } from '@/design/components/OTOText';

export function DeRiskStackStories() {
  const rotation = useSharedValue(0);

  useEffect(() => {
    rotation.value = withRepeat(
      withTiming(360, {
        duration: 4000,
        easing: Easing.linear,
      }),
      -1,
      false
    );
  }, [rotation]);

  const animatedBoxStyle = useAnimatedStyle(() => {
    'worklet';
    return {
      transform: [{ rotate: `${rotation.value}deg` }],
    };
  });

  return (
    <View style={styles.container}>
      <OTOText variant="title">P0 De-Risk Stack Validation</OTOText>
      <OTOText variant="caption" colorRole="secondary">
        Validates Reanimated 4 UI-thread worklets and native Skia runtime shaders.
      </OTOText>

      {/* De-Risk 1: Reanimated */}
      <View style={styles.section}>
        <OTOText variant="meta" colorRole="tertiary">
          Reanimated 4 — UI Thread Animation
        </OTOText>
        <View style={styles.animationContainer}>
          <Animated.View style={[styles.animatedBox, animatedBoxStyle]}>
            <OTOText variant="caption" weight="bold" customColor={color.bg.base}>
              UI
            </OTOText>
          </Animated.View>
        </View>
        <OTOText variant="caption" colorRole="tertiary">
          If this box rotates smoothly, Reanimated worklets are functional.
        </OTOText>
      </View>

      {/* De-Risk 2: Skia Canvas */}
      <View style={styles.section}>
        <OTOText variant="meta" colorRole="tertiary">
          Skia Canvas — Gradient Rect
        </OTOText>
        <View style={styles.canvasContainer}>
          <Canvas style={styles.canvas}>
            <Rect x={0} y={0} width={280} height={140}>
              <LinearGradient
                start={vec(0, 0)}
                end={vec(280, 140)}
                colors={[color.accent.signature, color.bg.s3, color.bg.base]}
              />
            </Rect>
          </Canvas>
        </View>
        <OTOText variant="caption" colorRole="tertiary">
          If you see a warm amber-to-dark gradient above, Skia is functional.
        </OTOText>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: space[4],
    gap: space[5],
  },
  section: {
    gap: space[2],
  },
  animationContainer: {
    height: 100,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: color.bg.s1,
    borderRadius: radius.md,
  },
  animatedBox: {
    width: 48,
    height: 48,
    backgroundColor: color.accent.signature,
    borderRadius: radius.sm,
    justifyContent: 'center',
    alignItems: 'center',
  },
  canvasContainer: {
    height: 140,
    backgroundColor: color.bg.s1,
    borderRadius: radius.md,
    overflow: 'hidden',
  },
  canvas: {
    flex: 1,
  },
});
