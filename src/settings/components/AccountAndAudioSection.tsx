import React from 'react';
import { StyleSheet, View, Text } from 'react-native';
import { color, space, radius, type, fontFamily } from '@/design/tokens';
import { UserIcon, VolumeIcon, WifiIcon, SignalIcon } from '@/design/components/OTOIcon';
import { SettingRow } from './SettingRow';
import { SettingSwitch } from './SettingsControls';
import { useSettings } from '../hooks/useSettings';
import { useGoogleAuth } from '@/auth/useGoogleAuth';

export function AccountAndAudioSection(): React.ReactElement {
  const { settings, updateSetting } = useSettings();
  const { isSignedIn, activeProfile, loginWithGoogle } = useGoogleAuth();

  const userSubtitle = isSignedIn && activeProfile
    ? activeProfile.email || activeProfile.name || '@oto_user'
    : 'Sign in to sync library & playlists';

  return (
    <View style={styles.container}>
      <View style={styles.card}>
        <SettingRow
          title="Account & integrations"
          subtitle={userSubtitle}
          icon={<UserIcon size={20} color={color.text.secondary} />}
          showChevron
          onPress={() => {
            if (!isSignedIn) void loginWithGoogle();
          }}
        />

        <SettingRow
          title="Listen together"
          subtitle="Share a code and play the same music, in time"
          icon={<VolumeIcon size={20} color={color.text.secondary} />}
          showChevron
          onPress={() => {}}
        />
      </View>

      <Text style={styles.sectionHeader}>AUDIO QUALITY</Text>
      <View style={styles.card}>
        <SettingRow
          title="Sources"
          subtitle="Where audio comes from and the order used"
          showChevron
          onPress={() => {}}
        />

        <SettingRow
          title="On Wi-Fi"
          icon={<WifiIcon size={18} color={color.text.secondary} />}
          badgeLabel="IN USE"
          valueBadge={settings.audioQuality === 'lossless' ? 'Lossless' : 'High'}
          showChevron
          onPress={() => {
            const next = settings.audioQuality === 'lossless' ? 'high' : 'lossless';
            updateSetting('audioQuality', next);
          }}
        />

        <SettingRow
          title="On mobile data"
          icon={<SignalIcon size={18} color={color.text.secondary} />}
          valueBadge={settings.streamOnMobileData ? 'Lossless' : 'Low'}
          showChevron
          onPress={() => updateSetting('streamOnMobileData', !settings.streamOnMobileData)}
        />

        <SettingRow
          title="Dolby Atmos"
          subtitle="Play the more immersive, surround version of a song when there is one."
          rightElement={
            <SettingSwitch
              value={settings.dolbyAtmos}
              onValueChange={(val) => updateSetting('dolbyAtmos', val)}
              accessibilityLabel="Dolby Atmos"
            />
          }
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: space[5],
    paddingHorizontal: space[4],
  },
  sectionHeader: {
    fontSize: type.caption[0],
    fontFamily: fontFamily.bold,
    color: color.text.tertiary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginTop: space[5],
    marginBottom: space[2],
    marginLeft: space[2],
  },
  card: {
    backgroundColor: color.bg.s2,
    borderRadius: radius.lg,
    overflow: 'hidden',
  },
});
