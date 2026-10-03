import React from 'react';
import { View, StyleSheet, Pressable, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { color, space, radius, touchTarget } from '@/design/tokens';
import { OTOText } from '@/design/components/OTOText';
import { WaveLogoIcon, SettingsIcon } from '@/design/components/OTOIcon';
import type { YouTubeProfile } from '@/auth/GoogleAuthStore';

export interface LibraryHeaderProps {
  isSignedIn: boolean;
  activeProfile: YouTubeProfile | null;
  onOpenAuth: () => void;
  onOpenSettings?: () => void;
}

export function LibraryHeader({
  isSignedIn,
  activeProfile,
  onOpenAuth,
  onOpenSettings,
}: LibraryHeaderProps): React.JSX.Element {
  const router = useRouter();

  const handleProfilePress = () => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onOpenAuth();
  };

  const handleSettingsPress = () => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (onOpenSettings) {
      onOpenSettings();
    } else {
      router.push('/settings' as any);
    }
  };

  const displayName = isSignedIn && activeProfile?.name ? activeProfile.name : 'Sign In';
  const initials =
    isSignedIn && activeProfile?.name
      ? activeProfile.name
          .split(' ')
          .map((n) => n[0])
          .join('')
          .slice(0, 2)
          .toUpperCase()
      : 'G';

  const minTouch = Platform.select({
    ios: touchTarget.ios,
    default: touchTarget.android,
  });

  return (
    <View style={styles.header}>
      <View style={styles.brandRow}>
        <WaveLogoIcon size={28} color={color.accent.signature} />
        <OTOText variant="headline" weight="bold" style={styles.brandTitle}>
          Library
        </OTOText>
      </View>

      <View style={styles.headerRight}>
        <Pressable
          style={styles.profilePill}
          onPress={handleProfilePress}
          accessibilityRole="button"
          accessibilityLabel={`User profile: ${displayName}`}
        >
          <View style={styles.avatarCircle}>
            <OTOText variant="caption" weight="bold" colorRole="primary">
              {initials}
            </OTOText>
          </View>
          <OTOText variant="caption" weight="bold" colorRole="primary" numberOfLines={1}>
            {displayName}
          </OTOText>
        </Pressable>

        <Pressable
          style={[styles.settingsButton, { minWidth: minTouch, minHeight: minTouch }]}
          onPress={handleSettingsPress}
          accessibilityRole="button"
          accessibilityLabel="Open settings"
          accessibilityHint="Navigates to app settings"
          hitSlop={8}
        >
          <SettingsIcon size={20} color={color.text.secondary} />
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: space[4],
    paddingTop: space[4],
    paddingBottom: space[3],
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space[2],
  },
  brandTitle: {
    fontSize: 26,
    letterSpacing: -0.5,
  },
  profilePill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: radius.full,
    paddingVertical: 4,
    paddingHorizontal: space[2],
    gap: 6,
    maxWidth: 160,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
  },
  avatarCircle: {
    width: 22,
    height: 22,
    borderRadius: radius.full,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space[2],
  },
  settingsButton: {
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.full,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    width: 38,
    height: 38,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
});
