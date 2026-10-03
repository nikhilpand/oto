import React from 'react';
import { StyleSheet, View, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { color, space } from '@/design/tokens';
import { ChevronLeftIcon } from '@/design/components/OTOIcon';
import { SettingsScreenContent } from '@/settings/screens/SettingsScreenContent';

export default function SettingsRoute(): React.ReactElement {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.topBar}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.backButton}
          accessibilityLabel="Go back"
          accessibilityRole="button"
          hitSlop={8}
        >
          <ChevronLeftIcon size={24} color={color.text.primary} />
        </TouchableOpacity>
      </View>
      <SettingsScreenContent />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: color.bg.base,
  },
  topBar: {
    paddingHorizontal: space[3],
    height: 48,
    justifyContent: 'center',
  },
  backButton: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
