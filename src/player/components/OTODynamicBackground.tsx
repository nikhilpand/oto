import { useEffect, useMemo } from 'react';
import { View, StyleSheet, useWindowDimensions } from 'react-native';
import {
  useSharedValue,
  withRepeat,
  withTiming,
  Easing,
  useDerivedValue,
} from 'react-native-reanimated';
import {
  Canvas,
  Fill,
  Shader,
  RadialGradient,
  LinearGradient,
  vec,
} from '@shopify/react-native-skia';
import { color, QualityTier } from '@/design/tokens';
import { usePalette } from '@/design/context/PaletteContext';
import { useQualityTier } from '@/design/hooks/useQualityTier';
import { getAtmosphereRuntimeEffect } from '@/design/shaders/atmosphere.sksl';

export interface OTODynamicBackgroundProps {
  /** Optional override for testing or storybook */
  forcedTier?: QualityTier;
}

/**
 * OTODynamicBackground — 4-Tier Acoustic Atmosphere Layer.
 *
 * - Tier 3 (Full): Skia runtime effect shader with low-frequency organic drift.
 * - Tier 2 (Balanced): Static Skia radial gradient with slow palette morph.
 * - Tier 1 (Lite): Static linear gradient.
 * - Tier 0 (Minimal): Flat palette background color with crossfade only.
 *
 * @see docs/DESIGN.md §6 & §7
 */
export function OTODynamicBackground({
  forcedTier,
}: OTODynamicBackgroundProps): React.JSX.Element {
  const { width, height } = useWindowDimensions();
  const { activePalette, uniforms: paletteUniforms } = usePalette();
  const { tier: activeTier } = useQualityTier();
  const effectiveTier = forcedTier !== undefined ? forcedTier : activeTier;

  // UI-thread time accumulator for low-frequency shader drift
  const time = useSharedValue(0);

  useEffect(() => {
    if (effectiveTier === QualityTier.Full) {
      time.value = withRepeat(
        withTiming(1000, {
          duration: 1000000, // 1000s slow drift
          easing: Easing.linear,
        }),
        -1,
        false
      );
    }
  }, [effectiveTier, time]);

  const atmosphereEffect = useMemo(() => {
    if (effectiveTier === QualityTier.Full) {
      return getAtmosphereRuntimeEffect();
    }
    return null;
  }, [effectiveTier]);

  // Derived uniforms worklet for Tier 3 shader
  const uniforms = useDerivedValue(() => {
    return {
      iResolution: [width, height],
      iTime: time.value,
      uDominant: paletteUniforms.uDominant.value,
      uSecondary: paletteUniforms.uSecondary.value,
      uAccent: paletteUniforms.uAccent.value,
      uShadow: paletteUniforms.uShadow.value,
    };
  }, [width, height, time, paletteUniforms]);

  // Tier 0: Flat palette color
  if (effectiveTier === QualityTier.Minimal) {
    return (
      <View
        style={[
          StyleSheet.absoluteFill,
          { backgroundColor: activePalette.dominant || color.bg.base },
        ]}
      />
    );
  }

  // Tier 1: Static linear gradient
  if (effectiveTier === QualityTier.Lite) {
    return (
      <View style={[StyleSheet.absoluteFill, { backgroundColor: color.bg.base }]}>
        <Canvas style={StyleSheet.absoluteFill}>
          <Fill>
            <LinearGradient
              start={vec(0, 0)}
              end={vec(0, height)}
              colors={[activePalette.dominant, activePalette.secondary, color.bg.base]}
            />
          </Fill>
        </Canvas>
      </View>
    );
  }

  // Tier 2: Static Skia radial gradient (or Tier 3 fallback if shader unavailable)
  if (effectiveTier === QualityTier.Balanced || !atmosphereEffect) {
    return (
      <View style={[StyleSheet.absoluteFill, { backgroundColor: color.bg.base }]}>
        <Canvas style={StyleSheet.absoluteFill}>
          <Fill>
            <RadialGradient
              c={vec(width / 2, height * 0.35)}
              r={width * 0.9}
              colors={[
                activePalette.dominant,
                activePalette.secondary,
                activePalette.shadow,
                color.bg.base,
              ]}
            />
          </Fill>
        </Canvas>
      </View>
    );
  }

  // Tier 3: Animated Skia atmosphere runtime shader
  return (
    <View style={[StyleSheet.absoluteFill, { backgroundColor: color.bg.base }]}>
      <Canvas style={StyleSheet.absoluteFill}>
        <Fill>
          <Shader source={atmosphereEffect} uniforms={uniforms} />
        </Fill>
      </Canvas>
    </View>
  );
}
