/**
 * OTOSongRow — Borderless track row for Album/Playlist detail screens.
 *
 * Separated by luminance steps (bg.s1 row on bg.base) and spacing, not borders.
 * Touch target >= 48 dp. Context `...` trigger opens ContextActionSheet.
 */
import React, { useCallback } from 'react';
import {
  View,
  StyleSheet,
  Pressable,
} from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';
import { OTOText } from '@/design/components/OTOText';
import { OTOArtwork } from '@/design/components/OTOArtwork';
import { color, space, radius, spring } from '@/design/tokens';
import type { Track } from '@/domain/types';
import type { ContextAction } from '../types';

export interface OTOSongRowProps {
  track: Track;
  index?: number;
  showIndex?: boolean;
  isActive?: boolean;
  onPress: (track: Track) => void;
  onContextAction: (track: Track, action: ContextAction) => void;
  onContextOpen: (track: Track) => void;
}

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export function OTOSongRow({
  track,
  index,
  showIndex = false,
  isActive = false,
  onPress,
  onContextOpen,
}: OTOSongRowProps): React.JSX.Element {
  const scale = useSharedValue(1);

  const animStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePressIn = useCallback(() => {
    scale.value = withSpring(0.97, spring.spatial.fast);
  }, [scale]);

  const handlePressOut = useCallback(() => {
    scale.value = withSpring(1, spring.spatial.fast);
  }, [scale]);

  const durationStr = React.useMemo(() => {
    const totalSec = Math.round(track.durationMs / 1000);
    const m = Math.floor(totalSec / 60);
    const s = totalSec % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  }, [track.durationMs]);

  return (
    <AnimatedPressable
      style={[styles.row, animStyle, isActive && styles.rowActive]}
      onPress={() => onPress(track)}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      accessible
      accessibilityRole="button"
      accessibilityLabel={`${track.title} by ${track.artist}, ${durationStr}`}
      accessibilityActions={[
        { name: 'play_next', label: 'Play Next' },
        { name: 'add_to_queue', label: 'Add to Queue' },
        { name: 'download', label: 'Download' },
      ]}
      onAccessibilityAction={() => {
        onContextOpen(track);
      }}
    >
      {/* Left: index or thumbnail */}
      <View style={styles.left}>
        {showIndex ? (
          <OTOText
            variant="meta"
            colorRole={isActive ? 'accent' : 'tertiary'}
            style={styles.indexText}
          >
            {index != null ? String(index + 1) : ''}
          </OTOText>
        ) : (
          <OTOArtwork
            uri={track.artworkUrl}
            thumbhash={track.thumbhash}
            size={44}
            borderRadius={radius.sm}
          />
        )}
      </View>

      {/* Center: title + artist */}
      <View style={styles.center}>
        <OTOText
          variant="body"
          colorRole={isActive ? 'accent' : 'primary'}
          numberOfLines={1}
        >
          {track.title}
        </OTOText>
        <View style={styles.artistRow}>
          {track.isExplicit && (
            <View style={styles.explicitBadge}>
              <OTOText variant="caption" colorRole="tertiary">E</OTOText>
            </View>
          )}
          <OTOText variant="artist" colorRole="secondary" numberOfLines={1}>
            {track.artist}
          </OTOText>
        </View>
      </View>

      {/* Right: duration + context trigger */}
      <View style={styles.right}>
        <OTOText variant="meta" colorRole="tertiary">{durationStr}</OTOText>
        <Pressable
          style={styles.contextBtn}
          onPress={() => onContextOpen(track)}
          hitSlop={8}
          accessible
          accessibilityRole="button"
          accessibilityLabel={`More options for ${track.title}`}
        >
          <OTOText variant="body" colorRole="tertiary">•••</OTOText>
        </Pressable>
      </View>
    </AnimatedPressable>
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
  rowActive: {
    backgroundColor: color.bg.s1,
    borderRadius: radius.sm,
  },
  left: {
    width: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  indexText: {
    width: 28,
    textAlign: 'center',
  },
  center: {
    flex: 1,
    paddingHorizontal: space[3],
    gap: 2,
  },
  artistRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space[1],
  },
  explicitBadge: {
    backgroundColor: color.bg.s3,
    borderRadius: radius.xs,
    paddingHorizontal: 4,
    paddingVertical: 1,
  },
  right: {
    alignItems: 'flex-end',
    gap: space[1],
  },
  contextBtn: {
    padding: space[1],
    minWidth: 44,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
