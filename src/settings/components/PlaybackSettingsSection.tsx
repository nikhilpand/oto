import React from 'react';
import { StyleSheet, View, Text } from 'react-native';
import { color, space, radius, type, fontFamily } from '@/design/tokens';
import { SettingRow } from './SettingRow';
import { SettingSwitch, SegmentedControl } from './SettingsControls';
import { useSettings } from '../hooks/useSettings';

export function PlaybackSettingsSection(): React.ReactElement {
  const { settings, updateSetting } = useSettings();

  return (
    <View style={styles.sectionContainer}>
      <Text style={styles.sectionHeader}>PLAYBACK</Text>
      <View style={styles.card}>
        <SettingRow
          title="Prefer music-only version"
          subtitle="For music videos, show the video details while finding and loading the catalogue audio version"
          rightElement={
            <SettingSwitch
              value={settings.preferMusicOnly}
              onValueChange={(val) => updateSetting('preferMusicOnly', val)}
              accessibilityLabel="Prefer music-only version"
            />
          }
        />

        <SettingRow
          title="Output precision"
          subtitle="AudioTrack · 48.0 kHz · 32-bit float precision"
          bottomElement={
            <SegmentedControl<'16bit' | '32bit_float'>
              options={[
                { label: '16-bit PCM', value: '16bit' },
                { label: '32-bit float', value: '32bit_float' },
              ]}
              selectedValue={settings.outputPrecision}
              onSelect={(val) => updateSetting('outputPrecision', val)}
            />
          }
        />

        <SettingRow
          title="Prefer USB DAC"
          subtitle="Send direct bit-perfect PCM streams to external USB DACs"
          rightElement={
            <SettingSwitch
              value={settings.preferUsbDac}
              onValueChange={(val) => updateSetting('preferUsbDac', val)}
              accessibilityLabel="Prefer USB DAC"
            />
          }
        />

        <SettingRow
          title="Loudness normalization"
          subtitle="Match volume levels across all tracks using ReplayGain"
          rightElement={
            <SettingSwitch
              value={settings.normalizeAudio}
              onValueChange={(val) => updateSetting('normalizeAudio', val)}
              accessibilityLabel="Loudness normalization"
            />
          }
        />

        <SettingRow
          title="Skip silence"
          subtitle="Trim gaps longer than a second at the start and end of tracks"
          rightElement={
            <SettingSwitch
              value={settings.skipSilence}
              onValueChange={(val) => updateSetting('skipSilence', val)}
              accessibilityLabel="Skip silence"
            />
          }
        />

        <SettingRow
          title="Spatial audio & Dolby Atmos"
          subtitle="Play immersive, surround audio version when available"
          rightElement={
            <SettingSwitch
              value={settings.dolbyAtmos}
              onValueChange={(val) => updateSetting('dolbyAtmos', val)}
              accessibilityLabel="Spatial audio and Dolby Atmos"
            />
          }
        />

        <SettingRow
          title="Equalizer"
          subtitle="Tone, seven bands and balance"
          showChevron
          onPress={() => {}}
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
