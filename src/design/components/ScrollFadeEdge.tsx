/**
 * ScrollFadeEdge
 *
 * Progressive blur/fade mask at the bottom of scrollable content, dissolving
 * content smoothly into the tab bar / mini-player zone.
 *
 * Quality Tier behaviour:
 *   Tier 3 (Full)     — Skia LinearGradient mask on a View (GPU composited)
 *   Tier 2 (Balanced) — expo-linear-gradient alpha fade
 *   Tier 1 / 0        — Solid tinted bar matching color.glass.solidFallback
 *
 * The component is purely visual — it sits in an absolute overlay and never
 * intercepts touches (pointerEvents="none").
 */

import { View, StyleSheet, Platform } from 'react-native';
import { Canvas, LinearGradient, Rect, vec } from '@shopify/react-native-skia';
import { color, radius, QualityTier, BOTTOM_CHROME_HEIGHT } from '@/design/tokens';
import { useQualityTier } from '@/design/hooks/useQualityTier';

export interface ScrollFadeEdgeProps {
  /** Height of the fade zone in dp. Default = 72. */
  fadeHeight?: number;
  /** Which edge to fade. Currently only 'bottom' is implemented. */
  edge?: 'bottom' | 'top';
}

const FADE_HEIGHT_DEFAULT = 72;

export function ScrollFadeEdge({ fadeHeight = FADE_HEIGHT_DEFAULT, edge: _edge = 'bottom' }: ScrollFadeEdgeProps) {
  const { tier } = useQualityTier();

  // Tier 3: Skia LinearGradient mask — true GPU compositing
  if (tier >= QualityTier.Full && Platform.OS !== 'web') {
    return (
      <View
        style={[styles.container, { height: fadeHeight }]}
        pointerEvents="none"
      >
        <Canvas style={StyleSheet.absoluteFill}>
          <Rect x={0} y={0} width={9999} height={fadeHeight}>
            <LinearGradient
              start={vec(0, 0)}
              end={vec(0, fadeHeight)}
              colors={['transparent', color.bg.base]}
              positions={[0, 1]}
            />
          </Rect>
        </Canvas>
      </View>
    );
  }

  // Tier 2: Simple View gradient (no native Skia needed)
  if (tier >= QualityTier.Balanced) {
    return (
      <View
        style={[styles.container, { height: fadeHeight }]}
        pointerEvents="none"
      >
        {/* Multi-stop semi-transparent overlay approximates a gradient */}
        <View style={[StyleSheet.absoluteFill, styles.fade25]} />
        <View style={[StyleSheet.absoluteFill, styles.fade50]} />
      </View>
    );
  }

  // Tier 0 / 1: Solid tinted bar
  return (
    <View
      style={[styles.container, styles.solid, { height: fadeHeight }]}
      pointerEvents="none"
    />
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: BOTTOM_CHROME_HEIGHT,
    left: 0,
    right: 0,
    borderRadius: radius.sm,
  },
  // Tier 2 approximation strips
  fade25: {
    bottom: 0,
    height: '50%',
    backgroundColor: `${color.bg.base}40`,
  },
  fade50: {
    bottom: 0,
    height: '25%',
    backgroundColor: `${color.bg.base}99`,
  },
  solid: {
    backgroundColor: color.glass.solidFallback,
  },
});
