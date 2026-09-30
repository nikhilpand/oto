/**
 * NewReleasesSection — Horizontal Scroller with Release Date Badges
 *
 * Distinct visual density: 130x170 dp cards with release date badge ("NEW", "SEP 28")
 * overlaid on artwork with glass/solid pill.
 */

import React from 'react';
import { View, StyleSheet, ScrollView, Pressable } from 'react-native';
import { space, radius } from '@/design/tokens';
import { OTOText } from '@/design/components/OTOText';
import { OTOArtwork } from '@/design/components/OTOArtwork';
import { NewReleaseItem } from '../types';

export interface NewReleasesSectionProps {
  items: NewReleaseItem[];
  onSelect: (item: NewReleaseItem) => void;
}

export function NewReleasesSection({
  items,
  onSelect,
}: NewReleasesSectionProps): React.JSX.Element | null {
  if (!items || items.length === 0) return null;

  return (
    <View style={styles.container}>
      <View style={styles.sectionHeader}>
        <OTOText variant="title" weight="bold">
          New Releases
        </OTOText>
        <OTOText variant="caption" colorRole="secondary">
          Fresh drops from your favorite artists and labels
        </OTOText>
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {items.map((item) => (
          <Pressable
            key={item.id}
            accessible
            accessibilityRole="button"
            accessibilityLabel={`New release: ${item.title} by ${item.artist}. Released ${item.releaseBadge}.`}
            accessibilityHint="Plays this new release"
            onPress={() => onSelect(item)}
            style={styles.card}
          >
            {/* Artwork with Release Badge Overlay */}
            <View style={styles.artworkWrapper}>
              <OTOArtwork
                uri={item.artworkUrl}
                thumbhash={item.thumbhash}
                size={130}
                borderRadius={radius.md}
                alt={`${item.title} release art`}
              />
              <View style={styles.badgeOverlay}>
                <OTOText variant="meta" weight="bold" colorRole="primary">
                  {item.releaseBadge}
                </OTOText>
              </View>
            </View>

            {/* Title & Artist */}
            <View style={styles.infoContainer}>
              <OTOText variant="caption" weight="semibold" numberOfLines={1}>
                {item.title}
              </OTOText>
              <OTOText variant="meta" colorRole="secondary" numberOfLines={1}>
                {item.artist}
              </OTOText>
            </View>
          </Pressable>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: space[4],
  },
  sectionHeader: {
    paddingHorizontal: space[3],
    marginBottom: space[2],
    gap: 2,
  },
  scrollContent: {
    paddingHorizontal: space[3],
    gap: space[3],
  },
  card: {
    width: 130,
    gap: space[1],
  },
  artworkWrapper: {
    width: 130,
    height: 130,
    borderRadius: radius.md,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 4,
  },
  badgeOverlay: {
    position: 'absolute',
    top: space[1],
    right: space[1],
    backgroundColor: 'rgba(0, 0, 0, 0.72)',
    paddingHorizontal: space[2],
    paddingVertical: 2,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
  },
  infoContainer: {
    gap: 2,
    marginTop: 2,
  },
});
