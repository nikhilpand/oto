/**
 * SearchEmptyState
 *
 * Shown when query returns no results or when the search bar is focused
 * with no input. Shows curated mood/genre suggestion capsules.
 */

import { Pressable, StyleSheet, View } from 'react-native';
import { color, radius, space } from '@/design/tokens';
import { OTOText } from '@/design/components/OTOText';
import { SEARCH_SUGGESTIONS } from '../data/searchCatalog';
import type { SearchSuggestion } from '../types';

interface Props {
  mode: 'idle' | 'no-results';
  query?: string;
  onSuggestionPress: (suggestion: SearchSuggestion) => void;
}

export function SearchEmptyState({ mode, query, onSuggestionPress }: Props) {
  return (
    <View style={styles.container}>
      {mode === 'no-results' && query ? (
        <View style={styles.noResults}>
          <OTOText variant="track" weight="semibold" style={styles.noResultsTitle}>
            No results for
          </OTOText>
          <OTOText variant="body" customColor={color.text.secondary} style={styles.noResultsQuery} numberOfLines={2}>
            "{query}"
          </OTOText>
          <OTOText variant="meta" customColor={color.text.tertiary} style={styles.noResultsHint}>
            Check your spelling or try a different term.
          </OTOText>
        </View>
      ) : (
        <OTOText variant="track" weight="semibold" style={styles.browseTitle}>
          Browse categories
        </OTOText>
      )}

      {/* Suggestion Chips Grid */}
      <View style={styles.grid}>
        {SEARCH_SUGGESTIONS.map((suggestion) => (
          <Pressable
            key={suggestion.id}
            style={({ pressed }) => [
              styles.chip,
              { backgroundColor: suggestion.accentColor + '26' }, // 15% opacity
              pressed && styles.chipPressed,
            ]}
            onPress={() => onSuggestionPress(suggestion)}
            accessibilityRole="button"
            accessibilityLabel={`Browse ${suggestion.label}`}
          >
            <View style={[styles.chipAccent, { backgroundColor: suggestion.accentColor }]} />
            <OTOText variant="body" weight="semibold" customColor={color.text.primary}>
              {suggestion.label}
            </OTOText>
          </Pressable>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: space[4],
    paddingTop: space[5],
  },
  noResults: {
    alignItems: 'center',
    paddingVertical: space[7],
  },
  noResultsTitle: {
    marginBottom: space[1],
    textAlign: 'center',
  },
  noResultsQuery: {
    textAlign: 'center',
    marginBottom: space[2],
  },
  noResultsHint: {
    textAlign: 'center',
  },
  browseTitle: {
    marginBottom: space[4],
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: space[3],
  },
  chip: {
    width: '47%',
    height: 72,
    borderRadius: radius.md,
    justifyContent: 'flex-end',
    padding: space[3],
    overflow: 'hidden',
    minHeight: 44,
  },
  chipAccent: {
    position: 'absolute',
    top: 0,
    right: 0,
    width: 48,
    height: 48,
    borderRadius: radius.full,
    transform: [{ translateX: 12 }, { translateY: -12 }],
    opacity: 0.6,
  },
  chipPressed: {
    opacity: 0.75,
  },
});
