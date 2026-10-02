/**
 * OTONerdStatsSheet — Audiophile Stream Diagnostics Bottom Sheet
 *
 * Clean-room implementation inspired by BitChord's NerdStats.kt architecture.
 * Displays real-time audio stream telemetry, codec, delivery source (Disk Cache,
 * Offline Download, Live CDN), resolution latency, and circuit breaker health.
 *
 * @see docs/DESIGN.md
 * @see BitChord/.ua knowledge graph (NerdStats.kt)
 */

import React from 'react';
import {
  View,
  Text,
  Modal,
  Pressable,
  StyleSheet,
  ScrollView,
} from 'react-native';
import { color, space, radius, type, touchTarget } from '@/design/tokens';
import { useStreamDiagnosticsStore, type DeliverySource } from '../diagnostics/StreamDiagnosticsStore';

interface Props {
  onDismiss?: () => void;
}

function getSourceLabel(source: DeliverySource): { label: string; tagColor: string } {
  switch (source) {
    case 'stream_cache':
      return { label: 'Local Stream Cache (0ms)', tagColor: color.semantic.success };
    case 'offline_download':
      return { label: 'Offline Download (Local File)', tagColor: color.semantic.info };
    case 'direct_saavn_cdn':
      return { label: 'Direct Edge CDN (JioSaavn)', tagColor: color.accent.signature };
    case 'federated_fallback':
      return { label: 'Federated Fallback (Piped)', tagColor: color.semantic.warning };
    default:
      return { label: 'Direct Streaming', tagColor: color.text.tertiary };
  }
}

function getCircuitBreakerLabel(status: 'CLOSED' | 'OPEN' | 'HALF_OPEN'): {
  label: string;
  dotColor: string;
} {
  switch (status) {
    case 'CLOSED':
      return { label: 'CLOSED (Healthy / Operational)', dotColor: color.semantic.success };
    case 'HALF_OPEN':
      return { label: 'HALF_OPEN (Probing Recovery)', dotColor: color.semantic.warning };
    case 'OPEN':
      return { label: 'OPEN (Tripped / Fast-Failing)', dotColor: color.semantic.error };
  }
}

export function OTONerdStatsSheet({ onDismiss }: Props): React.JSX.Element | null {
  const isOpen = useStreamDiagnosticsStore((s) => s.isOpen);
  const close = useStreamDiagnosticsStore((s) => s.close);
  const diag = useStreamDiagnosticsStore((s) => s.current);

  if (!isOpen) return null;

  const handleClose = () => {
    close();
    onDismiss?.();
  };

  const sourceMeta = diag ? getSourceLabel(diag.deliverySource) : null;
  const cbMeta = diag ? getCircuitBreakerLabel(diag.circuitBreakerStatus) : null;

  return (
    <Modal
      visible={isOpen}
      transparent
      animationType="fade"
      onRequestClose={handleClose}
      accessibilityViewIsModal
    >
      <Pressable
        style={styles.backdrop}
        onPress={handleClose}
        accessibilityLabel="Dismiss diagnostics sheet"
      >
        <Pressable
          style={styles.sheet}
          onPress={(e) => e.stopPropagation()}
          accessible
          accessibilityLabel="Stream Diagnostics Modal"
        >
          <View style={styles.header}>
            <View>
              <Text style={styles.title}>Stream Diagnostics</Text>
              <Text style={styles.subtitle}>Stats for Nerds • Live Audio Telemetry</Text>
            </View>
            <Pressable
              onPress={handleClose}
              style={styles.closeButton}
              accessibilityRole="button"
              accessibilityLabel="Close diagnostics"
              hitSlop={touchTarget.android / 4}
            >
              <Text style={styles.closeText}>✕</Text>
            </Pressable>
          </View>

          <ScrollView style={styles.body} contentContainerStyle={styles.bodyContent}>
            {diag ? (
              <>
                <View style={styles.metricCard}>
                  <Text style={styles.metricLabel}>ACTIVE TRACK</Text>
                  <Text style={styles.trackTitle} numberOfLines={1}>{diag.title}</Text>
                  <Text style={styles.trackArtist} numberOfLines={1}>{diag.artist}</Text>
                </View>

                <View style={styles.metricRow}>
                  <View style={[styles.metricCard, styles.halfCard]}>
                    <Text style={styles.metricLabel}>DELIVERY PIPELINE</Text>
                    <Text style={[styles.badgeText, { color: sourceMeta?.tagColor }]}>
                      {sourceMeta?.label}
                    </Text>
                  </View>
                  <View style={[styles.metricCard, styles.halfCard]}>
                    <Text style={styles.metricLabel}>RESOLUTION LATENCY</Text>
                    <Text style={styles.metricValuePrimary}>{diag.resolutionLatencyMs} ms</Text>
                    <Text style={styles.metricValueSecondary}>Edge response</Text>
                  </View>
                </View>

                <View style={styles.metricRow}>
                  <View style={[styles.metricCard, styles.halfCard]}>
                    <Text style={styles.metricLabel}>AUDIO BITRATE</Text>
                    <Text style={styles.metricValuePrimary}>{diag.bitrateKbps} kbps</Text>
                    <Text style={styles.metricValueSecondary}>{diag.codec} Format</Text>
                  </View>
                  <View style={[styles.metricCard, styles.halfCard]}>
                    <Text style={styles.metricLabel}>CIRCUIT BREAKER</Text>
                    <View style={styles.inlineRow}>
                      <View style={[styles.statusDot, { backgroundColor: cbMeta?.dotColor }]} />
                      <Text style={[styles.badgeText, { color: cbMeta?.dotColor }]}>
                        {diag.circuitBreakerStatus}
                      </Text>
                    </View>
                    <Text style={styles.metricValueSecondary}>{cbMeta?.label}</Text>
                  </View>
                </View>

                <View style={styles.metricCard}>
                  <Text style={styles.metricLabel}>RESOLVED STREAM URI</Text>
                  <Text style={styles.uriText} numberOfLines={2} selectable>
                    {diag.uri}
                  </Text>
                </View>
              </>
            ) : (
              <View style={styles.emptyContainer}>
                <Text style={styles.emptyText}>No active stream playback detected.</Text>
              </View>
            )}
          </ScrollView>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: color.bg.s1,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    padding: space[4],
    borderTopWidth: 1,
    borderColor: color.hairline,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: space[3],
    paddingBottom: space[2],
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: color.hairline,
  },
  title: {
    fontSize: type.body[0],
    lineHeight: type.body[1],
    fontWeight: '600',
    color: color.text.primary,
  },
  subtitle: {
    fontSize: type.caption[0],
    lineHeight: type.caption[1],
    color: color.text.tertiary,
    marginTop: space[1],
  },
  closeButton: {
    width: touchTarget.android,
    height: touchTarget.android,
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeText: {
    color: color.text.secondary,
    fontSize: type.track[0],
  },
  body: {
    maxHeight: 400,
  },
  bodyContent: {
    gap: space[2],
    paddingVertical: space[1],
  },
  metricCard: {
    backgroundColor: color.bg.s2,
    borderRadius: radius.md,
    padding: space[3],
    borderWidth: 1,
    borderColor: color.hairline,
  },
  metricRow: {
    flexDirection: 'row',
    gap: space[2],
  },
  halfCard: {
    flex: 1,
  },
  metricLabel: {
    fontSize: type.caption[0],
    fontWeight: '700',
    color: color.text.tertiary,
    letterSpacing: 0.5,
    marginBottom: space[1],
  },
  trackTitle: {
    fontSize: type.track[0],
    lineHeight: type.track[1],
    fontWeight: '600',
    color: color.text.primary,
  },
  trackArtist: {
    fontSize: type.meta[0],
    lineHeight: type.meta[1],
    color: color.text.secondary,
    marginTop: space[1],
  },
  metricValuePrimary: {
    fontSize: type.body[0],
    lineHeight: type.body[1],
    fontWeight: '700',
    color: color.text.primary,
  },
  metricValueSecondary: {
    fontSize: type.caption[0],
    lineHeight: type.caption[1],
    color: color.text.secondary,
    marginTop: space[1],
  },
  badgeText: {
    fontSize: type.meta[0],
    lineHeight: type.meta[1],
    fontWeight: '500',
  },
  inlineRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space[2],
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: radius.full,
  },
  uriText: {
    fontSize: type.caption[0],
    color: color.text.secondary,
    fontFamily: 'monospace',
  },
  emptyContainer: {
    padding: space[5],
    alignItems: 'center',
  },
  emptyText: {
    color: color.text.tertiary,
    fontSize: type.meta[0],
  },
});
