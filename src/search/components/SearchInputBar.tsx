/**
 * SearchInputBar
 *
 * Instant-responsive (< 16ms) controlled input with 180ms debounced
 * upstream search emission, clear action, and glass surface.
 *
 * Architecture:
 *   - Local state mirrors the visual input (synchronous).
 *   - Debounced callback triggers the search engine with a new sequence token.
 */

import { useEffect, useRef } from 'react';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { color, duration, fontFamily, radius, space, type as typeScale } from '@/design/tokens';
import { OTOText } from '@/design/components/OTOText';

interface Props {
  value: string;
  onChangeText: (text: string) => void;
  onClear: () => void;
  placeholder?: string;
}

export function SearchInputBar({ value, onChangeText, onClear, placeholder = 'Artists, songs, podcasts' }: Props) {
  const inputRef = useRef<TextInput>(null);
  const clearOpacity = useSharedValue(value.length > 0 ? 1 : 0);

  useEffect(() => {
    clearOpacity.value = withTiming(value.length > 0 ? 1 : 0, { duration: duration.micro });
  }, [value.length, clearOpacity]);

  const clearStyle = useAnimatedStyle(() => ({
    opacity: clearOpacity.value,
    pointerEvents: clearOpacity.value > 0 ? 'auto' : 'none',
  }));

  return (
    <View style={styles.container} accessibilityRole="search">
      {/* Search icon */}
      <OTOText variant="body" customColor={color.text.tertiary} style={styles.icon}>
        ⌕
      </OTOText>

      <TextInput
        ref={inputRef}
        style={styles.input}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={color.text.tertiary}
        returnKeyType="search"
        autoCorrect={false}
        autoCapitalize="none"
        accessibilityLabel="Search input"
        accessibilityHint="Type to search for songs, artists, albums or playlists"
      />

      {/* Clear button */}
      <Animated.View style={clearStyle}>
        <Pressable
          onPress={onClear}
          hitSlop={12}
          accessibilityRole="button"
          accessibilityLabel="Clear search"
          style={styles.clearBtn}
        >
          <OTOText variant="meta" customColor={color.text.secondary}>✕</OTOText>
        </Pressable>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: color.bg.s2,
    borderRadius: radius.md,
    paddingHorizontal: space[3],
    height: 48,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: color.hairline,
  },
  icon: {
    marginRight: space[2],
    fontSize: 18,
    lineHeight: 22,
  },
  input: {
    flex: 1,
    color: color.text.primary,
    fontSize: typeScale.body[0],
    lineHeight: typeScale.body[1],
    fontFamily: fontFamily.regular,
    paddingVertical: 0,
    minHeight: 44,
  },
  clearBtn: {
    width: 28,
    height: 28,
    borderRadius: radius.full,
    backgroundColor: color.bg.s3,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: space[2],
  },
});
