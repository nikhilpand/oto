import React from 'react';
import { StyleSheet, Text, View, TouchableOpacity } from 'react-native';
import { Image } from 'expo-image';
import { color, space, radius, type, fontFamily } from '@/design/tokens';
import { DownloadIcon, TrashIcon, AlertIcon, ClockIcon } from '@/design/components/OTOIcon';
import type { DownloadRecord } from '../DownloadDB';

interface DownloadItemRowProps {
  item: DownloadRecord;
  onRemove: (id: string) => void;
  onRetry?: (id: string) => void;
}

function StatusBadge({ status }: { status: DownloadRecord['status'] }): React.ReactElement | null {
  if (status === 'completed') return <DownloadIcon size={14} color={color.semantic.success} />;
  if (status === 'failed') return <AlertIcon size={14} color={color.semantic.error} />;
  if (status === 'queued') return <ClockIcon size={14} color={color.text.tertiary} />;
  return null;
}

export const DownloadItemRow = React.memo(function DownloadItemRow({
  item,
  onRemove,
  onRetry,
}: DownloadItemRowProps): React.ReactElement {
  const { track, status, progress } = item;
  const fileSizeMB = (item.fileSizeBytes / (1024 * 1024)).toFixed(1);
  const pct = Math.round(progress * 100);

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
        <Text style={styles.trackTitle} numberOfLines={1}>{track.title}</Text>
        <Text style={styles.trackArtist} numberOfLines={1}>{track.artist}</Text>
        {status === 'downloading' ? (
          <View style={styles.progressBarContainer}>
            <View style={[styles.progressBarFill, { width: `${pct}%` as `${number}%` }]} />
          </View>
        ) : (
          <View style={styles.rowMeta}>
            <StatusBadge status={status} />
            <Text style={styles.metaText}>
              {status === 'completed' ? `${fileSizeMB} MB` : status === 'queued' ? 'Queued' : 'Failed'}
            </Text>
          </View>
        )}
      </View>

      {status === 'downloading' && (
        <View style={styles.progressRing}><Text style={styles.progressText}>{pct}%</Text></View>
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

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: space[4],
    paddingVertical: space[3],
    minHeight: 64,
  },
  artwork: {
    width: 48,
    height: 48,
    borderRadius: radius.sm,
    backgroundColor: color.bg.s2,
    marginRight: space[3],
  },
  rowInfo: { flex: 1, marginRight: space[3] },
  trackTitle: {
    fontSize: type.body[0],
    lineHeight: type.body[1],
    fontFamily: fontFamily.medium,
    color: color.text.primary,
    marginBottom: 2,
  },
  trackArtist: {
    fontSize: type.caption[0],
    lineHeight: type.caption[1],
    fontFamily: fontFamily.regular,
    color: color.text.secondary,
  },
  progressBarContainer: {
    height: 3,
    backgroundColor: color.bg.s3,
    borderRadius: radius.xs,
    overflow: 'hidden',
    marginTop: space[1],
  },
  progressBarFill: {
    height: 3,
    backgroundColor: color.accent.signature,
    borderRadius: radius.xs,
  },
  rowMeta: { flexDirection: 'row', alignItems: 'center', marginTop: space[1], gap: space[1] },
  metaText: {
    fontSize: type.caption[0],
    lineHeight: type.caption[1],
    fontFamily: fontFamily.regular,
    color: color.text.tertiary,
  },
  progressRing: {
    width: 38,
    height: 38,
    borderRadius: 19,
    borderWidth: 2,
    borderColor: color.accent.signature,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: space[2],
  },
  progressText: {
    fontSize: 10,
    fontFamily: fontFamily.medium,
    color: color.text.primary,
  },
  actionBtn: {
    paddingHorizontal: space[3],
    paddingVertical: space[1],
    backgroundColor: color.bg.s2,
    borderRadius: radius.full,
    marginRight: space[2],
  },
  retryText: {
    fontSize: type.caption[0],
    fontFamily: fontFamily.medium,
    color: color.semantic.error,
  },
  trashBtn: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
