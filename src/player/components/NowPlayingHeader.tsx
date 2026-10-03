import React from 'react';
import { View, StyleSheet } from 'react-native';
import * as Haptics from 'expo-haptics';
import { space, radius } from '@/design/tokens';
import {
  OTOText,
  OTOIconButton,
  OTOArtwork,
  ChevronDownIcon,
  MoreHorizontalIcon,
} from '@/design/components';
import type { Track } from '@/domain/types';

export interface NowPlayingHeaderProps {
  track: Track;
  onCollapse: () => void;
  minTouchSize: number;
  onOptionsPress?: () => void;
}

export function NowPlayingHeader({
  track,
  onCollapse,
  minTouchSize,
  onOptionsPress,
}: NowPlayingHeaderProps): React.JSX.Element {
  return (
    <View style={styles.headerRow}>
      <OTOIconButton
        icon={<ChevronDownIcon />}
        accessibilityLabel="Dismiss Now Playing"
        accessibilityHint="Returns to the mini player"
        onPress={onCollapse}
        size={minTouchSize}
      />
      <View style={styles.headerCenter}>
        <OTOArtwork
          uri={track.artworkUrl}
          thumbhash={track.thumbhash}
          size={28}
          borderRadius={radius.xs}
          style={styles.headerThumbnail}
          alt={track.title}
        />
        <View style={styles.headerMeta}>
          <OTOText variant="caption" weight="bold" colorRole="primary" numberOfLines={1}>
            {track.title}
          </OTOText>
          <OTOText variant="meta" colorRole="secondary" numberOfLines={1}>
            {track.artist}
          </OTOText>
        </View>
      </View>
      <OTOIconButton
        icon={<MoreHorizontalIcon />}
        accessibilityLabel="Track actions"
        accessibilityHint="Opens track options menu"
        onPress={() => {
          void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          onOptionsPress?.();
        }}
        size={minTouchSize}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  headerRow: {
    height: 48,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerCenter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
    paddingHorizontal: space[2],
  },
  headerThumbnail: {
    marginRight: space[2],
  },
  headerMeta: {
    maxWidth: 180,
    justifyContent: 'center',
  },
});
