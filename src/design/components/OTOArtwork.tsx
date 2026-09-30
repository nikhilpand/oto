import { useState } from 'react';
import {
  View,
  StyleSheet,
  StyleProp,
  ViewStyle,
  ActivityIndicator,
} from 'react-native';
import { Image, ImageProps } from 'expo-image';
import { color, radius } from '@/design/tokens';
import { OTOText } from './OTOText';

export interface OTOArtworkProps extends Omit<ImageProps, 'source' | 'style'> {
  uri?: string | null;
  thumbhash?: string | null;
  blurhash?: string | null;
  size?: number;
  borderRadius?: number;
  alt?: string;
  style?: StyleProp<ViewStyle>;
}

/**
 * OTOArtwork — Image component with thumbhash/blurhash placeholder,
 * memory-disk caching, rounded corners, and verified error fallback.
 */
export function OTOArtwork({
  uri,
  thumbhash,
  blurhash,
  size = 48,
  borderRadius = radius.md,
  alt = 'Track artwork',
  style,
  ...rest
}: OTOArtworkProps) {
  const [hasError, setHasError] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const containerStyle: ViewStyle = {
    width: size,
    height: size,
    borderRadius,
    overflow: 'hidden',
    backgroundColor: color.bg.s2,
  };

  if (!uri || hasError) {
    return (
      <View
        accessibilityRole="image"
        accessibilityLabel={alt}
        style={[containerStyle, styles.fallbackContainer, style]}
      >
        <OTOText variant="caption" colorRole="tertiary" weight="medium">
          ♪
        </OTOText>
      </View>
    );
  }

  const placeholder = thumbhash
    ? { thumbhash }
    : blurhash
    ? { blurhash }
    : undefined;

  return (
    <View style={[containerStyle, style]}>
      <Image
        source={{ uri }}
        placeholder={placeholder}
        contentFit="cover"
        transition={200}
        cachePolicy="memory-disk"
        accessibilityLabel={alt}
        accessibilityRole="image"
        onLoadStart={() => setIsLoading(true)}
        onLoad={() => setIsLoading(false)}
        onError={() => {
          setIsLoading(false);
          setHasError(true);
        }}
        style={StyleSheet.absoluteFill}
        {...rest}
      />
      {isLoading && (
        <View style={[StyleSheet.absoluteFill, styles.loadingOverlay]}>
          <ActivityIndicator size="small" color={color.text.tertiary} />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  fallbackContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: color.hairline,
  },
  loadingOverlay: {
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(10, 10, 12, 0.3)',
  },
});
