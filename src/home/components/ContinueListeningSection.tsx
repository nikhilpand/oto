/**
 * ContinueListeningSection — Compact Horizontal List with Progress Indicators
 *
 * Distinct visual density: 220x72 dp wide horizontal pills featuring track thumbnail,
 * title, artist, and resume progress bar.
 */

import React from 'react';
import { View, StyleSheet, ScrollView, Pressable } from 'react-native';
import { color, space, radius } from '@/design/tokens';
import { OTOText } from '@/design/components/OTOText';
import { OTOArtwork } from '@/design/components/OTOArtwork';
import { ContinueListeningItem } from '../types';

export interface ContinueListeningSectionProps {
  items: ContinueListeningItem[];
  onResume: (item: ContinueListeningItem) => void;
}

function PlaySmallIcon() {
  return (
    <View
      style={{
        width: 0,
        height: 0,
        borderLeftWidth: 8,
        borderTopWidth: 5,
        borderBottomWidth: 5,
        borderLeftColor: color.text.primary,
        borderTopColor: 'transparent',
        borderBottomColor: 'transparent',
        marginLeft: 2,
      }}
    />
  );
}

export function ContinueListeningSection({
  items,
  onResume,
}: ContinueListeningSectionProps): React.JSX.Element | null {
  if (!items || items.length === 0) return null;

  return (
    <View style={styles.container}>
      <View style={styles.sectionHeader}>
        <OTOText variant="title" weight="bold">
          Continue Listening
        </OTOText>
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {items.map((item) => (
          <Pressable
            key={item.track.id}
            accessible
            accessibilityRole="button"
            accessibilityLabel={`Resume ${item.track.title} by ${item.track.artist}. ${item.progressPercent}% completed.`}
            accessibilityHint="Resumes playback of this track"
            onPress={() => onResume(item)}
            style={styles.card}
          >
            {/* 52x52 Artwork Thumbnail */}
            <View style={styles.artworkContainer}>
              <OTOArtwork
                uri={item.track.artworkUrl}
                thumbhash={item.track.thumbhash}
                size={52}
                borderRadius={radius.sm}
                alt={`${item.track.title} thumbnail`}
              />
            </View>

            {/* Title & Artist */}
            <View style={styles.metaContainer}>
              <OTOText variant="caption" weight="semibold" numberOfLines={1}>
                {item.track.title}
              </OTOText>
              <OTOText variant="meta" colorRole="secondary" numberOfLines={1}>
                {item.track.artist}
              </OTOText>

              {/* Progress Indicator Track */}
              <View style={styles.progressTrack}>
                <View
                  style={[
                    styles.progressFill,
                    { width: `${Math.max(5, Math.min(100, item.progressPercent))}%` },
                  ]}
                />
              </View>
            </View>

            {/* Quick Play Arrow Indicator */}
            <View style={styles.playIconWrapper}>
              <PlaySmallIcon />
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
  },
  scrollContent: {
    paddingHorizontal: space[3],
    gap: space[2],
  },
  card: {
    width: 230,
    height: 70,
    backgroundColor: color.bg.s2,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: color.hairline,
    flexDirection: 'row',
    alignItems: 'center',
    padding: space[2],
    gap: space[2],
  },
  artworkContainer: {
    width: 52,
    height: 52,
    borderRadius: radius.sm,
    overflow: 'hidden',
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
    marginTop: 2,
  },
  progressFill: {
    height: '100%',
    backgroundColor: color.accent.signature,
    borderRadius: radius.full,
  },
  playIconWrapper: {
    width: 24,
    height: 24,
    borderRadius: radius.full,
    backgroundColor: color.bg.s3,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
