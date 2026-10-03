/**
 * NewReleasesSection — Horizontal Scroller with Release Date Badges
 *
 * Spring-animated press cards. Each card scales to 0.93 on press with
 * a snappy spring rebound. Release date badge floats top-right.
 */

import React from 'react';
import { View, StyleSheet, ScrollView , Pressable } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from 'react-native-reanimated';
import { color, space, radius } from '@/design/tokens';
import { OTOText } from '@/design/components/OTOText';
import { OTOArtwork } from '@/design/components/OTOArtwork';
import { NewReleaseItem } from '../types';

const SPRING = { damping: 18, stiffness: 260, mass: 0.8 };

function NewReleaseCard({
  item,
  onSelect,
}: {
  item: NewReleaseItem;
  onSelect: (item: NewReleaseItem) => void;
}) {
  const scale = useSharedValue(1);

  const animStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <Pressable
      accessible
      accessibilityRole="button"
      accessibilityLabel={`New release: ${item.title} by ${item.artist}. Released ${item.releaseBadge}.`}
      accessibilityHint="Plays this new release"
      onPressIn={() => { scale.value = withSpring(0.93, SPRING); }}
      onPressOut={() => { scale.value = withSpring(1, SPRING); }}
      onPress={() => onSelect(item)}
    >
      <Animated.View style={[styles.card, animStyle]}>
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
      </Animated.View>
    </Pressable>
  );
}

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
        decelerationRate="fast"
        snapToInterval={130 + 12}
        snapToAlignment="start"
      >
        {items.map((item) => (
          <NewReleaseCard key={item.id} item={item} onSelect={onSelect} />
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
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  badgeOverlay: {
    position: 'absolute',
    top: space[1],
    right: space[1],
    backgroundColor: 'rgba(0, 0, 0, 0.76)',
    paddingHorizontal: space[2],
    paddingVertical: 2,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: color.glass.highlight,
  },
  infoContainer: {
    gap: 2,
    marginTop: 2,
  },
});
