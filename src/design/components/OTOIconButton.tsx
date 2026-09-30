import { useCallback } from 'react';
import {
  Platform,
  Pressable,
  PressableProps,
  StyleSheet,
  ActivityIndicator,
  ViewStyle,
  StyleProp,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from 'react-native-reanimated';
import { color, spring, touchTarget } from '@/design/tokens';
import { useReducedMotion } from '@/design/hooks/useReducedMotion';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export interface OTOIconButtonProps extends Omit<PressableProps, 'style'> {
  icon: React.ReactNode;
  accessibilityLabel: string;
  size?: number;
  haptic?: boolean;
  disabled?: boolean;
  loading?: boolean;
  style?: StyleProp<ViewStyle>;
}

const MIN_TOUCH_SIZE = Platform.select({
  ios: touchTarget.ios,
  default: touchTarget.android,
});

/**
 * OTOIconButton — Icon button primitive.
 * Enforces touch targets >= 44x44pt (iOS) / 48x48dp (Android),
 * light haptic tap feedback, and Reanimated playful press physics.
 */
export function OTOIconButton({
  icon,
  accessibilityLabel,
  size = MIN_TOUCH_SIZE,
  haptic = true,
  disabled = false,
  loading = false,
  onPress,
  onPressIn,
  onPressOut,
  style,
  ...rest
}: OTOIconButtonProps) {
  const reducedMotion = useReducedMotion();
  const scale = useSharedValue(1);

  const handlePressIn = useCallback(
    (e: any) => {
      'worklet';
      if (!disabled && !loading) {
        if (!reducedMotion) {
          scale.value = withSpring(0.9, spring.spatial.playful);
        }
      }
      onPressIn?.(e);
    },
    [disabled, loading, reducedMotion, onPressIn, scale]
  );

  const handlePressOut = useCallback(
    (e: any) => {
      'worklet';
      if (!reducedMotion) {
        scale.value = withSpring(1, spring.spatial.playful);
      }
      onPressOut?.(e);
    },
    [reducedMotion, onPressOut, scale]
  );

  const handlePress = useCallback(
    (e: any) => {
      if (disabled || loading) return;
      if (haptic) {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
      }
      onPress?.(e);
    },
    [disabled, loading, haptic, onPress]
  );

  const animatedStyle = useAnimatedStyle(() => {
    'worklet';
    return {
      transform: [{ scale: scale.value }],
    };
  });

  const buttonSize = Math.max(size, MIN_TOUCH_SIZE);

  return (
    <AnimatedPressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{
        disabled: !!disabled,
        busy: !!loading,
      }}
      disabled={disabled || loading}
      onPress={handlePress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      style={[
        styles.base,
        {
          width: buttonSize,
          height: buttonSize,
          opacity: disabled ? 0.32 : 1,
        },
        animatedStyle,
        style,
      ]}
      hitSlop={
        buttonSize < MIN_TOUCH_SIZE
          ? {
              top: (MIN_TOUCH_SIZE - buttonSize) / 2,
              bottom: (MIN_TOUCH_SIZE - buttonSize) / 2,
              left: (MIN_TOUCH_SIZE - buttonSize) / 2,
              right: (MIN_TOUCH_SIZE - buttonSize) / 2,
            }
          : undefined
      }
      {...rest}
    >
      {loading ? (
        <ActivityIndicator size="small" color={color.text.primary} />
      ) : (
        icon
      )}
    </AnimatedPressable>
  );
}

const styles = StyleSheet.create({
  base: {
    justifyContent: 'center',
    alignItems: 'center',
  },
});
