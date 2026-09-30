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
import mockCatalog from '@/mock/mockCatalog.json';
import { Track } from '@/domain/types';

import { useQueueStore } from '@/store/useQueueStore';

/**
 * Root layout — wraps the entire app in GestureHandlerRootView
 * (required for all gesture-based interactions) and configures
 * the global navigation stack with dark theme, palette, and audio providers,
 * topped with the persistent single player overlay.
 */
export default function RootLayout() {
  useEffect(() => {
    const playbackStore = usePlaybackStore.getState();
    const queueStore = useQueueStore.getState();

    if (!queueStore.currentTrack && mockCatalog.tracks.length > 0) {
      playbackStore.setQueue(mockCatalog.tracks as Track[], 0);
    } else if (queueStore.currentTrack && !playbackStore.currentTrack) {
      playbackStore.setTrack(queueStore.currentTrack);
    }
  }, []);
  return (
    <GestureHandlerRootView style={styles.root}>
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
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: color.bg.base,
  },
});
