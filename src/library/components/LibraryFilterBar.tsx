/**
 * LibraryFilterBar
 *
 * Segmented filter chips: All, Playlists, Albums, Artists, Downloads.
 * Active chip uses accent color. All chips meet 44pt/48dp touch target.
 */

import React from 'react';
import { Pressable, ScrollView, StyleSheet } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { color, duration, radius, space } from '@/design/tokens';
import { OTOText } from '@/design/components/OTOText';
import { LIBRARY_FILTER_CHIPS } from '../types';
import type { LibraryFilter } from '../types';

interface Props {
  active: LibraryFilter;
  onChange: (filter: LibraryFilter) => void;
}

function FilterChip({ chip, isActive, onPress }: { chip: { id: LibraryFilter; label: string }; isActive: boolean; onPress: () => void }) {
  const bgOpacity = useSharedValue(isActive ? 1 : 0);

  React.useEffect(() => {
    bgOpacity.value = withTiming(isActive ? 1 : 0, { duration: duration.micro });
  }, [isActive, bgOpacity]);

  const animStyle = useAnimatedStyle(() => ({
    backgroundColor: isActive
      ? color.accent.signature + 'CC' // 80% opacity active
      : color.bg.s2,
    borderColor: isActive ? color.accent.signature : color.hairline,
  }));

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="radio"
      accessibilityState={{ checked: isActive }}
      accessibilityLabel={chip.label}
    >
      <Animated.View style={[styles.chip, animStyle]}>
        <OTOText
          variant="meta"
          weight="semibold"
          customColor={isActive ? color.bg.base : color.text.secondary}
        >
          {chip.label}
        </OTOText>
      </Animated.View>
    </Pressable>
  );
}

export function LibraryFilterBar({ active, onChange }: Props) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.row}
      accessibilityRole="radiogroup"
      accessibilityLabel="Library filter"
    >
      {LIBRARY_FILTER_CHIPS.map((chip) => (
        <FilterChip
          key={chip.id}
          chip={chip}
          isActive={active === chip.id}
          onPress={() => onChange(chip.id)}
        />
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  row: {
    paddingHorizontal: space[4],
    gap: space[2],
    paddingVertical: space[3],
  },
  chip: {
    height: 44,
    paddingHorizontal: space[4],
    borderRadius: radius.full,
    borderWidth: StyleSheet.hairlineWidth,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
