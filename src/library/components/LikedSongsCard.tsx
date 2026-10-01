/**
 * LikedSongsCard
 *
 * Pinned hero card for Liked Songs with mosaic artwork,
 * glowing OKLCH gradient accent wash, and one-tap play.
 */

import { Pressable, StyleSheet, View } from 'react-native';
import { color, radius, space } from '@/design/tokens';
import { OTOText } from '@/design/components/OTOText';
import { OTOArtwork } from '@/design/components/OTOArtwork';
import { PlayIcon } from '@/design/components/OTOIcon';
import type { LikedSongsInfo } from '../types';

interface Props {
  info: LikedSongsInfo;
  onPlay: () => void;
}

export function LikedSongsCard({ info, onPlay }: Props) {
  const [a, b, c, d] = info.recentArtworkUrls;

  return (
    <Pressable
      style={({ pressed }) => [styles.card, pressed && styles.pressed]}
      onPress={onPlay}
      accessibilityRole="button"
      accessibilityLabel={`Liked Songs, ${info.count} songs. Tap to play.`}
    >
      {/* Glow wash overlay */}
      <View style={styles.glow} />

      <View style={styles.content}>
        {/* Mosaic artwork */}
        <View style={styles.mosaic}>
          {[a, b, c, d].map((url, i) => (
            <View
              key={i}
              style={[styles.mosaicCell, i === 0 && styles.mosaicTL, i === 1 && styles.mosaicTR, i === 2 && styles.mosaicBL, i === 3 && styles.mosaicBR]}
            >
              {url ? (
                <OTOArtwork uri={url} size={28} style={styles.mosaicImg} />
              ) : (
                <View style={[styles.mosaicImg, { backgroundColor: color.bg.s3 }]} />
              )}
            </View>
          ))}
        </View>

        {/* Meta */}
        <View style={styles.meta}>
          <OTOText variant="headline" weight="bold">Liked Songs</OTOText>
          <OTOText variant="meta" customColor={color.text.secondary}>
            {info.count} songs
          </OTOText>
        </View>

        {/* Play button */}
        <View style={styles.playBtn} accessibilityLabel="Play liked songs">
          <PlayIcon size={16} color={color.bg.base} />
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    marginHorizontal: space[4],
    marginBottom: space[3],
    borderRadius: radius.lg,
    backgroundColor: color.bg.s2,
    borderWidth: 1,
    borderColor: color.hairline,
    borderTopColor: 'rgba(255, 255, 255, 0.12)',
    overflow: 'hidden',
    minHeight: 88,
  },
  pressed: {
    opacity: 0.9,
    transform: [{ scale: 0.99 }],
  },
  glow: {
    ...StyleSheet.absoluteFill,
    backgroundColor: color.accent.signature + '14', // Subtle warm luminous ambient wash
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: space[4],
    gap: space[3],
  },
  mosaic: {
    width: 58,
    height: 58,
    borderRadius: radius.md,
    overflow: 'hidden',
    flexDirection: 'row',
    flexWrap: 'wrap',
    borderWidth: 1,
    borderColor: color.hairline,
  },
  mosaicCell: {
    width: 29,
    height: 29,
  },
  mosaicTL: { borderTopLeftRadius: radius.sm },
  mosaicTR: { borderTopRightRadius: radius.sm },
  mosaicBL: { borderBottomLeftRadius: radius.sm },
  mosaicBR: { borderBottomRightRadius: radius.sm },
  mosaicImg: {
    width: 29,
    height: 29,
  },
  meta: {
    flex: 1,
    gap: 3,
  },
  playBtn: {
    width: 48,
    height: 48,
    borderRadius: radius.full,
    backgroundColor: color.accent.signature,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: color.accent.signature,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 6,
  },
});
