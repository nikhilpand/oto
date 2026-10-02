/**
 * MadeForYouSection — Large Rounded Carousel
 *
 * Distinct visual density: 160x210 dp large rounded vertical cards with square artwork,
 * primary title, descriptive subtitle, and track count badge.
 */

import React, { useCallback } from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import Animated, { FadeInDown, useSharedValue, useAnimatedStyle, withSpring } from 'react-native-reanimated';
import { space, radius, spring } from '@/design/tokens';
import { useReducedMotion } from '@/design/hooks/useReducedMotion';
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
        <OTOText variant="title" weight="bold" accessibilityRole="header">
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
        {items.map((item, idx) => (
          <MadeForYouCard key={item.id} item={item} index={idx} onSelect={onSelect} />
        ))}
      </ScrollView>
    </View>
  );
}

function MadeForYouCard({
  item,
  index,
  onSelect,
}: {
  item: MadeForYouItem;
  index: number;
  onSelect: (item: MadeForYouItem) => void;
}): React.JSX.Element {
  const reducedMotion = useReducedMotion();
  const scale = useSharedValue(1);

  const cardStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePressIn = useCallback(() => {
    if (!reducedMotion) scale.value = withSpring(0.97, spring.spatial.fast);
  }, [scale, reducedMotion]);

  const handlePressOut = useCallback(() => {
    if (!reducedMotion) scale.value = withSpring(1, spring.spatial.fast);
  }, [scale, reducedMotion]);

  return (
    <Animated.View
      entering={reducedMotion ? undefined : FadeInDown.delay(index * 60).duration(400).springify()}
      style={[styles.card, cardStyle]}
    >
      <Animated.View
        accessible
        accessibilityRole="button"
        accessibilityLabel={`${item.title}, ${item.subtitle}. Contains ${item.trackCount} tracks.`}
        accessibilityHint="Plays this playlist"
        onTouchStart={handlePressIn}
        onTouchEnd={() => { handlePressOut(); onSelect(item); }}
        onTouchCancel={handlePressOut}
      >
        <View style={styles.artworkContainer}>
          <OTOArtwork
            uri={item.artworkUrl}
            thumbhash={item.thumbhash}
            size={150}
            borderRadius={radius.md}
            alt={`${item.title} artwork`}
          />
          <View style={styles.trackCountBadge}>
            <OTOText variant="meta" weight="bold" colorRole="primary" style={styles.trackCountText}>
              {item.trackCount} TRACKS
            </OTOText>
          </View>
        </View>
        <View style={styles.infoContainer}>
          <OTOText variant="caption" weight="bold" numberOfLines={1}>
            {item.title}
          </OTOText>
          <OTOText variant="meta" colorRole="secondary" numberOfLines={2}>
            {item.subtitle}
          </OTOText>
        </View>
      </Animated.View>
    </Animated.View>
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
    width: 150,
    height: 150,
    borderRadius: radius.md,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 5,
  },
  trackCountBadge: {
    position: 'absolute',
    bottom: space[1],
    right: space[1],
    backgroundColor: 'rgba(10, 11, 14, 0.75)',
    paddingHorizontal: space[1] + 2,
    paddingVertical: 2,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.14)',
  },
  trackCountText: {
    fontSize: 9,
    letterSpacing: 0.6,
  },
  infoContainer: {
    gap: 2,
    marginTop: 2,
  },
});
