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
import { color, touchTarget } from '@/design/tokens';

export interface OTOIconButtonProps extends Omit<PressableProps, 'style'> {
  icon: React.ReactNode;
  accessibilityLabel: string;
  /** Optional hint read after label by screen readers. Describe the outcome. */
  accessibilityHint?: string;
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
  accessibilityHint,
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

  const buttonSize = Math.max(size, MIN_TOUCH_SIZE);

  return (
    <Pressable
      accessible
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityHint={accessibilityHint}
      accessibilityState={{
        disabled: !!disabled,
        busy: !!loading,
      }}
      disabled={disabled || loading}
      onPress={handlePress}
      onPressIn={onPressIn}
      onPressOut={onPressOut}
      style={({ pressed }) => [
        styles.base,
        {
          width: buttonSize,
          height: buttonSize,
          opacity: disabled ? 0.32 : pressed ? 0.65 : 1,
          transform: [{ scale: pressed && !disabled && !loading ? 0.92 : 1 }],
        },
        style as ViewStyle,
      ]}
      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
      {...rest}
    >
      {loading ? (
        <ActivityIndicator size="small" color={color.text.primary} />
      ) : (
        icon
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    justifyContent: 'center',
    alignItems: 'center',
  },
});
