/**
 * QuickPicksSection — Ultra-Dense Borderless Song Rows
 *
 * Distinct visual density: 2-column or multi-row grid of compact borderless song items
 * for instant one-tap listening.
 */

import React from 'react';
import { View, StyleSheet, Pressable, Platform } from 'react-native';
import { color, space, radius, touchTarget } from '@/design/tokens';
import { OTOText } from '@/design/components/OTOText';
import { OTOArtwork } from '@/design/components/OTOArtwork';
import { Track } from '@/domain/types';

export interface QuickPicksSectionProps {
  tracks: Track[];
  onPlayTrack: (track: Track) => void;
}

function MiniPlayIcon() {
  return (
    <View
      style={{
        width: 0,
        height: 0,
        borderLeftWidth: 8,
        borderTopWidth: 5,
        borderBottomWidth: 5,
        borderLeftColor: color.text.secondary,
        borderTopColor: 'transparent',
        borderBottomColor: 'transparent',
        marginLeft: 2,
      }}
    />
  );
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
        <OTOText variant="title" weight="bold">
          Quick Picks
        </OTOText>
        <OTOText variant="caption" colorRole="secondary">
          Start a session based on your recent rotation
        </OTOText>
      </View>

      <View style={styles.listContainer}>
        {tracks.map((track, idx) => (
          <Pressable
            key={track.id}
            accessible
            accessibilityRole="button"
            accessibilityLabel={`Play ${track.title} by ${track.artist}`}
            onPress={() => onPlayTrack(track)}
            style={[styles.row, { minHeight: minTouch }]}
          >
            {/* Rank index */}
            <View style={styles.rankContainer}>
              <OTOText variant="meta" weight="bold" colorRole="tertiary">
                {idx + 1}
              </OTOText>
            </View>

            {/* 46x46 Artwork Thumbnail */}
            <View style={styles.artworkContainer}>
              <OTOArtwork
                uri={track.artworkUrl}
                thumbhash={track.thumbhash}
                size={46}
                borderRadius={radius.xs}
                alt={`${track.title} artwork`}
              />
            </View>

            {/* Title & Artist */}
            <View style={styles.metaContainer}>
              <OTOText variant="caption" weight="semibold" numberOfLines={1}>
                {track.title}
              </OTOText>
              <View style={styles.artistRow}>
                {track.isExplicit && (
                  <View style={styles.explicitBadge}>
                    <OTOText variant="meta" weight="bold" colorRole="secondary">
                      E
                    </OTOText>
                  </View>
                )}
                <OTOText variant="meta" colorRole="secondary" numberOfLines={1}>
                  {track.artist}
                </OTOText>
              </View>
            </View>

            {/* Play trigger indicator */}
            <View style={styles.playButton}>
              <MiniPlayIcon />
            </View>
          </Pressable>
        ))}
      </View>
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
    alignItems: 'center',
    justifyContent: 'center',
  },
});
