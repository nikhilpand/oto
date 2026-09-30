import { useCallback } from 'react';
import {
  Platform,
  Pressable,
  PressableProps,
  StyleSheet,
  ActivityIndicator,
  ViewStyle,
  StyleProp,
  View,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from 'react-native-reanimated';
import {
  color,
  radius,
  space,
  spring,
  touchTarget,
} from '@/design/tokens';
import { OTOText } from './OTOText';
import { useReducedMotion } from '@/design/hooks/useReducedMotion';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export type ButtonVariant = 'primary' | 'secondary' | 'ghost';
export type ButtonSize = 'sm' | 'md' | 'lg';

export interface OTOButtonProps extends Omit<PressableProps, 'style'> {
  label: string;
  variant?: ButtonVariant;
  size?: ButtonSize;
  icon?: React.ReactNode;
  iconPosition?: 'left' | 'right';
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
 * OTOButton — Primary, secondary, and ghost interactive button primitive.
 * Strictly uses design tokens for styling, enforces accessibility touch targets,
 * and features playful Reanimated press physics.
 */
export function OTOButton({
  label,
  variant = 'primary',
  size = 'md',
  icon,
  iconPosition = 'left',
  haptic = true,
  disabled = false,
  loading = false,
  onPress,
  onPressIn,
  onPressOut,
  style,
  ...rest
}: OTOButtonProps) {
  const reducedMotion = useReducedMotion();
  const scale = useSharedValue(1);

  const handlePressIn = useCallback(
    (e: any) => {
      'worklet';
      if (!disabled && !loading && !reducedMotion) {
        scale.value = withSpring(0.96, spring.spatial.playful);
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

  const sizeStyles = {
    sm: {
      minHeight: 36,
      paddingHorizontal: space[3],
      borderRadius: radius.full,
    },
    md: {
      minHeight: MIN_TOUCH_SIZE,
      paddingHorizontal: space[4],
      borderRadius: radius.full,
    },
    lg: {
      minHeight: 52,
      paddingHorizontal: space[6],
      borderRadius: radius.full,
    },
  }[size];

  const variantStyles = {
    primary: {
      backgroundColor: color.accent.signature,
      borderWidth: 0,
      borderColor: 'transparent',
    },
    secondary: {
      backgroundColor: color.bg.s2,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: color.hairline,
    },
    ghost: {
      backgroundColor: 'transparent',
      borderWidth: 0,
      borderColor: 'transparent',
    },
  }[variant];

  const textColor = {
    primary: color.bg.base,
    secondary: color.text.primary,
    ghost: color.text.primary,
  }[variant];

  const textVariant = size === 'sm' ? 'caption' : size === 'lg' ? 'track' : 'body';

  return (
    <AnimatedPressable
      accessibilityRole="button"
      accessibilityLabel={label}
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
        sizeStyles,
        variantStyles,
        { opacity: disabled ? 0.32 : 1 },
        animatedStyle,
        style,
      ]}
      hitSlop={
        size === 'sm'
          ? {
              top: (MIN_TOUCH_SIZE - 36) / 2,
              bottom: (MIN_TOUCH_SIZE - 36) / 2,
              left: 0,
              right: 0,
            }
          : undefined
      }
      {...rest}
    >
      {loading ? (
        <ActivityIndicator size="small" color={textColor} />
      ) : (
        <View style={styles.contentRow}>
          {icon && iconPosition === 'left' && (
            <View style={styles.iconLeft}>{icon}</View>
          )}
          <OTOText
            variant={textVariant}
            weight="semibold"
            customColor={textColor}
          >
            {label}
          </OTOText>
          {icon && iconPosition === 'right' && (
            <View style={styles.iconRight}>{icon}</View>
          )}
        </View>
      )}
    </AnimatedPressable>
  );
}

const styles = StyleSheet.create({
  base: {
    justifyContent: 'center',
    alignItems: 'center',
    flexDirection: 'row',
  },
  contentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconLeft: {
    marginRight: space[2],
  },
  iconRight: {
    marginLeft: space[2],
  },
});
