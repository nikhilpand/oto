/**
 * LibraryToolbar
 *
 * Sort mode selector (Recent, A–Z, Z–A) and List/Grid view toggle.
 */

import { Pressable, StyleSheet, View } from 'react-native';
import { color, radius, space } from '@/design/tokens';
import { OTOText } from '@/design/components/OTOText';
import type { LibrarySortOrder, LibraryViewMode } from '../types';

interface Props {
  sortOrder: LibrarySortOrder;
  viewMode: LibraryViewMode;
  onSortChange: (order: LibrarySortOrder) => void;
  onViewModeChange: (mode: LibraryViewMode) => void;
}

const SORT_OPTIONS: { id: LibrarySortOrder; label: string }[] = [
  { id: 'recent', label: 'Recent' },
  { id: 'az',     label: 'A–Z' },
  { id: 'za',     label: 'Z–A' },
];

export function LibraryToolbar({ sortOrder, viewMode, onSortChange, onViewModeChange }: Props) {
  return (
    <View style={styles.row}>
      {/* Sort Options */}
      <View style={styles.sortGroup}>
        {SORT_OPTIONS.map((opt) => (
          <Pressable
            key={opt.id}
            onPress={() => onSortChange(opt.id)}
            style={[styles.sortBtn, sortOrder === opt.id && styles.sortBtnActive]}
            accessibilityRole="radio"
            accessibilityState={{ checked: sortOrder === opt.id }}
            accessibilityLabel={`Sort by ${opt.label}`}
          >
            <OTOText
              variant="meta"
              weight={sortOrder === opt.id ? 'semibold' : 'regular'}
              customColor={sortOrder === opt.id ? color.accent.signatureLight : color.text.secondary}
            >
              {opt.label}
            </OTOText>
          </Pressable>
        ))}
      </View>

      {/* View mode toggle */}
      <View style={styles.viewGroup}>
        <Pressable
          onPress={() => onViewModeChange('list')}
          style={[styles.viewBtn, viewMode === 'list' && styles.viewBtnActive]}
          accessibilityRole="radio"
          accessibilityState={{ checked: viewMode === 'list' }}
          accessibilityLabel="List view"
        >
          <OTOText variant="body" customColor={viewMode === 'list' ? color.accent.signatureLight : color.text.tertiary}>☰</OTOText>
        </Pressable>
        <Pressable
          onPress={() => onViewModeChange('grid')}
          style={[styles.viewBtn, viewMode === 'grid' && styles.viewBtnActive]}
          accessibilityRole="radio"
          accessibilityState={{ checked: viewMode === 'grid' }}
          accessibilityLabel="Grid view"
        >
          <OTOText variant="body" customColor={viewMode === 'grid' ? color.accent.signatureLight : color.text.tertiary}>⊞</OTOText>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: space[4],
    paddingVertical: space[2],
  },
  sortGroup: {
    flexDirection: 'row',
    gap: space[1],
  },
  sortBtn: {
    height: 44,
    paddingHorizontal: space[3],
    justifyContent: 'center',
    borderRadius: radius.full,
  },
  sortBtnActive: {
    backgroundColor: color.bg.s2,
  },
  viewGroup: {
    flexDirection: 'row',
    backgroundColor: color.bg.s2,
    borderRadius: radius.sm,
    overflow: 'hidden',
  },
  viewBtn: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  viewBtnActive: {
    backgroundColor: color.bg.s3,
  },
});
