/**
 * GoogleSignInModal — YouTube Music Authentication & Account Hub
 *
 * Slim orchestrator: delegates UI to AuthModalHeader, AuthProfileCard,
 * and AuthConnectForm. Handles only modal lifecycle and auth state.
 *
 * @see AuthModalHeader   — drag handle + title + close button
 * @see AuthProfileCard   — signed-in profile / stats / actions
 * @see AuthConnectForm   — signed-out Google/cookie connection form
 */

import React, { useState, useCallback } from 'react';
import {
  Modal,
  View,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Pressable,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { color, space, radius } from '@/design/tokens';
import { AuthModalHeader } from './AuthModalHeader';
import { AuthProfileCard } from './AuthProfileCard';
import { AuthConnectForm } from './AuthConnectForm';
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
  }, [cookieInput, loginWithCookie, onClose]);

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
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.backdrop}>
        <Pressable
          style={styles.dismissOverlay}
          onPress={onClose}
          accessible
          accessibilityRole="button"
          accessibilityLabel="Dismiss sign in dialog"
        />

        <View style={styles.sheetContainer}>
          <AuthModalHeader isSignedIn={isSignedIn} onClose={onClose} />

          <ScrollView
            style={styles.scrollContent}
            contentContainerStyle={styles.scrollContentContainer}
            keyboardShouldPersistTaps="handled"
          >
            {isSignedIn && activeProfile ? (
              <AuthProfileCard
                name={activeProfile.name}
                email={activeProfile.email}
                avatarUrl={activeProfile.avatarUrl}
                likedSongsCount={likedSongs.length}
                playlistCount={userPlaylists.length}
                isLoading={isLoading}
                onSync={handleSync}
                onSignOut={handleSignOut}
                onClose={onClose}
              />
            ) : (
              <AuthConnectForm
                cookieInput={cookieInput}
                onCookieChange={(v) => { setCookieInput(v); if (localError) setLocalError(null); }}
                isLoading={isLoading}
                isNativeWebSignInAvailable={isNativeWebSignInAvailable}
                error={localError || error}
                onGoogleSignIn={handleGoogleSignIn}
                onConnect={handleConnect}
                onClose={onClose}
              />
            )}
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0, 0, 0, 0.7)', justifyContent: 'flex-end' },
  dismissOverlay: { flex: 1 },
  sheetContainer: {
    backgroundColor: color.bg.s1,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    borderTopWidth: 1,
    borderTopColor: color.glass.highlight,
    maxHeight: '85%',
    paddingBottom: space[4],
  },
  scrollContent: { flexGrow: 0 },
  scrollContentContainer: { paddingHorizontal: space[4], paddingBottom: space[4] },
});
