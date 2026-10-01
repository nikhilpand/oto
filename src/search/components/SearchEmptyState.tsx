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

      {/* Suggestion Cards Grid */}
      <View style={styles.grid}>
        {SEARCH_SUGGESTIONS.map((suggestion) => (
          <Pressable
            key={suggestion.id}
            style={({ pressed }) => [
              styles.card,
              {
                backgroundColor: suggestion.accentColor + '1F',
                borderColor: suggestion.accentColor + '40',
              },
              pressed && styles.cardPressed,
            ]}
            onPress={() => onSuggestionPress(suggestion)}
            accessibilityRole="button"
            accessibilityLabel={`Browse ${suggestion.label}`}
          >
            {/* Top edge specular highlight */}
            <View style={[styles.topHighlight, { backgroundColor: suggestion.accentColor + '30' }]} />

            {/* Stylized vinyl groove emblem on bottom right */}
            <View style={styles.vinylContainer} pointerEvents="none">
              <View style={[styles.vinylOuter, { borderColor: suggestion.accentColor + '55' }]}>
                <View style={[styles.vinylInner, { borderColor: suggestion.accentColor + '35' }]}>
                  <View style={[styles.vinylCenter, { backgroundColor: suggestion.accentColor + '80' }]} />
                </View>
              </View>
            </View>

            {/* Category label */}
            <View style={styles.cardTextContainer}>
              <OTOText variant="track" weight="bold" customColor={color.text.primary}>
                {suggestion.label}
              </OTOText>
            </View>
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
  card: {
    width: '47.5%',
    height: 84,
    borderRadius: radius.md,
    padding: space[3],
    justifyContent: 'space-between',
    overflow: 'hidden',
    borderWidth: 1,
    backgroundColor: color.bg.s2,
    position: 'relative',
  },
  cardPressed: {
    opacity: 0.88,
    transform: [{ scale: 0.98 }],
  },
  topHighlight: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 1.5,
  },
  vinylContainer: {
    position: 'absolute',
    right: -10,
    bottom: -10,
    width: 60,
    height: 60,
  },
  vinylOuter: {
    width: 60,
    height: 60,
    borderRadius: radius.full,
    borderWidth: 1.5,
    justifyContent: 'center',
    alignItems: 'center',
  },
  vinylInner: {
    width: 36,
    height: 36,
    borderRadius: radius.full,
    borderWidth: 1.5,
    justifyContent: 'center',
    alignItems: 'center',
  },
  vinylCenter: {
    width: 10,
    height: 10,
    borderRadius: radius.full,
  },
  cardTextContainer: {
    zIndex: 1,
  },
});
