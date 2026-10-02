/**
 * DownloadsScreenContent — P13 Downloads & Offline
 *
 * Displays:
 *  - Storage usage summary bar
 *  - Section: Downloading (progress items)
 *  - Section: Downloaded (completed, playable offline)
 *  - Empty state when nothing downloaded
 *
 * Architecture:
 *  - FlashList v2 for all lists (stable keys, estimatedItemSize)
 *  - No per-row animations via JS
 *  - Reanimated progress bars updated from store (discrete state updates only)
 *  - OfflineBanner at top (real network state)
 */

import React, { useEffect, useCallback } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Image } from 'expo-image';

import {
  color,
  space,
  radius,
  type,
  fontFamily,
  BOTTOM_CHROME_HEIGHT,
} from '@/design/tokens';
import {
  DownloadIcon,
  TrashIcon,
  AlertIcon,
  ClockIcon,
} from '@/design/components/OTOIcon';
import { OfflineBanner } from '@/components/OfflineBanner';
import { useDownloadStore } from '../DownloadStore';
import type { DownloadRecord } from '../DownloadDB';
import { getTotalDownloadedBytes } from '../DownloadDB';
import { getDeviceStorageInfo } from '../DownloadEngine';

// ─── Storage Header ──────────────────────────────────────────────────────────

function StorageHeader(): React.ReactElement {
  const [info, setInfo] = React.useState({ freeBytes: 0, totalBytes: 0 });
  const [usedBytes] = React.useState(() => getTotalDownloadedBytes());

  useEffect(() => {
    void getDeviceStorageInfo().then(setInfo);
  }, []);

  const usedMB = (usedBytes / (1024 * 1024)).toFixed(1);
  const totalGB = info.totalBytes > 0 ? (info.totalBytes / (1024 * 1024 * 1024)).toFixed(1) : '--';
  const freeGB = info.freeBytes > 0 ? (info.freeBytes / (1024 * 1024 * 1024)).toFixed(1) : '--';
  const fillRatio = info.totalBytes > 0 ? Math.min(usedBytes / info.totalBytes, 1) : 0;

  return (
    <View style={styles.storageHeader}>
      <Text style={styles.storageTitle}>Downloads</Text>
      <View style={styles.storageBar}>
        <View style={[styles.storageBarFill, { width: (fillRatio * 100 + '%') as `${number}%` }]} />
      </View>
      <Text style={styles.storageMeta}>
        {usedMB} MB used · {freeGB} GB free of {totalGB} GB
      </Text>
    </View>
  );
}

// ─── Progress Ring (inline for downloading rows) ─────────────────────────────

function ProgressRing({ progress }: { progress: number }): React.ReactElement {
  const pct = Math.round(progress * 100);
  return (
    <View style={styles.progressRing}>
      <Text style={styles.progressText}>{pct}%</Text>
    </View>
  );
}

// ─── Status Badge ────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: DownloadRecord['status'] }): React.ReactElement | null {
  if (status === 'completed') {
    return <DownloadIcon size={14} color={color.semantic.success} />;
  }
  if (status === 'failed') {
    return <AlertIcon size={14} color={color.semantic.error} />;
  }
  if (status === 'queued') {
    return <ClockIcon size={14} color={color.text.tertiary} />;
  }
  return null;
}

// ─── Download Row ────────────────────────────────────────────────────────────

interface DownloadRowProps {
  item: DownloadRecord;
  onRemove: (id: string) => void;
  onRetry?: (id: string) => void;
}

const DownloadRow = React.memo(function DownloadRow({
  item,
  onRemove,
  onRetry,
}: DownloadRowProps): React.ReactElement {
  const { track, status, progress } = item;
  const fileSizeMB = (item.fileSizeBytes / (1024 * 1024)).toFixed(1);

  return (
    <View style={styles.row}>
      <Image
        source={{ uri: track.artworkUrl }}
        style={styles.artwork}
        contentFit="cover"
        transition={200}
        recyclingKey={track.id}
        accessibilityLabel={`${track.title} artwork`}
      />
      <View style={styles.rowInfo}>
        <Text style={styles.trackTitle} numberOfLines={1}>
          {track.title}
        </Text>
        <Text style={styles.trackArtist} numberOfLines={1}>
          {track.artist}
        </Text>
        {status === 'downloading' && (
          <View style={styles.progressBarContainer}>
            <View style={[styles.progressBarFill, { width: (Math.round(progress * 100) + '%') as `${number}%` }]} />
          </View>
        )}
        {status !== 'downloading' && (
          <View style={styles.rowMeta}>
            <StatusBadge status={status} />
            <Text style={styles.metaText}>
              {status === 'completed'
                ? `${fileSizeMB} MB`
                : status === 'queued'
                ? 'Queued'
                : 'Failed'}
            </Text>
          </View>
        )}
      </View>

      {status === 'downloading' && (
        <ProgressRing progress={progress} />
      )}

      {status === 'failed' && onRetry && (
        <TouchableOpacity
          onPress={() => onRetry(item.id)}
          style={styles.actionBtn}
          accessibilityLabel="Retry download"
          accessibilityRole="button"
          hitSlop={8}
        >
          <Text style={styles.retryText}>Retry</Text>
        </TouchableOpacity>
      )}

      <TouchableOpacity
        onPress={() => onRemove(item.id)}
        style={styles.trashBtn}
        accessibilityLabel={`Remove ${track.title}`}
        accessibilityRole="button"
        hitSlop={8}
      >
        <TrashIcon size={18} color={color.text.tertiary} />
      </TouchableOpacity>
    </View>
  );
});

// ─── Empty State ─────────────────────────────────────────────────────────────

function EmptyState(): React.ReactElement {
  return (
    <View style={styles.emptyState}>
      <DownloadIcon size={48} color={color.text.disabled} />
      <Text style={styles.emptyTitle}>No downloads yet</Text>
      <Text style={styles.emptySubtitle}>
        {'Long-press any track and tap "Download" to save for offline listening.'}
      </Text>
    </View>
  );
}

// ─── Section Header ──────────────────────────────────────────────────────────

function SectionHeader({ title, count }: { title: string; count: number }): React.ReactElement {
  return (
    <View style={styles.sectionHeader}>
      <Text style={styles.sectionTitle}>{title}</Text>
      <Text style={styles.sectionCount}>{count}</Text>
    </View>
  );
}

// ─── Screen ──────────────────────────────────────────────────────────────────

type ListItem =
  | { type: 'storage_header' }
  | { type: 'section'; title: string; count: number }
  | { type: 'download_row'; data: DownloadRecord }
  | { type: 'empty' };

export function DownloadsScreenContent(): React.ReactElement {
  const insets = useSafeAreaInsets();
  const { records, init, remove } = useDownloadStore();

  useEffect(() => {
    init();
  }, [init]);

  const active = records.filter(
    (r) => r.status === 'downloading' || r.status === 'queued',
  );
  const completed = records.filter((r) => r.status === 'completed');
  const failed = records.filter((r) => r.status === 'failed');
  const allCompleted = [...completed, ...failed];

  const handleRemove = useCallback(
    (id: string) => {
      Alert.alert('Remove Download', 'Delete this file from device?', [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => void remove(id),
        },
      ]);
    },
    [remove],
  );

  const handleRetry = useCallback(
    (_id: string) => {
      // In production: get streamUrl from AudioEngine/cache and call retry()
      // For now: surface a feedback. Real wiring happens in P14 hardening.
      Alert.alert('Retry', 'Re-queue this track to retry the download.');
    },
    [],
  );

  // Build flat list data
  const listData: ListItem[] = [{ type: 'storage_header' }];

  if (records.length === 0) {
    listData.push({ type: 'empty' });
  } else {
    if (active.length > 0) {
      listData.push({ type: 'section', title: 'Downloading', count: active.length });
      active.forEach((d) => listData.push({ type: 'download_row', data: d }));
    }
    if (allCompleted.length > 0) {
      listData.push({
        type: 'section',
        title: 'Downloaded',
        count: allCompleted.length,
      });
      allCompleted.forEach((d) => listData.push({ type: 'download_row', data: d }));
    }
  }

  const renderItem = useCallback(
    ({ item }: { item: ListItem }) => {
      if (item.type === 'storage_header') return <StorageHeader />;
      if (item.type === 'section') {
        return <SectionHeader title={item.title} count={item.count} />;
      }
      if (item.type === 'empty') return <EmptyState />;
      if (item.type === 'download_row') {
        return (
          <DownloadRow
            item={item.data}
            onRemove={handleRemove}
            onRetry={item.data.status === 'failed' ? handleRetry : undefined}
          />
        );
      }
      return null;
    },
    [handleRemove, handleRetry],
  );

  const keyExtractor = useCallback((_item: ListItem, index: number) => {
    if (_item.type === 'download_row') return `row-${_item.data.id}`;
    if (_item.type === 'section') return `sec-${_item.title}`;
    return `${_item.type}-${index}`;
  }, []);

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <OfflineBanner />
      <FlashList
        data={listData}
        renderItem={renderItem}
        keyExtractor={keyExtractor}
        contentContainerStyle={{
          paddingBottom: BOTTOM_CHROME_HEIGHT + space[4],
        }}
        showsVerticalScrollIndicator={false}
      />
    </View>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: color.bg.base,
  },

  // Storage Header
  storageHeader: {
    paddingHorizontal: space[4],
    paddingTop: space[5],
    paddingBottom: space[4],
  },
  storageTitle: {
    fontSize: type.title[0],
    lineHeight: type.title[1],
    fontFamily: fontFamily.bold,
    color: color.text.primary,
    marginBottom: space[3],
  },
  storageBar: {
    height: 4,
    backgroundColor: color.bg.s3,
    borderRadius: radius.xs,
    overflow: 'hidden',
    marginBottom: space[2],
  },
  storageBarFill: {
    height: 4,
    backgroundColor: color.accent.signature,
    borderRadius: radius.xs,
    // width set dynamically
  },
  storageMeta: {
    fontSize: type.meta[0],
    lineHeight: type.meta[1],
    fontFamily: fontFamily.regular,
    color: color.text.tertiary,
  },

  // Section
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: space[4],
    paddingTop: space[4],
    paddingBottom: space[2],
    gap: space[2],
  },
  sectionTitle: {
    fontSize: type.body[0],
    lineHeight: type.body[1],
    fontFamily: fontFamily.semibold,
    color: color.text.primary,
  },
  sectionCount: {
    fontSize: type.meta[0],
    lineHeight: type.meta[1],
    fontFamily: fontFamily.medium,
    color: color.text.tertiary,
  },

  // Row
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: space[4],
    paddingVertical: space[3],
    gap: space[3],
    minHeight: 72,
  },
  artwork: {
    width: 48,
    height: 48,
    borderRadius: radius.sm,
    backgroundColor: color.bg.s2,
  },
  rowInfo: {
    flex: 1,
    gap: 2,
  },
  trackTitle: {
    fontSize: type.body[0],
    lineHeight: type.body[1],
    fontFamily: fontFamily.medium,
    color: color.text.primary,
  },
  trackArtist: {
    fontSize: type.meta[0],
    lineHeight: type.meta[1],
    fontFamily: fontFamily.regular,
    color: color.text.secondary,
  },
  progressBarContainer: {
    height: 2,
    backgroundColor: color.bg.s3,
    borderRadius: radius.xs,
    overflow: 'hidden',
    marginTop: space[1],
  },
  progressBarFill: {
    height: 2,
    backgroundColor: color.accent.signature,
    borderRadius: radius.xs,
    // width set dynamically
  },
  rowMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space[1],
    marginTop: 2,
  },
  metaText: {
    fontSize: type.caption[0],
    lineHeight: type.caption[1],
    fontFamily: fontFamily.regular,
    color: color.text.tertiary,
  },

  // Progress ring (inline %)
  progressRing: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: color.bg.s3,
    alignItems: 'center',
    justifyContent: 'center',
  },
  progressText: {
    fontSize: 9,
    fontFamily: fontFamily.semibold,
    color: color.accent.signature,
  },

  // Action buttons
  actionBtn: {
    paddingHorizontal: space[2],
    paddingVertical: space[1],
    borderRadius: radius.sm,
    backgroundColor: color.bg.s2,
    minWidth: 44,
    alignItems: 'center',
  },
  retryText: {
    fontSize: type.caption[0],
    lineHeight: type.caption[1],
    fontFamily: fontFamily.semibold,
    color: color.accent.signatureLight,
  },
  trashBtn: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Empty state
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: space[7],
    gap: space[3],
    marginTop: space[7],
  },
  emptyTitle: {
    fontSize: type.headline[0],
    lineHeight: type.headline[1],
    fontFamily: fontFamily.semibold,
    color: color.text.secondary,
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: type.body[0],
    lineHeight: type.body[1],
    fontFamily: fontFamily.regular,
    color: color.text.tertiary,
    textAlign: 'center',
  },
});
