/**
 * AuthModalHeader — Drag Handle + Title/Subtitle Row + Close Button
 *
 * Extracted from GoogleSignInModal to maintain < 200 line file mandate.
 */

import React from 'react';
import { View, StyleSheet } from 'react-native';
import { color, space, touchTarget } from '@/design/tokens';
import { OTOText } from '@/design/components/OTOText';
import { OTOIconButton } from '@/design/components/OTOIconButton';
import { CloseIcon } from '@/design/components/OTOIcon';

export interface AuthModalHeaderProps {
  isSignedIn: boolean;
  onClose: () => void;
}

export function AuthModalHeader({ isSignedIn, onClose }: AuthModalHeaderProps): React.JSX.Element {
  return (
    <>
      <View style={styles.dragHandle} />
      <View style={styles.headerRow}>
        <View style={styles.headerTitles}>
          <OTOText variant="title" weight="bold">
            {isSignedIn ? 'Google Account' : 'Connect YouTube Music'}
          </OTOText>
          <OTOText variant="caption" colorRole="secondary">
            {isSignedIn
              ? 'Connected to YouTube Music Innertube'
              : 'Sync your real liked songs and playlists'}
          </OTOText>
        </View>
        <OTOIconButton
          icon={<CloseIcon size={20} color={color.text.secondary} />}
          accessibilityLabel="Close sign-in modal"
          onPress={onClose}
          size={touchTarget.android}
        />
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  dragHandle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: color.text.disabled,
    alignSelf: 'center',
    marginTop: space[2],
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: space[4],
    paddingTop: space[3],
    paddingBottom: space[2],
  },
  headerTitles: {
    flex: 1,
    gap: 2,
  },
});
