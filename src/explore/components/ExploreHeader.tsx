import React from 'react';
import { View, StyleSheet, Pressable, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { color, space, radius, touchTarget } from '@/design/tokens';
import { OTOText } from '@/design/components/OTOText';
import { WaveLogoIcon, SettingsIcon } from '@/design/components/OTOIcon';
import type { YouTubeProfile } from '@/auth/GoogleAuthStore';

export interface ExploreHeaderProps {
  contentWidth: number;
  isSignedIn: boolean;
  activeProfile: YouTubeProfile | null;
  onOpenAuth: () => void;
  onOpenSettings?: () => void;
}

export function ExploreHeader({
  contentWidth,
  isSignedIn,
  activeProfile,
  onOpenAuth,
  onOpenSettings,
}: ExploreHeaderProps): React.JSX.Element {
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
    <View style={[styles.header, { maxWidth: contentWidth }]}>
      <View style={styles.headerLeft}>
        <WaveLogoIcon size={26} color={color.text.primary} />
        <OTOText variant="title" weight="bold" style={styles.headerTitle}>
          Explore
        </OTOText>
      </View>

      <View style={styles.headerRight}>
        <Pressable
          style={styles.userPill}
          onPress={handleProfilePress}
          accessibilityRole="button"
          accessibilityLabel={`User profile: ${displayName}`}
        >
          <View style={styles.userAvatarPlaceholder}>
            <OTOText variant="meta" weight="bold" style={styles.userAvatarText}>
              {initials}
            </OTOText>
          </View>
          <OTOText variant="caption" weight="semibold" numberOfLines={1} style={styles.userName}>
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
    width: '100%',
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: space[4],
    paddingVertical: space[3],
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space[2],
  },
  headerTitle: {
    fontSize: 22,
    letterSpacing: -0.3,
  },
  userPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: radius.full,
    paddingVertical: 4,
    paddingHorizontal: 8,
    gap: 6,
    maxWidth: 160,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
  },
  userAvatarPlaceholder: {
    width: 22,
    height: 22,
    borderRadius: radius.full,
    backgroundColor: color.accent.signature,
    alignItems: 'center',
    justifyContent: 'center',
  },
  userAvatarText: {
    color: '#000000',
    fontSize: 10,
  },
  userName: {
    color: color.text.primary,
    fontSize: 12,
    flexShrink: 1,
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
