/**
 * MadeForYouSection — Large Rounded Carousel
 *
 * Distinct visual density: 160x210 dp large rounded vertical cards with square artwork,
 * primary title, descriptive subtitle, and track count badge.
 */

import React from 'react';
import { View, StyleSheet, ScrollView, Pressable } from 'react-native';
import { space, radius } from '@/design/tokens';
import { OTOText } from '@/design/components/OTOText';
import { OTOArtwork } from '@/design/components/OTOArtwork';
import { MadeForYouItem } from '../types';

export interface MadeForYouSectionProps {
  items: MadeForYouItem[];
  onSelect: (item: MadeForYouItem) => void;
}

export function MadeForYouSection({
  items,
  onSelect,
}: MadeForYouSectionProps): React.JSX.Element | null {
  if (!items || items.length === 0) return null;

  return (
    <View style={styles.container}>
      <View style={styles.sectionHeader}>
        <OTOText variant="title" weight="bold">
          Made For You
        </OTOText>
        <OTOText variant="caption" colorRole="secondary">
          Personalized daily mixes and mood playlists
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
            accessibilityLabel={`${item.title}, ${item.subtitle}. Contains ${item.trackCount} tracks.`}
            accessibilityHint="Plays this playlist"
            onPress={() => onSelect(item)}
            style={styles.card}
          >
            {/* 150x150 Artwork with rounded corners */}
            <View style={styles.artworkContainer}>
              <OTOArtwork
                uri={item.artworkUrl}
                thumbhash={item.thumbhash}
                size={148}
                borderRadius={radius.md}
                alt={`${item.title} artwork`}
              />
            </View>

            {/* Title & Subtitle */}
            <View style={styles.infoContainer}>
              <OTOText variant="caption" weight="bold" numberOfLines={1}>
                {item.title}
              </OTOText>
              <OTOText variant="meta" colorRole="secondary" numberOfLines={2}>
                {item.subtitle}
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
    width: 150,
    gap: space[1],
  },
  artworkContainer: {
    width: 148,
    height: 148,
    borderRadius: radius.md,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  infoContainer: {
    gap: 2,
    marginTop: 2,
  },
});
