/**
 * LibraryItemCard
 *
 * 2-column grid view card for a library entry.
 * Meets 44pt/48dp touch targets for all interactive areas.
 */

import { Image, Pressable, StyleSheet, View } from 'react-native';
import { color, radius, space } from '@/design/tokens';
import { OTOText } from '@/design/components/OTOText';
import { DownloadStatusBadge } from './DownloadStatusBadge';
import type { LibraryItem } from '../types';

interface Props {
  item: LibraryItem;
  onPress: (item: LibraryItem) => void;
  columnWidth: number;
}

export function LibraryItemCard({ item, onPress, columnWidth }: Props) {
  const isCircle = item.kind === 'artist';
  const artSize = columnWidth - space[4] * 2;

  return (
    <Pressable
      style={({ pressed }) => [styles.card, { width: columnWidth }, pressed && styles.pressed]}
      onPress={() => onPress(item)}
      accessibilityRole="button"
      accessibilityLabel={`${item.title}, ${item.subtitle}`}
    >
      <Image
        source={{ uri: item.artworkUrl }}
        style={[
          styles.artwork,
          { width: artSize, height: artSize },
          isCircle && styles.artworkCircle,
        ]}
        accessibilityLabel={item.title}
      />
      <View style={styles.meta}>
        <OTOText variant="artist" weight="semibold" numberOfLines={1}>{item.title}</OTOText>
        <OTOText variant="caption" customColor={color.text.tertiary} numberOfLines={1}>{item.subtitle}</OTOText>
        <DownloadStatusBadge state={item.download} />
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    paddingHorizontal: space[2],
    paddingVertical: space[3],
    minHeight: 44,
  },
  pressed: { opacity: 0.75 },
  artwork: {
    borderRadius: radius.md,
    backgroundColor: color.bg.s3,
    marginBottom: space[2],
  },
  artworkCircle: {
    borderRadius: radius.full,
  },
  meta: { gap: 2 },
});
