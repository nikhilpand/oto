import React from 'react';
import { StyleSheet, Pressable } from 'react-native';
import * as Haptics from 'expo-haptics';
import { color, space, radius } from '@/design/tokens';
import { OTOText } from '@/design/components';

export interface NowPlayingLyricsTeaserProps {
  firstLineText?: string;
  onPress: () => void;
}

export function NowPlayingLyricsTeaser({
  firstLineText,
  onPress,
}: NowPlayingLyricsTeaserProps): React.JSX.Element {
  const handlePress = () => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onPress();
  };

  return (
    <Pressable
      onPress={handlePress}
      accessibilityRole="button"
      accessibilityLabel="Open lyrics"
      style={styles.lyricsTeaserPill}
    >
      <OTOText variant="caption" weight="medium" style={styles.lyricsTeaserText} numberOfLines={1}>
        ♫  {firstLineText ? `"${firstLineText}"` : 'The hook is on the way'}  ›
      </OTOText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  lyricsTeaserPill: {
    alignSelf: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    paddingHorizontal: space[3],
    paddingVertical: space[1],
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
    marginTop: space[1],
    marginBottom: space[2],
    maxWidth: '85%',
  },
  lyricsTeaserText: {
    color: color.text.secondary,
    textAlign: 'center',
  },
});
