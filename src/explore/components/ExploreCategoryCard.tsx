/**
 * ExploreCategoryCard — BitChord-matched 2-column Mood/Genre Card.
 *
 * - LinearGradient background with high vibrancy
 * - Tilted album artwork popping out of bottom-right corner
 * - Bold category typography
 * - Haptic feedback on press
 */

import React from 'react';
import { View, StyleSheet, Pressable } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { radius, space } from '@/design/tokens';

import { OTOText } from '@/design/components/OTOText';
import { OTOArtwork } from '@/design/components/OTOArtwork';
import type { ExploreCardItem } from '../data/exploreData';

export interface ExploreCategoryCardProps {
  item: ExploreCardItem;
  onPress: (item: ExploreCardItem) => void;
}

export function ExploreCategoryCard({
  item,
  onPress,
}: ExploreCategoryCardProps): React.JSX.Element {
  const handlePress = () => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onPress(item);
  };

  return (
    <Pressable
      onPress={handlePress}
      accessibilityRole="button"
      accessibilityLabel={`Explore ${item.title}`}
      style={({ pressed }) => [styles.pressable, pressed && styles.pressed]}
    >
      <LinearGradient
        colors={item.gradientColors}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.cardContainer}
      >
        {/* Category Title */}
        <View style={styles.titleContainer}>
          <OTOText variant="body" weight="bold" style={styles.title} numberOfLines={2}>
            {item.title}
          </OTOText>
        </View>

        {/* Tilted Artwork peeking out bottom right */}
        <View style={styles.artworkWrapper}>
          <OTOArtwork
            uri={item.artworkUrl}
            size={64}
            borderRadius={radius.xs}
            style={styles.artwork}
            alt={`${item.title} cover art`}
          />
        </View>
      </LinearGradient>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  pressable: {
    flex: 1,
    minHeight: 96,
    borderRadius: radius.md,
    overflow: 'hidden',
  },
  pressed: {
    opacity: 0.88,
    transform: [{ scale: 0.98 }],
  },
  cardContainer: {
    flex: 1,
    height: 96,
    borderRadius: radius.md,
    padding: space[3],
    position: 'relative',
    overflow: 'hidden',
    justifyContent: 'space-between',
  },
  titleContainer: {
    maxWidth: '65%',
    zIndex: 2,
  },
  title: {
    color: '#FFFFFF',
    fontSize: 15,
    lineHeight: 19,
    letterSpacing: 0.2,
  },
  artworkWrapper: {
    position: 'absolute',
    right: -8,
    bottom: -8,
    transform: [{ rotate: '25deg' }],
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 6,
    elevation: 4,
  },
  artwork: {
    width: 64,
    height: 64,
  },
});
