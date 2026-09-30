/**
 * MoodsGenresSection — Typographic Cards with Curated Color Palettes
 *
 * Distinct visual density: 2-row horizontal scroller of typographic capsule cards
 * (strictly no generic stock photos, as mandated by the Anti-AI-Slop Checklist).
 */

import React from 'react';
import { View, StyleSheet, ScrollView, Pressable } from 'react-native';
import { space, radius } from '@/design/tokens';
import { OTOText } from '@/design/components/OTOText';
import { MoodGenreItem } from '../types';

export interface MoodsGenresSectionProps {
  items: MoodGenreItem[];
  onSelect: (item: MoodGenreItem) => void;
}

export function MoodsGenresSection({
  items,
  onSelect,
}: MoodsGenresSectionProps): React.JSX.Element | null {
  if (!items || items.length === 0) return null;

  // Split into 2 rows for balanced 2-tier scrolling
  const mid = Math.ceil(items.length / 2);
  const row1 = items.slice(0, mid);
  const row2 = items.slice(mid);

  const renderCard = (item: MoodGenreItem) => (
    <Pressable
      key={item.id}
      accessible
      accessibilityRole="button"
      accessibilityLabel={`Mood and Genre: ${item.title}. ${item.description}. ${item.trackCount} tracks available.`}
      accessibilityHint="Explores tracks in this genre"
      onPress={() => onSelect(item)}
      style={[
        styles.card,
        {
          backgroundColor: item.gradientColors[0],
          borderColor: item.accentColor + '33', // 20% opacity border
        },
      ]}
    >
      {/* Accent corner dot indicator */}
      <View style={[styles.accentDot, { backgroundColor: item.accentColor }]} />

      <View style={styles.cardContent}>
        <OTOText variant="caption" weight="bold" numberOfLines={1}>
          {item.title}
        </OTOText>
        <OTOText variant="meta" colorRole="secondary" numberOfLines={1}>
          {item.trackCount} tracks
        </OTOText>
      </View>
    </Pressable>
  );

  return (
    <View style={styles.container}>
      <View style={styles.sectionHeader}>
        <OTOText variant="title" weight="bold">
          Moods & Genres
        </OTOText>
        <OTOText variant="caption" colorRole="secondary">
          Explore by sound textures and sonic frequencies
        </OTOText>
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        <View style={styles.gridColumn}>
          <View style={styles.rowWrapper}>{row1.map(renderCard)}</View>
          <View style={styles.rowWrapper}>{row2.map(renderCard)}</View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: space[5],
  },
  sectionHeader: {
    paddingHorizontal: space[3],
    marginBottom: space[2],
    gap: 2,
  },
  scrollContent: {
    paddingHorizontal: space[3],
  },
  gridColumn: {
    gap: space[2],
  },
  rowWrapper: {
    flexDirection: 'row',
    gap: space[2],
  },
  card: {
    width: 140,
    height: 58,
    borderRadius: radius.md,
    borderWidth: 1,
    paddingHorizontal: space[2],
    paddingVertical: space[1],
    justifyContent: 'center',
    overflow: 'hidden',
  },
  accentDot: {
    position: 'absolute',
    top: 6,
    right: 8,
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  cardContent: {
    gap: 2,
  },
});
