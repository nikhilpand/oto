/**
 * HeroSection — Artwork-Led Atmospheric Album Feature
 *
 * Implements the expansive hero card with palette-tinted ambient glow wash,
 * editorial badge, album title, artist, and primary "Listen Now" action.
 */

import React from 'react';
import { View, StyleSheet, Pressable } from 'react-native';
import { color, space, radius } from '@/design/tokens';
import { OTOText } from '@/design/components/OTOText';
import { OTOButton } from '@/design/components/OTOButton';
import { OTOArtwork } from '@/design/components/OTOArtwork';
import { usePalette } from '@/design/context/PaletteContext';
import { Track } from '@/domain/types';

export interface HeroSectionProps {
  track: Track;
  onPlay: (track: Track) => void;
  onPressCard?: (track: Track) => void;
}

function PlayArrowIcon({ color: iconColor = color.bg.base }: { color?: string }) {
  return (
    <View
      style={{
        width: 0,
        height: 0,
        borderLeftWidth: 12,
        borderTopWidth: 7,
        borderBottomWidth: 7,
        borderLeftColor: iconColor,
        borderTopColor: 'transparent',
        borderBottomColor: 'transparent',
        marginLeft: 2,
      }}
    />
  );
}

export function HeroSection({
  track,
  onPlay,
  onPressCard,
}: HeroSectionProps): React.JSX.Element {
  const { activePalette } = usePalette();
  const accentColor = activePalette.dominant || color.accent.signature;

  return (
    <View style={styles.container}>
      <Pressable
        accessible
        accessibilityRole="button"
        accessibilityLabel={`Featured album: ${track.album ?? track.title} by ${track.artist}. Double tap to view details.`}
        onPress={() => onPressCard?.(track)}
        style={styles.card}
      >
        {/* Background Atmospheric Glow Wash */}
        <View
          style={[
            styles.glowWash,
            {
              backgroundColor: accentColor,
            },
          ]}
        />

        {/* Content Layout */}
        <View style={styles.content}>
          {/* Hero Artwork */}
          <View style={styles.artworkContainer}>
            <OTOArtwork
              uri={track.artworkUrl}
              thumbhash={track.thumbhash}
              size={140}
              borderRadius={radius.md}
              alt={`${track.title} cover art`}
            />
          </View>

          {/* Editorial Info */}
          <View style={styles.infoContainer}>
            <View style={[styles.badge, { borderColor: accentColor }]}>
              <OTOText variant="meta" weight="bold" colorRole="accent">
                FEATURED RELEASE
              </OTOText>
            </View>

            <OTOText variant="title" weight="bold" numberOfLines={2}>
              {track.album ?? track.title}
            </OTOText>

            <OTOText variant="body" colorRole="secondary" numberOfLines={1}>
              {track.artist}
            </OTOText>

            {/* Listen Now Action */}
            <View style={styles.buttonWrapper}>
              <OTOButton
                variant="primary"
                size="md"
                label="Listen Now"
                icon={<PlayArrowIcon />}
                onPress={() => onPlay(track)}
                accessibilityLabel={`Listen now to ${track.title} by ${track.artist}`}
              />
            </View>
          </View>
        </View>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: space[3],
    marginBottom: space[4],
  },
  card: {
    backgroundColor: color.bg.s2,
    borderRadius: radius.xl,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: color.hairline,
    minHeight: 180,
  },
  glowWash: {
    ...StyleSheet.absoluteFill,
    opacity: 0.12,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: space[3],
    gap: space[3],
  },
  artworkContainer: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 8,
  },
  infoContainer: {
    flex: 1,
    gap: space[1],
    justifyContent: 'center',
  },
  badge: {
    alignSelf: 'flex-start',
    paddingHorizontal: space[2],
    paddingVertical: 2,
    borderRadius: radius.full,
    borderWidth: 1,
    marginBottom: 2,
  },
  buttonWrapper: {
    marginTop: space[1],
    alignSelf: 'flex-start',
  },
});
