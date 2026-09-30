import { Text, TextProps, TextStyle } from 'react-native';
import {
  type as typeTokens,
  color,
  TypographyVariant,
} from '@/design/tokens';

export type TextColorRole =
  | 'primary'
  | 'secondary'
  | 'tertiary'
  | 'disabled'
  | 'accent'
  | 'accentLight'
  | 'error'
  | 'success'
  | 'warning'
  | 'info';

export interface OTOTextProps extends TextProps {
  variant?: TypographyVariant;
  colorRole?: TextColorRole;
  customColor?: string;
  weight?: 'regular' | 'medium' | 'semibold' | 'bold';
  align?: 'auto' | 'left' | 'right' | 'center' | 'justify';
}

const colorRoleMap: Record<TextColorRole, string> = {
  primary: color.text.primary,
  secondary: color.text.secondary,
  tertiary: color.text.tertiary,
  disabled: color.text.disabled,
  accent: color.accent.signature,
  accentLight: color.accent.signatureLight,
  error: color.semantic.error,
  success: color.semantic.success,
  warning: color.semantic.warning,
  info: color.semantic.info,
};

const defaultWeightMap: Record<TypographyVariant, 'regular' | 'medium' | 'semibold' | 'bold'> = {
  display: 'bold',
  title: 'semibold',
  headline: 'semibold',
  section: 'semibold',
  track: 'semibold',
  body: 'regular',
  artist: 'medium',
  meta: 'regular',
  caption: 'regular',
};

const fontWeightValueMap = {
  regular: '400',
  medium: '500',
  semibold: '600',
  bold: '700',
} as const;

/**
 * OTOText — Core typography primitive.
 * Enforces design token typography scale, Dynamic Type max multiplier (1.8x),
 * and accessible contrast standards.
 */
export function OTOText({
  variant = 'body',
  colorRole = 'primary',
  customColor,
  weight,
  align,
  maxFontSizeMultiplier = 1.8,
  style,
  children,
  ...rest
}: OTOTextProps) {
  const [fontSize, lineHeight] = typeTokens[variant];
  const resolvedColor = customColor ?? colorRoleMap[colorRole];
  const resolvedWeight = weight ?? defaultWeightMap[variant];

  const computedStyle: TextStyle = {
    fontSize,
    lineHeight,
    color: resolvedColor,
    fontWeight: fontWeightValueMap[resolvedWeight],
    textAlign: align,
  };

  return (
    <Text
      maxFontSizeMultiplier={maxFontSizeMultiplier}
      style={[computedStyle, style]}
      {...rest}
    >
      {children}
    </Text>
  );
}
