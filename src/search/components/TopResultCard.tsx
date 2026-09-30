/**
 * TopResultCard
 *
 * High-impact hero card for the top search result.
 * Handles track, artist, album, and playlist variants.
 */

import { Image, Pressable, StyleSheet, View } from 'react-native';
import { color, radius, space } from '@/design/tokens';
import { OTOText } from '@/design/components/OTOText';
import type { TopResult } from '../types';

interface Props {
  result: TopResult;
  onPress: (result: TopResult) => void;
}

function getResultMeta(result: TopResult): { title: string; subtitle: string; artworkUrl: string; badge: string } {
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
        badge: result.playlist!.curated ? 'Curated Playlist' : 'Playlist',
      };
  }
}

export function TopResultCard({ result, onPress }: Props) {
  const meta = getResultMeta(result);
  const isCircle = result.kind === 'artist';

  return (
    <View style={styles.section}>
      <OTOText variant="track" weight="semibold" style={styles.label}>Top Result</OTOText>
      <Pressable
        style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
        onPress={() => onPress(result)}
        accessibilityRole="button"
        accessibilityLabel={`Top result: ${meta.title} · ${meta.subtitle}`}
      >
        <Image
          source={{ uri: meta.artworkUrl }}
          style={[styles.artwork, isCircle && styles.artworkCircle]}
          accessibilityLabel={meta.title}
        />
        <View style={styles.badge}>
          <OTOText variant="caption" customColor={color.text.tertiary}>{meta.badge}</OTOText>
        </View>
        <OTOText variant="headline" weight="bold" numberOfLines={2} style={styles.title}>
          {meta.title}
        </OTOText>
        <OTOText variant="artist" customColor={color.text.secondary} numberOfLines={1}>
          {meta.subtitle}
        </OTOText>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    paddingHorizontal: space[4],
    marginBottom: space[5],
  },
  label: {
    marginBottom: space[3],
  },
  card: {
    backgroundColor: color.bg.s2,
    borderRadius: radius.lg,
    padding: space[4],
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: color.hairline,
    minHeight: 44,
  },
  cardPressed: {
    opacity: 0.8,
  },
  artwork: {
    width: 96,
    height: 96,
    borderRadius: radius.md,
    marginBottom: space[3],
    backgroundColor: color.bg.s3,
  },
  artworkCircle: {
    borderRadius: radius.full,
  },
  badge: {
    backgroundColor: color.bg.s3,
    borderRadius: radius.full,
    paddingHorizontal: space[2],
    paddingVertical: 3,
    alignSelf: 'flex-start',
    marginBottom: space[2],
  },
  title: {
    marginBottom: space[1],
  },
});
