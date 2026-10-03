/**
 * AuthProfileCard — Signed-In Profile View
 *
 * Shows avatar, name, email, Innertube status badge,
 * liked song / playlist stats, and action buttons (Sync, Disconnect, Settings).
 *
 * Extracted from GoogleSignInModal to maintain < 200 line file mandate.
 */

import React from 'react';
import { View, StyleSheet, Pressable, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { Image } from 'expo-image';
import { color, space, radius } from '@/design/tokens';
import { OTOText } from '@/design/components/OTOText';
import { CheckIcon, SettingsIcon } from '@/design/components/OTOIcon';

export interface AuthProfileCardProps {
  name: string;
  email?: string;
  avatarUrl?: string;
  likedSongsCount: number;
  playlistCount: number;
  isLoading: boolean;
  onSync: () => void;
  onSignOut: () => void;
  onClose: () => void;
}

export function AuthProfileCard({
  name,
  email,
  avatarUrl,
  likedSongsCount,
  playlistCount,
  isLoading,
  onSync,
  onSignOut,
  onClose,
}: AuthProfileCardProps): React.JSX.Element {
  const router = useRouter();

  return (
    <View style={styles.profileSection}>
      {/* Avatar + name + email */}
      <View style={styles.profileCard}>
        <View style={styles.avatarWrapper}>
          {avatarUrl ? (
            <Image source={{ uri: avatarUrl }} style={styles.avatarImage} contentFit="cover" transition={200} />
          ) : (
            <View style={styles.avatarPlaceholder}>
              <OTOText variant="title" weight="bold" style={styles.avatarLetter}>
                {name.charAt(0).toUpperCase()}
              </OTOText>
            </View>
          )}
        </View>
        <View style={styles.profileMeta}>
          <OTOText variant="body" weight="bold" numberOfLines={1}>{name}</OTOText>
          {email && <OTOText variant="caption" colorRole="secondary" numberOfLines={1}>{email}</OTOText>}
          <View style={styles.connectedBadge}>
            <CheckIcon size={12} color={color.accent.signature} />
            <OTOText variant="meta" style={styles.connectedBadgeText}>Innertube Active</OTOText>
          </View>
        </View>
      </View>

      {/* Stats */}
      <View style={styles.statsRow}>
        <View style={styles.statBox}>
          <OTOText variant="title" weight="bold">{likedSongsCount}</OTOText>
          <OTOText variant="meta" colorRole="secondary">Liked Songs</OTOText>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statBox}>
          <OTOText variant="title" weight="bold">{playlistCount}</OTOText>
          <OTOText variant="meta" colorRole="secondary">Playlists</OTOText>
        </View>
      </View>

      {/* Actions */}
      <View style={styles.buttonStack}>
        <Pressable style={[styles.primaryButton, isLoading && styles.buttonDisabled]} onPress={onSync} disabled={isLoading}>
          {isLoading
            ? <ActivityIndicator size="small" color="#000" />
            : <OTOText variant="body" weight="bold" style={styles.primaryButtonText}>Sync Data Now</OTOText>}
        </Pressable>

        <Pressable style={styles.secondaryButton} onPress={onSignOut}>
          <OTOText variant="body" style={styles.secondaryButtonText}>Disconnect Account</OTOText>
        </Pressable>

        <Pressable
          style={styles.settingsButton}
          onPress={() => { onClose(); router.push('/settings' as any); }}
          accessibilityRole="button"
          accessibilityLabel="Settings"
        >
          <SettingsIcon size={20} color={color.text.primary} />
          <OTOText variant="body" weight="medium" colorRole="primary" style={styles.settingsText}>Settings</OTOText>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  profileSection: { gap: space[3], paddingTop: space[2] },
  profileCard: {
    flexDirection: 'row', alignItems: 'center',
    padding: space[3], backgroundColor: color.bg.s2,
    borderRadius: radius.lg, borderWidth: 1, borderColor: color.hairline, gap: space[3],
  },
  avatarWrapper: {
    width: 56, height: 56, borderRadius: 28, overflow: 'hidden',
    backgroundColor: color.bg.s3, borderWidth: 1.5, borderColor: color.accent.signature,
  },
  avatarImage: { width: '100%', height: '100%' },
  avatarPlaceholder: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  avatarLetter: { color: color.accent.signature },
  profileMeta: { flex: 1, gap: 2 },
  connectedBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 },
  connectedBadgeText: { color: color.accent.signature, fontWeight: '600' },
  statsRow: {
    flexDirection: 'row', backgroundColor: color.bg.s2,
    borderRadius: radius.md, paddingVertical: space[3],
    borderWidth: 1, borderColor: color.hairline,
  },
  statBox: { flex: 1, alignItems: 'center', gap: 2 },
  statDivider: { width: 1, backgroundColor: color.hairline },
  buttonStack: { gap: space[2], marginTop: space[2] },
  primaryButton: {
    height: 48, backgroundColor: color.accent.signature,
    borderRadius: radius.full, alignItems: 'center', justifyContent: 'center',
  },
  buttonDisabled: { opacity: 0.6 },
  primaryButtonText: { color: '#000000' },
  secondaryButton: {
    height: 44, backgroundColor: 'transparent',
    borderRadius: radius.full, alignItems: 'center', justifyContent: 'center',
  },
  secondaryButtonText: { color: color.semantic.error },
  settingsButton: {
    flexDirection: 'row', alignItems: 'center',
    paddingVertical: 12, paddingHorizontal: space[3],
    backgroundColor: color.bg.s2, borderRadius: radius.md, marginTop: space[3],
  },
  settingsText: { marginLeft: space[2] },
});
