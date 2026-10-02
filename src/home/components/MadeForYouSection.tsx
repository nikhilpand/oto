/**
 * MadeForYouSection — Large Rounded Carousel
 *
 * Distinct visual density: 160x210 dp large rounded vertical cards with square artwork,
 * primary title, descriptive subtitle, and track count badge.
 */

import React, { useCallback } from 'react';
import { View, StyleSheet, ScrollView, Pressable } from 'react-native';
import Animated, {
  FadeInDown,
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from 'react-native-reanimated';
import { color, space, radius, spring, shadow } from '@/design/tokens';
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
        decelerationRate="fast"
        snapToInterval={162}
        snapToAlignment="start"
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
    if (!reducedMotion) scale.value = withSpring(0.96, spring.spatial.fast);
  }, [scale, reducedMotion]);

  const handlePressOut = useCallback(() => {
    if (!reducedMotion) scale.value = withSpring(1, spring.spatial.playful);
  }, [scale, reducedMotion]);

  return (
    <Animated.View
      entering={reducedMotion ? undefined : FadeInDown.delay(index * 60).duration(400).springify()}
      style={[styles.card, cardStyle]}
    >
      <Pressable
        accessible
        accessibilityRole="button"
        accessibilityLabel={`${item.title}, ${item.subtitle}. Contains ${item.trackCount} tracks.`}
        accessibilityHint="Plays this playlist"
        onPress={() => onSelect(item)}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
      >
        <View style={styles.artworkContainer}>
          <OTOArtwork
            uri={item.artworkUrl}
            thumbhash={item.thumbhash}
            size={150}
            borderRadius={radius.md}
            alt={`${item.title} artwork`}
          />
          {/* Gradient scrim for readability */}
          <View style={styles.artworkScrim} />
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
      </Pressable>
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
    paddingRight: space[5],
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
    ...shadow.card,
  },
  artworkScrim: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 60,
    backgroundColor: 'transparent',
    // Simulated gradient via linear gradient overlay effect
  },
  trackCountBadge: {
    position: 'absolute',
    bottom: space[1],
    right: space[1],
    backgroundColor: 'rgba(10, 11, 14, 0.80)',
    paddingHorizontal: space[1] + 2,
    paddingVertical: 3,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: color.hairline,
  },
  trackCountText: {
    fontSize: 9,
    letterSpacing: 0.6,
  },
  infoContainer: {
    gap: 2,
    marginTop: 4,
    paddingHorizontal: 2,
  },
});
