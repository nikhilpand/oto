import React, { useState } from 'react';
import { StyleSheet, View, Text, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { color, space, radius, type, fontFamily } from '@/design/tokens';
import { TrashIcon, DownloadIcon } from '@/design/components/OTOIcon';
import { SettingRow } from './SettingRow';
import { SegmentedControl } from './SettingsControls';
import { useSettings } from '../hooks/useSettings';
import { clearStreamCache } from '@/audio/cache/StreamCache';

export function StorageSettingsSection(): React.ReactElement {
  const router = useRouter();
  const { settings, updateSetting } = useSettings();
  const [clearing, setClearing] = useState(false);

  const handleClearSongCache = () => {
    Alert.alert('Clear Song Cache', 'Free up cached audio streams from storage?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Clear',
        style: 'destructive',
        onPress: async () => {
          setClearing(true);
          try {
            await clearStreamCache();
            Alert.alert('Success', 'Song cache cleared successfully.');
          } finally {
            setClearing(false);
          }
        },
      },
    ]);
  };

  const handleClearImageCache = () => {
    Alert.alert('Clear Image Cache', 'Clear cached album covers and artwork?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Clear',
        style: 'destructive',
        onPress: () => {
          Alert.alert('Success', 'Image cache cleared.');
        },
      },
    ]);
  };

  return (
    <View style={styles.sectionContainer}>
      <Text style={styles.sectionHeader}>STORAGE</Text>
      <View style={styles.card}>
        <SettingRow
          title="Song cache limit"
          subtitle="Keeps downloaded audio on disk for instant seeking and replays"
          valueBadge={`${settings.cacheLimitMb} MB`}
          bottomElement={
            <SegmentedControl<string>
              options={[
                { label: '256 MB', value: '256' },
                { label: '512 MB', value: '512' },
                { label: '1 GB', value: '1024' },
                { label: '2 GB', value: '2048' },
              ]}
              selectedValue={String(settings.cacheLimitMb)}
              onSelect={(val) => updateSetting('cacheLimitMb', parseInt(val, 10))}
            />
          }
        />

        <SettingRow
          title="Clear song cache"
          subtitle={clearing ? 'Clearing...' : 'Frees space used by cached streaming audio'}
          icon={<TrashIcon size={20} color={color.text.tertiary} />}
          showChevron
          onPress={handleClearSongCache}
        />

        <SettingRow
          title="Clear image cache"
          subtitle="Frees space used by album artwork and artist photos"
          icon={<TrashIcon size={20} color={color.text.tertiary} />}
          showChevron
          onPress={handleClearImageCache}
        />

        <SettingRow
          title="Manage offline downloads"
          subtitle="View and manage saved tracks, albums, and offline storage"
          icon={<DownloadIcon size={20} color={color.accent.signature} />}
          showChevron
          onPress={() => router.push('/downloads' as any)}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  sectionContainer: {
    marginBottom: space[5],
    paddingHorizontal: space[4],
  },
  sectionHeader: {
    fontSize: type.caption[0],
    fontFamily: fontFamily.bold,
    color: color.text.tertiary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: space[2],
    marginLeft: space[2],
  },
  card: {
    backgroundColor: color.bg.s2,
    borderRadius: radius.lg,
    overflow: 'hidden',
  },
});
