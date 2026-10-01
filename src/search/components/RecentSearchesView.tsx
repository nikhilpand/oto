/**
 * RecentSearchesView
 *
 * Horizontal chip row of recent queries with one-tap re-search and removal.
 */

import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { color, radius, space } from '@/design/tokens';
import { OTOText } from '@/design/components/OTOText';
import { CloseIcon } from '@/design/components/OTOIcon';

interface Props {
  queries: string[];
  onSelect: (query: string) => void;
  onRemove: (query: string) => void;
  onClearAll: () => void;
}

export function RecentSearchesView({ queries, onSelect, onRemove, onClearAll }: Props) {
  if (queries.length === 0) return null;

  return (
    <View>
      {/* Header */}
      <View style={styles.header}>
        <OTOText variant="track" weight="semibold">Recent searches</OTOText>
        <Pressable
          onPress={onClearAll}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel="Clear all recent searches"
        >
          <OTOText variant="meta" customColor={color.accent.signatureLight}>Clear all</OTOText>
        </Pressable>
      </View>

      {/* Chips */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.chipRow}
      >
        {queries.map((item) => (
          <View key={item} style={styles.chip}>
            <Pressable
              onPress={() => onSelect(item)}
              accessibilityRole="button"
              accessibilityLabel={`Search for ${item}`}
              style={styles.chipLabel}
            >
              <OTOText variant="meta" customColor={color.text.primary} numberOfLines={1}>
                {item}
              </OTOText>
            </Pressable>
            <Pressable
              onPress={() => onRemove(item)}
              hitSlop={6}
              accessibilityRole="button"
              accessibilityLabel={`Remove ${item} from recent searches`}
              style={styles.chipRemove}
            >
              <CloseIcon size={12} color={color.text.tertiary} />
            </Pressable>
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: space[4],
    paddingBottom: space[3],
  },
  chipRow: {
    paddingHorizontal: space[4],
    gap: space[2],
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: color.bg.s2,
    borderRadius: radius.full,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: color.hairline,
    paddingVertical: space[2],
    paddingLeft: space[3],
    paddingRight: space[2],
    minHeight: 44,
  },
  chipLabel: {
    maxWidth: 120,
    justifyContent: 'center',
    minHeight: 44,
  },
  chipRemove: {
    width: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: space[2],
  },
});
