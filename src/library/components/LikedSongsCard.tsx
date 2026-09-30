/**
 * LikedSongsCard
 *
 * Pinned hero card for Liked Songs with mosaic artwork,
 * glowing OKLCH gradient accent wash, and one-tap play.
 */

import { Image, Pressable, StyleSheet, View } from 'react-native';
import { color, radius, space } from '@/design/tokens';
import { OTOText } from '@/design/components/OTOText';
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
                <Image source={{ uri: url }} style={styles.mosaicImg} accessibilityLabel="" />
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
          <OTOText variant="body" customColor={color.bg.base} weight="bold">▶</OTOText>
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
    backgroundColor: color.accent.signature + '33',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: color.accent.signature + '66',
    overflow: 'hidden',
    minHeight: 80,
  },
  pressed: { opacity: 0.85 },
  glow: {
    ...StyleSheet.absoluteFill,
    backgroundColor: color.accent.signature + '11',
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: space[4],
    gap: space[4],
  },
  mosaic: {
    width: 56,
    height: 56,
    borderRadius: radius.sm,
    overflow: 'hidden',
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  mosaicCell: {
    width: 28,
    height: 28,
  },
  mosaicTL: { borderTopLeftRadius: radius.sm },
  mosaicTR: { borderTopRightRadius: radius.sm },
  mosaicBL: { borderBottomLeftRadius: radius.sm },
  mosaicBR: { borderBottomRightRadius: radius.sm },
  mosaicImg: {
    width: 28,
    height: 28,
  },
  meta: { flex: 1 },
  playBtn: {
    width: 44,
    height: 44,
    borderRadius: radius.full,
    backgroundColor: color.accent.signature,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
