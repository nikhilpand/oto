import React from 'react';
import { View, StyleSheet, Pressable } from 'react-native';
import * as Haptics from 'expo-haptics';
import { color, space, radius } from '@/design/tokens';
import {
  HeadphonesIcon,
  PeopleIcon,
  ShuffleIcon,
  RepeatIcon,
  InfinityIcon,
} from '@/design/components/OTOIcon';

export interface NowPlayingCenterPillProps {
  showQueue: boolean;
  activeColor: string;
  isShuffled?: boolean;
  onToggleShuffle?: () => void;
  repeatMode?: 'off' | 'all' | 'one';
  onToggleRepeat?: () => void;
  autoplayEnabled?: boolean;
  onToggleAutoplay?: () => void;
  isPartyActive?: boolean;
  onOpenPartyModal?: () => void;
}

export function NowPlayingCenterPill({
  showQueue,
  activeColor,
  isShuffled = false,
  onToggleShuffle,
  repeatMode = 'off',
  onToggleRepeat,
  autoplayEnabled = true,
  onToggleAutoplay,
  isPartyActive = false,
  onOpenPartyModal,
}: NowPlayingCenterPillProps): React.JSX.Element {
  if (showQueue) {
    return (
      <View style={styles.segmentedPill}>
        <Pressable
          accessible
          accessibilityRole="button"
          accessibilityLabel={`Shuffle: ${isShuffled ? 'on' : 'off'}`}
          onPress={() => {
            void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            onToggleShuffle?.();
          }}
          style={styles.pillSegment}
        >
          <ShuffleIcon size={18} active={isShuffled} color={isShuffled ? activeColor : color.text.secondary} />
        </Pressable>

        <View style={styles.segmentDivider} />

        <Pressable
          accessible
          accessibilityRole="button"
          accessibilityLabel={`Repeat mode: ${repeatMode}`}
          onPress={() => {
            void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            onToggleRepeat?.();
          }}
          style={styles.pillSegment}
        >
          <RepeatIcon size={18} mode={repeatMode} color={repeatMode !== 'off' ? activeColor : color.text.secondary} />
        </Pressable>

        <View style={styles.segmentDivider} />

        <Pressable
          accessible
          accessibilityRole="button"
          accessibilityLabel={`Autoplay radio: ${autoplayEnabled ? 'on' : 'off'}`}
          onPress={() => {
            void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            onToggleAutoplay?.();
          }}
          style={styles.pillSegment}
        >
          <InfinityIcon size={18} color={autoplayEnabled ? activeColor : color.text.secondary} />
        </Pressable>
      </View>
    );
  }

  return (
    <View style={styles.segmentedPill}>
      <Pressable
        accessible
        accessibilityRole="button"
        accessibilityLabel="Solo listening mode"
        onPress={() => {
          void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        }}
        style={[styles.pillSegment, !isPartyActive && styles.pillSegmentActive]}
      >
        <HeadphonesIcon size={18} color={!isPartyActive ? color.text.primary : color.text.secondary} />
      </Pressable>

      <View style={styles.segmentDivider} />

      <Pressable
        accessible
        accessibilityRole="button"
        accessibilityLabel="Listen together party mode"
        onPress={() => {
          void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          onOpenPartyModal?.();
        }}
        style={[styles.pillSegment, isPartyActive && styles.pillSegmentActive]}
      >
        <PeopleIcon size={18} color={isPartyActive ? activeColor : color.text.secondary} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  segmentedPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    paddingVertical: space[1],
    paddingHorizontal: space[2],
  },
  pillSegment: {
    paddingHorizontal: space[3],
    paddingVertical: space[1],
    borderRadius: radius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pillSegmentActive: {
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
  },
  segmentDivider: {
    width: 1,
    height: 14,
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
  },
});
