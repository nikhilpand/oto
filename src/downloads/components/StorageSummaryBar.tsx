import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { color, space, radius, type, fontFamily } from '@/design/tokens';
import { getTotalDownloadedBytes } from '../DownloadDB';
import { getDeviceStorageInfo } from '../DownloadEngine';

export function StorageSummaryBar(): React.ReactElement {
  const [info, setInfo] = useState({ freeBytes: 0, totalBytes: 0 });
  const [usedBytes] = useState(() => getTotalDownloadedBytes());

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
        <View style={[styles.storageBarFill, { width: `${fillRatio * 100}%` as `${number}%` }]} />
      </View>
      <Text style={styles.storageMeta}>
        {usedMB} MB used · {freeGB} GB free of {totalGB} GB
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
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
  },
  storageMeta: {
    fontSize: type.caption[0],
    lineHeight: type.caption[1],
    fontFamily: fontFamily.regular,
    color: color.text.tertiary,
  },
});
