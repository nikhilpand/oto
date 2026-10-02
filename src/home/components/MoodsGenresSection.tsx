/**
 * MoodsGenresSection — Typographic Cards with Curated Color Palettes
 *
 * 2-row horizontal scroller of typographic capsule cards with spring
 * press physics. Each card pops the accent as a subtle background wash.
 */

import React from 'react';
import { View, StyleSheet, ScrollView, Pressable } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from 'react-native-reanimated';
import { space, radius } from '@/design/tokens';
import { OTOText } from '@/design/components/OTOText';
import { MoodGenreItem } from '../types';

const SPRING = { damping: 16, stiffness: 280, mass: 0.75 };

function MoodCard({
  item,
  onSelect,
}: {
  item: MoodGenreItem;
  onSelect: (item: MoodGenreItem) => void;
}) {
  const scale = useSharedValue(1);

  const animStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <Pressable
      accessible
      accessibilityRole="button"
      accessibilityLabel={`Mood and Genre: ${item.title}. ${item.description}. ${item.trackCount} tracks available.`}
      accessibilityHint="Explores tracks in this genre"
      onPressIn={() => { scale.value = withSpring(0.92, SPRING); }}
      onPressOut={() => { scale.value = withSpring(1, SPRING); }}
      onPress={() => onSelect(item)}
    >
      <Animated.View
        style={[
          styles.card,
          {
            backgroundColor: item.gradientColors[0],
            borderColor: item.accentColor + '44',
          },
          animStyle,
        ]}
      >
        {/* Accent dot indicator */}
        <View style={[styles.accentDot, { backgroundColor: item.accentColor }]} />

        <View style={styles.cardContent}>
          <OTOText variant="caption" weight="bold" numberOfLines={1}>
            {item.title}
          </OTOText>
          <OTOText variant="meta" colorRole="secondary" numberOfLines={1}>
            {item.trackCount} tracks
          </OTOText>
        </View>
      </Animated.View>
    </Pressable>
  );
}

export interface MoodsGenresSectionProps {
  items: MoodGenreItem[];
  onSelect: (item: MoodGenreItem) => void;
}

export function MoodsGenresSection({
  items,
  onSelect,
}: MoodsGenresSectionProps): React.JSX.Element | null {
  if (!items || items.length === 0) return null;

  const mid = Math.ceil(items.length / 2);
  const row1 = items.slice(0, mid);
  const row2 = items.slice(mid);

  return (
    <View style={styles.container}>
      <View style={styles.sectionHeader}>
        <OTOText variant="title" weight="bold">
          Moods &amp; Genres
        </OTOText>
        <OTOText variant="caption" colorRole="secondary">
          Explore by sound textures and sonic frequencies
        </OTOText>
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        decelerationRate="fast"
      >
        <View style={styles.gridColumn}>
          <View style={styles.rowWrapper}>
            {row1.map((item) => (
              <MoodCard key={item.id} item={item} onSelect={onSelect} />
            ))}
          </View>
          <View style={styles.rowWrapper}>
            {row2.map((item) => (
              <MoodCard key={item.id} item={item} onSelect={onSelect} />
            ))}
          </View>
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
    height: 60,
    borderRadius: radius.md,
    borderWidth: 1,
    paddingHorizontal: space[2],
    paddingVertical: space[1],
    justifyContent: 'center',
    overflow: 'hidden',
  },
  accentDot: {
    position: 'absolute',
    top: 7,
    right: 9,
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  cardContent: {
    gap: 2,
  },
});
