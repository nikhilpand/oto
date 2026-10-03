import React from 'react';
import { View, StyleSheet, ScrollView, Pressable } from 'react-native';
import * as Haptics from 'expo-haptics';
import { color, space, radius } from '@/design/tokens';
import { OTOText } from '@/design/components/OTOText';

export const SEARCH_FILTERS = ['All', 'Songs', 'Videos', 'Albums', 'Artists', 'Playlists'] as const;
export type SearchFilter = (typeof SEARCH_FILTERS)[number];

export interface SearchCategoryPillsProps {
  activeFilter: SearchFilter;
  onFilterChange: (filter: SearchFilter) => void;
}

export function SearchCategoryPills({
  activeFilter,
  onFilterChange,
}: SearchCategoryPillsProps): React.JSX.Element {
  return (
    <View style={styles.container}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {SEARCH_FILTERS.map((f) => {
          const isActive = f === activeFilter;
          return (
            <Pressable
              key={f}
              style={[styles.pill, isActive ? styles.pillActive : styles.pillInactive]}
              onPress={() => {
                void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                onFilterChange(f);
              }}
              accessibilityRole="button"
              accessibilityState={{ selected: isActive }}
              accessibilityLabel={`Filter by ${f}`}
            >
              <OTOText
                variant="meta"
                weight={isActive ? 'bold' : 'regular'}
                style={isActive ? styles.textActive : styles.textInactive}
              >
                {f}
              </OTOText>
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    height: 44,
    justifyContent: 'center',
  },
  scrollContent: {
    paddingHorizontal: space[4],
    gap: space[2],
    alignItems: 'center',
  },
  pill: {
    paddingHorizontal: space[3],
    paddingVertical: 6,
    borderRadius: radius.full,
    borderWidth: 1,
  },
  pillActive: {
    backgroundColor: color.accent.signature,
    borderColor: color.accent.signature,
  },
  pillInactive: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  textActive: {
    color: '#000000',
  },
  textInactive: {
    color: color.text.secondary,
  },
});
