/**
 * LibraryItemRow
 *
 * Compact list view item for a library entry (playlist, album, artist).
 * Meets 64dp minimum row height and includes DownloadStatusBadge.
 */

import { Image, Pressable, StyleSheet, View } from 'react-native';
import { color, radius, space } from '@/design/tokens';
import { OTOText } from '@/design/components/OTOText';
import { DownloadStatusBadge } from './DownloadStatusBadge';
import type { LibraryItem } from '../types';

interface Props {
  item: LibraryItem;
  onPress: (item: LibraryItem) => void;
}

export function LibraryItemRow({ item, onPress }: Props) {
  const isCircle = item.kind === 'artist';

  return (
    <Pressable
      style={({ pressed }) => [styles.row, pressed && styles.pressed]}
      onPress={() => onPress(item)}
      accessibilityRole="button"
      accessibilityLabel={`${item.title}, ${item.subtitle}`}
    >
      <Image
        source={{ uri: item.artworkUrl }}
        style={[styles.artwork, isCircle && styles.artworkCircle]}
        accessibilityLabel={item.title}
      />
      <View style={styles.meta}>
        <OTOText variant="body" weight="semibold" numberOfLines={1}>{item.title}</OTOText>
        <View style={styles.subtitleRow}>
          <OTOText variant="meta" customColor={color.text.secondary} numberOfLines={1}>
            {item.subtitle}
          </OTOText>
          <DownloadStatusBadge state={item.download} />
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: space[4],
    paddingVertical: space[3],
    minHeight: 64,
  },
  pressed: { opacity: 0.75 },
  artwork: {
    width: 52,
    height: 52,
    borderRadius: radius.sm,
    backgroundColor: color.bg.s3,
    marginRight: space[3],
  },
  artworkCircle: {
    borderRadius: radius.full,
  },
  meta: { flex: 1 },
  subtitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space[2],
    marginTop: 2,
    flexWrap: 'wrap',
  },
});
