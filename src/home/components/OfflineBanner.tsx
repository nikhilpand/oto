/**
 * OfflineBanner — Designed Offline State Notice with Cached Filter
 *
 * Implements graceful offline notification (docs/prompts/P08_home.md)
 * informing the listener that cached & downloaded music remains playable.
 */

import React from 'react';
import { View, StyleSheet, Pressable } from 'react-native';
import { color, space, radius } from '@/design/tokens';
import { OTOText } from '@/design/components/OTOText';
import { CloudOfflineIcon } from '@/design/components/OTOIcon';

export interface OfflineBannerProps {
  isOffline: boolean;
  onRetry?: () => void;
  cachedOnlyActive?: boolean;
  onToggleCachedOnly?: () => void;
}

export function OfflineBanner({
  isOffline,
  onRetry,
  cachedOnlyActive,
  onToggleCachedOnly,
}: OfflineBannerProps): React.JSX.Element | null {
  if (!isOffline) return null;

  return (
    <View style={styles.container}>
      <View style={styles.banner}>
        <CloudOfflineIcon color={color.semantic.warning} />

        <View style={styles.textContainer}>
          <OTOText variant="caption" weight="bold" colorRole="primary">
            Offline Mode
          </OTOText>
          <OTOText variant="meta" colorRole="secondary">
            Showing cached tracks available for local playback
          </OTOText>
        </View>

        {onToggleCachedOnly && (
          <Pressable
            accessible
            accessibilityRole="button"
            accessibilityLabel={cachedOnlyActive ? 'Show all tracks' : 'Filter cached tracks only'}
            onPress={onToggleCachedOnly}
            style={[
              styles.filterPill,
              cachedOnlyActive && styles.filterPillActive,
            ]}
          >
            <OTOText
              variant="meta"
              weight="semibold"
              colorRole={cachedOnlyActive ? 'primary' : 'secondary'}
            >
              {cachedOnlyActive ? 'Cached Only' : 'All'}
            </OTOText>
          </Pressable>
        )}

        {onRetry && (
          <Pressable
            accessible
            accessibilityRole="button"
            accessibilityLabel="Retry connection"
            onPress={onRetry}
            style={styles.retryButton}
          >
            <OTOText variant="meta" weight="bold" colorRole="accent">
              Retry
            </OTOText>
          </Pressable>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: space[3],
    marginBottom: space[3],
  },
  banner: {
    backgroundColor: color.bg.s2,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: 'rgba(234, 179, 8, 0.3)', // subtle warm amber
    flexDirection: 'row',
    alignItems: 'center',
    padding: space[2],
    gap: space[2],
  },
  textContainer: {
    flex: 1,
    gap: 1,
  },
  cloudWrapper: {
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cloudBody: {
    width: 18,
    height: 12,
    borderRadius: 6,
    borderWidth: 1.5,
  },
  slashLine: {
    position: 'absolute',
    width: 20,
    height: 1.5,
    transform: [{ rotate: '-45deg' }],
  },
  filterPill: {
    paddingHorizontal: space[2],
    paddingVertical: 4,
    borderRadius: radius.full,
    backgroundColor: color.bg.s3,
  },
  filterPillActive: {
    backgroundColor: color.accent.signature,
  },
  retryButton: {
    paddingHorizontal: space[2],
    paddingVertical: 4,
  },
});
