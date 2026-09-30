import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { StyleSheet } from 'react-native';
import { color } from '@/design/tokens';
import { ThemeProvider } from '@/design/context/ThemeContext';
import { PaletteProvider } from '@/design/context/PaletteContext';

/**
 * Root layout — wraps the entire app in GestureHandlerRootView
 * (required for all gesture-based interactions) and configures
 * the global navigation stack with dark theme and palette providers.
 */
export default function RootLayout() {
  return (
    <GestureHandlerRootView style={styles.root}>
      <ThemeProvider>
        <PaletteProvider>
          <StatusBar style="light" />
          <Stack
            screenOptions={{
              headerShown: false,
              contentStyle: { backgroundColor: color.bg.base },
              animation: 'fade',
            }}
          />
        </PaletteProvider>
      </ThemeProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: color.bg.base,
  },
});
