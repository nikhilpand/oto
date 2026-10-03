import React from 'react';
import { View, StyleSheet, Pressable } from 'react-native';
import * as Haptics from 'expo-haptics';
import { color, space } from '@/design/tokens';
import { OTOText } from '@/design/components/OTOText';
import { LyricsIcon, QueueIcon } from '@/design/components/OTOIcon';
import { NowPlayingCenterPill, type NowPlayingCenterPillProps } from './NowPlayingCenterPill';

export interface NowPlayingSecondaryBarProps extends Omit<NowPlayingCenterPillProps, 'activeColor'> {
  showLyrics: boolean;
  onToggleLyrics: () => void;
  onToggleQueue: () => void;
  activeDominant?: string;
  minTouchSize: number;
  onOpenOutputSheet?: () => void;
}

export function NowPlayingSecondaryBar({
  showLyrics,
  showQueue,
  onToggleLyrics,
  onToggleQueue,
  activeDominant,
  minTouchSize,
  onOpenOutputSheet,
  onOpenPartyModal,
  isShuffled,
  onToggleShuffle,
  repeatMode,
  onToggleRepeat,
  autoplayEnabled,
  onToggleAutoplay,
  isPartyActive,
}: NowPlayingSecondaryBarProps): React.JSX.Element {
  const activeColor = activeDominant || color.accent.signature;

  return (
    <View style={styles.secondaryContainer}>
      <View style={styles.secondaryRow}>
        {/* Left: Lyrics Button */}
        <Pressable
          accessible
          accessibilityRole="button"
          accessibilityLabel={showLyrics ? 'Hide lyrics' : 'Show lyrics'}
          onPress={() => {
            void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            onToggleLyrics();
          }}
          style={[styles.sideButton, { width: minTouchSize, height: minTouchSize }]}
        >
          <LyricsIcon color={showLyrics ? activeColor : color.text.primary} />
        </Pressable>

        {/* Center: Dynamic Segmented Pill */}
        <NowPlayingCenterPill
          showQueue={showQueue}
          activeColor={activeColor}
          isShuffled={isShuffled}
          onToggleShuffle={onToggleShuffle}
          repeatMode={repeatMode}
          onToggleRepeat={onToggleRepeat}
          autoplayEnabled={autoplayEnabled}
          onToggleAutoplay={onToggleAutoplay}
          isPartyActive={isPartyActive}
          onOpenPartyModal={onOpenPartyModal}
        />

        {/* Right: Queue Button */}
        <Pressable
          accessible
          accessibilityRole="button"
          accessibilityLabel={showQueue ? 'Hide queue' : 'Show queue'}
          onPress={() => {
            void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            onToggleQueue();
          }}
          style={[styles.sideButton, { width: minTouchSize, height: minTouchSize }]}
        >
          <QueueIcon color={showQueue ? activeColor : color.text.primary} />
        </Pressable>
      </View>

      {/* Bottom Output Device text */}
      <Pressable
        accessible
        accessibilityRole="button"
        accessibilityLabel="Audio output device"
        onPress={() => {
          void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          onOpenOutputSheet?.();
        }}
        hitSlop={{ top: 8, bottom: 8, left: 16, right: 16 }}
      >
        <OTOText variant="meta" customColor={color.text.tertiary} style={styles.deviceFooterText}>
          Phone Speaker
        </OTOText>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  secondaryContainer: {
    alignItems: 'center',
    paddingBottom: space[2],
  },
  secondaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    paddingHorizontal: space[4],
  },
  sideButton: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  deviceFooterText: {
    marginTop: space[1],
  },
});
