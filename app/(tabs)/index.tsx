import { useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import { Canvas, Rect, vec, LinearGradient } from '@shopify/react-native-skia';
import { color, space, type as typeScale } from '@/design/tokens';

/**
 * P0 De-Risk Test View
 *
 * Validates two critical stack integrations:
 * 1. Reanimated 4 shared value → UI thread worklet → animated style (60/120 Hz)
 * 2. Skia canvas rendering a gradient rect (proves native Skia bridge works)
 *
 * This screen is temporary and will be replaced with the real Home feed in P3.
 */
export default function HomeScreen() {
  // ─── De-Risk 1: Reanimated Shared Value Animation ──────────────
  const rotation = useSharedValue(0);

  useEffect(() => {
    // Continuous rotation at 60/120 Hz on the UI thread
    rotation.value = withRepeat(
      withTiming(360, {
        duration: 4000,
        easing: Easing.linear,
      }),
      -1, // infinite repeat
      false, // don't reverse
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
      {/* Header */}
      <Text style={styles.title}>OTO</Text>
      <Text style={styles.subtitle}>P0 De-Risk Validation</Text>

      {/* De-Risk 1: Reanimated animation worklet */}
      <View style={styles.section}>
        <Text style={styles.sectionLabel}>Reanimated 4 — UI Thread Animation</Text>
        <View style={styles.animationContainer}>
          <Animated.View style={[styles.animatedBox, animatedBoxStyle]}>
            <Text style={styles.boxText}>UI</Text>
          </Animated.View>
        </View>
        <Text style={styles.statusText}>
          If this box rotates smoothly, Reanimated worklets are functional.
        </Text>
      </View>

      {/* De-Risk 2: Skia canvas */}
      <View style={styles.section}>
        <Text style={styles.sectionLabel}>Skia Canvas — Gradient Rect</Text>
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
        <Text style={styles.statusText}>
          If you see a warm amber-to-dark gradient above, Skia is functional.
        </Text>
      </View>

      {/* Stack info */}
      <View style={styles.infoSection}>
        <Text style={styles.infoText}>Stack: Expo SDK 57 + RN 0.86 + New Architecture</Text>
        <Text style={styles.infoText}>Threading: All animations on UI thread (worklets)</Text>
        <Text style={styles.infoText}>Rendering: Skia canvas + Native RN content</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: color.bg.base,
    paddingHorizontal: space[5],
    paddingTop: space[8],
  },
  title: {
    color: color.accent.signature,
    fontSize: typeScale.display[0],
    lineHeight: typeScale.display[1],
    fontWeight: '700',
    letterSpacing: 2,
  },
  subtitle: {
    color: color.text.secondary,
    fontSize: typeScale.body[0],
    lineHeight: typeScale.body[1],
    marginTop: space[1],
    marginBottom: space[7],
  },
  section: {
    marginBottom: space[7],
  },
  sectionLabel: {
    color: color.text.tertiary,
    fontSize: typeScale.meta[0],
    lineHeight: typeScale.meta[1],
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: space[3],
  },
  animationContainer: {
    height: 100,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: color.bg.s1,
    borderRadius: 12,
  },
  animatedBox: {
    width: 48,
    height: 48,
    backgroundColor: color.accent.signature,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  boxText: {
    color: color.bg.base,
    fontSize: typeScale.meta[0],
    fontWeight: '700',
  },
  statusText: {
    color: color.text.tertiary,
    fontSize: typeScale.caption[0],
    lineHeight: typeScale.caption[1],
    marginTop: space[2],
    fontStyle: 'italic',
  },
  canvasContainer: {
    height: 140,
    backgroundColor: color.bg.s1,
    borderRadius: 12,
    overflow: 'hidden',
  },
  canvas: {
    flex: 1,
  },
  infoSection: {
    paddingTop: space[5],
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: color.hairline,
  },
  infoText: {
    color: color.text.tertiary,
    fontSize: typeScale.caption[0],
    lineHeight: 18,
    marginBottom: space[1],
  },
});
