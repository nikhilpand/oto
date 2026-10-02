/**
 * ContinueListeningSection — Compact Horizontal List with Progress Indicators
 *
 * Distinct visual density: 220x72 dp wide horizontal pills featuring track thumbnail,
 * title, artist, and resume progress bar.
 */

import React, { useCallback } from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import Animated, { FadeInRight, useSharedValue, useAnimatedStyle, withSpring } from 'react-native-reanimated';
import { Pressable } from 'react-native';
import { color, space, radius, spring } from '@/design/tokens';
import { useReducedMotion } from '@/design/hooks/useReducedMotion';
import { OTOText } from '@/design/components/OTOText';
import { OTOArtwork } from '@/design/components/OTOArtwork';
import { PlayIcon } from '@/design/components/OTOIcon';
import { ContinueListeningItem } from '../types';

export interface ContinueListeningSectionProps {
  items: ContinueListeningItem[];
  onResume: (item: ContinueListeningItem) => void;
}

export function ContinueListeningSection({
  items,
  onResume,
}: ContinueListeningSectionProps): React.JSX.Element | null {
  if (!items || items.length === 0) return null;

  return (
    <View style={styles.container}>
      <View style={styles.sectionHeader}>
        <OTOText variant="title" weight="bold" accessibilityRole="header">
          Continue Listening
        </OTOText>
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {items.map((item, idx) => (
          <ContinueListeningCard key={item.track.id} item={item} index={idx} onResume={onResume} />
        ))}
      </ScrollView>
    </View>
  );
}

function ContinueListeningCard({
  item,
  index,
  onResume,
}: {
  item: ContinueListeningItem;
  index: number;
  onResume: (item: ContinueListeningItem) => void;
}): React.JSX.Element {
  const reducedMotion = useReducedMotion();
  const scale = useSharedValue(1);
  const cardStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  const handlePressIn = useCallback(() => {
    if (!reducedMotion) scale.value = withSpring(0.97, spring.spatial.fast);
  }, [scale, reducedMotion]);

  const handlePressOut = useCallback(() => {
    if (!reducedMotion) scale.value = withSpring(1, spring.spatial.fast);
  }, [scale, reducedMotion]);

  return (
    <Animated.View
      entering={reducedMotion ? undefined : FadeInRight.delay(index * 60).duration(380).springify()}
      style={cardStyle}
    >
      <Pressable
        accessible
        accessibilityRole="button"
        accessibilityLabel={`Resume ${item.track.title} by ${item.track.artist}. ${item.progressPercent}% completed.`}
        accessibilityHint="Resumes playback of this track"
        onPress={() => onResume(item)}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        style={styles.card}
      >
        <View style={styles.artworkContainer}>
          <OTOArtwork
            uri={item.track.artworkUrl}
            thumbhash={item.track.thumbhash}
            size={54}
            borderRadius={radius.sm}
            alt={`${item.track.title} thumbnail`}
          />
        </View>
        <View style={styles.metaContainer}>
          <OTOText variant="caption" weight="semibold" numberOfLines={1}>{item.track.title}</OTOText>
          <OTOText variant="meta" colorRole="secondary" numberOfLines={1}>{item.track.artist}</OTOText>
          <View style={styles.progressTrack}>
            <View
              style={[
                styles.progressFill,
                { width: `${Math.max(5, Math.min(100, item.progressPercent))}%` },
              ]}
            />
          </View>
        </View>
        <View style={styles.playButtonWrapper}>
          <PlayIcon size={11} color={color.text.primary} focused />
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
  },
  scrollContent: {
    paddingHorizontal: space[3],
    gap: space[2],
  },
  card: {
    width: 236,
    height: 74,
    backgroundColor: color.bg.s2,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: color.hairline,
    borderTopColor: color.glass.highlight,
    flexDirection: 'row',
    alignItems: 'center',
    padding: space[2],
    gap: space[2],
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 3,
  },
  cardPressed: {
    opacity: 0.88,
    transform: [{ scale: 0.985 }],
  },
  artworkContainer: {
    width: 54,
    height: 54,
    borderRadius: radius.sm,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 2,
  },
  metaContainer: {
    flex: 1,
    justifyContent: 'center',
    gap: 3,
  },
  progressTrack: {
    height: 3,
    backgroundColor: color.bg.s3,
    borderRadius: radius.full,
    overflow: 'hidden',
    marginTop: 4,
  },
  progressFill: {
    height: '100%',
    backgroundColor: color.accent.signature,
    borderRadius: radius.full,
  },
  playButtonWrapper: {
    width: 28,
    height: 28,
    borderRadius: radius.full,
    backgroundColor: color.bg.s3,
    borderWidth: 1,
    borderColor: color.hairline,
    borderTopColor: color.glass.highlight,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 2,
  },
});
