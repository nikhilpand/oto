import { useEffect } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { StyleSheet } from 'react-native';
import { color } from '@/design/tokens';
import { ThemeProvider } from '@/design/context/ThemeContext';
import { PaletteProvider } from '@/design/context/PaletteContext';
import { AudioEngineProvider } from '@/audio/AudioContext';
import { PlayerOverlay } from '@/player/components/PlayerOverlay';
import { usePlaybackStore } from '@/store/usePlaybackStore';
import { useQueueStore } from '@/store/useQueueStore';
import { QualityTierProvider } from '@/design/hooks/useQualityTier';
import { ScrollOffsetProvider } from '@/design/context/ScrollOffsetContext';
import { useDownloadStore } from '@/downloads/DownloadStore';

// LogBox.ignoreAllLogs(true);

/**
 * Root layout — wraps the entire app in GestureHandlerRootView
 * (required for all gesture-based interactions) and configures
 * the global navigation stack with dark theme, palette, and audio providers,
 * topped with the persistent single player overlay.
 */
export default function RootLayout() {
  console.log('[RootLayout] Mounting root layout...');
  useEffect(() => {
    const playbackStore = usePlaybackStore.getState();
    const queueStore = useQueueStore.getState();

    // Init download manifest DB
    useDownloadStore.getState().init();

    if (queueStore.currentTrack && !playbackStore.currentTrack) {
      playbackStore.setTrack(queueStore.currentTrack);
    }
  }, []);
  return (
    <GestureHandlerRootView style={styles.root}>
      <QualityTierProvider>
        <ScrollOffsetProvider>
          <ThemeProvider>
            <PaletteProvider>
              <AudioEngineProvider>
                <StatusBar style="light" />
                <Stack
                  screenOptions={{
                    headerShown: false,
                    contentStyle: { backgroundColor: color.bg.base },
                    animation: 'fade',
                  }}
                />
                <PlayerOverlay />
              </AudioEngineProvider>
            </PaletteProvider>
          </ThemeProvider>
        </ScrollOffsetProvider>
      </QualityTierProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: color.bg.base,
  },
});
