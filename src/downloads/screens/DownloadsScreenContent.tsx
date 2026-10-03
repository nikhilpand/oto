import React, { useEffect, useCallback } from 'react';
import { StyleSheet, Text, View, Alert } from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { color, space, type, fontFamily, BOTTOM_CHROME_HEIGHT } from '@/design/tokens';
import { DownloadIcon } from '@/design/components/OTOIcon';
import { OfflineBanner } from '@/components/OfflineBanner';
import { useDownloadStore } from '../DownloadStore';
import type { DownloadRecord } from '../DownloadDB';
import { StorageSummaryBar } from '../components/StorageSummaryBar';
import { DownloadItemRow } from '../components/DownloadItemRow';

type ListItem =
  | { type: 'storage_header' }
  | { type: 'section'; title: string; count: number }
  | { type: 'download_row'; data: DownloadRecord }
  | { type: 'empty' };

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

function SectionHeader({ title, count }: { title: string; count: number }): React.ReactElement {
  return (
    <View style={styles.sectionHeader}>
      <Text style={styles.sectionTitle}>{title}</Text>
      <Text style={styles.sectionCount}>{count}</Text>
    </View>
  );
}

export function DownloadsScreenContent(): React.ReactElement {
  const insets = useSafeAreaInsets();
  const { records, init, remove } = useDownloadStore();

  useEffect(() => {
    init();
  }, [init]);

  const active = records.filter((r) => r.status === 'downloading' || r.status === 'queued');
  const completed = records.filter((r) => r.status === 'completed');
  const failed = records.filter((r) => r.status === 'failed');
  const allCompleted = [...completed, ...failed];

  const handleRemove = useCallback(
    (id: string) => {
      Alert.alert('Remove Download', 'Delete this file from device?', [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete', style: 'destructive', onPress: () => void remove(id) },
      ]);
    },
    [remove]
  );

  const handleRetry = useCallback((_id: string) => {
    Alert.alert('Retry', 'Re-queue this track to retry the download.');
  }, []);

  const listData: ListItem[] = [{ type: 'storage_header' }];
  if (records.length === 0) {
    listData.push({ type: 'empty' });
  } else {
    if (active.length > 0) {
      listData.push({ type: 'section', title: 'Downloading', count: active.length });
      active.forEach((d) => listData.push({ type: 'download_row', data: d }));
    }
    if (allCompleted.length > 0) {
      listData.push({ type: 'section', title: 'Downloaded', count: allCompleted.length });
      allCompleted.forEach((d) => listData.push({ type: 'download_row', data: d }));
    }
  }

  const renderItem = useCallback(
    ({ item }: { item: ListItem }) => {
      if (item.type === 'storage_header') return <StorageSummaryBar />;
      if (item.type === 'section') return <SectionHeader title={item.title} count={item.count} />;
      if (item.type === 'empty') return <EmptyState />;
      if (item.type === 'download_row') {
        return (
          <DownloadItemRow
            item={item.data}
            onRemove={handleRemove}
            onRetry={item.data.status === 'failed' ? handleRetry : undefined}
          />
        );
      }
      return null;
    },
    [handleRemove, handleRetry]
  );

  const keyExtractor = useCallback((item: ListItem, index: number) => {
    if (item.type === 'download_row') return `row-${item.data.id}`;
    if (item.type === 'section') return `sec-${item.title}`;
    return `${item.type}-${index}`;
  }, []);

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <OfflineBanner />
      <FlashList
        data={listData}
        renderItem={renderItem}
        keyExtractor={keyExtractor}
        contentContainerStyle={{ paddingBottom: BOTTOM_CHROME_HEIGHT + space[4] }}
        showsVerticalScrollIndicator={false}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: color.bg.base },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: space[4],
    paddingTop: space[4],
    paddingBottom: space[2],
  },
  sectionTitle: {
    fontSize: type.caption[0],
    lineHeight: type.caption[1],
    fontFamily: fontFamily.bold,
    color: color.text.tertiary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  sectionCount: {
    fontSize: type.caption[0],
    fontFamily: fontFamily.regular,
    color: color.text.disabled,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: space[6],
    paddingTop: space[8],
  },
  emptyTitle: {
    fontSize: type.title[0],
    fontFamily: fontFamily.bold,
    color: color.text.primary,
    marginTop: space[4],
    marginBottom: space[2],
  },
  emptySubtitle: {
    fontSize: type.body[0],
    fontFamily: fontFamily.regular,
    color: color.text.tertiary,
    textAlign: 'center',
    lineHeight: type.body[1],
  },
});
