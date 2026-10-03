/**
 * DetailStateView.tsx — Reusable Loading and Error State Container for Detail Screens
 */

import { View, StyleSheet, ActivityIndicator, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { color, space, radius } from '@/design/tokens';
import { OTOText } from '@/design/components/OTOText';
import { OTOArtwork } from '@/design/components/OTOArtwork';

export interface DetailStateViewProps {
  readonly isLoading?: boolean;
  readonly errorMessage?: string | null;
  readonly title?: string;
  readonly subtitle?: string;
  readonly artworkUrl?: string;
  readonly onBack: () => void;
}

export function DetailStateView({
  isLoading,
  errorMessage,
  title,
  subtitle,
  artworkUrl,
  onBack,
}: DetailStateViewProps) {
  return (
    <SafeAreaView edges={['top']} style={styles.container}>
      <View style={styles.navBar}>
        <Pressable
          onPress={onBack}
          style={styles.backBtn}
          accessible
          accessibilityRole="button"
          accessibilityLabel="Go back"
        >
          <OTOText variant="body" colorRole="primary">
            ‹
          </OTOText>
        </Pressable>
      </View>
      <View style={styles.centerBody}>
        {artworkUrl ? (
          <OTOArtwork
            uri={artworkUrl}
            size={160}
            borderRadius={radius.md}
            style={styles.artwork}
          />
        ) : null}
        <OTOText variant="headline" weight="bold" style={styles.title}>
          {title || (isLoading ? 'Loading...' : 'Detail')}
        </OTOText>
        {subtitle ? (
          <OTOText variant="caption" colorRole="secondary">
            {subtitle}
          </OTOText>
        ) : null}
        {isLoading ? (
          <ActivityIndicator
            size="large"
            color={color.accent.signature}
            style={styles.spinner}
          />
        ) : (
          <>
            <OTOText variant="body" colorRole="secondary" style={styles.errorText}>
              {errorMessage || 'Information could not be loaded.'}
            </OTOText>
            <Pressable style={styles.goBackBtn} onPress={onBack}>
              <OTOText variant="body" weight="bold" colorRole="primary">
                Go Back
              </OTOText>
            </Pressable>
          </>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: color.bg.base,
  },
  navBar: {
    height: 48,
    paddingHorizontal: space[3],
    justifyContent: 'center',
  },
  backBtn: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  centerBody: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: space[4],
    gap: space[2],
  },
  artwork: {
    marginBottom: space[3],
  },
  title: {
    textAlign: 'center',
  },
  spinner: {
    marginTop: space[4],
  },
  errorText: {
    textAlign: 'center',
    marginTop: space[2],
  },
  goBackBtn: {
    marginTop: space[4],
    paddingHorizontal: space[4],
    paddingVertical: space[2],
    backgroundColor: color.bg.s2,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: color.hairline,
  },
});
