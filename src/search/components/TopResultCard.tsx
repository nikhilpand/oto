/**
 * TopResultCard — BitChord-matched Horizontal Top Result Card.
 *
 * - Horizontal layout with artwork, title, subtitle & options menu
 * - Two action pills below: [▶ Play] and [≡+ Playlist]
 * - Strict tokens and accessible touch targets
 */

import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import * as Haptics from 'expo-haptics';
import { color, radius, space } from '@/design/tokens';
import { OTOText } from '@/design/components/OTOText';
import { OTOArtwork } from '@/design/components/OTOArtwork';
import { PlayIcon, MoreHorizontalIcon, QueueIcon } from '@/design/components/OTOIcon';
import type { TopResult } from '../types';

interface Props {
  result: TopResult;
  onPress: (result: TopResult) => void;
  onPlayPress?: (result: TopResult) => void;
  onPlaylistPress?: (result: TopResult) => void;
  onOptionsPress?: (result: TopResult) => void;
}

function getResultMeta(result: TopResult): {
  title: string;
  subtitle: string;
  artworkUrl: string;
  badge: string;
} {
  switch (result.kind) {
    case 'track':
      return {
        title: result.track!.title,
        subtitle: result.track!.artist,
        artworkUrl: result.track!.artworkUrl,
        badge: 'Song',
      };
    case 'artist':
      return {
        title: result.artist!.name,
        subtitle: result.artist!.isVerified ? 'Verified Artist' : 'Artist',
        artworkUrl: result.artist!.artworkUrl,
        badge: 'Artist',
      };
    case 'album':
      return {
        title: result.album!.title,
        subtitle: result.album!.artist,
        artworkUrl: result.album!.artworkUrl,
        badge: 'Album',
      };
    case 'playlist':
      return {
        title: result.playlist!.title,
        subtitle: result.playlist!.description,
        artworkUrl: result.playlist!.artworkUrl,
        badge: result.playlist!.curated ? 'Curated' : 'Playlist',
      };
  }
}

export function TopResultCard({
  result,
  onPress,
  onPlayPress,
  onPlaylistPress,
  onOptionsPress,
}: Props): React.JSX.Element {
  const meta = getResultMeta(result);
  const isCircle = result.kind === 'artist';

  const handlePlay = (e: any) => {
    e.stopPropagation?.();
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (onPlayPress) {
      onPlayPress(result);
    } else {
      onPress(result);
    }
  };

  const handlePlaylist = (e: any) => {
    e.stopPropagation?.();
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onPlaylistPress?.(result);
  };

  const handleOptions = (e: any) => {
    e.stopPropagation?.();
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onOptionsPress?.(result);
  };

  return (
    <View style={styles.section}>
      <OTOText variant="track" weight="semibold" style={styles.sectionHeader}>
        Top Result
      </OTOText>

      <Pressable
        style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
        onPress={() => onPress(result)}
        accessibilityRole="button"
        accessibilityLabel={`Top result: ${meta.title} by ${meta.subtitle}`}
      >
        {/* Top Info Row */}
        <View style={styles.infoRow}>
          <OTOArtwork
            uri={meta.artworkUrl}
            size={72}
            borderRadius={isCircle ? 36 : radius.md}
            style={[styles.artwork, isCircle && styles.artworkCircle]}
            alt={meta.title}
          />

          <View style={styles.metaColumn}>
            <OTOText variant="body" weight="bold" numberOfLines={1} style={styles.title}>
              {meta.title}
            </OTOText>
            <OTOText variant="meta" customColor={color.text.secondary} numberOfLines={1}>
              {meta.subtitle} • {meta.badge}
            </OTOText>
          </View>

          <Pressable
            onPress={handleOptions}
            accessibilityRole="button"
            accessibilityLabel="More options"
            style={styles.moreButton}
          >
            <MoreHorizontalIcon size={20} color={color.text.secondary} />
          </Pressable>
        </View>

        {/* Action Pills Row */}
        <View style={styles.actionRow}>
          {/* Play Button Pill */}
          <Pressable
            onPress={handlePlay}
            accessibilityRole="button"
            accessibilityLabel="Play top result"
            style={({ pressed }) => [styles.actionPill, styles.playPill, pressed && styles.pillPressed]}
          >
            <PlayIcon size={16} color="#000000" />
            <OTOText variant="caption" weight="bold" style={styles.playPillText}>
              Play
            </OTOText>
          </Pressable>

          {/* Add to Playlist Pill */}
          <Pressable
            onPress={handlePlaylist}
            accessibilityRole="button"
            accessibilityLabel="Add to playlist"
            style={({ pressed }) => [styles.actionPill, styles.secondaryPill, pressed && styles.pillPressed]}
          >
            <QueueIcon size={16} color={color.text.primary} />
            <OTOText variant="caption" weight="semibold" style={styles.secondaryPillText}>
              Playlist
            </OTOText>
          </Pressable>
        </View>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    paddingHorizontal: space[4],
    marginBottom: space[4],
  },
  sectionHeader: {
    marginBottom: space[2],
  },
  card: {
    backgroundColor: color.bg.s2,
    borderRadius: radius.lg,
    padding: space[3],
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  cardPressed: {
    opacity: 0.92,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space[3],
  },
  artwork: {
    width: 72,
    height: 72,
    borderRadius: radius.md,
    backgroundColor: color.bg.s3,
  },
  artworkCircle: {
    borderRadius: radius.full,
  },
  metaColumn: {
    flex: 1,
    justifyContent: 'center',
  },
  title: {
    fontSize: 16,
    marginBottom: 4,
  },
  moreButton: {
    padding: space[2],
    minWidth: 44,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space[2],
    marginTop: space[3],
  },
  actionPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 7,
    paddingHorizontal: space[3],
    borderRadius: radius.full,
    minHeight: 36,
  },
  pillPressed: {
    opacity: 0.8,
  },
  playPill: {
    backgroundColor: '#FFFFFF',
  },
  playPillText: {
    color: '#000000',
    fontSize: 13,
  },
  secondaryPill: {
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  secondaryPillText: {
    color: color.text.primary,
    fontSize: 13,
  },
});
