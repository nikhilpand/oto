import React, { useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Linking,
} from 'react-native';
import { color, space, radius, type, fontFamily, BOTTOM_CHROME_HEIGHT } from '@/design/tokens';
import { SearchIcon } from '@/design/components/OTOIcon';
import { AccountAndAudioSection } from '../components/AccountAndAudioSection';
import { PlaybackSettingsSection } from '../components/PlaybackSettingsSection';
import { AppearanceSettingsSection } from '../components/AppearanceSettingsSection';
import { StorageSettingsSection } from '../components/StorageSettingsSection';

export function SettingsScreenContent(): React.ReactElement {
  const [searchQuery, setSearchQuery] = useState('');

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.scrollContent}
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
    >
      <View style={styles.header}>
        <Text style={styles.title}>Settings</Text>
      </View>

      <View style={styles.searchContainer}>
        <SearchIcon size={18} color={color.text.tertiary} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search settings"
          placeholderTextColor={color.text.tertiary}
          value={searchQuery}
          onChangeText={setSearchQuery}
          autoCorrect={false}
          autoCapitalize="none"
          accessibilityLabel="Search settings"
        />
      </View>

      <AccountAndAudioSection />
      <PlaybackSettingsSection />
      <AppearanceSettingsSection />
      <StorageSettingsSection />

      <View style={styles.footer}>
        <Text style={styles.versionText}>oto 1.0</Text>
        <View style={styles.footerLinks}>
          <TouchableOpacity onPress={() => void Linking.openURL('https://github.com')}>
            <Text style={styles.linkText}>GitHub</Text>
          </TouchableOpacity>
          <Text style={styles.dot}>·</Text>
          <TouchableOpacity onPress={() => {}}>
            <Text style={styles.linkText}>Developer</Text>
          </TouchableOpacity>
          <Text style={styles.dot}>·</Text>
          <TouchableOpacity onPress={() => {}}>
            <Text style={styles.linkText}>Discord</Text>
          </TouchableOpacity>
          <Text style={styles.dot}>·</Text>
          <TouchableOpacity onPress={() => {}}>
            <Text style={styles.linkText}>Website</Text>
          </TouchableOpacity>
        </View>
        <Text style={styles.backendText}>~YouTube Music & Listen Together Backend</Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: color.bg.base,
  },
  scrollContent: {
    paddingTop: space[4],
    paddingBottom: BOTTOM_CHROME_HEIGHT + space[8],
  },
  header: {
    paddingHorizontal: space[5],
    paddingTop: space[2],
    paddingBottom: space[4],
  },
  title: {
    fontSize: type.display[0],
    lineHeight: type.display[1],
    fontFamily: fontFamily.bold,
    color: color.text.primary,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: color.bg.s2,
    marginHorizontal: space[4],
    marginBottom: space[5],
    paddingHorizontal: space[3],
    paddingVertical: space[2] + 2,
    borderRadius: radius.md,
  },
  searchInput: {
    flex: 1,
    marginLeft: space[2],
    fontSize: type.body[0],
    fontFamily: fontFamily.regular,
    color: color.text.primary,
    padding: 0,
  },
  footer: {
    alignItems: 'center',
    paddingVertical: space[6],
    paddingHorizontal: space[4],
  },
  versionText: {
    fontSize: type.caption[0],
    fontFamily: fontFamily.medium,
    color: color.text.tertiary,
    marginBottom: space[2],
  },
  footerLinks: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: space[2],
  },
  linkText: {
    fontSize: type.caption[0],
    fontFamily: fontFamily.regular,
    color: color.text.secondary,
    textDecorationLine: 'underline',
  },
  dot: {
    fontSize: type.caption[0],
    color: color.text.disabled,
    marginHorizontal: space[2],
  },
  backendText: {
    fontSize: 11,
    fontFamily: fontFamily.regular,
    color: color.text.disabled,
  },
});
