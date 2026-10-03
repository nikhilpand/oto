import React from 'react';
import { View, StyleSheet, Pressable } from 'react-native';
import * as Haptics from 'expo-haptics';
import { space, radius } from '@/design/tokens';
import { OTOText } from '@/design/components/OTOText';
import { DownloadIcon, FolderMusicIcon, ServerIcon } from '@/design/components/OTOIcon';

export interface OnDeviceHubSectionProps {
  downloadCount?: number;
  onDownloadsPress?: () => void;
  onLocalPress?: () => void;
  onWebDAVPress?: () => void;
}

export function OnDeviceHubSection({
  downloadCount = 0,
  onDownloadsPress,
  onLocalPress,
  onWebDAVPress,
}: OnDeviceHubSectionProps): React.JSX.Element {
  return (
    <View style={styles.container}>
      <OTOText variant="section" weight="bold" style={styles.title}>
        On Device
      </OTOText>

      <View style={styles.cardsRow}>
        {/* Downloads Card */}
        <Pressable
          accessible
          accessibilityRole="button"
          accessibilityLabel={`Offline downloads: ${downloadCount} tracks`}
          onPress={() => {
            void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            onDownloadsPress?.();
          }}
          style={[styles.card, styles.downloadsCard]}
        >
          <View style={styles.iconCircle}>
            <DownloadIcon size={20} color="#93C5FD" />
          </View>
          <OTOText variant="body" weight="semibold" customColor="#EFF6FF">
            Downloads
          </OTOText>
          <OTOText variant="meta" customColor="#93C5FD">
            {`${downloadCount} tracks`}
          </OTOText>
        </Pressable>

        {/* Local Music Card */}
        <Pressable
          accessible
          accessibilityRole="button"
          accessibilityLabel="Local device music"
          onPress={() => {
            void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            onLocalPress?.();
          }}
          style={[styles.card, styles.localCard]}
        >
          <View style={styles.iconCircle}>
            <FolderMusicIcon size={20} color="#6EE7B7" />
          </View>
          <OTOText variant="body" weight="semibold" customColor="#ECFDF5">
            Local Music
          </OTOText>
          <OTOText variant="meta" customColor="#6EE7B7">
            Storage
          </OTOText>
        </Pressable>

        {/* WebDAV Card */}
        <Pressable
          accessible
          accessibilityRole="button"
          accessibilityLabel="WebDAV network storage"
          onPress={() => {
            void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            onWebDAVPress?.();
          }}
          style={[styles.card, styles.webdavCard]}
        >
          <View style={styles.iconCircle}>
            <ServerIcon size={20} color="#C7D2FE" />
          </View>
          <OTOText variant="body" weight="semibold" customColor="#EEF2FF">
            WebDAV
          </OTOText>
          <OTOText variant="meta" customColor="#C7D2FE">
            Network
          </OTOText>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: space[4],
    marginBottom: space[4],
  },
  title: {
    marginBottom: space[3],
  },
  cardsRow: {
    flexDirection: 'row',
    gap: space[2],
  },
  card: {
    flex: 1,
    borderRadius: radius.lg,
    padding: space[3],
    alignItems: 'flex-start',
    gap: space[1],
    borderWidth: 1,
    minHeight: 104,
    justifyContent: 'space-between',
  },
  downloadsCard: {
    backgroundColor: '#1E293B',
    borderColor: 'rgba(59, 130, 246, 0.3)',
  },
  localCard: {
    backgroundColor: '#064E3B',
    borderColor: 'rgba(16, 185, 129, 0.3)',
  },
  webdavCard: {
    backgroundColor: '#312E81',
    borderColor: 'rgba(99, 102, 241, 0.3)',
  },
  iconCircle: {
    width: 34,
    height: 34,
    borderRadius: radius.full,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: space[1],
  },
});
