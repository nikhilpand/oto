import React from 'react';
import { StyleSheet, View, Text } from 'react-native';
import { color, space, radius, type, fontFamily } from '@/design/tokens';
import { SettingRow } from './SettingRow';
import { SettingSwitch, SegmentedControl } from './SettingsControls';
import { useSettings } from '../hooks/useSettings';

export function AppearanceSettingsSection(): React.ReactElement {
  const { settings, updateSetting } = useSettings();

  return (
    <View style={styles.sectionContainer}>
      <Text style={styles.sectionHeader}>APPEARANCE</Text>
      <View style={styles.card}>
        <SettingRow
          title="Theme"
          bottomElement={
            <SegmentedControl<'system' | 'light' | 'dark'>
              options={[
                { label: 'System', value: 'system' },
                { label: 'Light', value: 'light' },
                { label: 'Dark', value: 'dark' },
              ]}
              selectedValue={settings.theme}
              onSelect={(val) => updateSetting('theme', val)}
            />
          }
        />

        <SettingRow
          title="Reduce animation"
          subtitle="Freezes the main player's gradient instead of drifting"
          rightElement={
            <SettingSwitch
              value={settings.reduceAnimation}
              onValueChange={(val) => updateSetting('reduceAnimation', val)}
              accessibilityLabel="Reduce animation"
            />
          }
        />

        <SettingRow
          title="Reduce dynamic blur"
          subtitle="Swaps frosted glass for solid fills across the app"
          rightElement={
            <SettingSwitch
              value={settings.reduceDynamicBlur}
              onValueChange={(val) => updateSetting('reduceDynamicBlur', val)}
              accessibilityLabel="Reduce dynamic blur"
            />
          }
        />

        <SettingRow
          title="Liquid Glass"
          subtitle="Real refracting glass on the floating nav bar. Uses GPU shaders."
          rightElement={
            <SettingSwitch
              value={settings.liquidGlass}
              onValueChange={(val) => updateSetting('liquidGlass', val)}
              accessibilityLabel="Liquid Glass"
            />
          }
        />

        <SettingRow
          title="Full-screen cover art"
          subtitle="Runs the cover to the edges of the player instead of a square sleeve"
          rightElement={
            <SettingSwitch
              value={settings.fullScreenCoverArt}
              onValueChange={(val) => updateSetting('fullScreenCoverArt', val)}
              accessibilityLabel="Full-screen cover art"
            />
          }
        />
      </View>

      <Text style={[styles.sectionHeader, styles.performanceHeader]}>PERFORMANCE</Text>
      <View style={styles.card}>
        <SettingRow
          title="High performance mode"
          subtitle="Uses full animations and blur, and requests a higher display refresh rate"
          rightElement={
            <SettingSwitch
              value={settings.highPerformanceMode}
              onValueChange={(val) => updateSetting('highPerformanceMode', val)}
              accessibilityLabel="High performance mode"
            />
          }
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
  performanceHeader: {
    marginTop: space[5],
  },
  card: {
    backgroundColor: color.bg.s2,
    borderRadius: radius.lg,
    overflow: 'hidden',
  },
});
