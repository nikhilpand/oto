import { useMemo } from 'react';
import {
  Platform,
  View,
  ViewProps,
  StyleSheet,
  StyleProp,
  ViewStyle,
} from 'react-native';
import { BlurView } from 'expo-blur';
import {
  GlassView,
  isLiquidGlassAvailable,
  isGlassEffectAPIAvailable,
} from 'expo-glass-effect';
import { color, radius, QualityTier } from '@/design/tokens';
import { useQualityTier } from '@/design/hooks/useQualityTier';

export interface OTOGlassSurfaceProps extends ViewProps {
  borderRadius?: number;
  forceSolidFallback?: boolean;
  style?: StyleProp<ViewStyle>;
  children?: React.ReactNode;
}

/**
 * OTOGlassSurface — Liquid Glass container with multi-tier fallback.
 * - iOS 26+ (Tier >= 2): Native Liquid Glass via `expo-glass-effect`.
 * - Android Tier >= 2: `expo-blur` BlurView (dark tint, intensity 60).
 * - Tier <= 1 / old iOS: Polished solid dark tint with hairline border and top highlight.
 */
export function OTOGlassSurface({
  borderRadius = radius.xl,
  forceSolidFallback = false,
  style,
  children,
  ...rest
}: OTOGlassSurfaceProps) {
  const { tier } = useQualityTier();

  const canUseLiquidGlass = useMemo(() => {
    if (forceSolidFallback) return false;
    if (tier < QualityTier.Balanced) return false;
    if (Platform.OS !== 'ios') return false;

    try {
      return (
        typeof isLiquidGlassAvailable === 'function' &&
        isLiquidGlassAvailable() &&
        (typeof isGlassEffectAPIAvailable !== 'function' || isGlassEffectAPIAvailable())
      );
    } catch {
      return false;
    }
  }, [tier, forceSolidFallback]);

  const canUseBlur = !forceSolidFallback && tier >= QualityTier.Balanced;

  const containerStyle: ViewStyle = {
    borderRadius,
    overflow: 'hidden',
  };

  const highlightBorder: ViewStyle = {
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: color.hairline,
    borderTopColor: color.glass.highlight,
    borderTopWidth: 1,
  };

  if (canUseLiquidGlass) {
    return (
      <GlassView
        glassEffectStyle="regular"
        colorScheme="dark"
        tintColor={color.glass.tint}
        style={[containerStyle, highlightBorder, style]}
        {...rest}
      >
        {children}
      </GlassView>
    );
  }

  // Android Tier >= 2: expo-blur gives real translucency
  if (Platform.OS === 'android' && canUseBlur) {
    return (
      <BlurView
        intensity={55}
        tint="dark"
        experimentalBlurMethod="dimezisBlurView"
        style={[containerStyle, highlightBorder, style]}
        {...(rest as object)}
      >
        {children}
      </BlurView>
    );
  }

  // Tier <= 1 solid fallback
  return (
    <View
      style={[
        containerStyle,
        styles.solidFallback,
        highlightBorder,
        style,
      ]}
      {...rest}
    >
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  solidFallback: {
    backgroundColor: color.glass.solidFallback,
  },
});
