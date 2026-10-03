/**
 * AuthConnectForm — Cookie/Google Sign-In Form (Signed-Out State)
 *
 * Shows the Google sign-in button (when native WebView available),
 * an OR divider, cookie textarea input, error banner, connect button,
 * and step-by-step instructions for obtaining the cookie.
 *
 * Extracted from GoogleSignInModal to maintain < 200 line file mandate.
 */

import React from 'react';
import { View, StyleSheet, Pressable, TextInput, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { color, space, radius, type } from '@/design/tokens';
import { OTOText } from '@/design/components/OTOText';
import { SettingsIcon } from '@/design/components/OTOIcon';

export interface AuthConnectFormProps {
  cookieInput: string;
  onCookieChange: (v: string) => void;
  isLoading: boolean;
  isNativeWebSignInAvailable?: boolean;
  error: string | null;
  onGoogleSignIn: () => void;
  onConnect: () => void;
  onClose: () => void;
}

export function AuthConnectForm({
  cookieInput,
  onCookieChange,
  isLoading,
  isNativeWebSignInAvailable: _isNativeWebSignInAvailable,
  error,
  onGoogleSignIn,
  onConnect,
  onClose,
}: AuthConnectFormProps): React.JSX.Element {
  const router = useRouter();

  return (
    <View style={styles.connectSection}>
      <View style={styles.nativeSignInWrapper}>
        <Pressable
          style={[styles.googleSignInButton, isLoading && styles.buttonDisabled]}
          onPress={onGoogleSignIn}
          disabled={isLoading}
          accessibilityRole="button"
          accessibilityLabel="Sign in with Google Account"
        >
          {isLoading
            ? <ActivityIndicator size="small" color="#FFFFFF" />
            : <OTOText variant="body" weight="bold" style={styles.googleButtonText}>Sign In with Google</OTOText>}
        </Pressable>
        <OTOText variant="caption" colorRole="tertiary" style={styles.nativeSignInHint}>
          In-app Google login with Passkeys, 2FA & automatic session capture.
        </OTOText>

        <View style={styles.dividerRow}>
          <View style={styles.dividerLine} />
          <OTOText variant="meta" colorRole="disabled" style={styles.dividerText}>OR ENTER COOKIE MANUALLY</OTOText>
          <View style={styles.dividerLine} />
        </View>
      </View>

      <OTOText variant="body" colorRole="secondary" style={styles.instructions}>
        Paste your YouTube Music session cookie below (containing <OTOText weight="bold">SAPISID</OTOText>).
      </OTOText>

      <View style={styles.inputWrapper}>
        <TextInput
          style={styles.cookieInput}
          placeholder="Paste YouTube Music Cookie (e.g., HSID=...; SAPISID=...;)"
          placeholderTextColor={color.text.disabled}
          value={cookieInput}
          onChangeText={onCookieChange}
          multiline
          numberOfLines={4}
          autoCapitalize="none"
          autoCorrect={false}
        />
      </View>

      {error && (
        <View style={styles.errorBanner}>
          <OTOText variant="caption" style={styles.errorText}>{error}</OTOText>
        </View>
      )}

      <Pressable
        style={[styles.primaryButton, isLoading && styles.buttonDisabled]}
        onPress={onConnect}
        disabled={isLoading}
      >
        {isLoading
          ? <ActivityIndicator size="small" color="#000" />
          : <OTOText variant="body" weight="bold" style={styles.primaryButtonText}>Connect Account</OTOText>}
      </Pressable>

      <View style={styles.guideContainer}>
        <OTOText variant="caption" weight="bold" colorRole="secondary">How to get your cookie:</OTOText>
        <OTOText variant="meta" colorRole="tertiary">1. Open music.youtube.com in your web browser.</OTOText>
        <OTOText variant="meta" colorRole="tertiary">2. Open DevTools (F12) → Network tab.</OTOText>
        <OTOText variant="meta" colorRole="tertiary">3. Click any request to music.youtube.com and copy the Cookie header value.</OTOText>
      </View>

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
  );
}

const styles = StyleSheet.create({
  connectSection: { gap: space[3], paddingTop: space[2] },
  nativeSignInWrapper: { gap: space[2], marginBottom: space[2] },
  googleSignInButton: {
    height: 52, backgroundColor: '#1E1E24',
    borderRadius: radius.full, borderWidth: 1.5, borderColor: color.accent.signature,
    alignItems: 'center', justifyContent: 'center',
    shadowColor: color.accent.signature, shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25, shadowRadius: 8, elevation: 4,
  },
  buttonDisabled: { opacity: 0.6 },
  googleButtonText: { color: '#FFFFFF', fontSize: type.body[0] },
  nativeSignInHint: { textAlign: 'center', lineHeight: 18, paddingHorizontal: space[2] },
  dividerRow: { flexDirection: 'row', alignItems: 'center', gap: space[2], marginVertical: space[2] },
  dividerLine: { flex: 1, height: StyleSheet.hairlineWidth, backgroundColor: color.hairline },
  dividerText: { fontSize: 10, letterSpacing: 0.8 },
  instructions: { lineHeight: 20 },
  inputWrapper: {
    backgroundColor: color.bg.s2, borderRadius: radius.md,
    borderWidth: 1, borderColor: color.hairline, padding: space[2],
  },
  cookieInput: {
    color: color.text.primary, fontSize: type.body[0],
    minHeight: 80, textAlignVertical: 'top',
  },
  errorBanner: {
    backgroundColor: 'rgba(239, 68, 68, 0.15)', borderWidth: 1,
    borderColor: color.semantic.error, borderRadius: radius.sm, padding: space[2],
  },
  errorText: { color: color.semantic.error },
  primaryButton: {
    height: 48, backgroundColor: color.accent.signature,
    borderRadius: radius.full, alignItems: 'center', justifyContent: 'center',
  },
  primaryButtonText: { color: '#000000' },
  guideContainer: {
    gap: 4, padding: space[3], backgroundColor: color.bg.s2,
    borderRadius: radius.md, borderWidth: 1, borderColor: color.hairline, marginTop: space[1],
  },
  settingsButton: {
    flexDirection: 'row', alignItems: 'center',
    paddingVertical: 12, paddingHorizontal: space[3],
    backgroundColor: color.bg.s2, borderRadius: radius.md, marginTop: space[3],
  },
  settingsText: { marginLeft: space[2] },
});
