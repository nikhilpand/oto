/**
 * QuickPicksSection — Ultra-Dense Borderless Song Rows
 *
 * Distinct visual density: 2-column or multi-row grid of compact borderless song items
 * for instant one-tap listening.
 */

import React from 'react';
import { View, StyleSheet, Platform, Pressable } from 'react-native';
import Animated, { FadeInLeft, useSharedValue, useAnimatedStyle, withSpring } from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { color, space, radius, touchTarget, spring } from '@/design/tokens';
import { useReducedMotion } from '@/design/hooks/useReducedMotion';
import { OTOText } from '@/design/components/OTOText';
import { OTOArtwork } from '@/design/components/OTOArtwork';
import { PlayIcon } from '@/design/components/OTOIcon';
import { Track } from '@/domain/types';

export interface QuickPicksSectionProps {
  tracks: Track[];
  onPlayTrack: (track: Track) => void;
}

export function QuickPicksSection({
  tracks,
  onPlayTrack,
}: QuickPicksSectionProps): React.JSX.Element | null {
  if (!tracks || tracks.length === 0) return null;

  const minTouch = Platform.select({
    ios: touchTarget.ios,
    default: touchTarget.android,
  });

  return (
    <View style={styles.container}>
      <View style={styles.sectionHeader}>
        <OTOText variant="title" weight="bold" accessibilityRole="header">
          Quick Picks
        </OTOText>
        <OTOText variant="caption" colorRole="secondary">
          Start a session based on your recent rotation
        </OTOText>
      </View>

      <View style={styles.listContainer}>
        {tracks.map((track, idx) => (
          <QuickPickRow
            key={track.id}
            track={track}
            index={idx}
            minHeight={minTouch}
            onPlayTrack={onPlayTrack}
          />
        ))}
      </View>
    </View>
  );
}

function QuickPickRow({
  track,
  index,
  minHeight,
  onPlayTrack,
}: {
  track: Track;
  index: number;
  minHeight: number;
  onPlayTrack: (track: Track) => void;
}): React.JSX.Element {
  const reducedMotion = useReducedMotion();
  const scale = useSharedValue(1);
  const rowStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  return (
    <Animated.View
      entering={reducedMotion ? undefined : FadeInLeft.delay(index * 40).duration(350).springify()}
      style={rowStyle}
    >
      <Pressable
        accessible
        accessibilityRole="button"
        accessibilityLabel={`Play ${track.title} by ${track.artist}`}
        accessibilityHint="Starts playback of this track"
        onPress={() => { void Haptics.selectionAsync(); onPlayTrack(track); }}
        onPressIn={() => { if (!reducedMotion) scale.value = withSpring(0.97, spring.spatial.fast); }}
        onPressOut={() => { if (!reducedMotion) scale.value = withSpring(1, spring.spatial.fast); }}
        style={[styles.row, { minHeight }]}
      >
        <View style={styles.rankContainer}>
          <OTOText variant="meta" weight="bold" colorRole="tertiary">{index + 1}</OTOText>
        </View>
        <View style={styles.artworkContainer}>
          <OTOArtwork
            uri={track.artworkUrl}
            thumbhash={track.thumbhash}
            size={46}
            borderRadius={radius.xs}
            alt={`${track.title} artwork`}
          />
        </View>
        <View style={styles.metaContainer}>
          <OTOText variant="caption" weight="semibold" numberOfLines={1}>{track.title}</OTOText>
          <View style={styles.artistRow}>
            {track.isExplicit && (
              <View style={styles.explicitBadge}>
                <OTOText variant="meta" weight="bold" colorRole="secondary">E</OTOText>
              </View>
            )}
            <OTOText variant="meta" colorRole="secondary" numberOfLines={1}>{track.artist}</OTOText>
          </View>
        </View>
        <View style={styles.playButton}>
          <PlayIcon size={11} color={color.text.secondary} focused />
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
  listContainer: {
    paddingHorizontal: space[3],
    gap: space[1],
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: space[1],
    paddingHorizontal: space[2],
    borderRadius: radius.md,
    gap: space[2],
  },
  rowPressed: {
    backgroundColor: color.bg.s2,
    opacity: 0.9,
  },
  rankContainer: {
    width: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  artworkContainer: {
    width: 46,
    height: 46,
    borderRadius: radius.xs,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 2,
  },
  metaContainer: {
    flex: 1,
    justifyContent: 'center',
    gap: 2,
  },
  artistRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space[1],
  },
  explicitBadge: {
    backgroundColor: color.bg.s3,
    paddingHorizontal: 4,
    borderRadius: 2,
  },
  playButton: {
    width: 32,
    height: 32,
    borderRadius: radius.full,
    backgroundColor: color.bg.s2,
    borderWidth: 1,
    borderColor: color.hairline,
    borderTopColor: color.glass.highlight,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 2,
  },
});
