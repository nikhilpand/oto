/**
 * GoogleSignInModal — YouTube Music Authentication & Account Hub
 *
 * Provides a clean modal to view profile details, sync status,
 * or connect via session cookie.
 */

import React, { useState, useCallback } from 'react';
import {
  Modal,
  View,
  StyleSheet,
  Pressable,
  TextInput,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { Image } from 'expo-image';
import * as Haptics from 'expo-haptics';
import { color, space, radius, type, touchTarget } from '@/design/tokens';
import { OTOText } from '@/design/components/OTOText';
import { OTOIconButton } from '@/design/components/OTOIconButton';
import { CloseIcon, CheckIcon } from '@/design/components/OTOIcon';
import { useGoogleAuth } from '../useGoogleAuth';

export interface GoogleSignInModalProps {
  visible: boolean;
  onClose: () => void;
}

export function GoogleSignInModal({ visible, onClose }: GoogleSignInModalProps): React.JSX.Element {
  const {
    isSignedIn,
    activeProfile,
    likedSongs,
    userPlaylists,
    isLoading,
    error,
    loginWithGoogle,
    loginWithCookie,
    isNativeWebSignInAvailable,
    signOut,
    refresh,
  } = useGoogleAuth();

  const [cookieInput, setCookieInput] = useState('');
  const [localError, setLocalError] = useState<string | null>(null);

  const handleGoogleSignIn = useCallback(async () => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setLocalError(null);
    const result = await loginWithGoogle();
    if (result.success) {
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      onClose();
    } else if (
      result.error &&
      result.error !== 'CANCELLED' &&
      result.error !== 'User closed Google sign-in' &&
      result.error !== 'User cancelled Google sign-in'
    ) {
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      setLocalError(result.error);
    }
  }, [loginWithGoogle, onClose]);

  const handleConnect = useCallback(async () => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setLocalError(null);
    if (!cookieInput.trim()) {
      setLocalError('Please paste your YouTube Music cookie string.');
      return;
    }

    const result = await loginWithCookie(cookieInput);
    if (result.success) {
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setCookieInput('');
      onClose();
    } else {
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      setLocalError(result.error || 'Authentication failed. Please verify your cookie.');
    }
  }, [cookieInput, loginWithCookie]);

  const handleSignOut = useCallback(() => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    signOut();
  }, [signOut]);

  const handleSync = useCallback(async () => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    await refresh();
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  }, [refresh]);

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.backdrop}
      >
        <Pressable style={styles.dismissOverlay} onPress={onClose} />

        <View style={styles.sheetContainer}>
          <View style={styles.dragHandle} />

          {/* Header */}
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

          <ScrollView
            style={styles.scrollContent}
            contentContainerStyle={styles.scrollContentContainer}
            keyboardShouldPersistTaps="handled"
          >
            {isSignedIn && activeProfile ? (
              /* Signed In Profile Card */
              <View style={styles.profileSection}>
                <View style={styles.profileCard}>
                  <View style={styles.avatarWrapper}>
                    {activeProfile.avatarUrl ? (
                      <Image
                        source={{ uri: activeProfile.avatarUrl }}
                        style={styles.avatarImage}
                        contentFit="cover"
                        transition={200}
                      />
                    ) : (
                      <View style={styles.avatarPlaceholder}>
                        <OTOText variant="title" weight="bold" style={styles.avatarLetter}>
                          {activeProfile.name.charAt(0).toUpperCase()}
                        </OTOText>
                      </View>
                    )}
                  </View>

                  <View style={styles.profileMeta}>
                    <OTOText variant="body" weight="bold" numberOfLines={1}>
                      {activeProfile.name}
                    </OTOText>
                    {activeProfile.email && (
                      <OTOText variant="caption" colorRole="secondary" numberOfLines={1}>
                        {activeProfile.email}
                      </OTOText>
                    )}
                    <View style={styles.connectedBadge}>
                      <CheckIcon size={12} color={color.accent.signature} />
                      <OTOText variant="meta" style={styles.connectedBadgeText}>
                        Innertube Active
                      </OTOText>
                    </View>
                  </View>
                </View>

                {/* Stats row */}
                <View style={styles.statsRow}>
                  <View style={styles.statBox}>
                    <OTOText variant="title" weight="bold">
                      {likedSongs.length}
                    </OTOText>
                    <OTOText variant="meta" colorRole="secondary">
                      Liked Songs
                    </OTOText>
                  </View>
                  <View style={styles.statDivider} />
                  <View style={styles.statBox}>
                    <OTOText variant="title" weight="bold">
                      {userPlaylists.length}
                    </OTOText>
                    <OTOText variant="meta" colorRole="secondary">
                      Playlists
                    </OTOText>
                  </View>
                </View>

                {/* Action Buttons */}
                <View style={styles.buttonStack}>
                  <Pressable
                    style={[styles.primaryButton, isLoading && styles.buttonDisabled]}
                    onPress={handleSync}
                    disabled={isLoading}
                  >
                    {isLoading ? (
                      <ActivityIndicator size="small" color="#000" />
                    ) : (
                      <OTOText variant="body" weight="bold" style={styles.primaryButtonText}>
                        Sync Data Now
                      </OTOText>
                    )}
                  </Pressable>

                  <Pressable style={styles.secondaryButton} onPress={handleSignOut}>
                    <OTOText variant="body" style={styles.secondaryButtonText}>
                      Disconnect Account
                    </OTOText>
                  </Pressable>
                </View>
              </View>
            ) : (
              /* Signed Out Connection Form */
              <View style={styles.connectSection}>
                {isNativeWebSignInAvailable && (
                  <View style={styles.nativeSignInWrapper}>
                    <Pressable
                      style={[styles.googleSignInButton, isLoading && styles.buttonDisabled]}
                      onPress={handleGoogleSignIn}
                      disabled={isLoading}
                      accessibilityRole="button"
                      accessibilityLabel="Sign in with Google Account"
                    >
                      {isLoading ? (
                        <ActivityIndicator size="small" color="#FFFFFF" />
                      ) : (
                        <View style={styles.googleButtonContent}>
                          <OTOText variant="body" weight="bold" style={styles.googleButtonText}>
                            Sign In with Google
                          </OTOText>
                        </View>
                      )}
                    </Pressable>
                    <OTOText variant="caption" colorRole="tertiary" style={styles.nativeSignInHint}>
                      BitChord protocol: In-app official Google login with Passkeys, 2FA & automatic session capture.
                    </OTOText>

                    <View style={styles.dividerRow}>
                      <View style={styles.dividerLine} />
                      <OTOText variant="meta" colorRole="disabled" style={styles.dividerText}>
                        OR ENTER COOKIE MANUALLY
                      </OTOText>
                      <View style={styles.dividerLine} />
                    </View>
                  </View>
                )}

                <OTOText variant="body" colorRole="secondary" style={styles.instructions}>
                  To access your Google account data without Google OAuth blocking, you can also paste your YouTube
                  Music session cookie below (containing <OTOText weight="bold">SAPISID</OTOText>).
                </OTOText>

                <View style={styles.inputWrapper}>
                  <TextInput
                    style={styles.cookieInput}
                    placeholder="Paste YouTube Music Cookie (e.g., HSID=...; SAPISID=...;)"
                    placeholderTextColor={color.text.disabled}
                    value={cookieInput}
                    onChangeText={(t) => {
                      setCookieInput(t);
                      if (localError) setLocalError(null);
                    }}
                    multiline
                    numberOfLines={4}
                    autoCapitalize="none"
                    autoCorrect={false}
                  />
                </View>

                {(localError || error) && (
                  <View style={styles.errorBanner}>
                    <OTOText variant="caption" style={styles.errorText}>
                      {localError || error}
                    </OTOText>
                  </View>
                )}

                <Pressable
                  style={[styles.primaryButton, isLoading && styles.buttonDisabled]}
                  onPress={handleConnect}
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <ActivityIndicator size="small" color="#000" />
                  ) : (
                    <OTOText variant="body" weight="bold" style={styles.primaryButtonText}>
                      Connect Account
                    </OTOText>
                  )}
                </Pressable>

                <View style={styles.guideContainer}>
                  <OTOText variant="caption" weight="bold" colorRole="secondary">
                    How to get your cookie:
                  </OTOText>
                  <OTOText variant="meta" colorRole="tertiary">
                    1. Open music.youtube.com in your web browser.
                  </OTOText>
                  <OTOText variant="meta" colorRole="tertiary">
                    2. Open DevTools (F12) → Network tab.
                  </OTOText>
                  <OTOText variant="meta" colorRole="tertiary">
                    3. Click any request to music.youtube.com and copy the Cookie header value.
                  </OTOText>
                </View>
              </View>
            )}
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'flex-end',
  },
  dismissOverlay: {
    flex: 1,
  },
  sheetContainer: {
    backgroundColor: color.bg.s1,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    borderTopWidth: 1,
    borderTopColor: color.glass.highlight,
    maxHeight: '85%',
    paddingBottom: space[4],
  },
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
  scrollContent: {
    flexGrow: 0,
  },
  scrollContentContainer: {
    paddingHorizontal: space[4],
    paddingBottom: space[4],
  },
  profileSection: {
    gap: space[3],
    paddingTop: space[2],
  },
  profileCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: space[3],
    backgroundColor: color.bg.s2,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: color.hairline,
    gap: space[3],
  },
  avatarWrapper: {
    width: 56,
    height: 56,
    borderRadius: 28,
    overflow: 'hidden',
    backgroundColor: color.bg.s3,
    borderWidth: 1.5,
    borderColor: color.accent.signature,
  },
  avatarImage: {
    width: '100%',
    height: '100%',
  },
  avatarPlaceholder: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarLetter: {
    color: color.accent.signature,
  },
  profileMeta: {
    flex: 1,
    gap: 2,
  },
  connectedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 2,
  },
  connectedBadgeText: {
    color: color.accent.signature,
    fontWeight: '600',
  },
  statsRow: {
    flexDirection: 'row',
    backgroundColor: color.bg.s2,
    borderRadius: radius.md,
    paddingVertical: space[3],
    borderWidth: 1,
    borderColor: color.hairline,
  },
  statBox: {
    flex: 1,
    alignItems: 'center',
    gap: 2,
  },
  statDivider: {
    width: 1,
    backgroundColor: color.hairline,
  },
  buttonStack: {
    gap: space[2],
    marginTop: space[2],
  },
  primaryButton: {
    height: 48,
    backgroundColor: color.accent.signature,
    borderRadius: radius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  primaryButtonText: {
    color: '#000000',
  },
  secondaryButton: {
    height: 44,
    backgroundColor: 'transparent',
    borderRadius: radius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryButtonText: {
    color: color.semantic.error,
  },
  connectSection: {
    gap: space[3],
    paddingTop: space[2],
  },
  instructions: {
    lineHeight: 20,
  },
  inputWrapper: {
    backgroundColor: color.bg.s2,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: color.hairline,
    padding: space[2],
  },
  cookieInput: {
    color: color.text.primary,
    fontSize: type.body[0],
    minHeight: 80,
    textAlignVertical: 'top',
  },
  errorBanner: {
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    borderWidth: 1,
    borderColor: color.semantic.error,
    borderRadius: radius.sm,
    padding: space[2],
  },
  errorText: {
    color: color.semantic.error,
  },
  guideContainer: {
    gap: 4,
    padding: space[3],
    backgroundColor: color.bg.s2,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: color.hairline,
    marginTop: space[1],
  },
  nativeSignInWrapper: {
    gap: space[2],
    marginBottom: space[2],
  },
  googleSignInButton: {
    height: 52,
    backgroundColor: '#1E1E24',
    borderRadius: radius.full,
    borderWidth: 1.5,
    borderColor: color.accent.signature,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: color.accent.signature,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
  },
  googleButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space[2],
  },
  googleButtonText: {
    color: '#FFFFFF',
    fontSize: type.body[0],
  },
  nativeSignInHint: {
    textAlign: 'center',
    lineHeight: 18,
    paddingHorizontal: space[2],
  },
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space[2],
    marginVertical: space[2],
  },
  dividerLine: {
    flex: 1,
    height: StyleSheet.hairlineWidth,
    backgroundColor: color.hairline,
  },
  dividerText: {
    fontSize: 10,
    letterSpacing: 0.8,
  },
});
