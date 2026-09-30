/**
 * DownloadStatusBadge
 *
 * Accessible download status badge using icon + text (never color alone).
 * WCAG 1.4.1 compliant — status is always text-labeled.
 */

import { StyleSheet, View } from 'react-native';
import { color, radius, space } from '@/design/tokens';
import { OTOText } from '@/design/components/OTOText';
import type { DownloadState } from '../types';

interface Props {
  state: DownloadState;
}

interface BadgeConfig {
  icon: string;
  label: string;
  textColor: string;
  bgColor: string;
}

function getBadgeConfig(state: DownloadState): BadgeConfig | null {
  switch (state.status) {
    case 'downloaded':
      return {
        icon: '↓',
        label: 'Downloaded',
        textColor: color.semantic.success,
        bgColor: color.semantic.success + '1A',
      };
    case 'downloading':
      return {
        icon: '↓',
        label: `${state.progress ?? 0}%`,
        textColor: color.accent.signatureLight,
        bgColor: color.accent.signature + '1A',
      };
    case 'queued':
      return {
        icon: '◷',
        label: 'Queued',
        textColor: color.text.tertiary,
        bgColor: color.bg.s3,
      };
    case 'failed':
      return {
        icon: '⚠',
        label: 'Failed',
        textColor: color.semantic.error,
        bgColor: color.semantic.error + '1A',
      };
    case 'none':
      return null;
  }
}

export function DownloadStatusBadge({ state }: Props) {
  const config = getBadgeConfig(state);
  if (!config) return null;

  return (
    <View
      style={[styles.badge, { backgroundColor: config.bgColor }]}
      accessibilityLabel={`Download status: ${config.label}`}
    >
      <OTOText variant="caption" customColor={config.textColor} style={styles.icon}>
        {config.icon}
      </OTOText>
      <OTOText variant="caption" customColor={config.textColor}>
        {config.label}
      </OTOText>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: radius.full,
    paddingHorizontal: space[2],
    paddingVertical: 2,
    alignSelf: 'flex-start',
    gap: 3,
  },
  icon: {
    fontSize: 10,
  },
});
